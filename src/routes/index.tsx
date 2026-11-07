import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { getMyAccess } from "@/lib/billing.functions";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellOff, RefreshCw, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppMenu, statusLabel } from "@/components/AppMenu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getMarketBoard, getSignal, type SignalResult } from "@/lib/signal.functions";
import { PLANS, planIds } from "@/lib/plans";
import { MARKETS, marketIds, price, type Market } from "@/lib/markets";
import type { Scan } from "@/lib/market-data";
import { TakeEntry } from "@/components/TakeEntry";
import { BrandLogo } from "@/components/BrandLogo";
import { InstallApp } from "@/components/InstallApp";
import { getFreeBoard, getFreeSignal, getPremiumMode } from "@/lib/public.functions";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "AurumPulse — Gold, Bitcoin & Forex Signals" },
    { name: "description", content: "Live XAUUSD, BTCUSD, EURUSD, GBPUSD and USDJPY technical signals, with entry, stop loss, targets and BUY/SELL alerts." },
    { property: "og:title", content: "AurumPulse — Five-Market Signal Monitor" },
    { property: "og:description", content: "Gold, Bitcoin and forex analysis with fresh BUY/SELL alerts. No alerts for WAIT." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Index,
});
const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
type Board = Awaited<ReturnType<typeof getMarketBoard>>;
function Index() {
  const runPaid = useServerFn(getSignal), readPaid = useServerFn(getMarketBoard), readAccess = useServerFn(getMyAccess);
  const runFree = useServerFn(getFreeSignal), readFree = useServerFn(getFreeBoard), readMode = useServerFn(getPremiumMode);
  const auth = useAuth();
  const [premium,setPremium] = useState<boolean | null>(null);
  useEffect(() => { readMode().then(m => setPremium(m.premium)).catch(() => setPremium(true)); },[readMode]);
  const free = premium === false;
  const user = free ? null : auth.user, ready = auth.ready && premium !== null;
  const run = free ? runFree : runPaid, readBoard = free ? readFree : readPaid;
  const [access,setAccess] = useState<Awaited<ReturnType<typeof getMyAccess>> | null>(null);
  useEffect(() => { if (!user) { setAccess(null); return; } readAccess().then(setAccess).catch(() => setAccess(null)); },[user,readAccess]);
  const allowed = free || access?.state.kind === 'trial' || access?.state.kind === 'premium';
  useEffect(() => {
    if (!free || typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') { notify.current = true; setNotifying(true); }
    else if (Notification.permission === 'default' && !sessionStorage.getItem('ap-notif-asked')) setAsk(true);
  },[free]);
  const [market,setMarket] = useState<Market>("XAUUSD");
  const [manual,setManual] = useState<Partial<Record<Market,Scan>>>({});
  const [board,setBoard] = useState<Board | null>(null);
  const [loading,setLoading] = useState<Market | null>(null);
  const [err,setErr] = useState("");
  const [notifying,setNotifying] = useState(false);
  const [notice,setNotice] = useState("");
  const [clock,setClock] = useState(0);
  const [ask,setAsk] = useState(false);
  useEffect(() => {
    if (!user || typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') { notify.current = true; setNotifying(true); return; }
    if (Notification.permission === 'default' && !sessionStorage.getItem('ap-notif-asked')) setAsk(true);
  },[user]);
  const seen = useRef<Set<string> | null>(null), notify = useRef(false);
  const refresh = useCallback(async () => {
    try {
      const next = await readBoard();
      if (seen.current) {
        for (const alert of [...next.alerts].reverse()) {
          if (!seen.current.has(alert.id) && new Date(alert.valid_until).getTime()>Date.now()) {
            setNotice(`${alert.market} · ${alert.direction} · ${fmt(alert.created_at)}`);
            if (notify.current && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              const result = alert.result as unknown as SignalResult;
              try { new Notification(`AurumPulse · ${alert.market} ${alert.direction}`, {body:`Entry ${price(result.market,result.entry)} · TP1 ${price(result.market,result.tp1)} · TP2 ${price(result.market,result.tp2)}`,tag:alert.id}); } catch { setNotice('A new signal is available. Device notifications are not supported in this browser.'); }
            }
          }
        }
      }
      seen.current = new Set(next.alerts.map(a => a.id));
      setBoard(next); setErr(""); setClock(Date.now());
    } catch { setErr("Saved market updates are unavailable. Signal Now can still check a market."); }
  },[readBoard]);
  useEffect(() => { if (!allowed) return; void refresh(); const id = setInterval(() => {void refresh();},15000); return () => clearInterval(id); },[refresh,allowed]);
  useEffect(() => { const id=setInterval(() => setClock(Date.now()),1000); return () => clearInterval(id); },[]);
  const go = async () => {
    const selected=market; setLoading(selected); setErr("");
    try { const scan=await run({data:{market:selected}}); setManual(old => ({...old,[selected]:scan})); }
    catch (e) { setErr(e instanceof Error && e.message.includes('PREMIUM_REQUIRED') ? "Your access has ended. Choose a premium package." : "Couldn't reach the market right now. Try again in a moment."); }
    finally { setLoading(null); }
  };
  const enableNotifications = async () => {
    if (notifying) { notify.current=false; setNotifying(false); return; }
    if (typeof Notification === 'undefined') { setNotice('Device notifications are unavailable in this browser. New signals still appear here.'); return; }
    const permission=await Notification.requestPermission();
    if (permission === 'granted') {notify.current=true;setNotifying(true);setNotice('Device notifications enabled while this app is open.');}
    else setNotice('Notifications were not enabled. New signals still appear here.');
  };
  const saved = board?.scans.find(row => row.market === market) as unknown as Scan | undefined;
  const checked = manual[market];
  const scan = checked && (!saved || checked.scanned_at > saved.scanned_at) ? checked : saved;
  const s = scan?.result;
  const stale = !!scan && clock>0 && clock-new Date(scan.scanned_at).getTime()>120000;
  const expired = !!s && clock>0 && new Date(s.validUntil).getTime()<=clock;
  const tone=s?.direction === 'BUY' ? 'text-bull' : s?.direction === 'SELL' ? 'text-bear' : 'text-gold';
  const latest = board?.scans.reduce((time,row) => row.scanned_at>time ? row.scanned_at : time,'');
  const running=!!latest && clock>0 && clock-new Date(latest).getTime()<120000;
  return <main className="min-h-screen bg-background text-foreground px-5 py-10">
    <div className="mx-auto max-w-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">{user && <AppMenu email={user.email ?? ''} isAdmin={!!access?.isAdmin} status={statusLabel(access?.state.kind, !!access?.isAdmin, (access?.state as {until?:string}|undefined)?.until)} />}<p className="font-mono text-xs text-gold">{market} · {MARKETS[market].name}</p></div>
        {(user || free) && <Button variant="ghost" size="icon" title={notifying ? 'Disable device alerts' : 'Enable device alerts'} aria-label={notifying ? 'Disable device alerts' : 'Enable device alerts'} onClick={enableNotifications}>{notifying ? <Bell/> : <BellOff/>}</Button>}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><BrandLogo className="h-11 w-11" /><h1 className="font-display text-4xl leading-none sm:text-5xl">AurumPulse</h1></div><InstallApp /></div>
      {ready && !user && <section className="card-glow mt-6 rounded-lg p-5"><p className="font-display text-3xl text-gold">3 DAYS FREE</p><p className="mt-2 text-sm">Create an account to get live BUY/SELL signals for 5 markets. After the trial, pick a package:</p><div className="mt-4 grid grid-cols-3 gap-2">{planIds.map(id => <Link key={id} to="/packages" className="rounded-lg border border-gold/40 bg-card p-3 text-center hover:border-gold"><p className="text-xs text-muted-foreground">{PLANS[id].label}</p><p className="font-display text-3xl text-gold">${PLANS[id].price}</p><p className="text-[10px] text-muted-foreground">{PLANS[id].days} {PLANS[id].days === 1 ? "day" : "days"}</p></Link>)}</div><Button asChild className="btn-gold mt-4 w-full"><Link to="/auth">Start free trial</Link></Button></section>}
      {user && access && !allowed && <section className="card-glow mt-6 rounded-lg p-5"><p className="font-display text-3xl text-gold">TRIAL ENDED</p><p className="mt-2 text-sm">Your 3-day free trial has expired. Get a premium package to keep receiving signals.</p><div className="mt-4 grid grid-cols-3 gap-2">{planIds.map(id => <Link key={id} to="/packages" className="rounded-lg border border-gold/40 bg-card p-3 text-center hover:border-gold"><p className="text-xs text-muted-foreground">{PLANS[id].label}</p><p className="font-display text-3xl text-gold">${PLANS[id].price}</p><p className="text-[10px] text-muted-foreground">{PLANS[id].days} {PLANS[id].days === 1 ? "day" : "days"}</p></Link>)}</div><Button asChild className="btn-gold mt-4 w-full"><Link to="/packages">See packages — from $1</Link></Button></section>}
      {user && access && allowed && <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>{access.state.kind === 'trial' ? `Free trial · ends ${new Date(access.state.until).toLocaleDateString()}` : access.isAdmin ? 'Admin' : `Premium · until ${new Date((access.state as {until:string}).until).toLocaleDateString()}`}</span><Link to="/packages" className="text-gold underline">Packages</Link></div>}
      {allowed && <>
      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5" aria-label="Markets">
        {marketIds.map(id => <Button key={id} variant={market===id ? 'default' : 'outline'} aria-pressed={market===id} onClick={() => {setMarket(id);setNotice('');}}>{id}</Button>)}
      </div>
      <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><Radio className={`size-4 shrink-0 ${running ? 'text-bull' : 'text-gold'}`}/><span>{running ? `Scanning · updated ${fmt(latest ?? '')}` : 'Always-on scanner awaiting activation'}{latest && !running ? ` · last update ${fmt(latest)}` : ''}</span></div>
      <Button onClick={go} disabled={loading!==null} className="btn-gold mt-5 h-16 w-full rounded-lg font-display text-2xl"><RefreshCw className={loading===market ? 'animate-spin motion-reduce:animate-none' : ''}/>{loading===market ? 'Scanning market…' : 'Signal Now'}</Button>
      {err && <p role="alert" className="mt-4 text-sm text-bear">{err}</p>}
      {notice && <div role="status" className="mt-4 border-l-2 border-gold pl-3 text-sm">{notice}</div>}
      {scan && !s && <section className="mt-7 border-y border-border py-6"><p className="font-display text-4xl text-gold">{scan.status === 'closed' ? 'MARKET CLOSED' : scan.status === 'stale' ? 'DELAYED DATA' : 'UNAVAILABLE'}</p><p className="mt-2 text-sm text-muted-foreground">{scan.error}</p><p className="mt-2 text-xs text-muted-foreground">Checked {fmt(scan.scanned_at)}</p></section>}
      {s && <section className="mt-7 space-y-4 animate-in fade-in slide-in-from-bottom-2">
        <div className="card-glow rounded-lg p-5">
          <p className="text-xs text-muted-foreground">{market} · {fmt(s.time)} → {fmt(s.validUntil)}</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <p className={`font-display text-6xl ${stale || expired ? 'text-muted-foreground' : tone}`}>{stale || expired ? 'EXPIRED' : s.direction}</p>
            <div className="text-right"><p className="text-xs text-muted-foreground">{market==='XAUUSD' ? 'Gold quote' : 'Price'}</p><p className="font-mono text-2xl">{price(market,s.spot)}</p><p className="text-xs text-muted-foreground">Signal strength {s.confidence}%</p></div>
          </div>
          <p className="mt-4 text-sm leading-relaxed">{stale || expired ? 'This result is no longer current. Check again before considering a trade.' : s.summary}</p>
          <p className="mt-3 text-xs text-muted-foreground">Market candle {fmt(s.dataTime)}{s.direction === 'WAIT' ? ' · No alert' : ''}</p>
        </div>
        {s.direction !== 'WAIT' && !stale && !expired && <div className="grid grid-cols-2 gap-3">{[
          {name:'Entry',value:s.entry,color:''},{name:'Stop loss',value:s.stopLoss,color:'text-bear'},{name:'Target 1',value:s.tp1,color:'text-bull'},{name:'Target 2',value:s.tp2,color:'text-bull'},
        ].map(item => <div key={item.name} className="rounded-lg border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{item.name}</p><p className={`mt-1 break-words font-mono text-lg ${item.color}`}>{price(market,item.value)}</p></div>)}</div>}
        {user && !free && s.direction !== 'WAIT' && !stale && !expired && <TakeEntry market={market} direction={s.direction as 'BUY' | 'SELL'} />}
        <div className="grid grid-cols-2 gap-3">{[{name:'Support (32 candles)',value:s.support},{name:'Resistance (32 candles)',value:s.resistance}].map(item => <div key={item.name} className="rounded-lg border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{item.name}</p><p className="mt-1 font-mono text-lg">{price(market,item.value)}</p></div>)}</div>
        <div className="divide-y divide-border rounded-lg border border-border bg-card">{s.indicators.map(i => <div key={i.name} className="flex flex-wrap justify-between gap-x-3 gap-y-1 px-4 py-3 text-sm"><span className="text-muted-foreground">{i.name}</span><span className={`font-mono ${i.bias==='bull' ? 'text-bull' : i.bias==='bear' ? 'text-bear' : ''}`}>{i.value}</span></div>)}</div>
      </section>}
      <section className="mt-8 border-t border-border pt-5">
        <div className="flex items-center justify-between"><h2 className="font-display text-2xl">Signal alerts</h2><span className="text-xs text-muted-foreground">BUY / SELL only</span></div>
        {!board?.alerts.length ? <p className="mt-3 text-sm text-muted-foreground">No new signals.</p> : <div className="mt-3 divide-y divide-border">{board.alerts.slice(0,8).map(alert => <Button key={alert.id} variant="ghost" className="h-auto w-full justify-between rounded-none px-0 py-3" onClick={() => setMarket(alert.market as Market)}><span className="font-mono">{alert.market} <span className={alert.direction==='BUY' ? 'text-bull' : 'text-bear'}>{alert.direction}</span></span><span className="text-xs text-muted-foreground">{fmt(alert.created_at)} · {clock>0 && new Date(alert.valid_until).getTime()<=clock ? 'Expired' : 'Active'}</span></Button>)}</div>}
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm"><span>WhatsApp</span><span className="text-muted-foreground">Not connected</span></div>
      </section>
      </>}
      <AlertDialog open={ask} onOpenChange={o => { if (!o) { sessionStorage.setItem('ap-notif-asked','1'); setAsk(false); } }}>
        <AlertDialogContent className="border-gold/30">
          <AlertDialogHeader><div className="btn-gold mx-auto flex h-14 w-14 items-center justify-center rounded-full"><Bell className="h-7 w-7"/></div>
            <AlertDialogTitle className="text-center font-display text-3xl">Get signal alerts?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">Do you want BUY/SELL signals as automatic notifications? Tap Yes, then choose Allow.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Not now</AlertDialogCancel><AlertDialogAction className="btn-gold" onClick={() => { sessionStorage.setItem('ap-notif-asked','1'); void enableNotifications(); }}>Yes, notify me</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <p className="mt-7 text-xs leading-relaxed text-muted-foreground">Educational only, not financial advice. Signal strength is an indicator score, not a probability of profit. Yahoo market feeds may be delayed; gold uses spot and COMEX futures. Device alerts require permission and an open app.</p>
    </div>
  </main>;
}
