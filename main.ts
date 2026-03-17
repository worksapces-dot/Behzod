import "dotenv/config";
import { Bot, webhookCallback } from "grammy";
import { Elysia } from "elysia";
import { createBehzodAgent } from "./src/agents/behzod";
import { getSession } from "./src/session";
import { model } from "./src/config";
import { Logger } from "./src/logger";

const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN missing in .env");

// --- Trigger words that wake Behzod up in group chats ---
const TRIGGERS = ["behzod", "begi"];

// --- Deduplication: track processed update IDs ---
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
  if (!text) return "I've processed your request. Is there anything else?";
  let cleaned = text.replace(/<function=[^>]*>\{[^}]*\}<\/function>/g, "").trim();
  cleaned = cleaned.replace(/<function=[^>]*>[^<]*(<\/function>)?/g, "").trim();
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
  return cleaned;
}

/**
 * Main Entry Point
 */
async function main() {
  Logger.startup();

  Logger.info("Initializing Behzod agent...");
  const behzodAgent = await createBehzodAgent();
  Logger.info("Behzod agent ready.");

  const bot = new Bot(botToken);

  bot.catch((err) => {
    Logger.error(`[BOT] Unhandled error: ${err.message}`);
  });

  bot.command("start", (ctx) =>
    ctx.reply(
      "Salom! Men Behzod — sizning texnik yordam agentingizman. 🤖\n\n" +
      "Menga murojaat qilish uchun:\n" +
      "• Guruhda: «Behzod [savol]» deb yozing.\n" +
      "• Shaxsiy chatda: To'g'ridan-to'g'ri yozing."
    )
  );

  // --- Main Message Handler ---
  bot.on("message:text", async (ctx) => {
    const rawText = ctx.message.text;
    const fromUser = ctx.from.username || ctx.from.first_name || "Unknown";
    const updateId = ctx.update.update_id;

    // Check if we've already done this update
    if (processedUpdates.has(updateId)) return;
    processedUpdates.add(updateId);

    // Keep memory clean
    if (processedUpdates.size > MAX_TRACKED) {
      const oldest = processedUpdates.values().next().value;
      if (oldest !== undefined) processedUpdates.delete(oldest);
    }

    const userId = ctx.from.id.toString();
    const chatId = ctx.chat.id.toString();
    const chatTitle = ctx.chat.type !== 'private' ? (ctx.chat as any).title || "Group" : "Private Chat";
    const botUsername = ctx.me.username;

    // Detect triggers
    const isPrivate = ctx.chat.type === "private";
    const isReplyToMe = ctx.message.reply_to_message?.from?.id === ctx.me.id;
    const isMentioned = rawText.includes(`@${botUsername}`);
    const hasTrigger = isBehzodTriggered(rawText);

    // DEBUG: Log everything received
    Logger.info(`📩 [MSG] From: @${fromUser} | Chat: "${chatTitle}" | Text: "${rawText}"`);

    // Get Session State
    const { threadId, shouldRespond } = getSession(chatId, userId, isPrivate || hasTrigger || isMentioned || isReplyToMe);

    if (!shouldRespond) return;

    const cleanText = cleanMessage(rawText, botUsername);

    Logger.box("Active Chat", [
      `User: @${fromUser} (${userId})`,
      `Group: ${chatTitle} (${chatId})`,
      `Thread: ${threadId}`,
      `Query: "${cleanText.substring(0, 50)}"`
    ], "magenta");

    ctx.replyWithChatAction("typing").catch(() => {});

    try {
      const result = await behzodAgent.invoke(
        { messages: [{ role: "user", content: `[Group Context: ${chatTitle}] [User @${fromUser} (ID:${userId})] ${cleanText}` }] },
        { configurable: { thread_id: threadId } }
      );

      const rawReply = result.messages[result.messages.length - 1].content as string;
      
      // --- REFLEXION & REINFORCEMENT STEP ---
      Logger.info(`🧐 [REFLEXION] Reviewing draft: "${rawReply.substring(0, 30)}..."`);
      
      const reviewResult = await model.invoke([
        { role: "system", content: `You are the 'Senior Support Auditor' for Behzod AI.
Your job is to catch mistakes. Your output MUST be a JSON object with this structure:
{
  "is_perfect": boolean,
  "mistake_reason": "string describing what was wrong or empty",
  "corrected_text": "the final polished text for the user"
}

Review criteria:
1. PII LEAKS: No names, phones, or emails from logs.
2. WORDINESS: Max 3-4 sentences.
3. TONE: Professional & Experts.
        `},
        { role: "user", content: `Draft: "${rawReply}"` }
      ], { response_format: { type: "json_object" } });

      const audit = JSON.parse(reviewResult.content as string);
      let finalReply = audit.corrected_text || rawReply;

      // REINFORCEMENT: If auditor corrected it, save the lesson to Mem0 automatically
      if (!audit.is_perfect && audit.mistake_reason) {
        Logger.error(`🧠 [REINFORCEMENT] Mistake found: ${audit.mistake_reason}. Saving lesson...`);
        const { saveAgentLesson } = await import("./src/tools/agent_memory");
        await saveAgentLesson.invoke({ lesson: `AUDITOR RULE: ${audit.mistake_reason}` });
      }

      const reply = cleanReply(finalReply);
      Logger.box("Behzod Response", [reply], "green");
      await ctx.reply(reply, { reply_to_message_id: ctx.message.message_id });
    } catch (error: any) {
      Logger.error(`Agent Error: ${error.message}`);
      await ctx.reply("Uzr, xatolik yuz berdi. Iltimos, birozdan so'ng xabar qoldiring.");
    }
  });

  Logger.startup();

  // --- Start ONLY in Long Polling for Local Dev ---
  // Webhooks are often the reason it "fails" if ngrok is dead.
  bot.start({
    onStart: (me) => Logger.info(`🤖 Bot @${me.username} started via LONG POLLING (Instant Wakeup)`),
  });

  // --- Elysia Webhook & Dashboard Server ---
  new Elysia()
    .get("/", () => {
      const history = Logger.getHistory().map(l => l.replace(/\x1b\[[0-9;]*m/g, (m) => {
        // Convert ANSI to Simple HTML colors for the dashboard
        if (m.includes("32m")) return '<span style="color: #4ade80">'; // Green
        if (m.includes("36m")) return '<span style="color: #22d3ee">'; // Cyan
        if (m.includes("31m")) return '<span style="color: #f87171">'; // Red
        if (m.includes("33m")) return '<span style="color: #fbbf24">'; // Yellow
        if (m.includes("35m")) return '<span style="color: #db2777">'; // Magenta
        if (m.includes("90m")) return '<span style="color: #4b5563">'; // Gray
        if (m.includes("0m")) return "</span>";
        return "";
      })).join("<br>");

      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Behzod v2 | Live Console</title>
            <style>
              body { background: #0a0a0a; color: #e5e7eb; font-family: 'Courier New', monospace; padding: 20px; line-height: 1.4; overflow-x: hidden; }
              #console { background: #000; border: 1px solid #333; padding: 15px; border-radius: 8px; box-shadow: 0 0 20px rgba(0,0,0,0.5); min-height: 90vh; white-space: pre-wrap; word-break: break-all; }
              .header { color: #22d3ee; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 10px; display: flex; justify-content: space-between; }
              .status { color: #4ade80; animation: blink 1.5s infinite; }
              @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
            </style>
          </head>
          <body>
            <div class="header">
              <span>🚀 BEHZOD-V2-CLOUD @ TERMINAL</span>
              <span class="status">● LIVE STREAMING</span>
            </div>
            <div id="console">${history}</div>
            <script>
              const source = new EventSource("/logs");
              const consoleDiv = document.getElementById("console");
              
              source.onmessage = (event) => {
                let msg = event.data;
                // Convert ANSI to HTML for live stream
                msg = msg.replace(/\\x1b\\[[0-9;]*m/g, (m) => {
                  if (m.includes("32m")) return '<span style="color: #4ade80">';
                  if (m.includes("36m")) return '<span style="color: #22d3ee">';
                  if (m.includes("31m")) return '<span style="color: #f87171">';
                  if (m.includes("33m")) return '<span style="color: #fbbf24">';
                  if (m.includes("35m")) return '<span style="color: #db2777">';
                  if (m.includes("90m")) return '<span style="color: #4b5563">';
                  if (m.includes("0m")) return "</span>";
                  return "";
                });
                consoleDiv.innerHTML += msg + "<br>";
                window.scrollTo(0, document.body.scrollHeight);
              };
            </script>
          </body>
        </html>
      `, { headers: { "Content-Type": "text/html" } });
    })
    .get("/logs", ({ set }) => {
      set.headers["Content-Type"] = "text/event-stream";
      set.headers["Cache-Control"] = "no-cache";
      set.headers["Connection"] = "keep-alive";

      return new ReadableStream({
        start(controller) {
          const unsubscribe = Logger.subscribe((msg) => {
            controller.enqueue(`data: ${msg.replace(/\n/g, "<br>")}\n\n`);
          });

          // Keep connection alive with heartbeat
          const heartbeat = setInterval(() => {
            controller.enqueue(": heartbeat\\n\\n");
          }, 30000);

          // Handle close
          // @ts-ignore
          this.cancel = () => {
             unsubscribe();
             clearInterval(heartbeat);
          };
        }
      });
    })
    .listen(3000);
}

main().catch((err: any) => {
  Logger.error("Fatal startup error", err);
});
