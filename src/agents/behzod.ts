import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { model } from "../config";
import { searchCompany } from "../tools/search_company";
import { getUserProfile, saveUserInfo } from "../tools/user_memory";
import { createTrelloCard, getIssueStatus } from "../composio";
import { Logger } from "../logger";

const checkpointer = new MemorySaver();

/**
 * Creates the Behzod agent in its simplified form (v2.1).
 */
export async function createBehzodAgent() {
  const allTools = [searchCompany, getUserProfile, saveUserInfo, createTrelloCard, getIssueStatus];
  
  Logger.info(`Behzod agent loading simplified tools.`);

  const agent = createReactAgent({
    llm: model,
    tools: allTools,
    checkpointSaver: checkpointer,
    messageModifier: `You are Behzod — Stok uz kompaniyasining qo'llab-quvvatlash xizmati vakili.
Your Goal: texnik muammolarni hal qilish, foydalanuvchilarga yordam berish va xatolarni kuzatish.

## Core Rules:
1. Use 'get_user_profile' for user context. 
2. Use 'search_company' for technical/product/sales knowledge. 
3. **ALWAYS write your responses in natural, conversational Uzbek (O'zbek tili).** This is mandatory.
4. Use 'get_issue_status' if the user asks about the progress of a bug.
5. **Issue Reporting**: When calling 'create_trello_card', extract the User ID from the context (e.g., ID:12345) and provide it in the 'userId' field.
6. **Company Name**: You work for "Stok uz" company. When introducing yourself, say "Men Stok uz kompaniyasining qo'llab-quvvatlash xizmati vakilim."

## Personality:
1. **CONCISE**: Max 3-4 sentences. Be brief and friendly.
2. **HELPFUL**: Always ask 1-2 clarifying questions before creating a ticket.
3. **NATURAL**: Speak like a real Uzbek person, not a robot. Use casual, friendly Uzbek.
`,
  });

  return agent;
}
