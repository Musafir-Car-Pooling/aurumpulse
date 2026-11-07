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

type OrderRow = { id: string; market: string; direction: string; lot: number; signal: unknown };
export function pollLine(o: OrderRow, withLevels: boolean) {
  const base = `${o.id}|${o.market}|${o.direction}|${o.lot}`;
  if (!withLevels) return base;
  const s = (o.signal ?? {}) as { stopLoss?: unknown; tp1?: unknown; tp2?: unknown };
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return `${base}|${n(s.stopLoss)}|${n(s.tp1)}|${n(s.tp2)}`;
}

export function isStale(createdAt: string, now = Date.now()) {
  return now - new Date(createdAt).getTime() > ORDER_MAX_AGE_MS;
}
