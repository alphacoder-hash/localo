import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Pencil, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCatalogImagePublicUrl } from "@/lib/storage";
import { formatTags, parseTagInput } from "@/lib/catalog-tags";

const itemSchema = z.object({
  title: z.string().trim().min(2).max(60),
  price_inr: z.coerce.number().int().min(1).max(100000),
  unit: z.string().trim().min(1).max(20),
});

const editSchema = z.object({
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
  category: string | null;
  tags: string[];
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
        .select("id, title, price_inr, unit, in_stock, photo_url, category, tags")
        .eq("vendor_id", vendor!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CatalogRow[];
    },
  });

  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState<string>("");
  const [newUnit, setNewUnit] = useState("kg");
  const [newCategory, setNewCategory] = useState("");
  const [newTags, setNewTags] = useState("");
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<CatalogRow | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");
  const [editUnit, setEditUnit] = useState<string>("");
  const [editCategory, setEditCategory] = useState("");
  const [editTags, setEditTags] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const plan = planQuery.data;
  const limit = plan?.catalog_limit ?? 5;
  const count = catalogQuery.data?.length ?? 0;

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "stock" | "price_asc" | "price_desc">("stock");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  const availableCategories = useMemo(() => {
    const cats = (catalogQuery.data ?? [])
      .map((it) => it.category?.trim())
      .filter((c): c is string => !!c);
    return Array.from(new Set(cats)).sort((a, b) => a.localeCompare(b));
  }, [catalogQuery.data]);

  const availableTags = useMemo(() => {
    const tags = (catalogQuery.data ?? []).flatMap((it) => it.tags ?? []);
    return Array.from(new Set(tags)).sort((a, b) => a.localeCompare(b));
  }, [catalogQuery.data]);

  const filteredAndSortedItems = useMemo(() => {
    const items = [...(catalogQuery.data ?? [])];

    const q = search.trim().toLowerCase();
    let filtered = q ? items.filter((it) => it.title.toLowerCase().includes(q)) : items;

    if (categoryFilter.trim()) {
      filtered = filtered.filter((it) => (it.category ?? "").toLowerCase() === categoryFilter.toLowerCase());
    }

    if (tagFilter.length) {
      filtered = filtered.filter((it) => (it.tags ?? []).some((t) => tagFilter.includes(t)));
    }

    filtered.sort((a, b) => {
      if (sort === "stock") {
        if (a.in_stock !== b.in_stock) return a.in_stock ? -1 : 1;
        return a.title.localeCompare(b.title);
      }
      if (sort === "name") return a.title.localeCompare(b.title);
      if (sort === "price_asc") return a.price_inr - b.price_inr;
      return b.price_inr - a.price_inr;
    });

    return filtered;
  }, [catalogQuery.data, search, sort, categoryFilter, tagFilter]);

  const toggleOnline = async () => {
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

    const tags = parseTagInput(newTags);
    const category = newCategory.trim() ? newCategory.trim() : null;

    const { error } = await supabase.from("vendor_catalog_items").insert({
      vendor_id: vendor.id,
      title: parsed.data.title,
      price_inr: parsed.data.price_inr,
      unit: parsed.data.unit,
      category,
      tags,
      in_stock: true,
    });

    if (error) {
      toast({ title: "Couldn’t add item", description: error.message, variant: "destructive" });
      return;
    }

    setNewTitle("");
    setNewPrice("");
    setNewUnit("kg");
    setNewCategory("");
    setNewTags("");
    toast({ title: "Item added" });
    catalogQuery.refetch();
  };

  const requestUpgrade = async () => {
    if (!vendor) return;

    const { error } = await supabase.from("vendor_plans").update({ upgrade_requested: true }).eq("vendor_id", vendor.id);

    if (error) {
      toast({ title: "Couldn’t request upgrade", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Upgrade requested", description: "Admin will review your request." });
    planQuery.refetch();
  };

  const uploadItemPhoto = async (itemId: string, file: File) => {
    if (!user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please choose an image.", variant: "destructive" });
      return;
    }

    setUploadingItemId(itemId);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${itemId}-${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from("catalog-images").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { error: updateErr } = await supabase
        .from("vendor_catalog_items")
        .update({ photo_url: path })
        .eq("id", itemId);
      if (updateErr) throw updateErr;

      toast({ title: "Photo uploaded" });
      catalogQuery.refetch();
    } catch (e: any) {
      toast({ title: "Couldn’t upload", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setUploadingItemId(null);
    }
  };

  const openEdit = (it: CatalogRow) => {
    setEditingItem(it);
    setEditPrice(String(it.price_inr));
    setEditUnit(it.unit);
    setEditCategory(it.category ?? "");
    setEditTags(formatTags(it.tags));
  };

  const saveEdit = async () => {
    if (!editingItem) return;

    const parsed = editSchema.safeParse({ price_inr: editPrice, unit: editUnit });
    if (!parsed.success) {
      toast({ title: "Fix item", description: parsed.error.errors[0]?.message, variant: "destructive" });
      return;
    }

    setSavingEdit(true);
    try {
      const tags = parseTagInput(editTags);
      const category = editCategory.trim() ? editCategory.trim() : null;

      const { error } = await supabase
        .from("vendor_catalog_items")
        .update({ price_inr: parsed.data.price_inr, unit: parsed.data.unit, category, tags })
        .eq("id", editingItem.id);
      if (error) throw error;

      toast({ title: "Item updated" });
      setEditingItem(null);
      catalogQuery.refetch();
    } catch (e: any) {
      toast({ title: "Couldn’t update", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleInStock = async (it: CatalogRow) => {
    setTogglingItemId(it.id);
    try {
      const { error } = await supabase
        .from("vendor_catalog_items")
        .update({ in_stock: !it.in_stock })
        .eq("id", it.id);
      if (error) throw error;
      catalogQuery.refetch();
    } catch (e: any) {
      toast({ title: "Couldn’t update", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setTogglingItemId(null);
    }
  };

  const deleteItem = async (it: CatalogRow) => {
    setDeletingItemId(it.id);
    try {
      const { error } = await supabase.from("vendor_catalog_items").delete().eq("id", it.id);
      if (error) throw error;
      toast({ title: "Item deleted" });
      catalogQuery.refetch();
    } catch (e: any) {
      toast({ title: "Couldn’t delete", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setDeletingItemId(null);
    }
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
                <Badge variant={vendor.is_online ? "default" : "secondary"}>{vendor.is_online ? "Online" : "Offline"}</Badge>
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
                <Input
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="Price (₹)"
                  inputMode="numeric"
                />
                <Input
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="Unit (kg/piece/dozen)"
                />
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Category (e.g. fruit)"
                />
                <Input
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="Tags (comma separated)"
                />
                <Button variant="hero" className="w-full" onClick={addItem}>
                  Add
                </Button>
                <Button variant="outline" className="w-full" onClick={requestUpgrade} disabled={plan?.upgrade_requested}>
                  {plan?.upgrade_requested ? "Upgrade requested" : "Request upgrade"}
                </Button>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <p className="text-sm font-semibold text-muted-foreground">Your items</p>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search items…"
                    className="sm:w-60"
                  />

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-44"
                    aria-label="Filter by category"
                  >
                    <option value="">All categories</option>
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as any)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-52"
                    aria-label="Sort catalog"
                  >
                    <option value="stock">In-stock first</option>
                    <option value="name">Name (A–Z)</option>
                    <option value="price_asc">Price (low → high)</option>
                    <option value="price_desc">Price (high → low)</option>
                  </select>
                </div>

                {availableTags.length ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {availableTags.map((t) => {
                      const active = tagFilter.includes(t);
                      return (
                        <Button
                          key={t}
                          type="button"
                          size="sm"
                          variant={active ? "secondary" : "outline"}
                          onClick={() =>
                            setTagFilter((prev) => (active ? prev.filter((x) => x !== t) : [...prev, t]))
                          }
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

              <div className="mt-3 grid gap-2">
                {(catalogQuery.data ?? []).length === 0 ? (
                  <div className="rounded-xl border bg-card p-6 text-center">
                    <p className="font-semibold">No items yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">Add your first item to start receiving orders.</p>
                  </div>
                ) : filteredAndSortedItems.length === 0 ? (
                  <div className="rounded-xl border bg-card p-6 text-center">
                    <p className="font-semibold">No matches</p>
                    <p className="mt-1 text-sm text-muted-foreground">Try a different search or sort.</p>
                  </div>
                ) : (
                  filteredAndSortedItems.map((it) => {
                    const img = getCatalogImagePublicUrl(it.photo_url);
                    const busy =
                      uploadingItemId === it.id || togglingItemId === it.id || deletingItemId === it.id || savingEdit;

                    return (
                      <div
                        key={it.id}
                        className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 overflow-hidden rounded-lg border bg-muted">
                            {img ? (
                              <img
                                src={img}
                                alt={`${it.title} photo`}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : null}
                          </div>
                          <div>
                            <p className="font-semibold">{it.title}</p>
                            <p className="text-sm text-muted-foreground">
                              ₹{it.price_inr} / {it.unit}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:items-end">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={it.in_stock ? "default" : "secondary"}>{it.in_stock ? "In stock" : "Out"}</Badge>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => toggleInStock(it)}
                              disabled={busy}
                            >
                              Toggle stock
                            </Button>

                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => openEdit(it)}
                              disabled={busy}
                              aria-label="Edit item"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  disabled={busy}
                                  aria-label="Delete item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete “{it.title}”?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove the item from your catalog.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteItem(it)} disabled={deletingItemId === it.id}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>

                          <Input
                            type="file"
                            accept="image/*"
                            disabled={busy}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.currentTarget.value = "";
                              if (!f) return;
                              uploadItemPhoto(it.id, f);
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit item</DialogTitle>
            <DialogDescription>Update price and unit for “{editingItem?.title}”.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Price (₹)</p>
              <Input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Unit</p>
              <Input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} placeholder="kg / piece / dozen" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Category</p>
              <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="fruit" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Tags (comma separated)</p>
              <Input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="fresh, organic" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button variant="hero" onClick={saveEdit} disabled={savingEdit}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
