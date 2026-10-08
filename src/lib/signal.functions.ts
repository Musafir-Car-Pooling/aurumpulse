import { createServerFn } from "@tanstack/react-start";

export type SignalResult = {
  time: string;
  spot: number;
  direction: "BUY" | "SELL" | "WAIT";
  confidence: number;
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  validUntil: string;
  indicators: { name: string; value: string; bias: "bull" | "bear" | "neutral" }[];
  summary: string;
  support: number;
  resistance: number;
  error?: string;
};

const ema = (v: number[], p: number) => {
  const k = 2 / (p + 1);
  const out: number[] = [];
  v.forEach((x, i) => out.push(i === 0 ? x : x * k + out[i - 1] * (1 - k)));
  return out;
};
const rsi = (c: number[], p = 14) => {
  let g = 0, l = 0;
  for (let i = 1; i <= p; i++) {
    const d = c[i] - c[i - 1];
    d > 0 ? (g += d) : (l -= d);
  }
  g /= p; l /= p;
  for (let i = p + 1; i < c.length; i++) {
    const d = c[i] - c[i - 1];
    g = (g * (p - 1) + Math.max(d, 0)) / p;
    l = (l * (p - 1) + Math.max(-d, 0)) / p;
  }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
};

async function candles(interval: string, range: string) {
  const r = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=${interval}&range=${range}`,
    { headers: { "User-Agent": "Mozilla/5.0" } },
  );
  if (!r.ok) throw new Error("Market data unavailable");
  const j: any = await r.json();
  const q = j.chart.result[0].indicators.quote[0];
  const rows: { h: number; l: number; c: number }[] = [];
  q.close.forEach((c: number | null, i: number) => {
    if (c != null && q.high[i] != null && q.low[i] != null) rows.push({ h: q.high[i], l: q.low[i], c });
  });
  return rows;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export const getSignal = createServerFn({ method: "POST" }).handler(async (): Promise<SignalResult> => {
  const [m15, h1, spotRes] = await Promise.all([
    candles("15m", "5d"),
    candles("60m", "1mo"),
    fetch("https://api.gold-api.com/price/XAU").then((r) => r.json()).catch(() => null),
  ]);
  const c15 = m15.map((x) => x.c);
  const c1h = h1.map((x) => x.c);
  const futLast = c15[c15.length - 1];
  const spot: number = spotRes?.price ?? futLast;
  const basis = futLast - spot; // futures premium, shift levels to spot

  const e9 = ema(c15, 9).at(-1)!, e21 = ema(c15, 21).at(-1)!;
  const e50h = ema(c1h, 50).at(-1)!, e200h = ema(c1h, 200).at(-1)!;
  const r15 = rsi(c15), r1h = rsi(c1h);
  const macdLine = ema(c15, 12).map((v, i) => v - ema(c15, 26)[i]);
  const sig = ema(macdLine, 9);
  const hist = macdLine.at(-1)! - sig.at(-1)!;
  const prevHist = macdLine.at(-2)! - sig.at(-2)!;
  const trs = m15.slice(1).map((x, i) => Math.max(x.h - x.l, Math.abs(x.h - m15[i].c), Math.abs(x.l - m15[i].c)));
  const atr = trs.slice(-14).reduce((a, b) => a + b, 0) / 14;
  const recent = m15.slice(-32);
  const support = Math.min(...recent.map((x) => x.l)) - basis;
  const resistance = Math.max(...recent.map((x) => x.h)) - basis;

  let score = 0;
  const ind: SignalResult["indicators"] = [];
  const add = (name: string, value: string, s: number) => {
    score += s;
    ind.push({ name, value, bias: s > 0 ? "bull" : s < 0 ? "bear" : "neutral" });
  };
  add("EMA 9/21 (15m)", e9 > e21 ? "Bullish cross" : "Bearish cross", e9 > e21 ? 2 : -2);
  add("EMA 50/200 (1h)", e50h > e200h ? "Uptrend" : "Downtrend", e50h > e200h ? 2 : -2);
  add("Price vs EMA50 (1h)", futLast > e50h ? "Above" : "Below", futLast > e50h ? 1 : -1);
  add("RSI 14 (15m)", r15.toFixed(1), r15 > 70 ? -1 : r15 < 30 ? 1 : r15 > 55 ? 1 : r15 < 45 ? -1 : 0);
  add("RSI 14 (1h)", r1h.toFixed(1), r1h > 70 ? -1 : r1h < 30 ? 1 : r1h > 55 ? 1 : r1h < 45 ? -1 : 0);
  add("MACD hist (15m)", `${hist.toFixed(2)} ${hist > prevHist ? "rising" : "falling"}`, (hist > 0 ? 1 : -1) + (hist > prevHist ? 1 : -1));
  add("ATR 14 (15m)", `$${atr.toFixed(2)}`, 0);

  const max = 10;
  const direction = score >= 4 ? "BUY" : score <= -4 ? "SELL" : "WAIT";
  const confidence = Math.round(50 + (Math.abs(score) / max) * 45);
  const d = direction === "SELL" ? -1 : 1;
  const sl = spot - d * atr * 1.5;
  const now = new Date();
  const summary =
    direction === "WAIT"
      ? `Mixed signals (score ${score}). Gold is ranging between $${r2(support)} and $${r2(resistance)}. Wait for a break of either level before entering.`
      : `${direction === "BUY" ? "Bullish" : "Bearish"} momentum (score ${score > 0 ? "+" : ""}${score}/${max}). ${
          e50h > e200h ? "Hourly trend is up" : "Hourly trend is down"
        }, RSI ${r15.toFixed(0)}, MACD ${hist > 0 ? "positive" : "negative"}. Expected volatility ~$${atr.toFixed(1)} per 15 min.`;

  return {
    time: now.toISOString(),
    spot: r2(spot),
    direction,
    confidence: direction === "WAIT" ? Math.min(confidence, 55) : confidence,
    entry: r2(spot),
    stopLoss: r2(sl),
    tp1: r2(spot + d * atr * 1.5),
    tp2: r2(spot + d * atr * 3),
    validUntil: new Date(now.getTime() + 3600_000).toISOString(),
    indicators: ind,
    summary,
    support: r2(support),
    resistance: r2(resistance),
  };
});
