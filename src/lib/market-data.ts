import { z } from "zod";
import { analyze, type Candle, type SignalResult } from "./signal-engine";
import { isMarketClosed, MARKETS, type Market } from "./markets";
export type Scan = { market: Market; result: SignalResult | null; status: "ready" | "closed" | "stale" | "unavailable"; scanned_at: string; error: string | null };
const chartSchema = z.object({ chart: z.object({ result: z.array(z.object({ timestamp: z.array(z.number()), indicators: z.object({ quote: z.array(z.object({ close: z.array(z.number().nullable()), high: z.array(z.number().nullable()), low: z.array(z.number().nullable()) })) }) })).nullable() }) });
async function candles(market: Market, interval: string, range: string): Promise<Candle[]> {
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(MARKETS[market].ticker)}?interval=${interval}&range=${range}`, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Market provider unavailable (${response.status})`);
  const parsed = chartSchema.parse(await response.json()).chart.result?.[0], quote = parsed?.indicators.quote[0];
  if (!parsed || !quote) throw new Error("Market data unavailable");
  return parsed.timestamp.flatMap((time,i) => {
    const c = quote.close[i], h = quote.high[i], l = quote.low[i];
    return typeof c === "number" && typeof h === "number" && typeof l === "number" && [c,h,l].every(Number.isFinite) ? [{c,h,l,time}] : [];
  });
}
export async function scanMarket(market: Market): Promise<Scan> {
  const now = new Date(), base = {market, scanned_at: now.toISOString()};
  if (isMarketClosed(market, now)) return {...base, result:null,status:"closed",error:"Market closed — no signal alerts."};
  try {
    const [m15,h1] = await Promise.all([candles(market,"15m","5d"),candles(market,"60m","1mo")]);
    const latest = m15.at(-1), hourly = h1.at(-1);
    if (!latest || !hourly) throw new Error("Insufficient market history");
    if (now.getTime() - latest.time * 1000 > 30 * 60000 || now.getTime() - hourly.time * 1000 > 90 * 60000) return {...base,result:null,status:"stale",error:"The price feed is delayed — no signal alerts."};
    let spot = latest.c;
    if (market === "XAUUSD") {
      try {
        const res = await fetch("https://api.gold-api.com/price/XAU", {signal:AbortSignal.timeout(3000)});
        if (res.ok) {
          const data = z.object({price:z.number().positive(),updatedAt:z.string()}).parse(await res.json());
          const age = now.getTime() - new Date(data.updatedAt).getTime();
          if (Number.isFinite(age) && age >= -60000 && age <= 5 * 60000) spot = data.price;
        }
      } catch { /* Preserve original futures fallback when the spot feed is unavailable. */ }
    }
    return {...base, result:analyze(market,m15,h1,spot,now),status:"ready",error:null};
  } catch (error) {
    console.error(`Scan failed for ${market}:`, error);
    return {...base,result:null,status:"unavailable",error:"Couldn't reach this market. Please try again shortly."};
  }
}