-- Update vendors_public view to include banner_image_url
CREATE OR REPLACE VIEW public.vendors_public
WITH (security_invoker = on)
AS
  SELECT
    v.id,
    v.shop_name,
    v.primary_category,
    v.vendor_type,
    v.description,
    v.city,
    v.state,
    v.address_text,
    v.opening_note,
    v.location_lat,
    v.location_lng,
    v.location_accuracy_meters,
    v.last_location_updated_at,
    v.selfie_with_shop_image_url,
    v.banner_image_url, -- Added this field
    v.verification_status,
    v.is_online,
    v.created_at,
    v.updated_at
  FROM public.vendors v
  WHERE v.verification_status = 'approved';
