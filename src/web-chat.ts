/**
 * Web Chat Handler — Behzod v2
 * Handles chat widget messages via HTTP/WebSocket
 */

import { createBehzodAgent } from "./agents/behzod";
import { Logger } from "./logger";
import { HumanMessage } from "@langchain/core/messages";

interface WebSession {
  userId: string;
  threadId: string;
  lastActivityAt: Date;
}

const webSessions = new Map<string, WebSession>();
const SESSION_TTL_MINUTES = 30;

/**
 * Get or create web session
 */
export function getWebSession(userId: string): { threadId: string } {
  const now = new Date();
  let session = webSessions.get(userId);

  if (session) {
    const minutesSinceLastActivity = (now.getTime() - session.lastActivityAt.getTime()) / 1000 / 60;
    
    if (minutesSinceLastActivity >= SESSION_TTL_MINUTES) {
      Logger.info(`Web session expired for ${userId}, creating new thread`);
      session = undefined;
    }
  }

  if (!session) {
    session = {
      userId,
      threadId: `web_${userId}_${Date.now()}`,
      lastActivityAt: now,
    };
    webSessions.set(userId, session);
    Logger.info(`New web session created: ${session.threadId}`);
  } else {
    session.lastActivityAt = now;
  }

  return { threadId: session.threadId };
}

/**
 * Handle incoming web chat message
 */
export async function handleWebMessage(userId: string, message: string): Promise<string> {
  try {
    Logger.info(`Web message from ${userId}: ${message}`);
    
    const { threadId } = getWebSession(userId);
    const agent = await createBehzodAgent();

    // Prefix userId with 'web_' to separate from Telegram users
    const webUserId = `web_${userId}`;
    
    const result = await agent.invoke(
      { messages: [new HumanMessage(`[Web User ${webUserId}] ${message}`)] },
      { configurable: { thread_id: threadId } }
    );

    const lastMessage = result.messages[result.messages.length - 1];
    const response = typeof lastMessage.content === "string" 
      ? lastMessage.content 
      : JSON.stringify(lastMessage.content);

    Logger.info(`Web response to ${userId}: ${response.substring(0, 100)}...`);
    return response;

  } catch (error: any) {
    Logger.error(`Web chat error for ${userId}: ${error.message}`);
    return "Kechirasiz, xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring. / Извините, произошла ошибка. Пожалуйста, попробуйте снова.";
  }
}

/**
 * Get session history (for widget to show previous messages)
 */
export async function getSessionHistory(userId: string): Promise<any[]> {
  try {
    const session = webSessions.get(userId);
    if (!session) return [];

    const agent = await createBehzodAgent();
    const state = await agent.getState({ configurable: { thread_id: session.threadId } });
    
    return state.values.messages || [];
  } catch (error: any) {
    Logger.error(`Failed to get session history: ${error.message}`);
    return [];
  }
}
