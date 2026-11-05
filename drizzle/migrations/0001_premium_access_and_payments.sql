CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE POLICY "Own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.user_access (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  trial_ends_at timestamptz NOT NULL DEFAULT now() + interval '3 days',
  premium_until timestamptz,
  plan text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_access TO authenticated;
GRANT ALL ON public.user_access TO service_role;
ALTER TABLE public.user_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own access" ON public.user_access FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user_access()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  INSERT INTO public.user_access(user_id,email) VALUES (NEW.id, NEW.email) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created_access AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_access();

CREATE OR REPLACE FUNCTION public.has_signal_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id,'admin') OR EXISTS (SELECT 1 FROM public.user_access WHERE user_id=_user_id AND (trial_ends_at > now() OR premium_until > now())) $$;

DROP POLICY IF EXISTS "Public market results" ON public.market_scans;
DROP POLICY IF EXISTS "Public signal alerts" ON public.signal_alerts;
REVOKE SELECT ON public.market_scans FROM anon;
REVOKE SELECT ON public.signal_alerts FROM anon;
CREATE POLICY "Members read market results" ON public.market_scans FOR SELECT TO authenticated USING (public.has_signal_access(auth.uid()));
CREATE POLICY "Members read signal alerts" ON public.signal_alerts FOR SELECT TO authenticated USING (public.has_signal_access(auth.uid()));

CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  plan text NOT NULL CHECK (plan IN ('daily','weekly','monthly')),
  amount_usd numeric NOT NULL,
  method text NOT NULL CHECK (method IN ('manual','crypto')),
  manual_channel text,
  reference text,
  proof_path text,
  provider_payment_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
GRANT SELECT ON public.payment_requests TO authenticated;
GRANT ALL ON public.payment_requests TO service_role;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin payments" ON public.payment_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX payment_requests_created_idx ON public.payment_requests (created_at DESC);

CREATE OR REPLACE FUNCTION public.activate_payment(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE r public.payment_requests; span interval;
BEGIN
  SELECT * INTO r FROM public.payment_requests WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR r.status <> 'pending' THEN RETURN; END IF;
  span := CASE r.plan WHEN 'daily' THEN interval '1 day' WHEN 'weekly' THEN interval '7 days' ELSE interval '30 days' END;
  UPDATE public.payment_requests SET status='approved', decided_at=now() WHERE id=p_id;
  INSERT INTO public.user_access(user_id,email,trial_ends_at) VALUES (r.user_id,r.email,now()) ON CONFLICT DO NOTHING;
  UPDATE public.user_access SET plan=r.plan, premium_until=GREATEST(COALESCE(premium_until,now()),now())+span WHERE user_id=r.user_id;
END $$;
REVOKE ALL ON FUNCTION public.activate_payment(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_payment(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_decide_payment(p_id uuid, p_approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF p_approve THEN PERFORM public.activate_payment(p_id);
  ELSE UPDATE public.payment_requests SET status='rejected', decided_at=now() WHERE id=p_id AND status='pending'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.admin_decide_payment(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_decide_payment(uuid,boolean) TO authenticated;

CREATE POLICY "Upload own proof" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Read own or admin proof" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='payment-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));