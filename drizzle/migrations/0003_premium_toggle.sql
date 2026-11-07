INSERT INTO public.user_roles(user_id, role) SELECT id, 'admin' FROM auth.users WHERE lower(email)='pp@gmail.com' ON CONFLICT DO NOTHING;
CREATE TABLE public.app_settings (id int PRIMARY KEY DEFAULT 1 CHECK (id = 1), premium_enabled boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO public.app_settings(id) VALUES (1);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins update settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.premium_enabled() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT coalesce((SELECT premium_enabled FROM public.app_settings WHERE id=1), true) $$;
CREATE OR REPLACE FUNCTION public.has_signal_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT NOT public.premium_enabled() OR public.has_role(_user_id,'admin') OR EXISTS (SELECT 1 FROM public.user_access WHERE user_id=_user_id AND (trial_ends_at > now() OR premium_until > now())) $$;
GRANT SELECT ON public.market_scans TO anon;
GRANT SELECT ON public.signal_alerts TO anon;
CREATE POLICY "Free mode market results" ON public.market_scans FOR SELECT TO anon USING (NOT public.premium_enabled());
CREATE POLICY "Free mode signal alerts" ON public.signal_alerts FOR SELECT TO anon USING (NOT public.premium_enabled());