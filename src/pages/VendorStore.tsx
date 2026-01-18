import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Navigation, Minus, Plus, ShoppingCart } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
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

type PaymentMode = "upi" | "cash";

function formatInr(amount: number) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${amount}`;
  }
}

const checkoutSchema = z.object({
  payment_mode: z.enum(["upi", "cash"]),
  pickup_note: z.string().trim().max(200).optional(),
});

export default function VendorStore() {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("upi");
  const [pickupNote, setPickupNote] = useState("");
  const [placing, setPlacing] = useState(false);

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

  const cartItems = useMemo(() => {
    const list = catalogQuery.data ?? [];
    const byId = new Map(list.map((it) => [it.id, it] as const));

    return Object.entries(cart)
      .map(([id, qty]) => {
        const it = byId.get(id);
        if (!it) return null;
        const safeQty = Number.isFinite(qty) ? Math.max(0, Math.min(99, Math.floor(qty))) : 0;
        if (safeQty <= 0) return null;
        return { ...it, qty: safeQty };
      })
      .filter(Boolean) as Array<CatalogRow & { qty: number }>;
  }, [cart, catalogQuery.data]);

  const cartCount = useMemo(() => cartItems.reduce((sum, it) => sum + it.qty, 0), [cartItems]);
  const cartTotal = useMemo(() => cartItems.reduce((sum, it) => sum + it.price_inr * it.qty, 0), [cartItems]);

  const setCartQty = (itemId: string, nextQty: number) => {
    setCart((prev) => {
      const qty = Math.max(0, Math.min(99, Math.floor(nextQty)));
      if (qty <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: qty };
    });
  };

  const placeOrder = async () => {
    if (!vendorId || !vendor) return;

    if (!user) {
      navigate("/auth", { replace: true, state: { from: location.pathname } });
      return;
    }

    // UX guard (backend also blocks this via RLS)
    try {
      const { data: isOwner, error } = await supabase.rpc("is_vendor_owner", { _vendor_id: vendor.id });
      if (error) throw error;
      if (isOwner) {
        toast({
          title: "Not allowed",
          description: "Vendors can’t place orders to their own store.",
          variant: "destructive",
        });
        return;
      }
    } catch (e: any) {
      toast({
        title: "Couldn’t verify vendor",
        description: e?.message ?? "Please try again",
        variant: "destructive",
      });
      return;
    }

    const parsed = checkoutSchema.safeParse({
      payment_mode: paymentMode,
      pickup_note: pickupNote,
    });

    if (!parsed.success) {
      toast({
        title: "Check checkout details",
        description: parsed.error.errors[0]?.message ?? "Invalid input",
        variant: "destructive",
      });
      return;
    }

    if (cartItems.length === 0) {
      toast({ title: "Your cart is empty", variant: "destructive" });
      return;
    }

    setPlacing(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          vendor_id: vendor.id,
          customer_user_id: user.id,
          payment_mode: parsed.data.payment_mode,
          pickup_note: parsed.data.pickup_note?.trim() ? parsed.data.pickup_note.trim() : null,
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      const { error: itemsError } = await supabase.from("order_items").insert(
        cartItems.map((it) => ({
          order_id: order.id,
          catalog_item_id: it.id,
          qty: it.qty,
          price_snapshot_inr: it.price_inr,
          title_snapshot: it.title,
          unit_snapshot: it.unit,
        })),
      );

      if (itemsError) throw itemsError;

      toast({
        title: "Order placed",
        description: "The vendor has received your order. Pay at pickup (UPI or cash).",
      });

      setCart({});
      setPickupNote("");
      setPaymentMode("upi");
      setCheckoutOpen(false);
    } catch (e: any) {
      toast({
        title: "Order failed",
        description: e?.message ?? "Please try again",
        variant: "destructive",
      });
    } finally {
      setPlacing(false);
    }
  };

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
                const qty = cart[it.id] ?? 0;

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

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{it.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatInr(it.price_inr)} / {it.unit}
                      </p>
                      {(it.category || (it.tags ?? []).length) ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {it.category ? <Badge variant="outline">{it.category}</Badge> : null}
                          {(it.tags ?? []).slice(0, 4).map((t) => (
                            <Badge key={t} variant="secondary">
                              #{t}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      {qty > 0 ? (
                        <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => setCartQty(it.id, qty - 1)}
                            aria-label={`Decrease ${it.title} quantity`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-7 text-center text-sm font-semibold">{qty}</span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => setCartQty(it.id, qty + 1)}
                            aria-label={`Increase ${it.title} quantity`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button type="button" variant="outline" onClick={() => setCartQty(it.id, 1)}>
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </CardContent>
        </Card>

        <Card className="md:col-span-5">
          <CardHeader>
            <CardTitle className="text-base">Cart</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cartItems.length === 0 ? (
              <div className="rounded-xl border bg-card p-4">
                <p className="font-semibold">Your cart is empty</p>
                <p className="mt-1 text-sm text-muted-foreground">Add items from the catalog to place an order.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  {cartItems.slice(0, 6).map((it) => (
                    <div key={it.id} className="flex items-start justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{it.title}</p>
                        <p className="text-muted-foreground">
                          {it.qty} × {formatInr(it.price_inr)}
                        </p>
                      </div>
                      <p className="whitespace-nowrap font-semibold">{formatInr(it.qty * it.price_inr)}</p>
                    </div>
                  ))}
                  {cartItems.length > 6 ? (
                    <p className="text-xs text-muted-foreground">+ {cartItems.length - 6} more items</p>
                  ) : null}
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-semibold">{formatInr(cartTotal)}</p>
                </div>
              </div>
            )}

            <Button
              variant="hero"
              className="w-full"
              disabled={cartItems.length === 0}
              onClick={() => setCheckoutOpen(true)}
            >
              <ShoppingCart className="h-4 w-4" /> Checkout ({cartCount})
            </Button>
            <p className="text-sm text-muted-foreground">Payment is always at pickup: UPI or cash.</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>Confirm your cart and place the order. The vendor will prepare it for pickup.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm font-semibold">Order summary</p>
              <div className="mt-3 space-y-2">
                {cartItems.map((it) => (
                  <div key={it.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {it.title} <span className="text-muted-foreground">× {it.qty}</span>
                      </p>
                      <p className="text-muted-foreground">
                        {formatInr(it.price_inr)} / {it.unit}
                      </p>
                    </div>
                    <p className="whitespace-nowrap font-semibold">{formatInr(it.qty * it.price_inr)}</p>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-semibold">{formatInr(cartTotal)}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Payment mode</Label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Payment mode"
                >
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                </select>
                <p className="text-xs text-muted-foreground">You’ll pay when you pick up the order.</p>
              </div>

              <div className="space-y-2">
                <Label>Pickup note (optional)</Label>
                <Textarea
                  value={pickupNote}
                  onChange={(e) => setPickupNote(e.target.value)}
                  placeholder="Any instructions for pickup?"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Max 200 characters.</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)} disabled={placing}>
              Cancel
            </Button>
            <Button variant="hero" onClick={placeOrder} disabled={placing || cartItems.length === 0}>
              {placing ? "Placing…" : user ? "Place order" : "Login to place order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
