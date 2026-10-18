import { directionForScore, MARKETS, price, type Market } from "./markets";

export type Candle = { h: number; l: number; c: number; time: number };
export type SignalResult = {
  market: Market; time: string; dataTime: string; spot: number; direction: "BUY" | "SELL" | "WAIT";
  confidence: number; entry: number; stopLoss: number; tp1: number; tp2: number; validUntil: string;
  indicators: { name: string; value: string; bias: "bull" | "bear" | "neutral" }[];
  summary: string; support: number; resistance: number;
};
const ema = (values: number[], period: number) => {
  const k = 2 / (period + 1), out: number[] = [];
  values.forEach((v, i) => out.push(i === 0 ? v : v * k + (out[i - 1] ?? v) * (1 - k)));
  return out;
};
const last = (values: number[], offset = 1) => {
  const value = values.at(-offset);
  if (value === undefined) throw new Error("Insufficient market history");
  return value;
};
const rsi = (values: number[], p = 14) => {
  let g = 0, l = 0;
  for (let i = 1; i < values.length; i++) {
    const d = (values[i] ?? 0) - (values[i - 1] ?? 0);
    if (i <= p) { g += Math.max(d, 0) / p; l += Math.max(-d, 0) / p; }
    else { g = (g * (p - 1) + Math.max(d, 0)) / p; l = (l * (p - 1) + Math.max(-d, 0)) / p; }
  }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
};
export function analyze(market: Market, m15: Candle[], h1: Candle[], spot: number, now: Date): SignalResult {
  if (m15.length < 32 || h1.length < 200 || !Number.isFinite(spot) || spot <= 0) throw new Error("Insufficient market history");
  const c15 = m15.map(x => x.c), c1h = h1.map(x => x.c), futLast = last(c15), basis = futLast - spot;
  const e9 = last(ema(c15, 9)), e21 = last(ema(c15, 21)), e50h = last(ema(c1h, 50)), e200h = last(ema(c1h, 200));
  const r15 = rsi(c15), r1h = rsi(c1h), slow = ema(c15, 26);
  const macd = ema(c15, 12).map((v, i) => v - (slow[i] ?? v)), sig = ema(macd, 9);
  const hist = last(macd) - last(sig), prevHist = last(macd, 2) - last(sig, 2);
  const trs = m15.slice(1).map((x, i) => Math.max(x.h - x.l, Math.abs(x.h - (m15[i]?.c ?? x.c)), Math.abs(x.l - (m15[i]?.c ?? x.c))));
  const atr = trs.slice(-14).reduce((a,b) => a + b, 0) / 14;
  const support = Math.min(...m15.slice(-32).map(x => x.l)) - basis, resistance = Math.max(...m15.slice(-32).map(x => x.h)) - basis;
  let score = 0;
  const indicators: SignalResult["indicators"] = [];
  const add = (name: string, value: string, s: number) => { score += s; indicators.push({name,value,bias: s > 0 ? "bull" : s < 0 ? "bear" : "neutral"}); };
  add("EMA 9/21 (15m)", e9 > e21 ? "Bullish cross" : "Bearish cross", e9 > e21 ? 2 : -2);
  add("EMA 50/200 (1h)", e50h > e200h ? "Uptrend" : "Downtrend", e50h > e200h ? 2 : -2);
  add("Price vs EMA50 (1h)", futLast > e50h ? "Above" : "Below", futLast > e50h ? 1 : -1);
  const rs = (v: number) => v > 70 ? -1 : v < 30 ? 1 : v > 55 ? 1 : v < 45 ? -1 : 0;
  add("RSI 14 (15m)", r15.toFixed(1), rs(r15)); add("RSI 14 (1h)", r1h.toFixed(1), rs(r1h));
  add("MACD hist (15m)", `${hist.toFixed(MARKETS[market].decimals)} ${hist > prevHist ? "rising" : "falling"}`, (hist > 0 ? 1 : -1) + (hist > prevHist ? 1 : -1));
  add("ATR 14 (15m)", price(market, atr), 0);
  const direction = directionForScore(score), d = direction === "SELL" ? -1 : 1;
  const round = (n: number) => Number(n.toFixed(MARKETS[market].decimals));
  const confidence = Math.round(50 + Math.abs(score) / 10 * 45);
  const summary = direction === "WAIT" ? `Mixed signals (score ${score}). ${MARKETS[market].name} is ranging between ${price(market, support)} and ${price(market, resistance)}. Wait for a break before entering.` : `${direction === "BUY" ? "Bullish" : "Bearish"} momentum (score ${score > 0 ? "+" : ""}${score}/10). Hourly trend is ${e50h > e200h ? "up" : "down"}, RSI ${r15.toFixed(0)}, MACD ${hist > 0 ? "positive" : "negative"}. Expected volatility ${price(market, atr)} per 15 min.`;
  return { market, time: now.toISOString(), dataTime: new Date((m15.at(-1)?.time ?? 0) * 1000).toISOString(), spot: round(spot), direction, confidence: direction === "WAIT" ? Math.min(confidence,55) : confidence, entry: round(spot), stopLoss: round(spot - d * atr * 1.5), tp1: round(spot + d * atr * 1.5), tp2: round(spot + d * atr * 3), validUntil: new Date(now.getTime() + 3600000).toISOString(), indicators, summary, support: round(support), resistance: round(resistance) };
}