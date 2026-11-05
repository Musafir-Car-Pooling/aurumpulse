import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { marketIds } from "./markets";
import { scanMarket } from "./market-data";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
export type { SignalResult } from "./signal-engine";

export const getSignal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ market: z.enum(["XAUUSD","BTCUSD","EURUSD","GBPUSD","USDJPY"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: ok } = await context.supabase.rpc("has_signal_access", { _user_id: context.userId });
    if (!ok) throw new Error("PREMIUM_REQUIRED");
    return scanMarket(data.market);
  });

export const getMarketBoard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;
    const [scans, alerts] = await Promise.all([
      db.from("market_scans").select("market,result,status,scanned_at,error").in("market", marketIds),
      db.from("signal_alerts").select("id,market,direction,result,created_at,valid_until").order("created_at", { ascending: false }).limit(30),
    ]);
    if (scans.error) throw scans.error;
    if (alerts.error) throw alerts.error;
    return { scans: scans.data, alerts: alerts.data };
  });
