import Crisp from "crisp-api";
import { supermemory } from "../config";
import { Logger } from "../logger";
import "dotenv/config";

// --- Configuration ---
const CRISP_IDENTIFIER = process.env.CRISP_IDENTIFIER || "";
const CRISP_KEY = process.env.CRISP_KEY || "";
const WEBSITE_ID = process.env.CRISP_WEBSITE_ID || "";

if (!CRISP_IDENTIFIER || !CRISP_KEY || !WEBSITE_ID) {
  console.error("❌ Missing Crisp credentials in .env");
  process.exit(1);
}

const crispClient = new Crisp();
crispClient.setTier("plugin");
crispClient.authenticate(CRISP_IDENTIFIER, CRISP_KEY);

/**
 * Helper to prevent rate limits
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * ABSOLUTE ALL EXPORT
 * Scans every page until 0 conversations are left.
 */
async function exportEverythingToAI() {
  const START_PAGE = 13; // 🚀 STARTING FROM CONVERSATION 245+ (OLDER HISTORY)
  Logger.info(`🚀 Resuming Crisp knowledge sync from PAGE ${START_PAGE}...`);
  
  let totalUploaded = 0;
  let page = START_PAGE;

  try {
    while (true) {
      Logger.info(`📦 Fetching page ${page}...`);
      let conversations: any[] = [];
      
      try {
        conversations = await crispClient.website.listConversations(WEBSITE_ID, page);
      } catch (pageErr: any) {
        if (pageErr.message.includes("rate_limited")) {
          Logger.info("🛑 HIT RATE LIMIT. Waiting 30s...");
          await sleep(30000);
          continue; 
        }
        throw pageErr;
      }
      
      if (!conversations || conversations.length === 0) {
        Logger.info("✅ No more conversations found on Crisp history.");
        break;
      }

      for (const conv of conversations) {
        const sessionId = conv.session_id;
        
        // Moderate sync speed for the new key
        await sleep(200);

        try {
          // Fetch all messages in this conversation
          const messages = await crispClient.website.getMessagesInConversation(WEBSITE_ID, sessionId, Date.now());
          
          const textMessages = messages?.filter((m: any) => m.type === "text" && m.content) || [];
          if (textMessages.length < 2) continue; 

          const userEmail = conv.meta?.email || "Anonymous";
          const nickname = conv.meta?.nickname || "User";
          const subject = conv.meta?.subject || "No Subject";
          const status = (conv as any).status === 1 ? "RESOLVED" : "ONGOING/OPEN";
          const createdAt = new Date((conv as any).created_at || Date.now()).toLocaleString();
          
          const dialogue = textMessages
            .map((m: any) => {
              const role = m.from === "operator" ? "SUPPORT_AGENT" : "CUSTOMER";
              const content = typeof m.content === "string" ? m.content : m.content?.text || "";
              return `[${role}]: ${content}`;
            })
            .join("\n");

          if (dialogue.length < 20) continue; 

          const structuredDoc = `
# Support Case: ${subject}
**Date**: ${createdAt}
**Status**: ${status}
**Customer**: ${nickname} (${userEmail})
**Session ID**: ${sessionId}

## Conversation History:
${dialogue}

---
*KNOWLEDGE SOURCE: CRISP CUSTOMER SUPPORT LOGS*
`.trim();

          // Upload to Supermemory
          await (supermemory as any).documents.add({
            content: structuredDoc,
          });
          totalUploaded++;
          Logger.info(`[Page ${page}] ✅ Synchronized: ${sessionId}`);
        } catch (msgErr: any) {
          if (msgErr.message.includes("rate_limited")) {
            Logger.info("🛑 HIT RATE LIMIT. Waiting 60 seconds...");
            await sleep(60000);
            // We could retry here, but let's keep it simple and just log
            Logger.error(`Skipping ${sessionId} due to rate limit.`);
          } else {
            throw msgErr;
          }
        }
      }
      
      page++;
      Logger.info("⏳ Waiting 1s before next page...");
      await sleep(1000);
      if (page > 300) break; 
    }

    Logger.info(`🎊 RESUME SYNC COMPLETE!`);
    Logger.info(`Total additional conversations converted: ${totalUploaded}`);
  } catch (err: any) {
    Logger.error(`Fatal error in total export: ${err.message}`);
  }
}

exportEverythingToAI();
