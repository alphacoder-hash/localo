import { supabase } from "@/integrations/supabase/client";

export function getCatalogImagePublicUrl(path: string | null | undefined) {
  if (!path) return null;
  const { data } = supabase.storage.from("catalog-images").getPublicUrl(path);
  return data.publicUrl;
}
