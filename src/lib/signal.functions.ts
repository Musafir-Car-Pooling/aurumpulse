import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { marketIds } from "./markets";
import { scanMarket } from "./market-data";
import type { Database } from "@/integrations/supabase/types";
export type { SignalResult } from "./signal-engine";
export const getSignal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ market: z.enum(["XAUUSD","BTCUSD","EURUSD","GBPUSD","USDJPY"]) }).parse(input))
  .handler(async ({data}) => scanMarket(data.market));
export const getMarketBoard = createServerFn({method:"GET"}).handler(async () => {
  const url = process.env['SUPABASE_URL'], key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error("Market board not configured");
  const db = createClient<Database>(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init) => {
    const headers = new Headers(init?.headers);
    if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
    headers.set('apikey',key); return fetch(input,{...init,headers});
  }}});
  const [scans, alerts] = await Promise.all([
    db.from('market_scans').select('market,result,status,scanned_at,error').in('market',marketIds),
    db.from('signal_alerts').select('id,market,direction,result,created_at,valid_until').order('created_at',{ascending:false}).limit(30),
  ]);
  if (scans.error) throw scans.error;
  if (alerts.error) throw alerts.error;
  return {scans:scans.data, alerts:alerts.data};
});
