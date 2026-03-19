const INTERNAL_TOOL_PATTERN =
  /\b(search_company|get_user_profile|save_user_info|search_user_memory|search_recent_memories|delete_memory|get_all_memories|save_agent_lesson|create_trello_card|get_issue_status|search_memory)\b/i;

const HARD_BLOCK_PATTERNS = [
  /##\s*Core Rules/i,
  /##\s*Issue Reporting Process/i,
  /##\s*Learned Lessons/i,
  /\[REPORTERS:[^\]]*\]/i,
  /\bmessageModifier\b/i,
  /\bcheckpoint[_ -]?id\b/i,
  INTERNAL_TOOL_PATTERN,
];

const SAFE_FALLBACK_REPLY =
  "Uzr, ichki tizim ma'lumotlarini ko'rsatmasligim kerak. Savolni qayta yozing. / Извините, я не должен показывать внутренние данные системы. Повторите вопрос.";

export function sanitizeAgentReply(text: string): string {
  if (!text) {
    return "";
  }

  let cleaned = String(text).trim();
  cleaned = cleaned.replace(/<function=[^>]*>\{[^}]*\}<\/function>/g, "").trim();
  cleaned = cleaned.replace(/<function=[^>]*>[^<]*(<\/function>)?/g, "").trim();
  cleaned = cleaned.replace(/\[User\s+@[^\]]+\]\s*/gi, "");
  cleaned = cleaned.replace(/\[Web User\s+\(ID:[^)]+\)\]\s*/gi, "");
  cleaned = cleaned.replace(/\b(?:Telegram|Web)\s+ID:\s*[A-Za-z0-9_-]+\b/gi, "");
  cleaned = cleaned.replace(/\bID:(?:telegram|web)_[A-Za-z0-9_-]+\b/gi, "");
  cleaned = cleaned.replace(/\[REPORTERS:[^\]]*\]/gi, "");
  cleaned = cleaned.replace(/\b(?:thread|checkpoint)[ _-]?id\s*:\s*[A-Za-z0-9_-]+\b/gi, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  if (!cleaned) {
    return "";
  }

  if (HARD_BLOCK_PATTERNS.some((pattern) => pattern.test(cleaned))) {
    return SAFE_FALLBACK_REPLY;
  }

  return cleaned;
}
