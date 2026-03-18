import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Logger } from "./logger";

/**
 * Trello Integration — Behzod Smart Clustering v2
 */

const TRELLO_API_KEY = process.env.TRELLO_API_KEY || "";
const TRELLO_TOKEN = process.env.TRELLO_TOKEN || "";
const TRELLO_LIST_ID = process.env.TRELLO_LIST_ID || "";

// --- Helper Functions ---

/**
 * Simple similarity checker to detect duplicate issues
 */
function isSimilar(query: string, target: string): boolean {
  const q = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const t = target.toLowerCase();
  const matches = q.filter(word => t.includes(word));
  return matches.length / q.length > 0.6; // 60% keyword overlap
}

/**
 * Fetch all cards in the configured list
 */
async function getExistingCards() {
  const url = `https://api.trello.com/1/lists/${TRELLO_LIST_ID}/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}&fields=name,desc,shortUrl,idList`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return await res.json() as any[];
}

/**
 * Add a "Another report" comment to a card
 */
async function addCommentToCard(cardId: string, text: string) {
  const url = `https://api.trello.com/1/cards/${cardId}/actions/comments?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: `➕ [NEW REPORT]: ${text}` }),
  });
}

// --- Tools ---

export const createTrelloCard = tool(
  async ({ name, description, userId }) => {
    Logger.tool("trello_sync", name, "START");

    if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_LIST_ID) {
      return "Trello not configured properly.";
    }

    try {
      // 1. SMART CLUSTERING: Check for duplicates
      const existing = await getExistingCards();
      const duplicate = existing.find(c => isSimilar(name, c.name));

      if (duplicate) {
        Logger.tool("trello_sync", name, "DONE", `Duplicate clustered to: ${duplicate.shortUrl}`);
        
        // Update Reporters tag in description
        let newDesc = duplicate.desc;
        const reportersTag = /\[REPORTERS: ([\d,\s]+)\]/;
        const match = newDesc.match(reportersTag);
        
        if (match && userId) {
          const IDs = match[1].split(",").map((id: string) => id.trim());
          if (!IDs.includes(userId)) {
            newDesc = newDesc.replace(reportersTag, `[REPORTERS: ${match[1]}, ${userId}]`);
            // Update the card description in Trello
            await fetch(`https://api.trello.com/1/cards/${duplicate.id}?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`, {
               method: "PUT",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ desc: newDesc })
            });
          }
        }

        await addCommentToCard(duplicate.id, description);
        return `I found a matching issue already in our system! I've added your report to the existing card so the engineers see the priority increase.\nCard: ${duplicate.shortUrl}`;
      }

      // 2. CREATE NEW CARD: If no duplicate found
      const url = `https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`;
      const finalDesc = `${description}\n\n[REPORTERS: ${userId || "unknown"}]`;
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idList: TRELLO_LIST_ID,
          name: name,
          desc: finalDesc,
          pos: "top",
        }),
      });

      const data = await res.json() as any;
      if (!res.ok) throw new Error(data?.message || "Trello Error");

      Logger.tool("trello_sync", name, "DONE", `New unique issue recorded: ${data.shortUrl}`);
      return `New issue recorded successfully!\nURL: ${data.shortUrl}`;
    } catch (e: any) {
      Logger.tool("trello_sync", name, "ERROR", e.message);
      return `Error: ${e.message}`;
    }
  },
  {
    name: "create_trello_card",
    description: "Create or cluster a Trello issue with detailed, structured information. IMPORTANT: Only call this after gathering complete details about the issue (what, where, when, error message, expected behavior, user goal). The description should be comprehensive and well-formatted.",
    schema: z.object({
      name: z.string().describe("Concise title in English (e.g., 'Login button not working on admin panel')"),
      description: z.string().describe("Detailed structured description with sections: Problem, Location, Timing, Error, Expected Result, User Goal, and Reporter Info. Use the template format with emojis and clear sections."),
      userId: z.string().optional().describe("The Telegram user ID of the reporter")
    }),
  }
);

/**
 * Check the status of an issue
 */
export const getIssueStatus = tool(
  async ({ query }) => {
    Logger.tool("get_issue_status", query, "START");
    try {
      const cards = await getExistingCards();
      const found = cards.find(c => isSimilar(query, c.name) || c.desc.includes(query));

      if (!found) return "I couldn't find a matching issue in the active list.";

      // Fetch list name (To see if it's in 'Doing', 'Done', etc)
      const listUrl = `https://api.trello.com/1/lists/${found.idList}?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`;
      const listRes = await fetch(listUrl);
      const listData = await listRes.json() as any;

      const status = listData.name || "Unknown";
      Logger.tool("get_issue_status", query, "DONE", `Status: ${status}`);
      return `Found issue: "${found.name}"\nStatus: [${status.toUpperCase()}]\nURL: ${found.shortUrl}`;
    } catch (e: any) {
      return `Error: ${e.message}`;
    }
  },
  {
    name: "get_issue_status",
    description: "Check the progress of a previously reported issue by searching for keywords or card titles.",
    schema: z.object({
      query: z.string().describe("The issue title or key details to search for"),
    }),
  }
);
