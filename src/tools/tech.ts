import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { supermemory } from "../config";

export const searchMemory = tool(
  async ({ query }) => {
    try {
      const response = await (supermemory as any).search.memories({ q: query, searchMode: "hybrid", threshold: 0.1, limit: 10 });
      if (!response.results || response.results.length === 0) return "No specific data found in memory.";
      
      return response.results.map((res: any) => {
        let content = typeof res.memory === 'string' ? res.memory : res.memory?.content || res.chunk?.content || "";
        return `[Data Found]: ${content}`;
      }).join("\n---\n");
    } catch (e) { return "Error searching knowledge base."; }
  },
  {
    name: "search_memory",
    description: "Search technical specs and support documents.",
    schema: z.object({ query: z.string().describe("Technical query.") }),
  }
);
