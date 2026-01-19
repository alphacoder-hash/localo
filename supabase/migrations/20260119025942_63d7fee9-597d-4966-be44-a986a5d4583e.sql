-- Allow authenticated users to submit vendor applications.
-- RLS already restricts rows via vendors_insert_owner and vendors_update_owner_admin.
GRANT INSERT, UPDATE ON TABLE public.vendors TO authenticated;