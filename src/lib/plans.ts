export const TRIAL_DAYS = 3;
export const PLANS = {
  daily: { label: "Daily", price: 1, days: 1 },
  weekly: { label: "Weekly", price: 5, days: 7 },
  monthly: { label: "Monthly", price: 15, days: 30 },
} as const;
export type PlanId = keyof typeof PLANS;
export const planIds = Object.keys(PLANS) as PlanId[];

// Where manual payments are sent. Replace the placeholder details with the owner's real accounts.
export const MANUAL_CHANNELS = [
  { id: "easypaisa", label: "Easypaisa", details: "Account details coming soon" },
  { id: "jazzcash", label: "JazzCash", details: "Account details coming soon" },
  { id: "bank", label: "Bank transfer", details: "Account details coming soon" },
  { id: "binance", label: "Binance Pay", details: "Pay ID coming soon" },
] as const;
export type ChannelId = (typeof MANUAL_CHANNELS)[number]["id"];

export type AccessRow = { trial_ends_at: string; premium_until: string | null; plan: string | null };
export type AccessState =
  | { kind: "premium"; until: string; plan: string | null }
  | { kind: "trial"; until: string }
  | { kind: "expired" };

export function accessState(row: AccessRow | null, now: number, isAdmin = false): AccessState {
  if (isAdmin) return { kind: "premium", until: "9999-12-31T00:00:00Z", plan: "admin" };
  if (!row) return { kind: "expired" };
  if (row.premium_until && new Date(row.premium_until).getTime() > now) return { kind: "premium", until: row.premium_until, plan: row.plan };
  if (new Date(row.trial_ends_at).getTime() > now) return { kind: "trial", until: row.trial_ends_at };
  return { kind: "expired" };
}

/** New premium end: extends from the later of now and any remaining premium time. */
export function extendPremium(currentUntil: string | null, plan: PlanId, now: number): Date {
  const base = Math.max(now, currentUntil ? new Date(currentUntil).getTime() : 0);
  return new Date(base + PLANS[plan].days * 86400000);
}
