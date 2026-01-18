-- Prevent vendor owners from placing orders to their own vendor

DROP POLICY IF EXISTS "orders_insert_customer" ON public.orders;

CREATE POLICY "orders_insert_customer"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  customer_user_id = auth.uid()
  AND NOT public.is_vendor_owner(vendor_id)
);
