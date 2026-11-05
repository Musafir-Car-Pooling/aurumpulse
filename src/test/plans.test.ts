import { describe, expect, it } from "vitest";
import { accessState, extendPremium, PLANS, TRIAL_DAYS } from "@/lib/plans";
const now = Date.parse("2026-11-06T00:00:00Z");
describe("premium packages", () => {
  it("trial lasts 3 days", () => expect(TRIAL_DAYS).toBe(3));
  it("prices are daily $1, weekly $5, monthly $15", () => {
    expect([PLANS.daily.price, PLANS.weekly.price, PLANS.monthly.price]).toEqual([1, 5, 15]);
  });
  it("active trial grants access", () => expect(accessState({ trial_ends_at: "2026-11-07T00:00:00Z", premium_until: null, plan: null }, now).kind).toBe("trial"));
  it("expired trial without premium locks signals", () => expect(accessState({ trial_ends_at: "2026-11-05T00:00:00Z", premium_until: null, plan: null }, now).kind).toBe("expired"));
  it("premium extends from remaining time", () => expect(extendPremium("2026-11-08T00:00:00Z", "weekly", now).toISOString()).toBe("2026-11-15T00:00:00.000Z"));
});
