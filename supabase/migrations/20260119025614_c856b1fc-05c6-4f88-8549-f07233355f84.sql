-- Fix: REST calls to public.vendors are failing with "permission denied for table vendors".
-- RLS policies already restrict rows; we also need table-level SELECT privileges.
GRANT SELECT ON TABLE public.vendors TO anon, authenticated;

-- Keep explicit column grant (harmless/redundant once table grant exists)
GRANT SELECT (description) ON TABLE public.vendors TO anon, authenticated;