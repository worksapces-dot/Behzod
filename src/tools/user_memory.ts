import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Logger } from "../logger";

/**
 * User Memory Tools — Behzod v2
 *
 * Uses the Mem0 REST API directly (no npm package needed).
 * Mem0 stores user identity: name, language, role, past issues, preferences.
 *
 * REST API docs: https://docs.mem0.ai/api-reference
 * Base URL: https://api.mem0.ai/v1
 */

const MEM0_BASE = "https://api.mem0.ai/v1";
const MEM0_API_KEY = process.env.MEM0_API_KEY || "";

function mem0Headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Token ${MEM0_API_KEY}`,
  };
}

// --- Tool 1: Get User Profile ---
export const getUserProfile = tool(
  async ({ userId }) => {
    Logger.tool("get_user_profile", userId, "START");
    try {
      const res = await fetch(`${MEM0_BASE}/memories/?user_id=${userId}`, {
        method: "GET",
        headers: mem0Headers(),
      });

      const data = await res.json() as any;
      const memories = Array.isArray(data) ? data : data.results || [];

      if (memories.length === 0) {
        Logger.tool("get_user_profile", userId, "DONE", "No profile found");
        return "New user — no profile found yet. Learn about them from the conversation.";
      }

      const profile = memories.map((m: any) => m.memory || m.content || "").filter(Boolean);
      Logger.tool("get_user_profile", userId, "DONE", `Found ${profile.length} items`);
      return `[User Profile for ${userId}]:\n${profile.join("\n")}`;
    } catch (e: any) {
      Logger.tool("get_user_profile", userId, "ERROR", e.message);
      return "Could not retrieve user profile.";
    }
  },
  {
    name: "get_user_profile",
    description:
      "Retrieve the identity profile of a user — their name, language preference, role, past issues, and other known information. Call this at the start of every conversation.",
    schema: z.object({
      userId: z.string().describe("The Telegram user ID of the person you are helping."),
    }),
  }
);

// --- Tool 2: Save User Info ---
export const saveUserInfo = tool(
  async ({ userId, info }) => {
    Logger.tool("save_user_info", info, "START", `userId: ${userId}`);
    try {
      const res = await fetch(`${MEM0_BASE}/memories/`, {
        method: "POST",
        headers: mem0Headers(),
        body: JSON.stringify({
          messages: [{ role: "user", content: info }],
          user_id: userId,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        Logger.tool("save_user_info", info, "ERROR", err);
        return "Failed to save user info.";
      }

      Logger.tool("save_user_info", info, "DONE");
      return `Saved: "${info}" to the profile of user ${userId}.`;
    } catch (e: any) {
      Logger.tool("save_user_info", info, "ERROR", e.message);
      return "Could not save user info.";
    }
  },
  {
    name: "save_user_info",
    description:
      "Save a new piece of information about a user to their profile — e.g., their name, preferred language, role, or a past issue. Use this whenever you learn something new about the user.",
    schema: z.object({
      userId: z.string().describe("The Telegram user ID."),
      info: z
        .string()
        .describe(
          "A short factual sentence about the user. Example: \"User's name is Ali\" or \"User prefers Russian language\" or \"User previously reported a screen flickering issue.\""
        ),
    }),
  }
);
