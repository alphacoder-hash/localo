-- Allow public discovery of approved vendors while keeping sensitive columns private

-- 1) RLS: allow anyone (including anon) to SELECT approved vendor rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vendors'
      AND policyname = 'vendors_select_public_approved'
  ) THEN
    CREATE POLICY "vendors_select_public_approved"
    ON public.vendors
    FOR SELECT
    USING (verification_status = 'approved'::vendor_verification_status);
  END IF;
END $$;

-- 2) Column-level privileges: ensure anon/authenticated can only read public-safe columns
--    (RLS still applies; this just limits which columns can be returned.)
REVOKE ALL ON TABLE public.vendors FROM anon, authenticated;

GRANT SELECT (
  id,
  shop_name,
  primary_category,
  vendor_type,
  is_online,
  last_location_updated_at,
  location_lat,
  location_lng,
  location_accuracy_meters,
  opening_note,
  city,
  state,
  address_text,
  selfie_with_shop_image_url,
  created_at,
  updated_at,
  verification_status
) ON TABLE public.vendors TO anon, authenticated;

-- Note: owners/admins already have access via existing RLS policies when using elevated roles.