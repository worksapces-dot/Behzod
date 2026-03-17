import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { supermemory } from "../config";
import { Logger } from "../logger";

/**
 * Tool: search_company
 * 
 * Searches the company's Supermemory knowledge base (default space).
 * This includes product specs, FAQs, legal docs, support documents, etc.
 */
export const searchCompany = tool(
  async ({ query }) => {
    Logger.tool("search_company", query, "START");
    try {
      const response = await (supermemory as any).search.memories({
        q: query,
        searchMode: "hybrid",
        threshold: 0.1,
        limit: 10,
      });

      if (!response.results || response.results.length === 0) {
        Logger.tool("search_company", query, "DONE", "No results found");
        return "No relevant company information found for this query.";
      }

      const results = response.results.map((res: any) => {
        const content =
          typeof res.memory === "string"
            ? res.memory
            : res.memory?.content || res.chunk?.content || "";
        return `[Company Knowledge]: ${content}`;
      });

      Logger.tool("search_company", query, "DONE", `Found ${results.length} results`);
      return results.join("\n---\n");
    } catch (e: any) {
      Logger.tool("search_company", query, "ERROR", e.message);
      return "Error retrieving company knowledge. Please try again.";
    }
  },
  {
    name: "search_company",
    description:
      "Search the company knowledge base for technical specs, FAQs, legal info, product details, and support documents. Use this for any question about the company or its products.",
    schema: z.object({
      query: z.string().describe("The question or topic to search for."),
    }),
  }
);
