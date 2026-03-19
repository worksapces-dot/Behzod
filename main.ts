import "dotenv/config";
import { Bot } from "grammy";
import { Elysia } from "elysia";
import { createBehzodAgent } from "./src/agents/behzod";
import { getSession } from "./src/session";
import { Logger } from "./src/logger";
import { BOT_CONFIG, SESSION_CONFIG } from "./src/constants";
import { handleWebMessage } from "./src/web-chat";
import { sanitizeAgentReply } from "./src/reply-sanitizer";
import { getOrCreateWebSessionToken, verifyWebSessionToken } from "./src/web-auth";
import { issueLiveKitAccessToken } from "./src/livekit-auth";

const requiredEnvVars = [
  "TELEGRAM_BOT_TOKEN",
  "GROQ_API_KEY",
  "SUPERMEMORY_API_KEY",
  "MEM0_API_KEY",
  "TRELLO_API_KEY",
  "TRELLO_TOKEN",
  "TRELLO_LIST_ID",
  "TRELLO_DONE_LIST_ID",
];

const optionalButRecommended = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    Logger.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

for (const envVar of optionalButRecommended) {
  if (!process.env[envVar]) {
    Logger.info(`Optional: ${envVar} not set. Conversations will not persist on restart.`);
    Logger.info("Get free Redis at: https://console.upstash.com/");
  }
}

const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
const bot = new Bot(botToken);
const TRIGGERS = BOT_CONFIG.TRIGGERS;
const processedUpdates = new Set<number>();
const MAX_TRACKED = SESSION_CONFIG.MAX_TRACKED_UPDATES;
const ADMIN_DASHBOARD_TOKEN = process.env.ADMIN_DASHBOARD_TOKEN || "";
const WEB_CHAT_RATE_LIMIT_WINDOW_MS = 60_000;
const WEB_CHAT_RATE_LIMIT_MAX = 12;
const MAX_WEB_MESSAGE_LENGTH = 4000;
const LIVEKIT_ROOM_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const webChatRateLimits = new Map<string, { count: number; startedAt: number }>();

function isBehzodTriggered(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return TRIGGERS.some((trigger) => lower.includes(trigger.toLowerCase()));
}

function cleanMessage(text: string, botUsername: string): string {
  let cleaned = text || "";
  for (const trigger of TRIGGERS) {
    cleaned = cleaned.replace(new RegExp(trigger, "gi"), "");
  }
  cleaned = cleaned.replace(new RegExp(`@${botUsername}`, "gi"), "").trim();
  return cleaned || "Hello!";
}

function cleanReply(text: string): string {
  return sanitizeAgentReply(text);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveLiveKitRoomName(input: unknown): string | null {
  const requestedRoom = typeof input === "string" ? input.trim() : "";
  const configuredRoom = (process.env.LIVEKIT_ROOM || "").trim();
  const roomName = requestedRoom || configuredRoom || "behzod-voice";

  if (!LIVEKIT_ROOM_NAME_PATTERN.test(roomName)) {
    return null;
  }

  return roomName;
}

function isDashboardAuthorized(request: Request): boolean {
  const url = new URL(request.url);
  const isLocalhost = ["localhost", "127.0.0.1"].includes(url.hostname);

  if (isLocalhost) {
    return true;
  }

  if (!ADMIN_DASHBOARD_TOKEN) {
    return false;
  }

  const headerToken = request.headers.get("x-admin-token");
  const queryToken = url.searchParams.get("token");
  return headerToken === ADMIN_DASHBOARD_TOKEN || queryToken === ADMIN_DASHBOARD_TOKEN;
}

function isWebRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = webChatRateLimits.get(key);

  if (!entry || now - entry.startedAt >= WEB_CHAT_RATE_LIMIT_WINDOW_MS) {
    webChatRateLimits.set(key, { count: 1, startedAt: now });
    return false;
  }

  entry.count += 1;
  return entry.count > WEB_CHAT_RATE_LIMIT_MAX;
}

async function main() {
  Logger.startup();
  Logger.info("Initializing Behzod v2.1...");
  Logger.info("Testing API connections...");

  const { testConnections } = await import("./src/config");
  await testConnections();

  const behzodAgent = await createBehzodAgent();
  Logger.info("Behzod ready.");

  bot.command("start", (ctx) => {
    ctx.reply("Salom! Men Behzod.\n\nMen Stok uz kompaniyasining qo'llab-quvvatlash xizmati vakiliman. Sizga qanday yordam bera olaman?");
  });

  bot.on("message:text", async (ctx) => {
    const rawText = ctx.message.text;
    const fromUser = ctx.from.username || ctx.from.first_name || "Unknown";
    const updateId = ctx.update.update_id;

    if (processedUpdates.has(updateId)) return;
    processedUpdates.add(updateId);

    if (processedUpdates.size > MAX_TRACKED) {
      const oldest = processedUpdates.values().next().value;
      if (oldest !== undefined) processedUpdates.delete(oldest);
    }

    const userId = ctx.from.id.toString();
    const chatId = ctx.chat.id.toString();
    const botUsername = ctx.me.username;

    const isPrivate = ctx.chat.type === "private";
    const isReplyToMe = ctx.message.reply_to_message?.from?.id === ctx.me.id;
    const isMentioned = rawText.includes(`@${botUsername}`);
    const hasTrigger = isBehzodTriggered(rawText);

    const shouldTrigger = isPrivate || hasTrigger || isMentioned || isReplyToMe;
    const { threadId, shouldRespond } = getSession(chatId, userId, shouldTrigger);

    const chatName = isPrivate ? "Direct Message" : (ctx.chat.title || "Group Chat");
    Logger.message(
      isPrivate ? "DM" : "GROUP",
      fromUser,
      chatName,
      rawText,
      shouldRespond
    );

    if (!shouldRespond) return;

    const cleanText = cleanMessage(rawText, botUsername);
    ctx.replyWithChatAction("typing").catch(() => {});

    try {
      Logger.info(`[BRAIN] Thinking... (${threadId.substring(0, 8)})`);
      const startTime = Date.now();
      const telegramUserId = `telegram_${userId}`;

      const result = await behzodAgent.invoke(
        {
          messages: [
            { role: "user", content: `[User @${fromUser} (ID:${telegramUserId})] ${cleanText}` },
          ],
        },
        { configurable: { thread_id: threadId } }
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      Logger.info(`[BRAIN] Done in ${duration}s`);

      const rawReply = result.messages[result.messages.length - 1].content as string;
      const reply = cleanReply(rawReply);

      if (reply) {
        Logger.box("Reply", [reply], "green");
        await ctx.reply(reply, { reply_to_message_id: ctx.message.message_id });
      } else {
        Logger.error("Agent returned empty reply.");
        await ctx.reply("System processed your message but had no verbal response. Try rephrasing.");
      }
    } catch (error: any) {
      processedUpdates.delete(updateId);

      console.error("=== FULL ERROR DETAILS ===");
      console.error("Error message:", error.message);
      console.error("Error name:", error.name);
      if (error.stack) console.error("Stack trace:", error.stack);
      if (error.cause) console.error("Cause:", error.cause);
      if (error.code) console.error("Error code:", error.code);
      console.error("========================");

      Logger.error(`Behzod Brain Error: ${error.message}`);

      let userError = "Uzr, ichki xatolik yuz berdi. / Извините, произошла внутренняя ошибка.";

      if (error.message.includes("rate_limit") || error.message.includes("429")) {
        userError = "Hozir so'rovlar juda ko'p. Iltimos, 1 daqiqadan so'ng qayta urinib ko'ring.\n\nСлишком много запросов. Пожалуйста, попробуйте через минуту.";
      } else if (error.message.includes("timeout")) {
        userError = "Server javob berishga ulgurmadi. Iltimos, qayta yozing.\n\nСервер не успел ответить. Пожалуйста, попробуйте снова.";
      } else if (
        error.message.includes("network") ||
        error.message.includes("fetch") ||
        error.message.includes("url") ||
        error.message.includes("port")
      ) {
        userError = "Tarmoq xatoligi. Iltimos, qaytadan urinib ko'ring.\n\nОшибка сети. Пожалуйста, попробуйте снова.";
        Logger.error("Network error detected. Possible causes: Redis, Mem0, or Groq connection issue.");
      } else if (error.message.includes("ECONNREFUSED") || error.message.includes("ENOTFOUND")) {
        userError = "Xizmat bilan bog'lanib bo'lmadi. Iltimos, keyinroq urinib ko'ring.\n\nНе удалось подключиться к сервису. Попробуйте позже.";
        Logger.error("Connection refused. Check if Redis, Groq, or Supermemory services are accessible.");
      }

      await ctx.reply(userError).catch(() => {});
    }
  });

  const app = new Elysia()
    .get("/", ({ request, set }: any) => {
      if (!isDashboardAuthorized(request)) {
        set.status = 404;
        return "Not Found";
      }

      const history = Logger.getHistory()
        .map((line) => escapeHtml(line.replace(/\x1b\[[0-9;]*m/g, "")))
        .join("<br>");

      return new Response(
        `<html><body style="background:#0a0a0a;color:#4ade80;font-family:monospace"><h2>BEHZOD LIVE LOGS</h2><div id="logs" style="white-space:pre-wrap">${history}</div><script>setTimeout(()=>location.reload(),5000)</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    })
    .get("/widget", () => Bun.file("public/chat-widget.html"))
    .get("/demo", () => Bun.file("public/demo.html"))
    .get("/behzod-widget.js", ({ set }) => {
      set.headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
      set.headers["Pragma"] = "no-cache";
      set.headers["Expires"] = "0";
      return Bun.file("public/behzod-widget.js");
    })
    .get("/behzod-widget-crisp.js", ({ set }) => {
      set.headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
      set.headers["Pragma"] = "no-cache";
      set.headers["Expires"] = "0";
      return Bun.file("public/behzod-widget-crisp.js");
    })
    .get("/agent-avatar.js", ({ set }) => {
      set.headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
      set.headers["Pragma"] = "no-cache";
      set.headers["Expires"] = "0";
      return Bun.file("public/agent-avatar.js");
    })
    .get("/livekit-client.umd.js", ({ set }) => {
      set.headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
      set.headers["Pragma"] = "no-cache";
      set.headers["Expires"] = "0";
      return Bun.file("node_modules/livekit-client/dist/livekit-client.umd.js");
    })
    .get("/api/chat/session", ({ request, set }: any) => {
      const existingToken = request.headers.get("x-session-token");
      const session = getOrCreateWebSessionToken(existingToken);
      set.headers["Cache-Control"] = "no-store";
      return {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expiresAt: session.expiresAt,
      };
    })
    .post("/api/chat", async ({ body, request, set }: { body: any; request: Request; set: any }) => {
      try {
        const { sessionToken, message } = body || {};

        if (!sessionToken || !message || typeof message !== "string") {
          set.status = 400;
          return { error: "sessionToken and message are required" };
        }

        if (message.length > MAX_WEB_MESSAGE_LENGTH) {
          set.status = 400;
          return { error: "Message is too long" };
        }

        const claims = verifyWebSessionToken(sessionToken);
        if (!claims) {
          set.status = 401;
          return { error: "Invalid session" };
        }

        const forwardedFor = request.headers.get("x-forwarded-for") || "";
        const rateLimitKey = `${claims.userId}:${forwardedFor.split(",")[0].trim() || "direct"}`;
        if (isWebRateLimited(rateLimitKey)) {
          set.status = 429;
          return { error: "Too many requests. Please wait a minute and try again." };
        }

        Logger.info(`[WEB] Message from ${claims.userId}: ${message}`);
        const response = await handleWebMessage(claims.userId, message);
        return { response };
      } catch (error: any) {
        Logger.error(`Web chat API error: ${error.message}`);
        set.status = 500;
        return { error: "Internal server error" };
      }
    })
    .get("/api/livekit/token", ({ request, set, query }: any) => {
      try {
        const livekitUrl = process.env.LIVEKIT_URL || "";
        if (!livekitUrl || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
          Logger.error("[LIVEKIT] Token request rejected: server not configured");
          set.status = 501;
          return { error: "Voice is not configured on this server." };
        }

        const sessionToken = request.headers.get("x-session-token") || "";
        const claims = verifyWebSessionToken(sessionToken);
        if (!claims) {
          Logger.error("[LIVEKIT] Token request rejected: invalid session");
          set.status = 401;
          return { error: "Invalid session" };
        }

        Logger.info(`[LIVEKIT] Token request from ${claims.userId} (room query: ${typeof query?.room === "string" ? query.room : "none"})`);
        const room = resolveLiveKitRoomName(query?.room);
        if (!room) {
          Logger.error(`[LIVEKIT] Token request rejected for ${claims.userId}: invalid room`);
          set.status = 400;
          return { error: "Invalid LiveKit room name." };
        }

        const { token, expiresAt } = issueLiveKitAccessToken({
          identity: claims.userId,
          name: claims.userId,
          room,
          ttlSeconds: 60 * 30,
        });

        Logger.info(`[LIVEKIT] Token issued for ${claims.userId} room=${room} expiresAt=${new Date(expiresAt).toISOString()}`);

        set.headers["Cache-Control"] = "no-store";
        return {
          url: livekitUrl,
          room,
          identity: claims.userId,
          token,
          expiresAt,
        };
      } catch (error: any) {
        Logger.error(`LiveKit token error: ${error.message}`);
        set.status = 500;
        return { error: "Internal server error" };
      }
    })
    .get("/logs", ({ set, request }: any) => {
      if (!isDashboardAuthorized(request)) {
        set.status = 404;
        return "Not Found";
      }

      set.headers["Content-Type"] = "text/event-stream";
      return new ReadableStream({
        start(controller) {
          const unsub = Logger.subscribe((message) => controller.enqueue(`data: ${message}\n\n`));
          // @ts-ignore
          this.cancel = () => unsub();
        },
      });
    })
    .post("/telegram-webhook", async ({ body }: { body: any }) => {
      try {
        await bot.handleUpdate(body);
        return new Response("OK");
      } catch (error: any) {
        Logger.error(`Telegram webhook error: ${error.message}`);
        return new Response("OK");
      }
    })
    .head("/trello-webhook", () => new Response("OK"))
    .post("/trello-webhook", async ({ body }: { body: any }) => {
      try {
        const action = body?.action;
        const card = action?.data?.card;
        const listAfter = action?.data?.listAfter;
        const doneListId = process.env.TRELLO_DONE_LIST_ID;

        if (action?.type === "updateCard" && listAfter?.id === doneListId) {
          Logger.info(`[TRELLO] Issue fixed. Notifying reporters for "${card?.name}"`);
          const trelloKey = process.env.TRELLO_API_KEY;
          const trelloToken = process.env.TRELLO_TOKEN;

          const cardRes = await fetch(`https://api.trello.com/1/cards/${card.id}?key=${trelloKey}&token=${trelloToken}`);
          if (!cardRes.ok) {
            Logger.error("Failed to fetch card details from Trello");
            return new Response("OK");
          }

          const cardData = await cardRes.json() as any;
          const match = (cardData.desc || "").match(/\[REPORTERS: ([\d,\s]+)\]/);

          if (match) {
            const ids = match[1]
              .split(",")
              .map((id: string) => id.trim())
              .filter((id: string) => id !== "unknown");

            for (const uid of ids) {
              try {
                await bot.api.sendMessage(
                  uid,
                  `<b>🎉 Yaxshi xabar! / Хорошие новости!</b>\n\nSiz xabar bergan muammo hal qilindi:\n«<i>${card.name}</i>»\n\nВаша проблема решена:\n«<i>${card.name}</i>»\n\n✅ Yordamingiz uchun rahmat! / Спасибо за помощь!`,
                  { parse_mode: "HTML" }
                );
                Logger.info(`Notified user ${uid}`);
              } catch (notifyError: any) {
                Logger.error(`Failed to notify user ${uid}: ${notifyError.message}`);
              }
            }
          }
        }
      } catch (webhookError: any) {
        Logger.error(`Webhook processing error: ${webhookError.message}`);
      }

      return new Response("OK");
    })
    .listen(BOT_CONFIG.PORT);

  const webhookUrl = process.env.WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await bot.init();
      await bot.api.setWebhook(`${webhookUrl}/telegram-webhook`);
      Logger.info(`Webhook set: ${webhookUrl}/telegram-webhook`);
      Logger.info("Bot running in webhook mode.");
    } catch (error: any) {
      Logger.error(`Failed to set webhook: ${error.message}`);
      Logger.info("Falling back to polling mode...");
      bot.start({
        onStart: (me) => Logger.info(`Bot @${me.username} online via long polling (fallback).`),
      });
    }
  } else {
    Logger.info("WEBHOOK_URL not set. Using polling mode.");
    bot.start({
      onStart: (me) => Logger.info(`Bot @${me.username} online via long polling.`),
    });
  }
}

main().catch((err) => Logger.error("Fatal Startup Error", err));
