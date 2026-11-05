import { createFileRoute } from "@tanstack/react-router";

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = sortKeys((value as Record<string, unknown>)[k]); return acc;
    }, {});
  }
  return value;
}

async function hmacSha512(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/nowpayments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.NOWPAYMENTS_IPN_SECRET;
        if (!secret) return new Response("Not configured", { status: 503 });
        const raw = await request.text();
        let body: Record<string, unknown>;
        try { body = JSON.parse(raw); } catch { return new Response("Bad request", { status: 400 }); }
        const expected = await hmacSha512(secret, JSON.stringify(sortKeys(body)));
        const given = (request.headers.get("x-nowpayments-sig") ?? "").toLowerCase();
        if (!safeEqual(expected, given)) return new Response("Invalid signature", { status: 401 });
        const orderId = String(body.order_id ?? "");
        const status = String(body.payment_status ?? "");
        if (status === "finished" && /^[0-9a-f-]{36}$/i.test(orderId)) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: row } = await supabaseAdmin.from("payment_requests").select("id,method,amount_usd").eq("id", orderId).maybeSingle();
          const paid = Number(body.price_amount ?? 0);
          if (row && row.method === "crypto" && paid >= Number(row.amount_usd)) {
            const { error } = await supabaseAdmin.rpc("activate_payment", { p_id: orderId });
            if (error) return new Response("Retry", { status: 500 });
          }
        }
        return new Response("ok");
      },
    },
  },
});
