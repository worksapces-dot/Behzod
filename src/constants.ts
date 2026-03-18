/**
 * Application Constants
 * Centralized configuration for easy tuning
 */

export const SESSION_CONFIG = {
  // How long a session stays alive without activity (minutes)
  TTL_MINUTES: 30,
  
  // How long bot stays "active" after being triggered (seconds)
  ACTIVE_TTL_SECONDS: 120,
  
  // Maximum number of processed updates to track
  MAX_TRACKED_UPDATES: 1000,
};

export const TRELLO_CONFIG = {
  // Similarity threshold for duplicate detection (0.0 - 1.0)
  SIMILARITY_THRESHOLD: 0.6,
  
  // Maximum cards to fetch at once
  MAX_CARDS_FETCH: 100,
};

export const BOT_CONFIG = {
  // Trigger words for Behzod
  TRIGGERS: ["behzod", "begi"],
  
  // Port for web server
  PORT: 3000,
};

export const LOGGER_CONFIG = {
  // Maximum log entries to keep in memory
  MAX_HISTORY: 100,
};
