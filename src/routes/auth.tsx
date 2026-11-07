import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, TrendingUp, Zap } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in — AurumPulse" },
    { name: "description", content: "Sign in to AurumPulse and start your 3-day free trial of gold, Bitcoin and forex signals." },
    { property: "og:title", content: "Sign in — AurumPulse" },
    { property: "og:description", content: "Start a 3-day free trial of live BUY/SELL signals." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { user, ready } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { if (ready && user) void nav({ to: user.email?.toLowerCase() === "pp@gmail.com" ? "/admin" : "/" }); }, [ready, user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg("");
    const { error } = mode === "up"
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMsg(/weak|easy to guess|pwned/i.test(error.message) ? "This password is too common. Use a stronger one (8+ characters with letters, numbers and a symbol)." : /already registered/i.test(error.message) ? "This email already has an account — tap Sign in below." : /not confirmed/i.test(error.message) ? "Please confirm your email first (check inbox/spam), then sign in." : error.message);
    else if (mode === "up") setMsg("Check your email to confirm your account, then sign in.");
  };
  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setMsg("Google sign-in failed. Try again.");
  };

  return <main className="relative flex min-h-screen flex-col overflow-hidden bg-background px-6 pb-8 pt-12 text-foreground">
    <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gold/20 blur-3xl" />
    <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col">
      <div className="flex items-center gap-3">
        <div className="btn-gold flex h-12 w-12 items-center justify-center rounded-xl"><TrendingUp className="h-6 w-6" /></div>
        <div><h1 className="font-display text-4xl leading-none">AURUMPULSE</h1><p className="text-xs tracking-widest text-gold">LIVE MARKET SIGNALS</p></div>
      </div>
      <div className="mt-10 flex-1">
        <div className="grid grid-cols-2 rounded-xl bg-muted p-1 text-sm">
          {(["up", "in"] as const).map(m => <button key={m} type="button" onClick={() => { setMode(m); setMsg(""); }} className={`h-10 rounded-lg font-medium transition ${mode === m ? "btn-gold" : "text-muted-foreground"}`}>{m === "up" ? "Sign up" : "Sign in"}</button>)}
        </div>
        <h2 className="mt-6 text-2xl font-semibold">{mode === "up" ? "Start your free trial" : "Welcome back"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{mode === "up" ? "3 days of free BUY/SELL signals on 5 markets." : "Sign in to see your live signals."}</p>
        <Button variant="outline" className="mt-6 h-14 w-full rounded-xl text-base" onClick={google}>Continue with Google</Button>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />OR<span className="h-px flex-1 bg-border" /></div>
        <form onSubmit={submit} className="space-y-4">
          <div className="relative"><Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input type="email" required placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} aria-label="Email" className="h-14 rounded-xl pl-12 text-base" /></div>
          <div className="relative"><Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input type={show ? "text" : "password"} required minLength={mode === "up" ? 8 : 1} placeholder={mode === "up" ? "Password (8+ characters)" : "Password"} value={password} onChange={e => setPassword(e.target.value)} aria-label="Password" className="h-14 rounded-xl pl-12 pr-12 text-base" />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-gold">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>
          <Button type="submit" disabled={busy} className="btn-gold h-14 w-full rounded-xl text-base font-semibold">{busy ? "Please wait…" : mode === "up" ? "Start free trial" : "Sign in"}</Button>
        </form>
        {msg && <p role="status" className="mt-4 rounded-xl border border-gold/40 bg-muted p-3 text-sm">{msg}</p>}
      </div>
      <div className="mt-10 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
        <div><ShieldCheck className="mx-auto mb-1 h-5 w-5 text-gold" />Secure</div>
        <div><Zap className="mx-auto mb-1 h-5 w-5 text-gold" />Real-time</div>
        <div><TrendingUp className="mx-auto mb-1 h-5 w-5 text-gold" />5 markets</div>
      </div>
    </div>
  </main>;
}
