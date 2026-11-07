import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { scanMarket } from "./market-data";
import { canTrade, hashKey, newKey } from "./mt5";

const marketEnum = z.enum(["XAUUSD", "BTCUSD", "EURUSD", "GBPUSD", "USDJPY"]);

export const getMt5Link = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("mt5_links").select("created_at,last_seen,auto_trade").eq("user_id", context.userId).maybeSingle();
    return data;
  });

export const createMt5Key = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ok } = await context.supabase.rpc("has_signal_access", { _user_id: context.userId });
    if (!ok) throw new Error("PREMIUM_REQUIRED");
    const key = newKey();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("mt5_links").upsert({ user_id: context.userId, key_hash: await hashKey(key), created_at: new Date().toISOString(), last_seen: null });
    if (error) throw new Error("Could not create key");
    return { key };
  });

export const revokeMt5Key = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("mt5_links").delete().eq("user_id", context.userId);
    return { ok: true };
  });

export const setAutoTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ on: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: ok } = await context.supabase.rpc("has_signal_access", { _user_id: context.userId });
    if (data.on && !ok) throw new Error("PREMIUM_REQUIRED");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("mt5_links").update({ auto_trade: data.on }).eq("user_id", context.userId).select("auto_trade").maybeSingle();
    if (error) throw new Error("Could not save");
    if (!row) throw new Error("MT5_NOT_CONNECTED");
    return { on: row.auto_trade };
  });

export const placeMt5Order = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ market: marketEnum }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: ok } = await context.supabase.rpc("has_signal_access", { _user_id: context.userId });
    if (!ok) throw new Error("PREMIUM_REQUIRED");
    const { data: link } = await context.supabase.from("mt5_links").select("user_id").eq("user_id", context.userId).maybeSingle();
    if (!link) throw new Error("MT5_NOT_CONNECTED");
    const scan = await scanMarket(data.market);
    const s = scan.result;
    if (!s || !canTrade(s)) throw new Error("NO_LIVE_SIGNAL");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("trade_orders").insert({
      user_id: context.userId, market: data.market, direction: s.direction, lot: 0.02,
      signal: { entry: s.entry, stopLoss: s.stopLoss, tp1: s.tp1, tp2: s.tp2, time: s.time, validUntil: s.validUntil },
    }).select("id,direction").single();
    if (error || !row) throw new Error("Could not send order");
    return row;
  });

export const listMt5Orders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("trade_orders").select("id,market,direction,lot,source,status,ticket,price,error,created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(10);
    return data ?? [];
  });
