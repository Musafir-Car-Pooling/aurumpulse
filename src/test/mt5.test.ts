import { describe, expect, it } from "vitest";
import { canTrade, isStale, pollLine } from "@/lib/mt5";

const now = Date.parse("2026-11-07T10:00:00Z");
describe("MT5 take entry rules", () => {
  it("rejects an expired signal", () => expect(canTrade({ direction: "BUY", validUntil: "2026-11-07T09:59:00Z" }, now)).toBe(false));
  it("rejects WAIT", () => expect(canTrade({ direction: "WAIT", validUntil: "2026-11-07T11:00:00Z" }, now)).toBe(false));
  it("accepts a live SELL", () => expect(canTrade({ direction: "SELL", validUntil: "2026-11-07T11:00:00Z" }, now)).toBe(true));
  it("v2 poll line carries SL, TP1, TP2; v1 stays 4 fields", () => {
    const o = { id: "x", market: "XAUUSD", direction: "BUY", lot: 0.02, signal: { stopLoss: 2300.5, tp1: 2310, tp2: 2320 } };
    expect(pollLine(o, true)).toBe("x|XAUUSD|BUY|0.02|2300.5|2310|2320");
    expect(pollLine(o, false).split("|")).toHaveLength(4);
  });
  it("orders older than 2 minutes are stale", () => {
    expect(isStale("2026-11-07T09:57:59Z", now)).toBe(true);
    expect(isStale("2026-11-07T09:59:00Z", now)).toBe(false);
  });
});
