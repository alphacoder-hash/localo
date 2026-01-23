-- Allow public read access to vendor_contacts so customers can see phone numbers
-- This is required because we want to display the phone number on the public vendor profile.

DROP POLICY IF EXISTS "vendor_contacts_select_owner_admin" ON public.vendor_contacts;

CREATE POLICY "vendor_contacts_select_public"
ON public.vendor_contacts
FOR SELECT
USING (true);
