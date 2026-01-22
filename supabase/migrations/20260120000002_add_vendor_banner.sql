ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS banner_image_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-banners', 'vendor-banners', false)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Vendor banners - upload own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vendor-banners'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Vendor banners - update own folder"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vendor-banners'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Vendor banners - delete own folder"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vendor-banners'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

