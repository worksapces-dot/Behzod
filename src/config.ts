import { ChatGroq } from "@langchain/groq";
import Supermemory from "supermemory";

export const supermemory = new Supermemory({
  apiKey: process.env.SUPERMEMORY_API_KEY,
});

export const model = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0,
  maxRetries: 3,
  timeout: 30000,
});

/**
 * Fast Model for quick Reflexion & simple tools
 */
export const fastModel = new ChatGroq({
  model: "llama-3.1-8b-instant",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0,
  maxRetries: 3,
  timeout: 30000,
});

// Test connection on startup
export async function testConnections() {
  const results = {
    groq: false,
    supermemory: false,
    mem0: false,
  };

  // Test Groq
  try {
    await model.invoke("test");
    results.groq = true;
    console.log("✅ Groq API: Connected");
  } catch (e: any) {
    console.error("❌ Groq API: Failed -", e.message);
  }

  // Test Supermemory
  try {
    await (supermemory as any).search.memories({ q: "test", limit: 1 });
    results.supermemory = true;
    console.log("✅ Supermemory API: Connected");
  } catch (e: any) {
    console.error("❌ Supermemory API: Failed -", e.message);
  }

  // Test Mem0
  try {
    const res = await fetch("https://api.mem0.ai/v1/memories/?user_id=behzod_startup_check", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${process.env.MEM0_API_KEY || ""}`,
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    results.mem0 = true;
    console.log("✅ Mem0 API: Connected");
  } catch (e: any) {
    console.error("❌ Mem0 API: Failed -", e.message);
  }

  return results;
}
