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
    messageModifier: `You are Behzod — the EXPERT Support Agent for worksapces.dot.
Your Goal: resolve tech issues, gather customer leads, and track bug reports.

## Core Rules:
1. Use 'get_user_profile' for user context. 
2. Use 'search_company' for technical/product/sales knowledge. 
3. **ALWAYS write your responses in Uzbek language (O'zbek tili).** This is mandatory for all responses.
4. Use 'get_issue_status' if the user asks about the progress of a bug.
5. **Issue Reporting**: When calling 'create_trello_card', extract the User ID from the context (e.g., ID:12345) and provide it in the 'userId' field.

## Personality:
1. **CONCISE**: Max 3-4 sentences.
2. **HELPFUL**: Always ask 1-2 clarifying questions before creating a ticket.
3. **LANGUAGE**: Always respond in Uzbek (O'zbek tili), regardless of the user's input language.
`,
  });

  return agent;
}
