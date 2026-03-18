import "dotenv/config";
import { Bot } from "grammy";
import { Elysia } from "elysia";
import { createBehzodAgent } from "./src/agents/behzod";
import { getSession } from "./src/session";
import { Logger } from "./src/logger";

const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN missing in .env");

const bot = new Bot(botToken);
const TRIGGERS = ["behzod", "begi"];
const processedUpdates = new Set<number>();
const MAX_TRACKED = 1000;

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
  const behzodAgent = await createBehzodAgent();
  Logger.info("Behzod ready.");

  // Welcome message for DMs
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
    if (!shouldRespond) return;

    const cleanText = cleanMessage(rawText, botUsername);
    Logger.box("Chat", [`User: @${fromUser}`, `Query: "${cleanText.substring(0, 50)}"`], "magenta");

    ctx.replyWithChatAction("typing").catch(() => {});

    try {
      Logger.info(`🧠 [BRAIN] Behzod is thinking... (Thread: ${threadId.substring(0, 8)})`);
      const startTime = Date.now();
      
      const result = await behzodAgent.invoke(
        { messages: [{ role: "user", content: `[User @${fromUser} (ID:${userId})] ${cleanText}` }] },
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
      Logger.error(`Behzod Brain Error: ${error.message}`, error.stack);
      
      // Tell the user the specific error if it's a known one (e.g. Rate Limit)
      let userError = "Uzr, ichki xatolik yuz berdi.";
      if (error.message.includes("rate_limit")) userError = "Hozirda so'rovlar juda ko'p. Iltimos, 1 daqiqadan so'ng urinib ko'ring. ⏳";
      if (error.message.includes("timeout")) userError = "Server javob berishga ulgurmadi. Iltimos, qaytadan yozing. 🔄";
      
      await ctx.reply(`${userError}\n\n(Error Info: ${error.message.substring(0, 50)}...)`);
    }
  });

  bot.start({
    onStart: (me) => Logger.info(`🤖 Bot @${me.username} online via Long Polling.`),
  });

  // Simplified Dashboard & Webhook Handler
  new Elysia()
    .get("/", () => {
      const history = Logger.getHistory().map(l => l.replace(/\x1b\[[0-9;]*m/g, "")).join("<br>");
      return new Response(`<html><body style="background:#0a0a0a;color:#4ade80;font-family:monospace">
        <h2>🚀 BEHZOD-V2.1 LIVE LOGS</h2><div id="logs" style="white-space:pre-wrap">${history}</div>
        <script>setTimeout(()=>location.reload(),5000)</script></body></html>`, { headers: {"Content-Type":"text/html"}});
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
    .head("/trello-webhook", () => new Response("OK"))
    .post("/trello-webhook", async ({ body }: { body: any }) => {
      const action = body?.action;
      const card = action?.data?.card;
      const listAfter = action?.data?.listAfter;
      const DONE_LIST_ID = process.env.TRELLO_DONE_LIST_ID;
      
      if (action?.type === "updateCard" && listAfter?.id === DONE_LIST_ID) {
        Logger.info(`🎯 [TRELLO] Bug Fixed! Notifying reporters for "${card?.name}"`);
        const TRELLO_KEY = process.env.TRELLO_API_KEY;
        const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
        const cardRes = await fetch(`https://api.trello.com/1/cards/${card.id}?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`);
        const cardData = await cardRes.json() as any;
        const match = (cardData.desc || "").match(/\[REPORTERS: ([\d,\s]+)\]/);
        if (match) {
          const IDs = match[1].split(",").map((id: string) => id.trim()).filter((id: string) => id !== "unknown");
          for (const uid of IDs) {
            bot.api.sendMessage(uid, `<b>🎉 Yaxshi xabar!</b>\n\nSiz xabar bergan muammo hal qilindi:\n«<i>${card.name}</i>»\n\nYordamingiz uchun rahmat! 🙏`, { parse_mode: "HTML" }).catch(() => {});
          }
        }
      }
      return new Response("OK");
    })
    .listen(3000);
}

main().catch(err => Logger.error("Fatal Startup Error", err));
