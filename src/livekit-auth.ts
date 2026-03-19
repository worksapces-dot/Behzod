import { createHmac, randomUUID } from "crypto";

function toBase64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signHS256(input: string, secret: string): string {
  return toBase64Url(createHmac("sha256", secret).update(input).digest());
}

export function issueLiveKitAccessToken(options: {
  identity: string;
  name?: string;
  room: string;
  ttlSeconds?: number;
}) {
  const apiKey = process.env.LIVEKIT_API_KEY || "";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "";

  if (!apiKey || !apiSecret) {
    throw new Error("LIVEKIT_API_KEY/LIVEKIT_API_SECRET not configured");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const ttlSeconds = Math.max(60, options.ttlSeconds ?? 60 * 60);
  const expSeconds = nowSeconds + ttlSeconds;

  const header = { alg: "HS256", typ: "JWT" };
  const payload: any = {
    iss: apiKey,
    sub: options.identity,
    name: options.name ?? options.identity,
    nbf: nowSeconds,
    exp: expSeconds,
    jti: randomUUID(),
    video: {
      roomJoin: true,
      room: options.room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = signHS256(signingInput, apiSecret);

  return {
    token: `${signingInput}.${signature}`,
    expiresAt: expSeconds * 1000,
  };
}

