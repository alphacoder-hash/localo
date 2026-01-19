-- Fix vendors_public view permissions: it selects vendors.description, which anon/authenticated lacked
GRANT SELECT (description) ON TABLE public.vendors TO anon, authenticated;
