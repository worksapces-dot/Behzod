import { Bot } from "grammy";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const model = new ChatOpenAI({
  modelName: "llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY,
  configuration: { baseURL: "https://api.groq.com/openai/v1" },
  temperature: 0.7,
});

const checkpointer = new MemorySaver();
const sherzodAgent = createReactAgent({
  llm: model,
  tools: [],
  checkpointSaver: checkpointer,
  messageModifier: "You are Sherzod, a helpful assistant. Answer questions directly and conversationally.",
});

const bot = new Bot(process.env.SHERZOD_BOT_TOKEN || "");

bot.command("start", (ctx) => ctx.reply("Hi! I'm Sherzod. Ask me anything!"));

bot.on("message:text", async (ctx) => {
  await ctx.replyWithChatAction("typing");
  const config = { configurable: { thread_id: `chat_${ctx.chat.id}` } };
  const result = await sherzodAgent.invoke(
    { messages: [{ role: "user", content: ctx.message.text }] },
    config
  );
  await ctx.reply(result.messages[result.messages.length - 1].content as string);
});

console.log("🤖 Sherzod bot is running...");
bot.start();
