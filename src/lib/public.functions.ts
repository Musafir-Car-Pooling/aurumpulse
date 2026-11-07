import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { marketIds } from "./markets";
import { scanMarket } from "./market-data";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const h = new Headers(init?.headers);
      if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
      h.set("apikey", key);
      return fetch(input, { ...init, headers: h });
    } },
  });
}

async function premiumOn() {
  const { data } = await publicClient().from("app_settings").select("premium_enabled").eq("id", 1).maybeSingle();
  return data?.premium_enabled !== false;
}

export const getPremiumMode = createServerFn({ method: "GET" }).handler(async () => ({ premium: await premiumOn() }));

export const getFreeSignal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ market: z.enum(["XAUUSD","BTCUSD","EURUSD","GBPUSD","USDJPY"]) }).parse(input))
  .handler(async ({ data }) => {
    if (await premiumOn()) throw new Error("PREMIUM_REQUIRED");
    return scanMarket(data.market);
  });

export const getFreeBoard = createServerFn({ method: "GET" }).handler(async () => {
  const db = publicClient();
  const [scans, alerts] = await Promise.all([
    db.from("market_scans").select("market,result,status,scanned_at,error").in("market", marketIds),
    db.from("signal_alerts").select("id,market,direction,result,created_at,valid_until").order("created_at", { ascending: false }).limit(30),
  ]);
  if (scans.error) throw scans.error;
  if (alerts.error) throw alerts.error;
  return { scans: scans.data, alerts: alerts.data };
});

export const adminSetPremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ premium: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("app_settings")
      .update({ premium_enabled: data.premium, updated_at: new Date().toISOString() }).eq("id", 1).select("id");
    if (error || !rows?.length) throw new Error("Not allowed");
    return { premium: data.premium };
  });
