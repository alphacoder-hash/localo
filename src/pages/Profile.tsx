import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Receipt, Store, UserRound } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type VendorProfileRow = {
  id: string;
  shop_name: string;
  verification_status: "pending" | "approved" | "rejected";
  vendor_type: "moving_stall" | "fixed_shop";
  rejection_reason: string | null;
  is_online: boolean;
};

function shortId(id: string) {
  return id ? `${id.slice(0, 8)}…${id.slice(-4)}` : "—";
}

export default function Profile() {
  const { user, roles } = useAuth();

  const isAdmin = roles.has("admin");

  const vendorQuery = useQuery({
    queryKey: ["profile_vendor", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, shop_name, verification_status, vendor_type, rejection_reason, is_online")
        .eq("owner_user_id", user!.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as VendorProfileRow | null) ?? null;
    },
  });

  const vendor = vendorQuery.data ?? null;
  const hasVendor = !!vendor;

  const roleBadges = useMemo(() => {
    const list: string[] = [];
    if (isAdmin) list.push("admin");
    if (hasVendor) list.push("vendor");
    list.push("customer");
    return Array.from(new Set(list));
  }, [hasVendor, isAdmin]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Account</p>
          <h1 className="mt-2 font-display text-4xl leading-tight">My profile</h1>
          <p className="mt-3 text-muted-foreground">Manage your account and access tools.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {roleBadges.map((r) => (
            <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>
              {r}
            </Badge>
          ))}
        </div>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Signed in as</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <UserRound className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{user?.email ?? "—"}</p>
              <p className="text-sm text-muted-foreground">{user?.id ? shortId(user.id) : "—"}</p>
            </div>
          </div>

          {vendorQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading vendor…</p>
          ) : vendor ? (
            <div className="rounded-xl border bg-card p-3">
              <p className="text-sm font-semibold">{vendor.shop_name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {vendor.vendor_type === "moving_stall" ? "Moving stall" : "Fixed shop"} • {vendor.verification_status}
                {vendor.verification_status === "approved" ? (vendor.is_online ? " • online" : " • offline") : ""}
              </p>
              {vendor.verification_status === "rejected" && vendor.rejection_reason ? (
                <p className="mt-2 text-xs text-muted-foreground">Reason: {vendor.rejection_reason}</p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Shortcuts</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {!hasVendor ? (
              <Button asChild variant="outline" className="justify-start">
                <Link to="/orders">
                  <Receipt className="h-4 w-4" /> My orders
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="justify-start">
                <Link to="/vendor/dashboard">
                  <Store className="h-4 w-4" /> Vendor dashboard
                </Link>
              </Button>
            )}

            {hasVendor ? (
              <Button asChild variant="outline" className="justify-start">
                <Link to="/vendor/orders">
                  <Store className="h-4 w-4" /> Vendor orders
                </Link>
              </Button>
            ) : null}

            {isAdmin ? (
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin">
                  <LayoutDashboard className="h-4 w-4" /> Admin dashboard
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {!hasVendor ? (
          <Card className="hover-lift">
            <CardContent className="py-6">
              <p className="text-sm font-semibold">Become a vendor</p>
              <p className="mt-1 text-sm text-muted-foreground">Submit details, then start receiving orders.</p>
              <div className="mt-3">
                <Button asChild variant="hero" className="w-full">
                  <Link to="/vendor/apply">Apply now</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="hover-lift">
            <CardContent className="py-6">
              <p className="text-sm font-semibold">Vendor tools</p>
              <p className="mt-1 text-sm text-muted-foreground">Manage availability, catalog, and share your shop.</p>
              <div className="mt-3">
                <Button asChild variant="hero" className="w-full">
                  <Link to="/vendor/dashboard">Open dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

    </div>
  );
}
