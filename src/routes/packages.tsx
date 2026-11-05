import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { createCryptoInvoice, getMyAccess, submitManualPayment } from "@/lib/billing.functions";
import { MANUAL_CHANNELS, PLANS, planIds, type ChannelId, type PlanId } from "@/lib/plans";

export const Route = createFileRoute("/packages")({
  head: () => ({ meta: [
    { title: "Premium packages — AurumPulse" },
    { name: "description", content: "Unlock AurumPulse signals: Daily $1, Weekly $5 or Monthly $15. Pay with crypto, Easypaisa, JazzCash or bank." },
    { property: "og:title", content: "AurumPulse Premium — from $1/day" },
    { property: "og:description", content: "Daily $1, Weekly $5, Monthly $15 signal access." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Packages,
});
type Access = Awaited<ReturnType<typeof getMyAccess>>;
const day = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

function Packages() {
  const { user, ready } = useAuth();
  const nav = useNavigate();
  const readAccess = useServerFn(getMyAccess), crypto = useServerFn(createCryptoInvoice), manual = useServerFn(submitManualPayment);
  const [access, setAccess] = useState<Access | null>(null);
  const [plan, setPlan] = useState<PlanId>("weekly");
  const [method, setMethod] = useState<"crypto" | "manual">("crypto");
  const [channel, setChannel] = useState<ChannelId>("easypaisa");
  const [reference, setReference] = useState(""), [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const load = useCallback(async () => { try { setAccess(await readAccess()); } catch { /* signed out */ } }, [readAccess]);
  useEffect(() => { if (ready && !user) void nav({ to: "/auth" }); if (user) void load(); }, [ready, user, nav, load]);

  const payCrypto = async () => {
    setBusy(true); setMsg("");
    try { const { url } = await crypto({ data: { plan } }); window.location.href = url; }
    catch (e) { setMsg(e instanceof Error ? e.message : "Crypto checkout is unavailable."); setBusy(false); }
  };
  const payManual = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user || !file) { setMsg("Attach your payment screenshot."); return; }
    setBusy(true); setMsg("");
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const up = await supabase.storage.from("payment-proofs").upload(path, file);
    if (up.error) { setMsg("Upload failed. Use an image under 5 MB."); setBusy(false); return; }
    try { await manual({ data: { plan, channel, reference, proofPath: path } }); setMsg("Payment sent for review. Your package starts once approved."); setReference(""); setFile(null); void load(); }
    catch { setMsg("Could not submit payment. Try again."); }
    setBusy(false);
  };
  const st = access?.state;
  const ch = MANUAL_CHANNELS.find(c => c.id === channel)!;

  return <main className="min-h-screen bg-background px-5 py-10 text-foreground">
    <div className="mx-auto max-w-xl">
      <Link to="/" className="text-xs text-gold">← Back to signals</Link>
      <h1 className="mt-2 font-display text-5xl">Premium</h1>
      {st && <p className="mt-2 text-sm text-muted-foreground">
        {st.kind === "trial" ? `Free trial active until ${day(st.until)}.` : st.kind === "premium" ? `Premium active until ${day(st.until)}.` : "Your free trial has ended. Choose a package to keep getting signals."}
      </p>}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {planIds.map(id => <button key={id} onClick={() => setPlan(id)} aria-pressed={plan === id}
          className={`rounded-lg border p-4 text-left transition ${plan === id ? "border-gold card-glow" : "border-border bg-card"}`}>
          <p className="text-xs text-muted-foreground">{PLANS[id].label}</p>
          <p className="font-display text-4xl">${PLANS[id].price}</p>
          <p className="text-xs text-muted-foreground">{PLANS[id].days} day{PLANS[id].days > 1 ? "s" : ""}</p>
        </button>)}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2">
        <Button variant={method === "crypto" ? "default" : "outline"} onClick={() => setMethod("crypto")}>Crypto (USDT, BTC…)</Button>
        <Button variant={method === "manual" ? "default" : "outline"} onClick={() => setMethod("manual")}>Easypaisa / Bank</Button>
      </div>
      {method === "crypto" ? <div className="mt-5">
        <p className="text-sm text-muted-foreground">Pay from anywhere in the world. Your package activates automatically once the payment confirms.</p>
        <Button disabled={busy} onClick={payCrypto} className="btn-gold mt-4 h-14 w-full font-display text-2xl">Pay ${PLANS[plan].price} with crypto</Button>
      </div> : <form onSubmit={payManual} className="mt-5 space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{MANUAL_CHANNELS.map(c => <Button type="button" key={c.id} size="sm" variant={channel === c.id ? "default" : "outline"} onClick={() => setChannel(c.id)}>{c.label}</Button>)}</div>
        <div className="rounded-lg border border-border bg-card p-4 text-sm"><p className="text-muted-foreground">Send ${PLANS[plan].price} to {ch.label}</p><p className="mt-1 font-mono">{ch.details}</p></div>
        <Input required placeholder="Transaction ID / reference" value={reference} onChange={e => setReference(e.target.value)} aria-label="Transaction reference" />
        <Input required type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} aria-label="Payment screenshot" />
        <Button type="submit" disabled={busy} className="btn-gold h-12 w-full">Submit payment for review</Button>
      </form>}
      {msg && <p role="status" className="mt-4 border-l-2 border-gold pl-3 text-sm">{msg}</p>}
      {!!access?.payments.length && <section className="mt-8 border-t border-border pt-4">
        <h2 className="font-display text-2xl">Your payments</h2>
        {access.payments.map(p => <div key={p.id} className="flex justify-between py-2 text-sm"><span>{PLANS[p.plan as PlanId]?.label} · ${p.amount_usd} · {p.method}</span><span className={p.status === "approved" ? "text-bull" : p.status === "rejected" ? "text-bear" : "text-muted-foreground"}>{p.status}</span></div>)}
      </section>}
      {access?.isAdmin && <Link to="/admin" className="mt-6 block text-sm text-gold underline">Open admin payments</Link>}
    </div>
  </main>;
}
