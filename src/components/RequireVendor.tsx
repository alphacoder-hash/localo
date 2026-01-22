import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

export function RequireVendor({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  const vendorQuery = useQuery({
    queryKey: ["require_vendor_vendor", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id")
        .eq("owner_user_id", user!.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string } | null;
    },
    retry: false,
  });

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (vendorQuery.isLoading) return null;
  if (!vendorQuery.data?.id) return <Navigate to="/orders" replace />;
  return <>{children}</>;
}

