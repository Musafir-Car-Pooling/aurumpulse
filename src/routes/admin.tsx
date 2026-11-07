import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { AppMenu } from "@/components/AppMenu";
import { adminSetPremium, getPremiumMode } from "@/lib/public.functions";
import { adminDecidePayment, adminDeleteMethod, adminListPayments, adminListUsers, adminSaveMethod, listPaymentMethods } from "@/lib/billing.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Admin panel — AurumPulse" },
    { name: "description", content: "Manage AurumPulse payments, users and payment methods." },
    { property: "og:title", content: "Admin panel — AurumPulse" },
    { property: "og:description", content: "Approve payments, view users and manage payment methods." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Admin,
});
type Rows = Awaited<ReturnType<typeof adminListPayments>>;
type Users = Awaited<ReturnType<typeof adminListUsers>>;
type Methods = Awaited<ReturnType<typeof listPaymentMethods>>;
const d = (s: string | null) => s ? new Date(s).toLocaleDateString() : "—";

function Admin() {
  const { user, ready } = useAuth();
  const list = useServerFn(adminListPayments), decide = useServerFn(adminDecidePayment), users = useServerFn(adminListUsers);
  const methodsFn = useServerFn(listPaymentMethods), save = useServerFn(adminSaveMethod), del = useServerFn(adminDeleteMethod);
  const [rows, setRows] = useState<Rows | null>(null), [us, setUs] = useState<Users>([]), [ms, setMs] = useState<Methods>([]);
  const [err, setErr] = useState(""), [form, setForm] = useState({ label: "", details: "" });
  const readMode = useServerFn(getPremiumMode), setMode = useServerFn(adminSetPremium);
  const [premium, setPremium] = useState<boolean | null>(null);
  useEffect(() => { readMode().then(m => setPremium(m.premium)).catch(() => {}); }, [readMode]);
  const load = useCallback(async () => {
    try { const [r, u, m] = await Promise.all([list(), users(), methodsFn()]); setRows(r); setUs(u); setMs(m); setErr(""); }
    catch { setErr("Admin access only."); }
  }, [list, users, methodsFn]);
  useEffect(() => { if (user) void load(); }, [user, load]);
  const act = async (id: string, approve: boolean) => { await decide({ data: { id, approve } }); void load(); };
  const pending = rows?.filter(r => r.status === "pending").length ?? 0;
  const now = Date.now();
  const premium = us.filter(u => u.premium_until && new Date(u.premium_until).getTime() > now).length;

  return <main className="min-h-screen bg-background px-5 py-8 text-foreground">
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-2">{user && <AppMenu email={user.email ?? ""} isAdmin status="Admin" />}<h1 className="font-display text-4xl">Admin panel</h1></div>
      {ready && !user && <p className="mt-4 text-sm">Please <Link to="/auth" className="text-gold underline">sign in</Link>.</p>}
      {err && <p className="mt-4 text-sm text-bear">{err}</p>}
      {!err && rows && <>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[["Users", us.length], ["Premium", premium], ["Pending", pending]].map(([k, v]) => <div key={k} className="card-glow rounded-xl p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="font-display text-4xl text-gold">{v}</p></div>)}
        </div>
        <Tabs defaultValue="payments" className="mt-6">
          <TabsList className="grid w-full grid-cols-4"><TabsTrigger value="payments">Payments</TabsTrigger><TabsTrigger value="users">Users</TabsTrigger><TabsTrigger value="methods">Methods</TabsTrigger><TabsTrigger value="settings">Settings</TabsTrigger></TabsList>
          <TabsContent value="settings" className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-4">
              <div><p className="font-semibold">Premium mode</p><p className="mt-1 text-xs text-muted-foreground">{premium === false ? "OFF — everyone sees free signals. No sign-up, login or packages." : "ON — users must sign up, get a 3-day trial, then buy a package."}</p></div>
              <Switch checked={premium !== false} disabled={premium === null} onCheckedChange={async v => { setPremium(v); try { await setMode({ data: { premium: v } }); } catch { setPremium(!v); } }} aria-label="Premium mode" />
            </div>
          </TabsContent>
          <TabsContent value="payments" className="divide-y divide-border rounded-xl border border-border bg-card">
            {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No payments yet.</p>}
            {rows.map(r => <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div className="min-w-0">
                <p className="truncate font-mono">{r.email ?? r.user_id}</p>
                <p className="text-muted-foreground">{r.plan} · ${r.amount_usd} · {r.method}{r.manual_channel ? ` (${r.manual_channel})` : ""} · {new Date(r.created_at).toLocaleString()}</p>
                {r.reference && <p className="text-xs">Ref: {r.reference}</p>}
                {r.proof_url && <a href={r.proof_url} target="_blank" rel="noreferrer" className="text-xs text-gold underline">View screenshot</a>}
              </div>
              {r.status === "pending" && r.method === "manual"
                ? <div className="flex gap-2"><Button size="sm" onClick={() => act(r.id, true)}>Approve</Button><Button size="sm" variant="outline" onClick={() => act(r.id, false)}>Reject</Button></div>
                : <span className={r.status === "approved" ? "text-bull" : r.status === "rejected" ? "text-bear" : "text-muted-foreground"}>{r.status}</span>}
            </div>)}
          </TabsContent>
          <TabsContent value="users" className="divide-y divide-border rounded-xl border border-border bg-card">
            {us.map(u => { const prem = u.premium_until && new Date(u.premium_until).getTime() > now; const trial = u.trial_ends_at && new Date(u.trial_ends_at).getTime() > now;
              return <div key={u.user_id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div className="min-w-0"><p className="truncate font-mono">{u.email}</p><p className="text-xs text-muted-foreground">Joined {d(u.created_at)}{prem ? ` · ${u.plan} until ${d(u.premium_until)}` : trial ? ` · trial until ${d(u.trial_ends_at)}` : ""}</p></div>
                <span className={`shrink-0 text-xs ${u.is_admin ? "text-gold" : prem ? "text-bull" : trial ? "" : "text-muted-foreground"}`}>{u.is_admin ? "Admin" : prem ? "Premium" : trial ? "Trial" : "Expired"}</span>
              </div>; })}
          </TabsContent>
          <TabsContent value="methods" className="space-y-3">
            {ms.map(m => <MethodRow key={m.id} m={m} onSave={async v => { await save({ data: { id: m.id, ...v } }); void load(); }} onDelete={async () => { await del({ data: { id: m.id } }); void load(); }} />)}
            <form className="space-y-2 rounded-xl border border-dashed border-gold/40 p-4" onSubmit={async e => { e.preventDefault(); await save({ data: { ...form, active: true } }); setForm({ label: "", details: "" }); void load(); }}>
              <p className="text-sm font-semibold">Add payment method</p>
              <Input required placeholder="Name (e.g. Easypaisa)" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
              <Input required placeholder="Account / wallet details" value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} />
              <Button type="submit" className="btn-gold w-full">Add method</Button>
            </form>
          </TabsContent>
        </Tabs>
      </>}
    </div>
  </main>;
}

function MethodRow({ m, onSave, onDelete }: { m: Methods[number]; onSave: (v: { label: string; details: string; active: boolean }) => Promise<void>; onDelete: () => Promise<void> }) {
  const [label, setLabel] = useState(m.label), [details, setDetails] = useState(m.details), [active, setActive] = useState(m.active);
  return <div className="space-y-2 rounded-xl border border-border bg-card p-4">
    <Input value={label} onChange={e => setLabel(e.target.value)} aria-label="Method name" />
    <Input value={details} onChange={e => setDetails(e.target.value)} aria-label="Method details" className="font-mono text-xs" />
    <div className="flex items-center justify-between gap-2">
      <label className="flex items-center gap-2 text-sm"><Switch checked={active} onCheckedChange={setActive} />Visible</label>
      <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void onDelete()}>Delete</Button><Button size="sm" onClick={() => void onSave({ label, details, active })}>Update</Button></div>
    </div>
  </div>;
}
