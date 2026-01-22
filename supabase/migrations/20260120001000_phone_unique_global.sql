CREATE UNIQUE INDEX IF NOT EXISTS uq_phone_verifications_phone_e164
  ON public.phone_verifications (phone_e164);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vendor_contacts_phone_e164
  ON public.vendor_contacts (phone_e164);

