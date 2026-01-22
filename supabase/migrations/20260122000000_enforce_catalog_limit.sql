-- Enforce catalog limit via trigger
CREATE OR REPLACE FUNCTION public.check_catalog_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count integer;
  max_limit integer;
BEGIN
  -- Get the current number of items for this vendor
  SELECT count(*) INTO current_count
  FROM public.vendor_catalog_items
  WHERE vendor_id = NEW.vendor_id;

  -- Get the limit from vendor_plans
  SELECT catalog_limit INTO max_limit
  FROM public.vendor_plans
  WHERE vendor_id = NEW.vendor_id;

  -- If no plan found, default to 5
  IF max_limit IS NULL THEN
    max_limit := 5;
  END IF;

  -- If adding a new item and limit is reached, throw error
  IF (current_count >= max_limit) THEN
    RAISE EXCEPTION 'Catalog limit reached. Current: %, Max: %', current_count, max_limit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enforce_catalog_limit ON public.vendor_catalog_items;
CREATE TRIGGER tr_enforce_catalog_limit
BEFORE INSERT ON public.vendor_catalog_items
FOR EACH ROW
EXECUTE FUNCTION public.check_catalog_limit();
