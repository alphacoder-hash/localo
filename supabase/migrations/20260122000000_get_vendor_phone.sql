-- Create a function to get vendor phone number safely
CREATE OR REPLACE FUNCTION public.get_vendor_phone(_vendor_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone_e164
  FROM public.vendor_contacts
  WHERE vendor_id = _vendor_id
  LIMIT 1;
$$;
