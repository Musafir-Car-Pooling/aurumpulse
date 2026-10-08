import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getSignal, type SignalResult } from "@/lib/signal.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AurumPulse — Live XAUUSD Gold Signals" },
      { name: "description", content: "Real-time gold (XAUUSD) buy/sell signals and technical analysis for the next hour." },
      { property: "og:title", content: "AurumPulse — Live XAUUSD Gold Signals" },
      { property: "og:description", content: "Press Signal Now for a live gold signal with entry, stop loss and targets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function Index() {
  const run = useServerFn(getSignal);
  const [s, setS] = useState<SignalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const go = async () => {
    setLoading(true); setErr("");
    try { setS(await run()); } catch { setErr("Couldn't reach the market right now. Try again in a moment."); }
    setLoading(false);
  };

  const tone = s?.direction === "BUY" ? "text-bull" : s?.direction === "SELL" ? "text-bear" : "text-gold";

  return (
    <main className="min-h-screen bg-background text-foreground px-5 py-10">
      <div className="mx-auto max-w-xl">
        <p className="font-mono text-xs tracking-[0.3em] text-gold">XAU / USD · LIVE</p>
        <h1 className="mt-2 font-display text-5xl leading-none">AurumPulse</h1>
        <p className="mt-3 text-muted-foreground">Gold signal for the next hour, computed from live market data the moment you press.</p>

        <button onClick={go} disabled={loading} className="btn-gold mt-8 w-full rounded-xl py-5 font-display text-2xl tracking-wide disabled:opacity-60">
          {loading ? "Scanning market…" : "Signal Now"}
        </button>
        {err && <p className="mt-4 text-bear">{err}</p>}

        {s && (
          <section className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="card-glow rounded-2xl p-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Signal · {fmt(s.time)} → {fmt(s.validUntil)}</p>
                  <p className={`font-display text-6xl ${tone}`}>{s.direction}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Spot</p>
                  <p className="font-mono text-2xl">${s.spot.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Confidence {s.confidence}%</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed">{s.summary}</p>
            </div>

            {s.direction !== "WAIT" && (
              <div className="grid grid-cols-2 gap-3">
                {[["Entry", s.entry, ""], ["Stop loss", s.stopLoss, "text-bear"], ["Target 1", s.tp1, "text-bull"], ["Target 2", s.tp2, "text-bull"]].map(([k, v, c]) => (
                  <div key={k as string} className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className={`font-mono text-xl ${c}`}>${(v as number).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Support (8h)</p><p className="font-mono text-lg">${s.support.toFixed(2)}</p></div>
              <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Resistance (8h)</p><p className="font-mono text-lg">${s.resistance.toFixed(2)}</p></div>
            </div>

            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {s.indicators.map((i) => (
                <div key={i.name} className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{i.name}</span>
                  <span className={`font-mono ${i.bias === "bull" ? "text-bull" : i.bias === "bear" ? "text-bear" : ""}`}>{i.value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Educational only, not financial advice. Prices from live gold spot and COMEX futures.</p>
          </section>
        )}
      </div>
    </main>
  );
}
