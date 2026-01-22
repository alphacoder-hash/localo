-- Add location_notes column to vendors table
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS location_notes text;
