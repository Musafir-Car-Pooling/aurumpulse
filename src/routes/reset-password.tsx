import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";
import { Eye, EyeOff, Lock } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Reset password — AurumPulse" },
    { name: "description", content: "Set a new password for your AurumPulse account." },
    { property: "og:title", content: "Reset password — AurumPulse" },
    { property: "og:description", content: "Set a new password for your AurumPulse account." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [recovery, setRecovery] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);

  useEffect(() => {
    // Recovery links arrive with type=recovery in the URL hash.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hash.get("type") === "recovery") { setRecovery(true); return; }
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    void supabase.auth.getSession().then(({ data: d }) => {
      setRecovery((r) => r ?? Boolean(d.session));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setMsg(/weak|easy to guess|pwned/i.test(error.message) ? "This password is too common. Use a stronger one (8+ characters with letters, numbers and a symbol)." : error.message);
    else { setMsg("Password updated! Taking you to your signals…"); setTimeout(() => void nav({ to: "/" }), 1200); }
  };

  return <main className="relative flex min-h-screen flex-col overflow-hidden bg-background px-6 pb-8 pt-12 text-foreground">
    <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gold/20 blur-3xl" />
    <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col">
      <div className="flex items-center gap-3">
        <BrandLogo />
        <div><h1 className="font-display text-4xl leading-none">AURUMPULSE</h1><p className="text-xs tracking-widest text-gold">LIVE MARKET SIGNALS</p></div>
      </div>
      <div className="mt-10 flex-1">
        <h2 className="text-2xl font-semibold">Set a new password</h2>
        {recovery === false ? (
          <div className="mt-4 space-y-4">
            <p role="status" className="rounded-xl border border-bear/40 bg-muted p-3 text-sm">This reset link is invalid or has expired. Please request a new one from the sign-in page.</p>
            <Link to="/auth" className="inline-flex h-14 w-full items-center justify-center rounded-xl border border-border text-base font-medium hover:bg-muted">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="relative"><Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input type={show ? "text" : "password"} required minLength={8} placeholder="New password (8+ characters)" value={password} onChange={e => setPassword(e.target.value)} aria-label="New password" className="h-14 rounded-xl pl-12 pr-12 text-base" />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-gold">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>
            <Button type="submit" disabled={busy || recovery !== true} className="btn-gold h-14 w-full rounded-xl text-base font-semibold">{busy ? "Please wait…" : "Update password"}</Button>
          </form>
        )}
        {msg && <p role="status" className="mt-4 rounded-xl border border-gold/40 bg-muted p-3 text-sm">{msg}</p>}
      </div>
    </div>
  </main>;
}
