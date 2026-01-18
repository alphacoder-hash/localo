-- Storage bucket for vendor selfies
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-selfies', 'vendor-selfies', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for vendor-selfies
-- Allow anyone to read approved vendors' selfie via signed URL only (bucket is private).
-- Allow authenticated users to upload/update/delete only inside their own folder: {user_id}/...

DO $$ BEGIN
  CREATE POLICY "Vendor selfies - upload own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vendor-selfies'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Vendor selfies - update own folder"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vendor-selfies'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Vendor selfies - delete own folder"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vendor-selfies'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Read is via signed URLs from the client SDK (no public SELECT policy needed).