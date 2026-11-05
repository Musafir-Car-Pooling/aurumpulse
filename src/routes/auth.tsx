import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";

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
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { if (ready && user) void nav({ to: "/" }); }, [ready, user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg("");
    const { error } = mode === "up"
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMsg(error.message);
    else if (mode === "up") setMsg("Check your email to confirm your account, then sign in.");
  };
  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setMsg("Google sign-in failed. Try again.");
  };

  return <main className="min-h-screen bg-background px-5 py-12 text-foreground">
    <div className="mx-auto max-w-sm">
      <h1 className="font-display text-5xl">AurumPulse</h1>
      <p className="mt-2 text-sm text-muted-foreground">{mode === "up" ? "Create an account — first 3 days of signals are free." : "Welcome back."}</p>
      <Button variant="outline" className="mt-6 w-full" onClick={google}>Continue with Google</Button>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <Input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} aria-label="Email" />
        <Input type="password" required minLength={6} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} aria-label="Password" />
        <Button type="submit" disabled={busy} className="btn-gold w-full">{mode === "up" ? "Start free trial" : "Sign in"}</Button>
      </form>
      {msg && <p role="status" className="mt-3 text-sm">{msg}</p>}
      <button className="mt-4 text-sm text-gold underline" onClick={() => { setMode(mode === "up" ? "in" : "up"); setMsg(""); }}>
        {mode === "up" ? "Already have an account? Sign in" : "New here? Start free trial"}
      </button>
    </div>
  </main>;
}
