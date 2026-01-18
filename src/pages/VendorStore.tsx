import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCatalogImagePublicUrl } from "@/lib/storage";

type VendorPublic = {
  id: string;
  shop_name: string;
  primary_category: string;
  vendor_type: "moving_stall" | "fixed_shop";
  is_online: boolean;
  location_lat: number | null;
  location_lng: number | null;
  opening_note: string | null;
  last_location_updated_at: string | null;
};

type CatalogRow = {
  id: string;
  title: string;
  price_inr: number;
  unit: string;
  in_stock: boolean;
  photo_url: string | null;
  category: string | null;
  tags: string[];
};

export default function VendorStore() {
  const { vendorId } = useParams();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  const vendorQuery = useQuery({
    queryKey: ["vendor_public", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors_public")
        .select(
          "id, shop_name, primary_category, vendor_type, is_online, location_lat, location_lng, opening_note, last_location_updated_at",
        )
        .eq("id", vendorId!)
        .maybeSingle();
      if (error) throw error;
      return data as VendorPublic | null;
    },
  });

  const vendor = vendorQuery.data;

  const catalogQuery = useQuery({
    queryKey: ["vendor_catalog_public", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_catalog_items")
        .select("id, title, price_inr, unit, in_stock, photo_url, category, tags")
        .eq("vendor_id", vendorId!)
        .eq("in_stock", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CatalogRow[];
    },
  });

  const updatedToday = useMemo(() => {
    if (!vendor?.last_location_updated_at) return false;
    return Date.now() - new Date(vendor.last_location_updated_at).getTime() < 24 * 60 * 60 * 1000;
  }, [vendor?.last_location_updated_at]);

  if (vendorQuery.isLoading) return null;

  if (!vendor) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-display text-2xl">Store not found</p>
            <p className="mt-2 text-muted-foreground">This vendor may not be approved yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Store</p>
          <h1 className="mt-2 font-display text-4xl leading-tight">{vendor.shop_name}</h1>
          <p className="mt-2 text-muted-foreground">{vendor.opening_note}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{vendor.is_online ? "Online" : "Offline"}</Badge>
            <Badge variant="outline">{vendor.primary_category}</Badge>
            <Badge variant="secondary">{updatedToday ? "Updated today" : "Stale location"}</Badge>
          </div>
        </div>

        <Button
          variant="hero"
          onClick={() => {
            if (vendor.location_lat == null || vendor.location_lng == null) return;
            const url = `https://www.google.com/maps/dir/?api=1&destination=${vendor.location_lat},${vendor.location_lng}`;
            window.open(url, "_blank", "noopener,noreferrer");
          }}
          disabled={vendor.location_lat == null || vendor.location_lng == null}
        >
          <Navigation className="h-4 w-4" /> Get directions
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-12">
        <Card className="md:col-span-7">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <CardTitle className="text-base">Catalog</CardTitle>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items…"
                className="sm:w-60"
              />
            </div>

            {(() => {
              const categories = Array.from(
                new Set((catalogQuery.data ?? []).map((it) => it.category?.trim()).filter(Boolean) as string[]),
              ).sort((a, b) => a.localeCompare(b));

              const tags = Array.from(new Set((catalogQuery.data ?? []).flatMap((it) => it.tags ?? []))).sort((a, b) =>
                a.localeCompare(b),
              );

              return (
                <div className="mt-3 space-y-3">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="Filter by category"
                  >
                    <option value="">All categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  {tags.length ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {tags.map((t) => {
                        const active = tagFilter.includes(t);
                        return (
                          <Button
                            key={t}
                            type="button"
                            size="sm"
                            variant={active ? "secondary" : "outline"}
                            onClick={() => setTagFilter((prev) => (active ? prev.filter((x) => x !== t) : [...prev, t]))}
                          >
                            #{t}
                          </Button>
                        );
                      })}
                      {tagFilter.length ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => setTagFilter([])}>
                          Clear tags
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const q = search.trim().toLowerCase();
              let items = catalogQuery.data ?? [];

              if (q) items = items.filter((it) => it.title.toLowerCase().includes(q));
              if (categoryFilter.trim()) {
                items = items.filter((it) => (it.category ?? "").toLowerCase() === categoryFilter.toLowerCase());
              }
              if (tagFilter.length) {
                items = items.filter((it) => (it.tags ?? []).some((t) => tagFilter.includes(t)));
              }

              if (items.length === 0) {
                return (
                  <div className="rounded-xl border bg-card p-6 text-center">
                    <p className="font-semibold">No matching items</p>
                    <p className="mt-1 text-sm text-muted-foreground">Try clearing filters.</p>
                  </div>
                );
              }

              return items.map((it) => {
                const img = getCatalogImagePublicUrl(it.photo_url);
                return (
                  <div key={it.id} className="flex items-center gap-3 rounded-xl border bg-card p-4">
                    <div className="h-12 w-12 overflow-hidden rounded-lg border bg-muted">
                      {img ? (
                        <img
                          src={img}
                          alt={`${it.title} thumbnail`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div>
                      <p className="font-semibold">{it.title}</p>
                      <p className="text-sm text-muted-foreground">₹{it.price_inr} / {it.unit}</p>
                      {(it.category || (it.tags ?? []).length) ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {it.category ? <Badge variant="outline">{it.category}</Badge> : null}
                          {(it.tags ?? []).slice(0, 4).map((t) => (
                            <Badge key={t} variant="secondary">#{t}</Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              });
            })()}

            <p className="text-sm text-muted-foreground">Ordering comes next (Step 10). For now, discovery + catalog is live.</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-5">
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="hero" className="w-full" disabled>
              Add to cart (next)
            </Button>
            <Button variant="outline" className="w-full" disabled>
              Place order (pay at pickup)
            </Button>
            <p className="text-sm text-muted-foreground">Payment is always at pickup: UPI or cash.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
