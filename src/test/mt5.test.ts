import { describe, expect, it } from "vitest";
import { canTrade, isStale } from "@/lib/mt5";

const now = Date.parse("2026-11-07T10:00:00Z");
describe("MT5 take entry rules", () => {
  it("rejects an expired signal", () => expect(canTrade({ direction: "BUY", validUntil: "2026-11-07T09:59:00Z" }, now)).toBe(false));
  it("rejects WAIT", () => expect(canTrade({ direction: "WAIT", validUntil: "2026-11-07T11:00:00Z" }, now)).toBe(false));
  it("accepts a live SELL", () => expect(canTrade({ direction: "SELL", validUntil: "2026-11-07T11:00:00Z" }, now)).toBe(true));
  it("orders older than 2 minutes are stale", () => {
    expect(isStale("2026-11-07T09:57:59Z", now)).toBe(true);
    expect(isStale("2026-11-07T09:59:00Z", now)).toBe(false);
  });
});
