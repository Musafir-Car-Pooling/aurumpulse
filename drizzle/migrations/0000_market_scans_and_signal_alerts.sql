CREATE TABLE public.market_scans (
  market text PRIMARY KEY CHECK (market IN ('XAUUSD','BTCUSD','EURUSD','GBPUSD','USDJPY')),
  result jsonb,
  status text NOT NULL CHECK (status IN ('ready','closed','stale','unavailable')),
  scanned_at timestamptz NOT NULL,
  error text,
  last_alert_direction text,
  last_alert_until timestamptz
);
GRANT SELECT (market,result,status,scanned_at,error) ON public.market_scans TO anon, authenticated;
GRANT ALL ON public.market_scans TO service_role;
ALTER TABLE public.market_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public market results" ON public.market_scans FOR SELECT TO anon, authenticated USING (true);
CREATE TABLE public.signal_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market text NOT NULL CHECK (market IN ('XAUUSD','BTCUSD','EURUSD','GBPUSD','USDJPY')),
  direction text NOT NULL CHECK (direction IN ('BUY','SELL')),
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  valid_until timestamptz NOT NULL
);
GRANT SELECT ON public.signal_alerts TO anon, authenticated;
GRANT ALL ON public.signal_alerts TO service_role;
ALTER TABLE public.signal_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public signal alerts" ON public.signal_alerts FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX signal_alerts_created_at_idx ON public.signal_alerts (created_at DESC);
CREATE OR REPLACE FUNCTION public.record_market_scan(p_market text,p_result jsonb,p_status text,p_scanned_at timestamptz,p_error text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE previous public.market_scans; direction text; expiry timestamptz;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('market-scan-' || p_market));
  SELECT * INTO previous FROM public.market_scans WHERE market=p_market;
  IF previous.scanned_at IS NOT NULL AND previous.scanned_at >= p_scanned_at THEN RETURN; END IF;
  direction := p_result->>'direction';
  expiry := (p_result->>'validUntil')::timestamptz;
  IF p_status='ready' AND direction IN ('BUY','SELL') AND expiry>p_scanned_at AND (
    previous.last_alert_direction IS NULL OR previous.last_alert_direction<>direction OR previous.last_alert_until<=p_scanned_at
  ) THEN
    INSERT INTO public.signal_alerts(market,direction,result,created_at,valid_until) VALUES(p_market,direction,p_result,p_scanned_at,expiry);
    previous.last_alert_direction := direction;
    previous.last_alert_until := expiry;
  ELSIF p_status='ready' AND direction='WAIT' THEN
    previous.last_alert_direction := NULL;
    previous.last_alert_until := NULL;
  END IF;
  INSERT INTO public.market_scans(market,result,status,scanned_at,error,last_alert_direction,last_alert_until)
  VALUES(p_market,p_result,p_status,p_scanned_at,p_error,previous.last_alert_direction,previous.last_alert_until)
  ON CONFLICT(market) DO UPDATE SET result=EXCLUDED.result,status=EXCLUDED.status,scanned_at=EXCLUDED.scanned_at,error=EXCLUDED.error,last_alert_direction=EXCLUDED.last_alert_direction,last_alert_until=EXCLUDED.last_alert_until;
END;
$$;
REVOKE ALL ON FUNCTION public.record_market_scan(text,jsonb,text,timestamptz,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_market_scan(text,jsonb,text,timestamptz,text) TO service_role;