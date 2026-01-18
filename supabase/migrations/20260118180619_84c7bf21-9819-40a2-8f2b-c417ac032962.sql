-- Vendor plans (Step 8: upgrade gating)
DO $$ BEGIN
  CREATE TYPE public.vendor_plan_tier AS ENUM ('free','pro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.vendor_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL UNIQUE REFERENCES public.vendors(id) ON DELETE CASCADE,
  tier public.vendor_plan_tier NOT NULL DEFAULT 'free',
  catalog_limit integer NOT NULL DEFAULT 5,
  upgrade_requested boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER update_vendor_plans_updated_at
  BEFORE UPDATE ON public.vendor_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.vendor_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_plans_select_owner_admin"
ON public.vendor_plans
FOR SELECT
TO authenticated
USING (
  public.is_vendor_owner(vendor_id)
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);

CREATE POLICY "vendor_plans_insert_owner"
ON public.vendor_plans
FOR INSERT
TO authenticated
WITH CHECK (public.is_vendor_owner(vendor_id));

CREATE POLICY "vendor_plans_update_owner_admin"
ON public.vendor_plans
FOR UPDATE
TO authenticated
USING (
  public.is_vendor_owner(vendor_id)
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.is_vendor_owner(vendor_id)
  OR public.has_role(auth.uid(), 'admin')
);
