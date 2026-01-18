-- Add category + tags to vendor catalog items
ALTER TABLE public.vendor_catalog_items
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Helpful index for tag filtering
CREATE INDEX IF NOT EXISTS vendor_catalog_items_tags_gin
  ON public.vendor_catalog_items
  USING gin (tags);

-- Helpful index for category filtering
CREATE INDEX IF NOT EXISTS vendor_catalog_items_category_idx
  ON public.vendor_catalog_items (category);
