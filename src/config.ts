import { ChatGroq } from "@langchain/groq";
import Supermemory from "supermemory";

export const supermemory = new Supermemory({
  apiKey: process.env.SUPERMEMORY_API_KEY,
});

/**
 * Using ChatGroq directly for proper tool-calling support.
 * ChatOpenAI + Groq baseURL was leaking function calls as raw text.
 */
export const model = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0,
});
