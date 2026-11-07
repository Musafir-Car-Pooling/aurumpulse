CREATE TABLE public.mt5_links (user_id uuid PRIMARY KEY, key_hash text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), last_seen timestamptz);
GRANT SELECT ON public.mt5_links TO authenticated;
GRANT ALL ON public.mt5_links TO service_role;
ALTER TABLE public.mt5_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own mt5 link" ON public.mt5_links FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.trade_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  market text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('BUY','SELL')),
  lot numeric NOT NULL DEFAULT 0.02,
  signal jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','executed','failed','expired')),
  ticket text, price numeric, error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz, done_at timestamptz
);
CREATE INDEX trade_orders_user_idx ON public.trade_orders(user_id, created_at DESC);
GRANT SELECT ON public.trade_orders TO authenticated;
GRANT ALL ON public.trade_orders TO service_role;
ALTER TABLE public.trade_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own trade orders" ON public.trade_orders FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.claim_mt5_order(p_key_hash text)
RETURNS TABLE(id uuid, market text, direction text, lot numeric, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid;
BEGIN
  UPDATE public.mt5_links SET last_seen = now() WHERE key_hash = p_key_hash RETURNING user_id INTO v_user;
  IF v_user IS NULL THEN RAISE EXCEPTION 'INVALID_KEY'; END IF;
  UPDATE public.trade_orders o SET status='expired', done_at=now() WHERE o.user_id=v_user AND o.status='pending' AND o.created_at < now() - interval '2 minutes';
  RETURN QUERY UPDATE public.trade_orders o SET status='sent', sent_at=now()
    WHERE o.id = (SELECT t.id FROM public.trade_orders t WHERE t.user_id=v_user AND t.status='pending' ORDER BY t.created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
    RETURNING o.id, o.market, o.direction, o.lot, o.created_at;
END $$;
REVOKE ALL ON FUNCTION public.claim_mt5_order(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mt5_order(text) TO service_role;