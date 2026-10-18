export const MARKETS = {
  XAUUSD: { name: "Gold", ticker: "GC=F", decimals: 2, currency: "USD" },
  BTCUSD: { name: "Bitcoin", ticker: "BTC-USD", decimals: 2, currency: "USD" },
  EURUSD: { name: "Euro / US dollar", ticker: "EURUSD=X", decimals: 5, currency: "USD" },
  GBPUSD: { name: "Pound / US dollar", ticker: "GBPUSD=X", decimals: 5, currency: "USD" },
  USDJPY: { name: "US dollar / Yen", ticker: "JPY=X", decimals: 3, currency: "JPY" },
} as const;
export type Market = keyof typeof MARKETS;
export const marketIds = Object.keys(MARKETS) as Market[];
export const price = (market: Market, value: number) => `${MARKETS[market].currency === "JPY" ? "¥" : "$"}${value.toFixed(MARKETS[market].decimals)}`;
export function directionForScore(score: number): "BUY" | "SELL" | "WAIT" {
  return score >= 4 ? "BUY" : score <= -4 ? "SELL" : "WAIT";
}
export function shouldAlert(direction: string, status: string, previous: string | null, previousUntil: number, now: number) {
  return status === "ready" && (direction === "BUY" || direction === "SELL") && (direction !== previous || previousUntil <= now);
}
export function isMarketClosed(market: Market, now: Date) {
  if (market === "BTCUSD") return false;
  const day = now.getUTCDay(), hour = now.getUTCHours();
  return day === 6 || (day === 5 && hour >= 21) || (day === 0 && hour < 22);
}