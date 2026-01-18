-- NearNow Vendors: core schema (Lovable Cloud)

-- 1) Enums
DO $$ BEGIN
  CREATE TYPE public.vendor_verification_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.vendor_type AS ENUM ('fixed_shop','moving_stall');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('placed','accepted','preparing','ready','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_mode AS ENUM ('upi','cash');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- roles (CRITICAL: roles in separate table)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Tables
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  shop_name text NOT NULL,
  primary_category text NOT NULL,
  vendor_type public.vendor_type NOT NULL DEFAULT 'moving_stall',
  description text,
  city text,
  state text,
  address_text text,
  opening_note text,
  location_lat double precision,
  location_lng double precision,
  location_accuracy_meters integer,
  last_location_updated_at timestamptz,
  selfie_with_shop_image_url text,
  verification_status public.vendor_verification_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  is_online boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors (verification_status);
CREATE INDEX IF NOT EXISTS idx_vendors_city ON public.vendors (city);
CREATE INDEX IF NOT EXISTS idx_vendors_owner ON public.vendors (owner_user_id);

-- phone is PII: store separately
CREATE TABLE IF NOT EXISTS public.vendor_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  phone_e164 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id)
);

CREATE TABLE IF NOT EXISTS public.vendor_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  title text NOT NULL,
  price_inr integer NOT NULL,
  unit text NOT NULL,
  photo_url text,
  in_stock boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalog_vendor ON public.vendor_catalog_items (vendor_id);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id uuid NOT NULL,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  status public.order_status NOT NULL DEFAULT 'placed',
  payment_mode public.payment_mode NOT NULL DEFAULT 'upi',
  pickup_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_vendor ON public.orders (vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders (customer_user_id);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  catalog_item_id uuid REFERENCES public.vendor_catalog_items(id) ON DELETE SET NULL,
  qty integer NOT NULL,
  price_snapshot_inr integer NOT NULL,
  title_snapshot text NOT NULL,
  unit_snapshot text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items (order_id);

CREATE TABLE IF NOT EXISTS public.vendor_location_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  day date NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy_meters integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, day)
);

CREATE INDEX IF NOT EXISTS idx_location_vendor_day ON public.vendor_location_updates (vendor_id, day);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, created_at DESC);

-- Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 3) Common trigger: update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$ BEGIN
  CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_vendor_contacts_updated_at
  BEFORE UPDATE ON public.vendor_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_vendor_catalog_items_updated_at
  BEFORE UPDATE ON public.vendor_catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_vendor_location_updates_updated_at
  BEFORE UPDATE ON public.vendor_location_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) Helper functions (SECURITY DEFINER to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_vendor_owner(_vendor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id = _vendor_id AND v.owner_user_id = auth.uid()
  );
$$;

-- 5) RLS enable
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_location_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6) Views for public vendor discovery (exclude phone)
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
    v.verification_status,
    v.is_online,
    v.created_at,
    v.updated_at
  FROM public.vendors v
  WHERE v.verification_status = 'approved';

-- 7) Policies
-- Vendors table: owners + admins can see their vendor row; no direct public select.
CREATE POLICY "vendors_select_owner_admin"
ON public.vendors
FOR SELECT
TO authenticated
USING (
  owner_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);

CREATE POLICY "vendors_insert_owner"
ON public.vendors
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "vendors_update_owner_admin"
ON public.vendors
FOR UPDATE
TO authenticated
USING (
  owner_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
)
WITH CHECK (
  owner_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);

CREATE POLICY "vendors_delete_admin_only"
ON public.vendors
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Vendor contacts: only owner/admin
CREATE POLICY "vendor_contacts_select_owner_admin"
ON public.vendor_contacts
FOR SELECT
TO authenticated
USING (
  public.is_vendor_owner(vendor_id)
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);

CREATE POLICY "vendor_contacts_insert_owner"
ON public.vendor_contacts
FOR INSERT
TO authenticated
WITH CHECK (public.is_vendor_owner(vendor_id));

CREATE POLICY "vendor_contacts_update_owner_admin"
ON public.vendor_contacts
FOR UPDATE
TO authenticated
USING (
  public.is_vendor_owner(vendor_id)
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.is_vendor_owner(vendor_id)
  OR public.has_role(auth.uid(), 'admin')
);

-- Catalog: public can read only for approved vendors via join; owner/admin can write
CREATE POLICY "catalog_select_public_approved_vendor"
ON public.vendor_catalog_items
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id = vendor_catalog_items.vendor_id
      AND v.verification_status = 'approved'
  )
);

CREATE POLICY "catalog_insert_owner"
ON public.vendor_catalog_items
FOR INSERT
TO authenticated
WITH CHECK (public.is_vendor_owner(vendor_id));

CREATE POLICY "catalog_update_owner"
ON public.vendor_catalog_items
FOR UPDATE
TO authenticated
USING (public.is_vendor_owner(vendor_id))
WITH CHECK (public.is_vendor_owner(vendor_id));

CREATE POLICY "catalog_delete_owner"
ON public.vendor_catalog_items
FOR DELETE
TO authenticated
USING (public.is_vendor_owner(vendor_id));

-- Vendor location updates: public can read for approved vendors; owner can write
CREATE POLICY "location_select_public_approved_vendor"
ON public.vendor_location_updates
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id = vendor_location_updates.vendor_id
      AND v.verification_status = 'approved'
  )
);

CREATE POLICY "location_upsert_owner"
ON public.vendor_location_updates
FOR INSERT
TO authenticated
WITH CHECK (public.is_vendor_owner(vendor_id));

CREATE POLICY "location_update_owner"
ON public.vendor_location_updates
FOR UPDATE
TO authenticated
USING (public.is_vendor_owner(vendor_id))
WITH CHECK (public.is_vendor_owner(vendor_id));

-- Orders: customer can create/select their orders; vendor owner can select/update for their vendor
CREATE POLICY "orders_select_customer_or_vendor_owner"
ON public.orders
FOR SELECT
TO authenticated
USING (
  customer_user_id = auth.uid()
  OR public.is_vendor_owner(vendor_id)
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);

CREATE POLICY "orders_insert_customer"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (customer_user_id = auth.uid());

CREATE POLICY "orders_update_customer_cancel_or_vendor_progress"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  customer_user_id = auth.uid()
  OR public.is_vendor_owner(vendor_id)
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  customer_user_id = auth.uid()
  OR public.is_vendor_owner(vendor_id)
  OR public.has_role(auth.uid(), 'admin')
);

-- Order items: tied to orders
CREATE POLICY "order_items_select_customer_or_vendor_owner"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        o.customer_user_id = auth.uid()
        OR public.is_vendor_owner(o.vendor_id)
        OR public.has_role(auth.uid(), 'admin')
      )
  )
);

CREATE POLICY "order_items_insert_customer"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.customer_user_id = auth.uid()
  )
);

-- Notifications: per-user
CREATE POLICY "notifications_select_own"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Only admins/moderators can create notifications directly
CREATE POLICY "notifications_insert_admin"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- user_roles: only admins can manage; users can read their own roles
CREATE POLICY "user_roles_select_own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_insert_admin"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_delete_admin"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
