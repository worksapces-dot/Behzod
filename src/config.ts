import { ChatGroq } from "@langchain/groq";
import Supermemory from "supermemory";

export const supermemory = new Supermemory({
  apiKey: process.env.SUPERMEMORY_API_KEY,
});

export const model = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0,
});

/**
 * Fast Model for quick Reflexion & simple tools
 */
export const fastModel = new ChatGroq({
  model: "llama-3.1-8b-instant",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0,
});
