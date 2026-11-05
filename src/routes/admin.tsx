import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { adminDecidePayment, adminListPayments } from "@/lib/billing.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Payments admin — AurumPulse" },
    { name: "description", content: "Review and approve AurumPulse premium payments." },
    { property: "og:title", content: "Payments admin — AurumPulse" },
    { property: "og:description", content: "Approve manual premium payments." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Admin,
});
type Rows = Awaited<ReturnType<typeof adminListPayments>>;

function Admin() {
  const { user, ready } = useAuth();
  const list = useServerFn(adminListPayments), decide = useServerFn(adminDecidePayment);
  const [rows, setRows] = useState<Rows | null>(null), [err, setErr] = useState("");
  const load = useCallback(async () => { try { setRows(await list()); setErr(""); } catch { setErr("Admin access only."); } }, [list]);
  useEffect(() => { if (user) void load(); }, [user, load]);
  const act = async (id: string, approve: boolean) => { await decide({ data: { id, approve } }); void load(); };

  return <main className="min-h-screen bg-background px-5 py-10 text-foreground">
    <div className="mx-auto max-w-3xl">
      <Link to="/packages" className="text-xs text-gold">← Packages</Link>
      <h1 className="mt-2 font-display text-5xl">Payments</h1>
      {ready && !user && <p className="mt-4 text-sm">Please <Link to="/auth" className="text-gold underline">sign in</Link>.</p>}
      {err && <p className="mt-4 text-sm text-bear">{err}</p>}
      <div className="mt-6 divide-y divide-border rounded-lg border border-border bg-card">
        {rows?.length === 0 && <p className="p-4 text-sm text-muted-foreground">No payments yet.</p>}
        {rows?.map(r => <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div>
            <p className="font-mono">{r.email ?? r.user_id}</p>
            <p className="text-muted-foreground">{r.plan} · ${r.amount_usd} · {r.method}{r.manual_channel ? ` (${r.manual_channel})` : ""} · {new Date(r.created_at).toLocaleString()}</p>
            {r.reference && <p className="text-xs">Ref: {r.reference}</p>}
            {r.proof_url && <a href={r.proof_url} target="_blank" rel="noreferrer" className="text-xs text-gold underline">View screenshot</a>}
          </div>
          {r.status === "pending" && r.method === "manual"
            ? <div className="flex gap-2"><Button size="sm" onClick={() => act(r.id, true)}>Approve</Button><Button size="sm" variant="outline" onClick={() => act(r.id, false)}>Reject</Button></div>
            : <span className={r.status === "approved" ? "text-bull" : r.status === "rejected" ? "text-bear" : "text-muted-foreground"}>{r.status}</span>}
        </div>)}
      </div>
    </div>
  </main>;
}
