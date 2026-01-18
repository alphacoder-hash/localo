-- OTP send request log for rate limiting
CREATE TABLE IF NOT EXISTS public.otp_send_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone_e164 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_send_requests_user_time
  ON public.otp_send_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_otp_send_requests_phone_time
  ON public.otp_send_requests (phone_e164, created_at DESC);

ALTER TABLE public.otp_send_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "otp_send_requests_select_own"
ON public.otp_send_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "otp_send_requests_insert_own"
ON public.otp_send_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);


-- Verified phone marker (used to gate vendor submit)
CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone_e164 TEXT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_phone_verifications_user_phone
  ON public.phone_verifications (user_id, phone_e164);

ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "phone_verifications_select_own"
ON public.phone_verifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- No direct inserts from client; edge function uses service role.
