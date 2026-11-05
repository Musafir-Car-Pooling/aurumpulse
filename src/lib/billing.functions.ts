import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { accessState, PLANS, planIds, MANUAL_CHANNELS, type PlanId } from "./plans";

const planSchema = z.enum(planIds as [PlanId, ...PlanId[]]);

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [access, admin, payments] = await Promise.all([
      context.supabase.from("user_access").select("trial_ends_at,premium_until,plan").eq("user_id", context.userId).maybeSingle(),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.from("payment_requests").select("id,plan,amount_usd,method,status,created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(5),
    ]);
    const isAdmin = admin.data === true;
    return { state: accessState(access.data, Date.now(), isAdmin), isAdmin, payments: payments.data ?? [] };
  });

export const submitManualPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    plan: planSchema,
    channel: z.enum(MANUAL_CHANNELS.map(c => c.id) as [string, ...string[]]),
    reference: z.string().trim().min(3).max(120),
    proofPath: z.string().max(300),
  }).parse(input))
  .handler(async ({ data, context }) => {
    if (!data.proofPath.startsWith(`${context.userId}/`)) throw new Error("Invalid proof file");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("payment_requests").insert({
      user_id: context.userId, email: (context.claims.email as string | undefined) ?? null,
      plan: data.plan, amount_usd: PLANS[data.plan].price, method: "manual",
      manual_channel: data.channel, reference: data.reference, proof_path: data.proofPath,
    });
    if (error) throw new Error("Could not save your payment");
    return { ok: true };
  });

export const createCryptoInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ plan: planSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env['NOWPAYMENTS_API_KEY'];
    if (!apiKey) throw new Error("Crypto payments are not set up yet");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("payment_requests").insert({
      user_id: context.userId, email: (context.claims.email as string | undefined) ?? null,
      plan: data.plan, amount_usd: PLANS[data.plan].price, method: "crypto",
    }).select("id").single();
    if (error || !row) throw new Error("Could not start payment");
    const origin = new URL(getRequest().url).origin;
    const res = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        price_amount: PLANS[data.plan].price, price_currency: "usd", order_id: row.id,
        order_description: `AurumPulse ${PLANS[data.plan].label} package`,
        ipn_callback_url: `${origin}/api/public/nowpayments`,
        success_url: `${origin}/packages?paid=1`, cancel_url: `${origin}/packages`,
      }),
    });
    const body = await res.json().catch(() => ({})) as { invoice_url?: string; id?: string | number };
    if (!res.ok || !body.invoice_url) throw new Error("Crypto checkout is unavailable right now");
    await supabaseAdmin.from("payment_requests").update({ provider_payment_id: String(body.id ?? "") }).eq("id", row.id);
    return { url: body.invoice_url };
  });

export const adminListPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Not allowed");
    const { data, error } = await context.supabase.from("payment_requests").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    const rows = await Promise.all((data ?? []).map(async r => {
      if (!r.proof_path) return { ...r, proof_url: null };
      const { data: s } = await context.supabase.storage.from("payment-proofs").createSignedUrl(r.proof_path, 3600);
      return { ...r, proof_url: s?.signedUrl ?? null };
    }));
    return rows;
  });

export const adminDecidePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_decide_payment", { p_id: data.id, p_approve: data.approve });
    if (error) throw new Error("Could not update payment");
    return { ok: true };
  });
