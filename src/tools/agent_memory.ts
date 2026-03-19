import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Logger } from "../logger";

const MEM0_BASE = "https://api.mem0.ai/v1";
const MEM0_API_KEY = process.env.MEM0_API_KEY || "";
const AGENT_ID = "behzod_agent_core";
const LESSON_CACHE_TTL_MS = 60_000;

let cachedLessons = "";
let cachedLessonsFetchedAt = 0;

function mem0Headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Token ${MEM0_API_KEY}`,
  };
}

/**
 * Get all past behavioral lessons for the agent.
 */
export async function getAgentLessons(): Promise<string> {
  if (cachedLessonsFetchedAt && Date.now() - cachedLessonsFetchedAt < LESSON_CACHE_TTL_MS) {
    return cachedLessons;
  }

  try {
    const res = await fetch(`${MEM0_BASE}/memories/?user_id=${AGENT_ID}`, {
      method: "GET",
      headers: mem0Headers(),
    });
    const data = await res.json() as any;
    const memories = Array.isArray(data) ? data : data.results || [];
    if (memories.length === 0) {
      cachedLessons = "No past behavior lessons stored yet.";
      cachedLessonsFetchedAt = Date.now();
      return cachedLessons;
    }
    
    cachedLessons = memories.map((m: any) => `- ${m.memory || m.content || ""}`).join("\n");
    cachedLessonsFetchedAt = Date.now();
    return cachedLessons;
  } catch (e: any) {
    Logger.error("Failed to fetch agent lessons from Mem0", e);
    return cachedLessons;
  }
}

/**
 * Tool: save_agent_lesson
 * 
 * Saves a new behavioral rule or correction that the agent learned.
 */
export const saveAgentLesson = tool(
  async ({ lesson }) => {
    Logger.tool("save_agent_lesson", lesson, "START");
    try {
      const res = await fetch(`${MEM0_BASE}/memories/`, {
        method: "POST",
        headers: mem0Headers(),
        body: JSON.stringify({
          messages: [{ role: "user", content: `BEHAVIOR RULE: ${lesson}` }],
          user_id: AGENT_ID,
        }),
      });

      if (!res.ok) return "Failed to save the lesson.";
      
      cachedLessonsFetchedAt = 0;
      Logger.tool("save_agent_lesson", lesson, "DONE");
      return `Succesfully saved new behavior lesson: "${lesson}"`;
    } catch (e: any) {
      Logger.tool("save_agent_lesson", lesson, "ERROR", e.message);
      return "Error saving lesson.";
    }
  },
  {
    name: "save_agent_lesson",
    description: "Store a new behavioral lesson or correction so the agent remembers not to make the same mistake again (e.g., 'Never mention session IDs' or 'Always use bullets for steps').",
    schema: z.object({
      lesson: z.string().describe("The specific rule or correction to remember."),
    }),
  }
);
