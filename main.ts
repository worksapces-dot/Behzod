import "dotenv/config";
import { Bot } from "grammy";
import { Elysia } from "elysia";
import { createBehzodAgent } from "./src/agents/behzod";
import { getSession } from "./src/session";
import { Logger } from "./src/logger";
import { BOT_CONFIG, SESSION_CONFIG } from "./src/constants";
import { handleWebMessage } from "./src/web-chat";

// Validate required environment variables
const requiredEnvVars = [
  "TELEGRAM_BOT_TOKEN",
  "GROQ_API_KEY",
  "SUPERMEMORY_API_KEY",
  "MEM0_API_KEY",
  "TRELLO_API_KEY",
  "TRELLO_TOKEN",
  "TRELLO_LIST_ID",
  "TRELLO_DONE_LIST_ID"
];

const optionalButRecommended = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN"
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    Logger.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Warn about optional but important vars
for (const envVar of optionalButRecommended) {
  if (!process.env[envVar]) {
    Logger.info(`⚠️ Optional: ${envVar} not set. Conversations won't persist on restart.`);
    Logger.info(`   Get free Redis at: https://console.upstash.com/`);
  }
}

const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
const bot = new Bot(botToken);
const TRIGGERS = BOT_CONFIG.TRIGGERS;
const processedUpdates = new Set<number>();
const MAX_TRACKED = SESSION_CONFIG.MAX_TRACKED_UPDATES;

function isBehzodTriggered(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t.toLowerCase()));
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
  if (!text) return "";
  let cleaned = text.replace(/<function=[^>]*>\{[^}]*\}<\/function>/g, "").trim();
  cleaned = cleaned.replace(/<function=[^>]*>[^<]*(<\/function>)?/g, "").trim();
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
  return cleaned;
}

async function main() {
  Logger.startup();

  Logger.info("Initializing Behzod v2.1 (Performance Stabilized)...");
  
  // Test API connections
  Logger.info("Testing API connections...");
  const { testConnections } = await import("./src/config");
  await testConnections();
  
  const behzodAgent = await createBehzodAgent();
  Logger.info("Behzod ready.");

  bot.command("start", (ctx) => {
    ctx.reply("Salom! Men Behzod 👋\n\nMen Stok uz kompaniyasining qo'llab-quvvatlash xizmati vakilim. Sizga qanday yordam bera olaman?");
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

    // In DMs, always respond. In groups, check triggers
    const shouldTrigger = isPrivate || hasTrigger || isMentioned || isReplyToMe;
    const { threadId, shouldRespond } = getSession(chatId, userId, shouldTrigger);
    
    // Log ALL messages (DM and Group)
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
      Logger.info(`🧠 [BRAIN] Behzod is thinking... (Thread: ${threadId.substring(0, 8)})`);
      const startTime = Date.now();
      
      // Prefix Telegram user ID with 'telegram_' to separate from web users
      const telegramUserId = `telegram_${userId}`;
      
      const result = await behzodAgent.invoke(
        { messages: [{ role: "user", content: `[User @${fromUser} (ID:${telegramUserId})] ${cleanText}` }] },
        { configurable: { thread_id: threadId } }
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      Logger.info(`✅ [BRAIN] Thought completed in ${duration}s`);

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
      
      // Detailed error logging
      console.error("=== FULL ERROR DETAILS ===");
      console.error("Error message:", error.message);
      console.error("Error name:", error.name);
      if (error.stack) console.error("Stack trace:", error.stack);
      if (error.cause) console.error("Cause:", error.cause);
      if (error.code) console.error("Error code:", error.code);
      console.error("========================");
      
      Logger.error(`Behzod Brain Error: ${error.message}`);
      
      // Better error messages in both languages
      let userError = "Uzr, ichki xatolik yuz berdi. / Извините, произошла внутренняя ошибка.";
      
      if (error.message.includes("rate_limit") || error.message.includes("429")) {
        userError = "Hozirda so'rovlar juda ko'p. Iltimos, 1 daqiqadan so'ng urinib ko'ring. ⏳\n\nСлишком много запросов. Пожалуйста, попробуйте через минуту.";
      } else if (error.message.includes("timeout")) {
        userError = "Server javob berishga ulgurmadi. Iltimos, qaytadan yozing. 🔄\n\nСервер не успел ответить. Пожалуйста, попробуйте снова.";
      } else if (error.message.includes("network") || error.message.includes("fetch") || error.message.includes("url") || error.message.includes("port")) {
        userError = "Tarmoq xatoligi. Iltimos, qaytadan urinib ko'ring. 🌐\n\nОшибка сети. Пожалуйста, попробуйте снова.";
        Logger.error("Network error detected. Possible causes: Redis, Mem0, or Groq connection issue.");
      } else if (error.message.includes("ECONNREFUSED") || error.message.includes("ENOTFOUND")) {
        userError = "Xizmat bilan bog'lanib bo'lmadi. Iltimos, keyinroq urinib ko'ring.\n\nНе удалось подключиться к сервису. Попробуйте позже.";
        Logger.error("Connection refused. Check if Redis/Groq/Supermemory services are accessible.");
      }
      
      await ctx.reply(userError).catch(() => {});
    }
  });

  // Simplified Dashboard & Webhook Handler
  const app = new Elysia()
    .get("/", () => {
      const history = Logger.getHistory().map(l => l.replace(/\x1b\[[0-9;]*m/g, "")).join("<br>");
      return new Response(`<html><body style="background:#0a0a0a;color:#4ade80;font-family:monospace">
        <h2>🚀 BEHZOD-V2.1 LIVE LOGS</h2><div id="logs" style="white-space:pre-wrap">${history}</div>
        <script>setTimeout(()=>location.reload(),5000)</script></body></html>`, { headers: {"Content-Type":"text/html"}});
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
    .post("/api/chat", async ({ body }: { body: any }) => {
      try {
        const { userId, message } = body;
        
        if (!userId || !message) {
          return { error: "userId and message are required" };
        }

        Logger.info(`💬 [WEB] Message from ${userId}: ${message}`);
        const response = await handleWebMessage(userId, message);
        
        return { response };
      } catch (error: any) {
        Logger.error(`Web chat API error: ${error.message}`);
        return { error: "Internal server error" };
      }
    })
    .get("/logs", ({ set }) => {
      set.headers["Content-Type"] = "text/event-stream";
      return new ReadableStream({
        start(controller) {
          const unsub = Logger.subscribe((m) => controller.enqueue(`data: ${m}\n\n`));
          // @ts-ignore
          this.cancel = () => unsub();
        }
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
        const DONE_LIST_ID = process.env.TRELLO_DONE_LIST_ID;
        
        if (action?.type === "updateCard" && listAfter?.id === DONE_LIST_ID) {
          Logger.info(`🎯 [TRELLO] Bug Fixed! Notifying reporters for "${card?.name}"`);
          const TRELLO_KEY = process.env.TRELLO_API_KEY;
          const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
          
          const cardRes = await fetch(`https://api.trello.com/1/cards/${card.id}?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`);
          if (!cardRes.ok) {
            Logger.error("Failed to fetch card details from Trello");
            return new Response("OK");
          }
          
          const cardData = await cardRes.json() as any;
          const match = (cardData.desc || "").match(/\[REPORTERS: ([\d,\s]+)\]/);
          
          if (match) {
            const IDs = match[1].split(",").map((id: string) => id.trim()).filter((id: string) => id !== "unknown");
            
            for (const uid of IDs) {
              try {
                await bot.api.sendMessage(
                  uid, 
                  `<b>🎉 Yaxshi xabar! / Хорошие новости!</b>\n\nSiz xabar bergan muammo hal qilindi:\n«<i>${card.name}</i>»\n\nВаша проблема решена:\n«<i>${card.name}</i>»\n\n✅ Yordamingiz uchun rahmat! / Спасибо за помощь!`, 
                  { parse_mode: "HTML" }
                );
                Logger.info(`✅ Notified user ${uid}`);
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

  // Setup Telegram Webhook
  const webhookUrl = process.env.WEBHOOK_URL;
  if (webhookUrl) {
    try {
      // Initialize bot first
      await bot.init();
      await bot.api.setWebhook(`${webhookUrl}/telegram-webhook`);
      Logger.info(`✅ Webhook set: ${webhookUrl}/telegram-webhook`);
      Logger.info(`🚀 Bot running in WEBHOOK mode (instant delivery)`);
    } catch (error: any) {
      Logger.error(`Failed to set webhook: ${error.message}`);
      Logger.info(`Falling back to polling mode...`);
      bot.start({
        onStart: (me) => Logger.info(`🤖 Bot @${me.username} online via Long Polling (fallback).`),
      });
    }
  } else {
    Logger.info(`⚠️ WEBHOOK_URL not set. Using polling mode.`);
    Logger.info(`   For better performance, set WEBHOOK_URL in .env`);
    bot.start({
      onStart: (me) => Logger.info(`🤖 Bot @${me.username} online via Long Polling.`),
    });
  }
}

main().catch(err => Logger.error("Fatal Startup Error", err));
