/**
 * Session Manager — Behzod v2
 * 
 * Each user in a group chat gets their own session (chatId_userId).
 * A session is "Activated" when the user mentions "Behzod".
 * After activation, the AI continues the lead for ACTIVE_TTL_SECONDS.
 * A session is "Closed" if inactive for SESSION_TTL_MINUTES.
 */

import { Logger } from "./logger";
import { SESSION_CONFIG } from "./constants";

const SESSION_TTL_MINUTES = SESSION_CONFIG.TTL_MINUTES;
const ACTIVE_TTL_SECONDS = SESSION_CONFIG.ACTIVE_TTL_SECONDS;

interface Session {
  threadId: string;
  lastActivityAt: Date;
  lastActivatedAt: Date | null;
  isActive: boolean; // Whether the bot is currently responding without mention
}

const sessions = new Map<string, Session>();

function generateThreadId(key: string): string {
  return `behzod_${key}_${Date.now()}`;
}

/**
 * Returns the threadId for the session and whether Behzod should respond.
 */
export function getSession(chatId: string, userId: string, isTriggered: boolean): { threadId: string; shouldRespond: boolean } {
  const key = `${chatId}_${userId}`;
  const now = new Date();
  
  let session = sessions.get(key);

  // 1. Initial check: New session or session expired?
  if (session) {
    const minutesSinceLastActivity = (now.getTime() - session.lastActivityAt.getTime()) / 1000 / 60;
    
    if (minutesSinceLastActivity >= SESSION_TTL_MINUTES) {
      Logger.session("NEW", key, "Session expired, creating new thread");
      session = undefined;
    }
  }

  if (!session) {
    session = {
      threadId: generateThreadId(key),
      lastActivityAt: now,
      lastActivatedAt: null,
      isActive: false,
    };
    sessions.set(key, session);
    Logger.session("NEW", key, session.threadId);
  }

  // 2. Determine activation logic
  let shouldRespond = false;

  // Activation check: Manually triggered (mentioned "Behzod" or DM)
  if (isTriggered) {
    session.isActive = true;
    session.lastActivatedAt = now;
    shouldRespond = true;
    Logger.session("CONTINUE", key, "Activated by trigger or DM");
  } 
  // Continuance check: Is it still within the ACTIVE_TTL?
  else if (session.isActive && session.lastActivatedAt) {
    const secondsSinceActivation = (now.getTime() - session.lastActivatedAt.getTime()) / 1000;
    
    if (secondsSinceActivation < ACTIVE_TTL_SECONDS) {
      shouldRespond = true;
      Logger.session("CONTINUE", key, `Active continuance (${Math.round(ACTIVE_TTL_SECONDS - secondsSinceActivation)}s left)`);
    } else {
      session.isActive = false;
      Logger.session("CONTINUE", key, "Deactivated (TTL timeout)");
    }
  }

  // 3. Update last activity
  session.lastActivityAt = now;
  if (shouldRespond) {
    session.lastActivatedAt = now; // Reset "last activated" on each response to keep it alive
  }

  return { threadId: session.threadId, shouldRespond };
}
