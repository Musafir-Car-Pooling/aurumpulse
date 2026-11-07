import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { hashKey } from "@/lib/mt5";

const body = z.object({
  id: z.string().uuid(), ok: z.boolean(),
  ticket: z.string().max(40).optional(), price: z.number().optional(), error: z.string().max(200).optional(),
});

export const Route = createFileRoute("/api/public/mt5/report")({
  server: { handlers: { POST: async ({ request }) => {
    const key = request.headers.get("x-ap-key") ?? "";
    if (!/^ap_[0-9a-f]{48}$/.test(key)) return new Response("Unauthorized", { status: 401 });
    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return new Response("Bad request", { status: 400 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin.from("mt5_links").select("user_id").eq("key_hash", await hashKey(key)).maybeSingle();
    if (!link) return new Response("Unauthorized", { status: 401 });
    const d = parsed.data;
    await supabaseAdmin.from("trade_orders").update({
      status: d.ok ? "executed" : "failed", ticket: d.ticket ?? null, price: d.price ?? null, error: d.error ?? null, done_at: new Date().toISOString(),
    }).eq("id", d.id).eq("user_id", link.user_id).eq("status", "sent");
    return new Response("OK");
  } } },
});
