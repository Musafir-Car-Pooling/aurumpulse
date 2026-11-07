import { useEffect, useState } from "react";
import { Download, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BrandLogo } from "@/components/BrandLogo";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [ios, setIos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const isInstalled = () => standalone.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(isInstalled());
    const apple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIos(apple);
    const receive = (event: Event) => {
      event.preventDefault(); setPrompt(event as InstallPromptEvent);
      if (!isInstalled() && !sessionStorage.getItem("ap-install-dismissed") && !document.querySelector('[role="alertdialog"]')) setOpen(true);
    };
    const complete = () => { setInstalled(true); setPrompt(null); setOpen(false); };
    const modeChange = () => setInstalled(isInstalled());
    window.addEventListener("beforeinstallprompt", receive);
    window.addEventListener("appinstalled", complete);
    standalone.addEventListener("change", modeChange);
    const timer = apple && !isInstalled() ? window.setTimeout(() => {
      if (!sessionStorage.getItem("ap-install-dismissed") && !document.querySelector('[role="alertdialog"]')) setOpen(true);
    }, 2500) : undefined;
    return () => {
      window.removeEventListener("beforeinstallprompt", receive);
      window.removeEventListener("appinstalled", complete);
      standalone.removeEventListener("change", modeChange);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, []);
  const changeOpen = (value: boolean) => {
    setOpen(value); setMessage("");
    if (!value) sessionStorage.setItem("ap-install-dismissed", "1");
  };
  const install = async () => {
    if (!prompt) return;
    setBusy(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setPrompt(null);
      if (choice.outcome === "accepted") setOpen(false);
      else changeOpen(false);
    } catch { setMessage("Installation couldn't start. Try your browser's install menu."); }
    finally { setBusy(false); }
  };
  if (installed) return null;
  return <>
    <Button variant="outline" size="sm" className="gap-2 border-gold/30 text-gold" onClick={() => changeOpen(true)}><Download />Install app</Button>
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-lg border-gold/30 p-6">
        <DialogHeader>
          <BrandLogo className="mx-auto h-20 w-20" />
          <DialogTitle className="text-center font-display text-3xl">Install AurumPulse</DialogTitle>
          <DialogDescription className="text-center">Gold, Bitcoin & forex signals on your home screen.</DialogDescription>
        </DialogHeader>
        {prompt ? <Button className="btn-gold h-12 w-full" disabled={busy} onClick={() => void install()}><Download />{busy ? "Opening installer…" : "Install app"}</Button>
          : ios ? <div className="space-y-3 text-sm"><p className="flex items-center gap-2"><Share className="size-5 shrink-0 text-gold" />Open this page in Safari and tap Share.</p><p className="flex items-center gap-2"><Smartphone className="size-5 shrink-0 text-gold" />Choose Add to Home Screen, then Add.</p></div>
          : <p className="text-sm leading-relaxed text-muted-foreground">Open your browser menu and choose Install AurumPulse or Add to Home Screen. If the option is missing, try Chrome or Edge.</p>}
        {message && <p role="status" className="text-sm text-bear">{message}</p>}
        <Button variant="ghost" onClick={() => changeOpen(false)}>Not now</Button>
      </DialogContent>
    </Dialog>
  </>;
}