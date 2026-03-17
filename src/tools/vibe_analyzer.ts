import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { supermemory } from "../config";
import { Logger } from "../logger";

/**
 * Tool: analyze_vibe
 * 
 * Analyzes group chat logs stored in Supermemory to identify patterns,
 * annoying behaviors, or helpful contributors.
 */
export const analyzeVibe = tool(
  async ({ chatId }) => {
    Logger.tool("analyze_vibe", `ChatID: ${chatId}`, "START");
    try {
      const response = await (supermemory as any).search.memories({
        q: "user behavior patterns, annoying people, drama, helpful people, group vibe",
        containerTag: `insights_${chatId}`,
        limit: 30
      });

      if (!response.results || response.results.length === 0) {
          Logger.tool("analyze_vibe", chatId, "DONE", "No vibe data found");
          return "I can't feel the vibe right now. The logs are empty.";
      }

      const logs = response.results.map((res: any) => 
        res.memory?.content || res.memory || ""
      ).join("\n");

      Logger.tool("analyze_vibe", chatId, "DONE", `Analyzed ${response.results.length} log entries`);
      return logs;
    } catch (e: any) {
      Logger.tool("analyze_vibe", chatId, "ERROR", e.message);
      return "I can't feel the vibe right now. My psychological insight is clouded.";
    }
  },
  { 
    name: "analyze_vibe", 
    description: "Analyze the group logs to find annoying behavior, psychological patterns, and overall atmosphere.", 
    schema: z.object({ 
        chatId: z.string().describe("The Telegram Chat ID to analyze.") 
    }) 
  }
);
