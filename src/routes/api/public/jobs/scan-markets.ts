import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { marketIds } from "@/lib/markets";
import { scanMarket } from "@/lib/market-data";
import { canTrade } from "@/lib/mt5";
import type { Json } from "@/integrations/supabase/types";
export const Route = createFileRoute('/api/public/jobs/scan-markets')({
  server:{handlers:{POST:async ({request}) => {
    const failure = await authenticateCronRequest(request);
    if (failure) return failure;
    const body = z.object({kind:z.literal('market-scan')}).safeParse(await request.json().catch(() => null));
    if (!body.success) return new Response('Invalid scan request',{status:400});
    const {supabaseAdmin} = await import('@/integrations/supabase/client.server');
    // Three markets at once produce at most six simultaneous provider requests.
    for (let i=0;i<marketIds.length;i+=3) {
      await Promise.all(marketIds.slice(i,i+3).map(async market => {
        const scan = await scanMarket(market);
        const {error} = await supabaseAdmin.rpc('record_market_scan',{
          p_market:market,p_result:scan.result as unknown as Json,p_status:scan.status,p_scanned_at:scan.scanned_at,...(scan.error ? {p_error:scan.error} : {}),
        });
        if(error) throw error;
        const s = scan.result;
        if (scan.status === 'ready' && canTrade(s) && s) {
          const {error:qErr} = await supabaseAdmin.rpc('queue_auto_orders',{p_market:market,p_direction:s.direction,
            p_signal:{entry:s.entry,stopLoss:s.stopLoss,tp1:s.tp1,tp2:s.tp2,time:s.time,validUntil:s.validUntil} as unknown as Json});
          if(qErr) console.error('auto-trade queue failed',market,qErr.message);
        }
      }));
    }
    return Response.json({ok:true});
  }}}
});
