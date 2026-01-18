import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const itemSchema = z.object({
  title: z.string().trim().min(2).max(60),
  price_inr: z.coerce.number().int().min(1).max(100000),
  unit: z.string().trim().min(1).max(20),
});

type VendorRow = {
  id: string;
  shop_name: string;
  verification_status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  is_online: boolean;
  vendor_type: "moving_stall" | "fixed_shop";
  last_location_updated_at: string | null;
};

type PlanRow = {
  tier: "free" | "pro";
  catalog_limit: number;
  upgrade_requested: boolean;
};

type CatalogRow = {
  id: string;
  title: string;
  price_inr: number;
  unit: string;
  in_stock: boolean;
  photo_url: string | null;
};

export default function VendorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const vendorQuery = useQuery({
    queryKey: ["my_vendor", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select(
          "id, shop_name, verification_status, rejection_reason, is_online, vendor_type, last_location_updated_at",
        )
        .eq("owner_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as VendorRow | null;
    },
  });

  const vendor = vendorQuery.data ?? null;

  const planQuery = useQuery({
    queryKey: ["vendor_plan", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_plans")
        .select("tier, catalog_limit, upgrade_requested")
        .eq("vendor_id", vendor!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as PlanRow | null) ?? { tier: "free", catalog_limit: 5, upgrade_requested: false };
    },
  });

  const catalogQuery = useQuery({
    queryKey: ["vendor_catalog", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_catalog_items")
        .select("id, title, price_inr, unit, in_stock, photo_url")
        .eq("vendor_id", vendor!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CatalogRow[];
    },
  });

  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState<string>("");
  const [newUnit, setNewUnit] = useState("kg");

  const plan = planQuery.data;
  const limit = plan?.catalog_limit ?? 5;
  const count = catalogQuery.data?.length ?? 0;

  const toggleOnline = async () => {
    if (!vendor) return;
    const next = !vendor.is_online;
    const { error } = await supabase.from("vendors").update({ is_online: next }).eq("id", vendor.id);
    if (error) {
      toast({ title: "Couldn’t update", description: error.message, variant: "destructive" });
      return;
    }
    vendorQuery.refetch();
  };

  const updateLocationToday = async () => {
    if (!vendor) return;

    if (!navigator.geolocation) {
      toast({ title: "GPS not available", variant: "destructive" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const today = new Date();
        const day = today.toISOString().slice(0, 10);

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null;

        const upsert1 = await supabase
          .from("vendor_location_updates")
          .upsert({ vendor_id: vendor.id, day, lat, lng, accuracy_meters: accuracy }, { onConflict: "vendor_id,day" });

        if (upsert1.error) {
          toast({ title: "Couldn’t update location", description: upsert1.error.message, variant: "destructive" });
          return;
        }

        const upsert2 = await supabase
          .from("vendors")
          .update({
            location_lat: lat,
            location_lng: lng,
            location_accuracy_meters: accuracy,
            last_location_updated_at: new Date().toISOString(),
          })
          .eq("id", vendor.id);

        if (upsert2.error) {
          toast({ title: "Couldn’t save location", description: upsert2.error.message, variant: "destructive" });
          return;
        }

        toast({ title: "Location updated" });
        vendorQuery.refetch();
      },
      () => toast({ title: "Couldn’t get location", variant: "destructive" }),
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 5000 },
    );
  };

  const addItem = async () => {
    if (!vendor) return;

    if (count >= limit) {
      toast({
        title: "Catalog limit reached",
        description: `Free plan allows ${limit} items. Request upgrade to add more.`,
        variant: "destructive",
      });
      return;
    }

    const parsed = itemSchema.safeParse({ title: newTitle, price_inr: newPrice, unit: newUnit });
    if (!parsed.success) {
      toast({ title: "Fix item", description: parsed.error.errors[0]?.message, variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("vendor_catalog_items").insert({
      vendor_id: vendor.id,
      title: parsed.data.title,
      price_inr: parsed.data.price_inr,
      unit: parsed.data.unit,
      in_stock: true,
    });

    if (error) {
      toast({ title: "Couldn’t add item", description: error.message, variant: "destructive" });
      return;
    }

    setNewTitle("");
    setNewPrice("");
    setNewUnit("kg");
    toast({ title: "Item added" });
    catalogQuery.refetch();
  };

  const requestUpgrade = async () => {
    if (!vendor) return;

    const { error } = await supabase
      .from("vendor_plans")
      .update({ upgrade_requested: true })
      .eq("vendor_id", vendor.id);

    if (error) {
      toast({ title: "Couldn’t request upgrade", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Upgrade requested", description: "Admin will review your request." });
    planQuery.refetch();
  };

  const statusBadge = useMemo(() => {
    if (!vendor) return <Badge variant="secondary">No application</Badge>;
    if (vendor.verification_status === "approved") return <Badge>Approved</Badge>;
    if (vendor.verification_status === "rejected") return <Badge variant="secondary">Rejected</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  }, [vendor]);

  if (vendorQuery.isLoading) return null;

  if (!vendor) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="font-display text-4xl">Vendor dashboard</h1>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-semibold">You haven’t applied yet.</p>
            <p className="mt-2 text-muted-foreground">Submit your details and selfie to get verified.</p>
            <div className="mt-5">
              <Button asChild variant="hero">
                <Link to="/vendor/apply">Apply now</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Vendor dashboard</p>
          <h1 className="mt-2 font-display text-4xl leading-tight">{vendor.shop_name}</h1>
        </div>
        <Button asChild variant="outline">
          <Link to="/vendor/apply">Edit application</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Verification</p>
              <div className="mt-1 font-semibold">{statusBadge}</div>
              {vendor.verification_status === "rejected" && vendor.rejection_reason && (
                <p className="mt-2 text-sm text-muted-foreground">Reason: {vendor.rejection_reason}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Shop status</p>
              <p className="mt-1 font-semibold">
                <Badge variant={vendor.is_online ? "default" : "secondary"}>
                  {vendor.is_online ? "Online" : "Offline"}
                </Badge>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {vendor.last_location_updated_at
                  ? `Last updated: ${new Date(vendor.last_location_updated_at).toLocaleString()}`
                  : "No location update yet"}
              </p>
            </div>
            <Button variant="hero" onClick={toggleOnline}>
              Toggle Online/Offline
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today’s location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Update daily for moving stalls.</p>
            <Button variant="hero" className="w-full" onClick={updateLocationToday}>
              Update location
            </Button>
            <Button variant="outline" className="w-full" disabled>
              Set pin manually (next)
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Catalog ({count}/{limit} {plan?.tier === "pro" ? "Pro" : "Free"})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <p className="text-sm font-semibold text-muted-foreground">Add item</p>
              <div className="mt-3 space-y-2">
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Bananas" />
                <Input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="Price (₹)" inputMode="numeric" />
                <Input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="Unit (kg/piece/dozen)" />
                <Button variant="hero" className="w-full" onClick={addItem}>
                  Add
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={requestUpgrade}
                  disabled={plan?.upgrade_requested}
                >
                  {plan?.upgrade_requested ? "Upgrade requested" : "Request upgrade"}
                </Button>
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="text-sm font-semibold text-muted-foreground">Your items</p>
              <div className="mt-3 grid gap-2">
                {(catalogQuery.data ?? []).length === 0 ? (
                  <div className="rounded-xl border bg-card p-6 text-center">
                    <p className="font-semibold">No items yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">Add your first item to start receiving orders.</p>
                  </div>
                ) : (
                  (catalogQuery.data ?? []).map((it) => (
                    <div key={it.id} className="flex items-center justify-between rounded-xl border bg-card p-4">
                      <div>
                        <p className="font-semibold">{it.title}</p>
                        <p className="text-sm text-muted-foreground">₹{it.price_inr} / {it.unit}</p>
                      </div>
                      <Badge variant={it.in_stock ? "default" : "secondary"}>{it.in_stock ? "In stock" : "Out"}</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
