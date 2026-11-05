CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  details text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read active methods" ON public.payment_methods FOR SELECT TO authenticated USING (active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert methods" ON public.payment_methods FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update methods" ON public.payment_methods FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete methods" ON public.payment_methods FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(user_id uuid, email text, created_at timestamptz, trial_ends_at timestamptz, premium_until timestamptz, plan text, is_admin boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN QUERY SELECT u.id, u.email::text, u.created_at, a.trial_ends_at, a.premium_until, a.plan,
    public.has_role(u.id,'admin')
  FROM auth.users u LEFT JOIN public.user_access a ON a.user_id = u.id
  ORDER BY u.created_at DESC LIMIT 500;
END $$;
REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.grant_owner_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 'pp@gmail.com' AND NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_owner_admin AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.grant_owner_admin();
INSERT INTO public.user_roles(user_id, role) SELECT id, 'admin' FROM auth.users WHERE lower(email)='pp@gmail.com' AND email_confirmed_at IS NOT NULL ON CONFLICT DO NOTHING;