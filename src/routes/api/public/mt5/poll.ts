import { createFileRoute } from "@tanstack/react-router";
import { hashKey } from "@/lib/mt5";

export const Route = createFileRoute("/api/public/mt5/poll")({
  server: { handlers: { GET: async ({ request }) => {
    const key = request.headers.get("x-ap-key") ?? "";
    if (!/^ap_[0-9a-f]{48}$/.test(key)) return new Response("Unauthorized", { status: 401 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("claim_mt5_order", { p_key_hash: await hashKey(key) });
    if (error) return new Response(error.message.includes("INVALID_KEY") ? "Unauthorized" : "Error", { status: error.message.includes("INVALID_KEY") ? 401 : 500 });
    const o = data?.[0];
    // Plain one-line format is easy for MQL5 to parse: id|market|direction|lot
    return new Response(o ? `${o.id}|${o.market}|${o.direction}|${o.lot}` : "NONE", { headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
  } } },
});
