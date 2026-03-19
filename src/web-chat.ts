/**
 * Web Chat Handler â€” Behzod v2
 * Handles chat widget messages via HTTP/WebSocket
 */

import { createBehzodAgent } from "./agents/behzod";
import { Logger } from "./logger";
import { HumanMessage } from "@langchain/core/messages";
import { sanitizeAgentReply } from "./reply-sanitizer";

interface WebSession {
  userId: string;
  threadId: string;
  lastActivityAt: Date;
}

const webSessions = new Map<string, WebSession>();
const SESSION_TTL_MINUTES = 30;

function normalizeWebUserId(userId: string): string {
  return userId.startsWith("web_") ? userId : `web_${userId}`;
}

/**
 * Get or create web session
 */
export function getWebSession(userId: string): { threadId: string } {
  const normalizedUserId = normalizeWebUserId(userId);
  const now = new Date();
  let session = webSessions.get(normalizedUserId);

  if (session) {
    const minutesSinceLastActivity = (now.getTime() - session.lastActivityAt.getTime()) / 1000 / 60;

    if (minutesSinceLastActivity >= SESSION_TTL_MINUTES) {
      Logger.info(`Web session expired for ${normalizedUserId}, creating new thread`);
      session = undefined;
    }
  }

  if (!session) {
    session = {
      userId: normalizedUserId,
      threadId: `behzod_${normalizedUserId}_${Date.now()}`,
      lastActivityAt: now,
    };
    webSessions.set(normalizedUserId, session);
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
  const normalizedUserId = normalizeWebUserId(userId);

  try {
    Logger.info(`Web message from ${normalizedUserId}: ${message}`);

    const { threadId } = getWebSession(normalizedUserId);
    const agent = await createBehzodAgent();

    const result = await agent.invoke(
      { messages: [new HumanMessage(`[Web User (ID:${normalizedUserId})] ${message}`)] },
      { configurable: { thread_id: threadId } }
    );

    const lastMessage = result.messages[result.messages.length - 1];
    const response =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    const safeResponse = sanitizeAgentReply(response);
    Logger.info(`Web response to ${normalizedUserId}: ${safeResponse.substring(0, 100)}...`);
    return safeResponse;
  } catch (error: any) {
    Logger.error(`Web chat error for ${normalizedUserId}: ${error.message}`);
    return "Kechirasiz, xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring. / Извините, произошла ошибка. Пожалуйста, попробуйте снова.";
  }
}

/**
 * Get session history (for widget to show previous messages)
 */
export async function getSessionHistory(userId: string): Promise<any[]> {
  try {
    const normalizedUserId = normalizeWebUserId(userId);
    const session = webSessions.get(normalizedUserId);
    if (!session) return [];

    const agent = await createBehzodAgent();
    const state = await agent.getState({ configurable: { thread_id: session.threadId } });

    return state.values.messages || [];
  } catch (error: any) {
    Logger.error(`Failed to get session history: ${error.message}`);
    return [];
  }
}
