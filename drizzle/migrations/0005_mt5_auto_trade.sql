ALTER TABLE public.mt5_links ADD COLUMN IF NOT EXISTS auto_trade boolean NOT NULL DEFAULT false;
ALTER TABLE public.trade_orders ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

CREATE OR REPLACE FUNCTION public.queue_auto_orders(p_market text, p_direction text, p_signal jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF p_direction NOT IN ('BUY','SELL') THEN RETURN 0; END IF;
  INSERT INTO public.trade_orders(user_id, market, direction, lot, signal, source)
  SELECT l.user_id, p_market, p_direction, 0.02, p_signal, 'auto'
  FROM public.mt5_links l
  WHERE l.auto_trade AND public.has_signal_access(l.user_id)
    AND NOT EXISTS (SELECT 1 FROM public.trade_orders o WHERE o.user_id = l.user_id AND o.market = p_market
      AND o.direction = p_direction AND o.source = 'auto' AND o.created_at > now() - interval '1 hour');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.queue_auto_orders(text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_auto_orders(text, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_mt5_order_v2(p_key_hash text)
RETURNS TABLE(id uuid, market text, direction text, lot numeric, signal jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid;
BEGIN
  UPDATE public.mt5_links SET last_seen = now() WHERE key_hash = p_key_hash RETURNING user_id INTO v_user;
  IF v_user IS NULL THEN RAISE EXCEPTION 'INVALID_KEY'; END IF;
  UPDATE public.trade_orders o SET status='expired', done_at=now() WHERE o.user_id=v_user AND o.status='pending' AND o.created_at < now() - interval '2 minutes';
  RETURN QUERY UPDATE public.trade_orders o SET status='sent', sent_at=now()
    WHERE o.id = (SELECT t.id FROM public.trade_orders t WHERE t.user_id=v_user AND t.status='pending' ORDER BY t.created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
    RETURNING o.id, o.market, o.direction, o.lot, o.signal;
END $$;
REVOKE ALL ON FUNCTION public.claim_mt5_order_v2(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mt5_order_v2(text) TO service_role;