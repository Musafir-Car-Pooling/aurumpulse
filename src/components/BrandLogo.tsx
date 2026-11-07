import logo from "@/assets/aurumpulse-logo-pulse.png";

export function BrandLogo({ className = "h-12 w-12" }: { className?: string }) {
  return <img src={logo} alt="AurumPulse logo" width={1024} height={1024} className={`shrink-0 object-contain ${className}`} />;
}