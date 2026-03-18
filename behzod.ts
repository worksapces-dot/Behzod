import { Bot } from "grammy";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import Supermemory from "supermemory";

const supermemory = new Supermemory({ apiKey: process.env.SUPERMEMORY_API_KEY });

const searchMemory = tool(
  async ({ query }) => {
    try {
      const response = await (supermemory as any).search.memories({ q: query, searchMode: "hybrid", threshold: 0.1, limit: 10 });
      if (!response.results || response.results.length === 0) return "No data found.";
      return response.results.map((res: any) => `[Data]: ${typeof res.memory === 'string' ? res.memory : res.memory?.content || res.chunk?.content}`).join("\n---\n");
    } catch (e) { return "Error searching memory."; }
  },
  { name: "search_memory", description: "Search technical specs.", schema: z.object({ query: z.string() }) }
);

const model = new ChatOpenAI({
  modelName: "llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY,
  configuration: { baseURL: "https://api.groq.com/openai/v1" },
  temperature: 0,
});

const checkpointer = new MemorySaver();
const behzodAgent = createReactAgent({
  llm: model,
  tools: [searchMemory],
  checkpointSaver: checkpointer,
  messageModifier: "You are Behzod, the Technical Support AI. Be friendly, direct, and use your tools for specs. IMPORTANT: Always write your responses in Uzbek language (O'zbek tili). This is mandatory for all responses.",
});

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || "");

bot.command("start", (ctx) => ctx.reply("Salom! I am Behzod. I handle support. Mention me to talk! 🤖"));

bot.on("message:text", async (ctx) => {
  const isPrivate = ctx.chat.type === "private";
  const text = ctx.message.text;
  const username = ctx.me.username;
  const hasTrigger = text.toLowerCase().includes("behzod");
  const isMentioned = text.includes(`@${username}`);
  const isReplyToMe = ctx.message.reply_to_message?.from?.id === ctx.me.id;

  if (!isPrivate && !hasTrigger && !isMentioned && !isReplyToMe) return;

  await ctx.replyWithChatAction("typing");
  try {
    const config = { configurable: { thread_id: `behzod_${ctx.from.id}` } };
    let cleanText = text.replace(/behzod/gi, "").replace(`@${username}`, "").trim();
    const result = await behzodAgent.invoke({ messages: [{ role: "user", content: cleanText || "Hi" }] }, config);
    await ctx.reply(result.messages[result.messages.length - 1].content as string, { reply_to_message_id: ctx.message.message_id });
  } catch (error) { console.error(error); }
});

console.log("🚀 Behzod is starting...");
bot.start();
