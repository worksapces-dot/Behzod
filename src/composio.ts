import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Logger } from "./logger";

/**
 * Direct Trello Card Creation Tool
 * 
 * Uses the Trello REST API directly (no Composio middleware).
 * This is the most reliable way to create cards.
 * 
 * Requires TRELLO_API_KEY, TRELLO_TOKEN, and TRELLO_LIST_ID in .env
 */

const TRELLO_API_KEY = process.env.TRELLO_API_KEY || "";
const TRELLO_TOKEN = process.env.TRELLO_TOKEN || "";
const TRELLO_LIST_ID = process.env.TRELLO_LIST_ID || "";

export const createTrelloCard = tool(
  async ({ name, description }) => {
    Logger.tool("create_trello_card", name, "START");

    if (!TRELLO_API_KEY || !TRELLO_TOKEN) {
      Logger.tool("create_trello_card", name, "ERROR", "Missing TRELLO_API_KEY or TRELLO_TOKEN");
      return "Error: Trello API credentials are not configured.";
    }

    if (!TRELLO_LIST_ID) {
      Logger.tool("create_trello_card", name, "ERROR", "Missing TRELLO_LIST_ID");
      return "Error: Trello list ID is not configured.";
    }

    try {
      const url = `https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`;
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idList: TRELLO_LIST_ID,
          name: name,
          desc: description,
          pos: "top",
        }),
      });

      const data = await res.json() as any;

      if (!res.ok) {
        const errMsg = data?.message || JSON.stringify(data);
        Logger.tool("create_trello_card", name, "ERROR", `${res.status}: ${errMsg}`);
        return `Failed to create Trello card: ${errMsg}`;
      }

      const cardUrl = data.shortUrl || data.url || "";
      Logger.tool("create_trello_card", name, "DONE", `Card created: ${cardUrl}`);
      return `Trello card created successfully!\nTitle: "${data.name}"\nURL: ${cardUrl}`;
    } catch (e: any) {
      Logger.tool("create_trello_card", name, "ERROR", e.message);
      return `Error creating Trello card: ${e.message}`;
    }
  },
  {
    name: "create_trello_card",
    description: "Create a new Trello card in the Issue list to track a bug or user-reported problem. Use this after gathering issue details and getting user confirmation.",
    schema: z.object({
      name: z.string().describe("A clear, concise title for the issue card"),
      description: z.string().describe("Full issue details: user info, device, description, severity, steps to reproduce"),
    }),
  }
);
