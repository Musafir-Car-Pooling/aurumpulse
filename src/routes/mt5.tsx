import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { Copy, Download, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { AppMenu } from "@/components/AppMenu";
import { createMt5Key, getMt5Link, listMt5Orders, revokeMt5Key } from "@/lib/mt5.functions";

export const Route = createFileRoute("/mt5")({
  head: () => ({ meta: [
    { title: "Connect MT5 — AurumPulse" },
    { name: "description", content: "Link your MetaTrader 5 bot to AurumPulse and take signal entries with one tap." },
    { property: "og:title", content: "Connect MT5 — AurumPulse" },
    { property: "og:description", content: "One-tap signal entries straight into MetaTrader 5." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Mt5Page,
});

const ago = (iso: string) => { const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000); return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : new Date(iso).toLocaleString(); };

function Mt5Page() {
  const { user, ready } = useAuth();
  const readLink = useServerFn(getMt5Link), create = useServerFn(createMt5Key), revoke = useServerFn(revokeMt5Key), list = useServerFn(listMt5Orders);
  const [link, setLink] = useState<Awaited<ReturnType<typeof getMt5Link>>>(null);
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof listMt5Orders>>>([]);
  const [key, setKey] = useState(""), [msg, setMsg] = useState("");
  const load = useCallback(async () => { try { const [l, o] = await Promise.all([readLink(), list()]); setLink(l); setOrders(o); } catch { /* signed out */ } }, [readLink, list]);
  useEffect(() => { if (!user) return; void load(); const id = setInterval(() => void load(), 5000); return () => clearInterval(id); }, [user, load]);
  const online = !!link?.last_seen && Date.now() - new Date(link.last_seen).getTime() < 30000;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return <main className="min-h-screen bg-background px-5 py-8 text-foreground">
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center gap-2">{user && <AppMenu email={user.email ?? ""} isAdmin={false} status="MT5 bridge" />}<h1 className="font-display text-4xl">Connect MT5</h1></div>
      {ready && !user && <p className="text-sm">Please <Link to="/auth" className="text-gold underline">sign in</Link>.</p>}
      {user && <>
        <section className="card-glow rounded-xl p-5">
          <div className="flex items-center justify-between"><p className="flex items-center gap-2 font-semibold"><Plug className="h-4 w-4" />MT5 bot</p>
            <span className={`text-sm ${online ? "text-bull" : "text-muted-foreground"}`}>{!link ? "Not connected" : online ? "Online" : link.last_seen ? `Offline · seen ${ago(link.last_seen)}` : "Waiting for first check-in"}</span></div>
          {key && <div className="mt-4 rounded-lg border border-gold/40 bg-card p-3"><p className="text-xs text-muted-foreground">Your connect key — copy it now, it's shown only once:</p>
            <div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-xs">{key}</code><Button size="icon" variant="ghost" aria-label="Copy key" onClick={() => { void navigator.clipboard.writeText(key); setMsg("Key copied."); }}><Copy /></Button></div></div>}
          {msg && <p role="status" className="mt-2 text-xs text-gold">{msg}</p>}
          <div className="mt-4 flex gap-2">
            <Button className="btn-gold flex-1" onClick={async () => { try { const r = await create(); setKey(r.key); setMsg(""); void load(); } catch { setMsg("You need an active trial or premium package."); } }}>{link ? "Generate new key" : "Generate connect key"}</Button>
            {link && <Button variant="outline" onClick={async () => { await revoke(); setKey(""); setMsg("Disconnected."); void load(); }}>Disconnect</Button>}
          </div>
        </section>
        <section className="rounded-xl border border-border bg-card p-5 text-sm leading-relaxed">
          <p className="font-semibold">Setup (one time)</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Download the <span className="text-foreground">AurumPulse Bridge EA</span> from your files and copy it into MT5 → File → Open Data Folder → MQL5/Experts.</li>
            <li>MT5 → Tools → Options → Expert Advisors → tick "Allow WebRequest" and add: <code className="break-all text-gold">{origin}</code></li>
            <li>Attach the EA to any chart, paste your connect key and this address into its settings, and enable Algo Trading.</li>
          </ol>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Download className="h-3 w-3" />Then tap "Take entry now" under any BUY/SELL signal.</p>
        </section>
        <section className="divide-y divide-border rounded-xl border border-border bg-card">
          <p className="p-4 font-semibold">Recent entries</p>
          {orders.length === 0 && <p className="p-4 text-sm text-muted-foreground">No entries yet.</p>}
          {orders.map(o => <div key={o.id} className="flex items-center justify-between gap-3 p-4 text-sm">
            <span className="font-mono">{o.market} <span className={o.direction === "BUY" ? "text-bull" : "text-bear"}>{o.direction}</span> {o.lot}</span>
            <span className={`text-xs ${o.status === "executed" ? "text-bull" : o.status === "failed" || o.status === "expired" ? "text-bear" : "text-gold"}`}>{o.status}{o.price ? ` @ ${o.price}` : ""}{o.error ? ` · ${o.error}` : ""}</span>
          </div>)}
        </section>
      </>}
    </div>
  </main>;
}
