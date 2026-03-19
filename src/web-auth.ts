import { createHmac, randomUUID, timingSafeEqual } from "crypto";

const WEB_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const WEB_SESSION_SECRET = process.env.WEB_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || "";

interface WebSessionClaims {
  userId: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

function toBase64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function signPayload(payload: string): string {
  return toBase64Url(createHmac("sha256", WEB_SESSION_SECRET).update(payload).digest());
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function issueWebSessionToken(userId = `web_${randomUUID()}`) {
  const now = Date.now();
  const claims: WebSessionClaims = {
    userId,
    issuedAt: now,
    expiresAt: now + WEB_SESSION_TTL_MS,
    nonce: randomUUID(),
  };

  const payload = toBase64Url(JSON.stringify(claims));
  const signature = signPayload(payload);

  return {
    sessionToken: `${payload}.${signature}`,
    userId: claims.userId,
    expiresAt: claims.expiresAt,
  };
}

export function verifyWebSessionToken(sessionToken?: string | null): WebSessionClaims | null {
  if (!sessionToken) {
    return null;
  }

  const [payload, signature, ...rest] = sessionToken.split(".");
  if (!payload || !signature || rest.length > 0) {
    return null;
  }

  const expectedSignature = signPayload(payload);
  if (!safeCompare(signature, expectedSignature)) {
    return null;
  }

  try {
    const claims = JSON.parse(fromBase64Url(payload)) as WebSessionClaims;

    if (
      !claims ||
      typeof claims.userId !== "string" ||
      !claims.userId.startsWith("web_") ||
      typeof claims.expiresAt !== "number" ||
      claims.expiresAt < Date.now()
    ) {
      return null;
    }

    return claims;
  } catch {
    return null;
  }
}

export function getOrCreateWebSessionToken(existingToken?: string | null) {
  const claims = verifyWebSessionToken(existingToken);

  if (claims && existingToken) {
    return {
      sessionToken: existingToken,
      userId: claims.userId,
      expiresAt: claims.expiresAt,
    };
  }

  return issueWebSessionToken();
}
