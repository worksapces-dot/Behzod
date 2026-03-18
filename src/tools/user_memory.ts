import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Logger } from "../logger";

/**
 * User Memory Tools — Behzod v2 (Enhanced)
 *
 * Uses the Mem0 REST API with advanced features:
 * - Natural language search
 * - Category-based organization
 * - Metadata tagging
 * - Date filtering
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const res = await fetch(`${MEM0_BASE}/memories/?user_id=${userId}`, {
        method: "GET",
        headers: mem0Headers(),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        Logger.tool("get_user_profile", userId, "ERROR", `HTTP ${res.status}`);
        return "New user — no profile found yet. Learn about them from the conversation.";
      }

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
      // Don't fail the whole conversation if Mem0 is down
      return "New user — no profile found yet. Learn about them from the conversation.";
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

// --- Tool 2: Save User Info (Enhanced with Categories & Metadata) ---
export const saveUserInfo = tool(
  async ({ userId, info, category }) => {
    Logger.tool("save_user_info", info, "START", `userId: ${userId}, category: ${category || "general"}`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Add metadata for better organization
      const metadata: any = {
        source: "telegram_bot",
        bot: "behzod",
        timestamp: new Date().toISOString(),
      };
      
      // Add category if provided
      if (category) {
        metadata.category = category;
      }
      
      const res = await fetch(`${MEM0_BASE}/memories/`, {
        method: "POST",
        headers: mem0Headers(),
        body: JSON.stringify({
          messages: [{ role: "user", content: info }],
          user_id: userId,
          metadata,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.text();
        Logger.tool("save_user_info", info, "ERROR", `HTTP ${res.status}: ${err.substring(0, 50)}`);
        return "Failed to save user info (service temporarily unavailable).";
      }

      Logger.tool("save_user_info", info, "DONE");
      return `Saved: "${info}" to the profile of user ${userId} (category: ${category || "general"}).`;
    } catch (e: any) {
      Logger.tool("save_user_info", info, "ERROR", e.message);
      return "Could not save user info (service temporarily unavailable).";
    }
  },
  {
    name: "save_user_info",
    description:
      "Save a new piece of information about a user to their profile with optional categorization. Use this whenever you learn something new about the user.",
    schema: z.object({
      userId: z.string().describe("The Telegram user ID."),
      info: z
        .string()
        .describe(
          "A short factual sentence about the user. Example: \"User's name is Ali\" or \"User prefers Russian language\" or \"User previously reported a screen flickering issue.\""
        ),
      category: z
        .enum(["personal", "preferences", "issues", "technical", "feedback"])
        .optional()
        .describe(
          "Category of the information: 'personal' (name, role), 'preferences' (language, settings), 'issues' (past bugs), 'technical' (technical knowledge), 'feedback' (user opinions)"
        ),
    }),
  }
);

// --- Tool 3: Search User Memories (NEW) ---
export const searchUserMemory = tool(
  async ({ userId, query, category }) => {
    Logger.tool("search_user_memory", query, "START", `userId: ${userId}`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Build filters
      const filters: any = {
        AND: [{ user_id: userId }],
      };
      
      // Add category filter if specified
      if (category) {
        filters.AND.push({ "metadata.category": category });
      }
      
      const res = await fetch(`${MEM0_BASE}/memories/search/`, {
        method: "POST",
        headers: mem0Headers(),
        body: JSON.stringify({
          query,
          filters,
          top_k: 5, // Return top 5 most relevant memories
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        Logger.tool("search_user_memory", query, "ERROR", `HTTP ${res.status}`);
        return "No relevant memories found.";
      }

      const data = await res.json() as any;
      const memories = Array.isArray(data) ? data : data.results || [];

      if (memories.length === 0) {
        Logger.tool("search_user_memory", query, "DONE", "No results");
        return "No relevant memories found for this query.";
      }

      const results = memories
        .map((m: any, i: number) => `${i + 1}. ${m.memory || m.content || ""}`)
        .join("\n");
      
      Logger.tool("search_user_memory", query, "DONE", `Found ${memories.length} results`);
      return `[Search Results for "${query}"]:\n${results}`;
    } catch (e: any) {
      Logger.tool("search_user_memory", query, "ERROR", e.message);
      return "Could not search memories (service temporarily unavailable).";
    }
  },
  {
    name: "search_user_memory",
    description:
      "Search through a user's memories using natural language. More powerful than get_user_profile - use this when you need to find specific information like 'What issues did this user report?' or 'What are their preferences?'",
    schema: z.object({
      userId: z.string().describe("The Telegram user ID."),
      query: z
        .string()
        .describe(
          "Natural language search query. Examples: 'What bugs did they report?', 'What language do they prefer?', 'What are their technical skills?'"
        ),
      category: z
        .enum(["personal", "preferences", "issues", "technical", "feedback"])
        .optional()
        .describe("Optional: Filter results by category to narrow down search."),
    }),
  }
);

// --- Tool 4: Search Recent Memories (Date-based filtering) ---
export const searchRecentMemories = tool(
  async ({ userId, query, daysBack, category }) => {
    Logger.tool("search_recent_memories", query, "START", `userId: ${userId}, days: ${daysBack}`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Calculate date threshold
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysBack);
      const dateStr = dateThreshold.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Build filters with date range
      const filters: any = {
        AND: [
          { user_id: userId },
          { created_at: { gte: dateStr } }
        ],
      };
      
      // Add category filter if specified
      if (category) {
        filters.AND.push({ "metadata.category": category });
      }
      
      const res = await fetch(`${MEM0_BASE}/memories/search/`, {
        method: "POST",
        headers: mem0Headers(),
        body: JSON.stringify({
          query,
          filters,
          top_k: 5,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        Logger.tool("search_recent_memories", query, "ERROR", `HTTP ${res.status}`);
        return `No recent memories found in the last ${daysBack} days.`;
      }

      const data = await res.json() as any;
      const memories = Array.isArray(data) ? data : data.results || [];

      if (memories.length === 0) {
        Logger.tool("search_recent_memories", query, "DONE", "No recent results");
        return `No recent memories found in the last ${daysBack} days.`;
      }

      const results = memories
        .map((m: any, i: number) => `${i + 1}. ${m.memory || m.content || ""}`)
        .join("\n");
      
      Logger.tool("search_recent_memories", query, "DONE", `Found ${memories.length} recent results`);
      return `[Recent Memories (last ${daysBack} days)]:\n${results}`;
    } catch (e: any) {
      Logger.tool("search_recent_memories", query, "ERROR", e.message);
      return "Could not search recent memories (service temporarily unavailable).";
    }
  },
  {
    name: "search_recent_memories",
    description:
      "Search through RECENT user memories with date filtering. Use this to find what happened recently (e.g., 'issues reported in last 7 days', 'recent feedback'). Helps avoid pulling old irrelevant information.",
    schema: z.object({
      userId: z.string().describe("The Telegram user ID."),
      query: z
        .string()
        .describe(
          "Natural language search query. Examples: 'recent bugs', 'latest feedback', 'new issues'"
        ),
      daysBack: z
        .number()
        .default(7)
        .describe("How many days back to search. Default: 7 days. Use 30 for monthly, 90 for quarterly."),
      category: z
        .enum(["personal", "preferences", "issues", "technical", "feedback"])
        .optional()
        .describe("Optional: Filter by category."),
    }),
  }
);

// --- Tool 5: Delete Irrelevant Memory ---
export const deleteMemory = tool(
  async ({ memoryId, reason }) => {
    Logger.tool("delete_memory", memoryId, "START", `reason: ${reason}`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(`${MEM0_BASE}/memories/${memoryId}/`, {
        method: "DELETE",
        headers: mem0Headers(),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        Logger.tool("delete_memory", memoryId, "ERROR", `HTTP ${res.status}`);
        return "Failed to delete memory.";
      }

      Logger.tool("delete_memory", memoryId, "DONE", reason);
      return `Successfully deleted irrelevant memory (reason: ${reason}).`;
    } catch (e: any) {
      Logger.tool("delete_memory", memoryId, "ERROR", e.message);
      return "Could not delete memory (service temporarily unavailable).";
    }
  },
  {
    name: "delete_memory",
    description:
      "Delete an irrelevant or outdated memory. Use this when you encounter memories that are: no longer accurate, duplicate information, resolved issues that keep appearing, or completely irrelevant to current support needs.",
    schema: z.object({
      memoryId: z.string().describe("The ID of the memory to delete (found in search results)."),
      reason: z
        .string()
        .describe(
          "Why this memory is being deleted. Examples: 'Duplicate entry', 'Issue was resolved', 'Outdated information', 'Not relevant to support'"
        ),
    }),
  }
);

// --- Tool 6: Get All Memories with Filtering ---
export const getAllMemories = tool(
  async ({ userId, category, daysBack }) => {
    Logger.tool("get_all_memories", userId, "START", `category: ${category || "all"}, days: ${daysBack || "all"}`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Build filters
      const filters: any = {
        AND: [{ user_id: userId }],
      };
      
      // Add category filter
      if (category) {
        filters.AND.push({ "metadata.category": category });
      }
      
      // Add date filter
      if (daysBack) {
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - daysBack);
        const dateStr = dateThreshold.toISOString().split('T')[0];
        filters.AND.push({ created_at: { gte: dateStr } });
      }
      
      const res = await fetch(`${MEM0_BASE}/memories/`, {
        method: "POST",
        headers: mem0Headers(),
        body: JSON.stringify({
          filters,
          page: 1,
          page_size: 50,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        Logger.tool("get_all_memories", userId, "ERROR", `HTTP ${res.status}`);
        return "No memories found.";
      }

      const data = await res.json() as any;
      const memories = Array.isArray(data) ? data : data.results || [];

      if (memories.length === 0) {
        Logger.tool("get_all_memories", userId, "DONE", "No memories found");
        return "No memories found with the specified filters.";
      }

      // Group by category for better organization
      const grouped: any = {};
      memories.forEach((m: any) => {
        const cat = m.metadata?.category || "uncategorized";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({
          id: m.id,
          content: m.memory || m.content || "",
          created: m.created_at,
        });
      });

      let result = `[All Memories for ${userId}]:\n\n`;
      for (const [cat, items] of Object.entries(grouped)) {
        result += `📁 ${cat.toUpperCase()}:\n`;
        (items as any[]).forEach((item, i) => {
          result += `  ${i + 1}. ${item.content} (ID: ${item.id})\n`;
        });
        result += "\n";
      }
      
      Logger.tool("get_all_memories", userId, "DONE", `Found ${memories.length} memories`);
      return result;
    } catch (e: any) {
      Logger.tool("get_all_memories", userId, "ERROR", e.message);
      return "Could not retrieve memories (service temporarily unavailable).";
    }
  },
  {
    name: "get_all_memories",
    description:
      "Get ALL memories for a user with optional filtering by category and date. Use this to review and clean up a user's memory profile. Returns memory IDs so you can delete irrelevant ones.",
    schema: z.object({
      userId: z.string().describe("The Telegram user ID."),
      category: z
        .enum(["personal", "preferences", "issues", "technical", "feedback"])
        .optional()
        .describe("Optional: Filter by specific category."),
      daysBack: z
        .number()
        .optional()
        .describe("Optional: Only show memories from last N days."),
    }),
  }
);
