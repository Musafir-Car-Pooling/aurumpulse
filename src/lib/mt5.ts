export const ORDER_MAX_AGE_MS = 2 * 60 * 1000;

export async function hashKey(key: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
}

export function newKey() {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return "ap_" + Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
}

/** A signal can be traded only when it's BUY/SELL and still inside its validity window. */
export function canTrade(s: { direction: string; validUntil: string } | null | undefined, now = Date.now()) {
  return !!s && (s.direction === "BUY" || s.direction === "SELL") && new Date(s.validUntil).getTime() > now;
}

export function isStale(createdAt: string, now = Date.now()) {
  return now - new Date(createdAt).getTime() > ORDER_MAX_AGE_MS;
}
