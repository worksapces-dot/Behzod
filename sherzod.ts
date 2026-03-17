import { Bot } from "grammy";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import Supermemory from "supermemory";

const supermemory = new Supermemory({ apiKey: process.env.SUPERMEMORY_API_KEY });

const analyzeVibe = tool(
  async ({ chatId }) => {
    try {
      const response = await (supermemory as any).search.memories({
        q: "user behavior patterns, annoying people, drama, helpful people, group vibe",
        containerTag: `insights_${chatId}`,
        limit: 30
      });
      return response.results.map((res: any) => res.memory?.content || res.memory || "").join("\n");
    } catch (e) { return "I can't feel the vibe right now."; }
  },
  { name: "analyze_vibe", description: "Analyze the group logs to find annoying behavior.", schema: z.object({ chatId: z.string() }) }
);

const model = new ChatOpenAI({
  modelName: "llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY,
  configuration: { baseURL: "https://api.groq.com/openai/v1" },
  temperature: 0.5, // Slightly higher for more creative psychological analysis
});

const checkpointer = new MemorySaver();
const sherzodAgent = createReactAgent({
  llm: model,
  tools: [analyzeVibe],
  checkpointSaver: checkpointer,
  messageModifier: "You are Sherzod, a silent and mysterious psychological observer. You watch group chats to see who is being annoying, helpful, or weird. When asked for a vibe report, be honest, slightly dark, and observant.",
});

// USES A DIFFERENT TOKEN FOR A SEPARATE PRESENCE
const bot = new Bot(process.env.SHERZOD_BOT_TOKEN || "");

bot.command("start", (ctx) => ctx.reply("...I am watching. I am Sherzod. 👻"));

// Explicit command for Sherzod's report
bot.command("vibe", async (ctx) => {
  await ctx.replyWithChatAction("typing");
  const config = { configurable: { thread_id: `sherzod_${ctx.chat.id}` } };
  const result = await sherzodAgent.invoke(
    { messages: [{ role: "user", content: `Tell me the truth about the vibe in this group (${ctx.chat.id}). Who is being annoying?` }] },
    config
  );
  await ctx.reply(result.messages[result.messages.length - 1].content as string);
});

bot.on("message:text", async (ctx) => {
  // SILENTLY RECORDING EVERYTHING
  try {
    const userTag = ctx.from.username || ctx.from.first_name;
    await (supermemory as any).documents.add({
      content: `${userTag} said: "${ctx.message.text}"`,
      containerTag: `insights_${ctx.chat.id}`,
    });
  } catch (e) { /* Silent fail */ }

  const text = ctx.message.text.toLowerCase();
  // Sherzod only speaks if his name is called or the /vibe command is used
  if (text.includes("sherzod")) {
     await ctx.replyWithChatAction("typing");
     const config = { configurable: { thread_id: `direct_${ctx.from.id}` } };
     const result = await sherzodAgent.invoke({ messages: [{ role: "user", content: ctx.message.text }] }, config);
     await ctx.reply(result.messages[result.messages.length - 1].content as string);
  }
});

console.log("👻 Sherzod is watching...");
bot.start();
