import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Crown, LayoutDashboard, LogIn, LogOut, Menu, Plug, Shield, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";

type Props = { email?: string; status: string; isAdmin: boolean; premium?: boolean; signedIn?: boolean };

export function AppMenu({ email, status, isAdmin, premium = true, signedIn = true }: Props) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    void nav({ to: "/auth", replace: true });
  };
  const items = [
    { to: "/", label: "Live signals", icon: LayoutDashboard },
    ...(premium ? [{ to: "/packages", label: "Premium packages", icon: Crown }] : []),
    ...(premium ? [{ to: "/mt5", label: "Connect MT5", icon: Plug }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "Admin panel", icon: Shield }] : []),
  ] as const;
  return <Sheet>
    <SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Open menu"><Menu /></Button></SheetTrigger>
    <SheetContent side="left" className="flex w-80 flex-col border-gold/20 bg-background p-0">
      <SheetHeader className="border-b border-border p-6 text-left">
        <div className="flex items-center gap-2"><BrandLogo className="h-10 w-10" /><SheetTitle className="font-display text-3xl text-gold">AURUMPULSE</SheetTitle></div>
        {signedIn ? <div className="mt-4 flex items-center gap-3">
          <div className="btn-gold flex h-12 w-12 shrink-0 items-center justify-center rounded-full"><UserRound className="h-6 w-6" /></div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{email}</p>
            <p className="flex items-center gap-1 text-xs text-gold"><Sparkles className="h-3 w-3" />{status}</p>
          </div>
        </div> : <div className="mt-4 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/40 text-gold"><UserRound className="h-6 w-6" /></div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Not signed in</p>
            <p className="text-xs text-muted-foreground">Sign in to keep your access</p>
          </div>
        </div>}
      </SheetHeader>
      <nav className="flex-1 space-y-1 p-3">
        {items.map(i => <Link key={i.to} to={i.to} className="flex h-12 items-center gap-3 rounded-xl px-4 text-sm hover:bg-muted" activeProps={{ className: "bg-muted text-gold" }} activeOptions={{ exact: true }}><i.icon className="h-5 w-5" />{i.label}</Link>)}
      </nav>
      <div className="border-t border-border p-3">
        {signedIn
          ? <button onClick={() => void signOut()} className="flex h-12 w-full items-center gap-3 rounded-xl px-4 text-sm text-bear hover:bg-muted"><LogOut className="h-5 w-5" />Sign out</button>
          : <Link to="/auth" className="btn-gold flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold"><LogIn className="h-5 w-5" />Sign in or create account</Link>}
      </div>
    </SheetContent>
  </Sheet>;
}

export function statusLabel(kind: string | undefined, isAdmin: boolean, until?: string) {
  if (isAdmin) return "Admin";
  if (kind === "trial") return `Free trial · ends ${until ? new Date(until).toLocaleDateString() : ""}`;
  if (kind === "premium") return `Premium · until ${until ? new Date(until).toLocaleDateString() : ""}`;
  return "Trial ended";
}
