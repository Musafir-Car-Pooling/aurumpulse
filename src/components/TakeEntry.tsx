import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getMt5Link, listMt5Orders, placeMt5Order } from "@/lib/mt5.functions";
import type { Market } from "@/lib/markets";

type Order = Awaited<ReturnType<typeof listMt5Orders>>[number];
const label: Record<string, string> = { pending: "Sent — waiting for MT5…", sent: "MT5 is placing the trade…", executed: "Executed", failed: "Failed", expired: "Expired — MT5 bot did not pick it up in 2 min" };

export function TakeEntry({ market, direction }: { market: Market; direction: "BUY" | "SELL" }) {
  const readLink = useServerFn(getMt5Link), place = useServerFn(placeMt5Order), list = useServerFn(listMt5Orders);
  const [linked, setLinked] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null), [order, setOrder] = useState<Order | null>(null);
  useEffect(() => { readLink().then(l => setLinked(!!l)).catch(() => setLinked(false)); }, [readLink]);
  useEffect(() => { setOrderId(null); setOrder(null); setErr(""); }, [market, direction]);
  useEffect(() => {
    if (!orderId) return;
    const tick = async () => { const rows = await list(); const o = rows.find(r => r.id === orderId) ?? null; setOrder(o); return o; };
    void tick();
    const id = setInterval(async () => { const o = await tick().catch(() => null); if (o && !["pending", "sent"].includes(o.status)) clearInterval(id); }, 3000);
    return () => clearInterval(id);
  }, [orderId, list]);
  if (linked === null) return null;
  if (!linked) return <Button asChild variant="outline" className="h-12 w-full border-gold/40"><Link to="/mt5"><Zap />Connect MT5 first</Link></Button>;
  const send = async () => {
    setBusy(true); setErr("");
    try { const r = await place({ data: { market } }); setOrderId(r.id); }
    catch (e) { const m = e instanceof Error ? e.message : ""; setErr(m.includes("NO_LIVE_SIGNAL") ? "The signal changed or expired. Check again." : m.includes("MT5_NOT_CONNECTED") ? "Connect MT5 first." : "Could not send the order."); }
    finally { setBusy(false); }
  };
  const tone = order?.status === "executed" ? "text-bull" : order?.status === "failed" || order?.status === "expired" ? "text-bear" : "text-gold";
  return <div className="space-y-2">
    <Button onClick={() => setOpen(true)} disabled={busy || (!!order && ["pending", "sent"].includes(order.status))} className={`h-14 w-full rounded-lg font-display text-xl ${direction === "BUY" ? "bg-bull" : "bg-bear"} text-background hover:opacity-90`}><Zap />Take entry now</Button>
    {order && <p role="status" className={`text-sm ${tone}`}>{order.market} {order.direction} {order.lot} · {label[order.status]}{order.status === "executed" && order.price ? ` at ${order.price}` : ""}{order.ticket ? ` · #${order.ticket}` : ""}{order.error ? ` · ${order.error}` : ""}</p>}
    {err && <p role="alert" className="text-sm text-bear">{err}</p>}
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="border-gold/30">
        <AlertDialogHeader><AlertDialogTitle className="font-display text-3xl">{direction} {market} 0.02 lot?</AlertDialogTitle>
          <AlertDialogDescription>Your connected MT5 bot will place this trade at market price, without a stop loss. Real money is at risk.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="btn-gold" onClick={() => void send()}>Yes, take entry</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
