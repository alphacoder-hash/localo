import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type VendorStatus = "pending" | "approved" | "rejected";
type VendorFilter = VendorStatus | "all";

type VendorAdminRow = {
  id: string;
  shop_name: string;
  vendor_type: "moving_stall" | "fixed_shop";
  city: string | null;
  state: string | null;
  opening_note: string | null;
  selfie_with_shop_image_url: string | null;
  verification_status: VendorStatus;
  rejection_reason: string | null;
  owner_user_id: string;
  is_online: boolean;
  created_at: string;
};

type VendorPlanTier = "free" | "pro";

type PlanRow = {
  id: string;
  vendor_id: string;
  tier: VendorPlanTier;
  catalog_limit: number;
  upgrade_requested: boolean;
  updated_at: string;
  vendors?: {
    shop_name: string | null;
    owner_user_id: string;
  } | null;
};

type OrderStatus = "placed" | "accepted" | "preparing" | "ready" | "completed" | "cancelled";
type PaymentMode = "upi" | "cash";

type AdminOrderItemRow = {
  id: string;
  title_snapshot: string;
  unit_snapshot: string;
  qty: number;
  price_snapshot_inr: number;
};

type AdminOrderRow = {
  id: string;
  created_at: string;
  status: OrderStatus;
  payment_mode: PaymentMode;
  pickup_note: string | null;
  customer_user_id: string;
  vendor_id: string;
  vendors?: {
    shop_name: string | null;
    owner_user_id: string;
  } | null;
  order_items: AdminOrderItemRow[];
};

const rejectionTemplates = [
  "Selfie/photo is unclear",
  "Shop name/details incomplete",
  "Address/location info missing",
  "Duplicate vendor application",
  "Could not verify shop ownership",
];

type AdminSection = "vendors" | "plans" | "orders";

type OrderFilter = OrderStatus | "all";

function formatInr(amount: number) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
      amount,
    );
  } catch {
    return `₹${amount}`;
  }
}

function orderTotal(items: AdminOrderItemRow[]) {
  return items.reduce((sum, it) => sum + (it.price_snapshot_inr ?? 0) * (it.qty ?? 0), 0);
}

function shortId(id: string) {
  return id ? `${id.slice(0, 8)}…${id.slice(-4)}` : "—";
}

type AdminHeaderProps = {
  section: AdminSection;
  q: string;
  setQ: (v: string) => void;
};

function AdminHeader({ section, q, setQ }: AdminHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-muted-foreground">Admin</p>
        <h1 className="mt-2 font-display text-4xl leading-tight">Operations</h1>
        <p className="mt-3 text-muted-foreground">Verify vendors, manage plans, and handle disputes.</p>
      </div>

      <div className="w-full sm:w-80">
        <Label className="sr-only" htmlFor="admin_search">
          Search
        </Label>
        <Input
          id="admin_search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            section === "vendors" ? "Search vendor…" : section === "plans" ? "Search by shop name…" : "Search order…"
          }
        />
      </div>
    </header>
  );
}

type VendorsSectionProps = {
  vendorFilter: VendorFilter;
  setVendorFilter: (v: VendorFilter) => void;
  vendorCounts: { all: number; pending: number; approved: number; rejected: number };
  vendorQueryLoading: boolean;
  vendorList: VendorAdminRow[];
  busy: Record<string, boolean>;
  onReview: (v: VendorAdminRow) => void;
  onApprove: (v: VendorAdminRow) => void;
  onReject: (v: VendorAdminRow) => void;
  onToggleOnline: (v: VendorAdminRow) => void;
};

function VendorsSection({
  vendorFilter,
  setVendorFilter,
  vendorCounts,
  vendorQueryLoading,
  vendorList,
  busy,
  onReview,
  onApprove,
  onReject,
  onToggleOnline,
}: VendorsSectionProps) {
  return (
    <TabsContent value="vendors" className="mt-4 space-y-3">
      <Tabs value={vendorFilter} onValueChange={(v) => setVendorFilter(v as VendorFilter)}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="pending">Pending ({vendorCounts.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({vendorCounts.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({vendorCounts.rejected})</TabsTrigger>
          <TabsTrigger value="all">All ({vendorCounts.all})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Vendors</CardTitle>
          <p className="text-sm text-muted-foreground">Click a row to review.</p>
        </CardHeader>
        <CardContent>
          {vendorQueryLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
          ) : vendorList.length === 0 ? (
            <div className="py-10 text-center">
              <p className="font-semibold">No vendors found.</p>
              <p className="mt-2 text-sm text-muted-foreground">Try changing the filter or search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shop</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorList.map((v) => {
                    const isRowBusy = !!busy[`vendor:${v.id}`];
                    return (
                      <TableRow key={v.id} className="cursor-pointer" onClick={() => onReview(v)}>
                        <TableCell className="font-semibold">{v.shop_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {v.verification_status}
                          {v.verification_status === "approved" ? (v.is_online ? " • online" : " • offline") : ""}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {v.vendor_type === "moving_stall" ? "Moving stall" : "Fixed shop"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{v.city ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {v.verification_status === "pending" ? (
                              <>
                                <Button variant="hero" size="sm" disabled={isRowBusy} onClick={() => onApprove(v)}>
                                  Approve
                                </Button>
                                <Button variant="outline" size="sm" disabled={isRowBusy} onClick={() => onReject(v)}>
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button variant="outline" size="sm" disabled={isRowBusy} onClick={() => onReview(v)}>
                                  Review
                                </Button>
                                <Button
                                  variant={v.is_online ? "outline" : "hero"}
                                  size="sm"
                                  disabled={isRowBusy || v.verification_status !== "approved"}
                                  onClick={() => onToggleOnline(v)}
                                >
                                  {v.is_online ? "Set offline" : "Set online"}
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

type PlansSectionProps = {
  planCounts: { all: number; upgrade: number; pro: number; free: number };
  planQueryLoading: boolean;
  planList: PlanRow[];
  busy: Record<string, boolean>;
  onReview: (p: PlanRow) => void;
  onApproveUpgrade: (p: PlanRow) => void;
};

function PlansSection({ planCounts, planQueryLoading, planList, busy, onReview, onApproveUpgrade }: PlansSectionProps) {
  return (
    <TabsContent value="plans" className="mt-4 space-y-3">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Upgrade requests</p>
            <p className="mt-1 font-display text-2xl">{planCounts.upgrade}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Pro</p>
            <p className="mt-1 font-display text-2xl">{planCounts.pro}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Free</p>
            <p className="mt-1 font-display text-2xl">{planCounts.free}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="mt-1 font-display text-2xl">{planCounts.all}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Vendor plans</CardTitle>
          <p className="text-sm text-muted-foreground">Approve upgrades and set catalog limits.</p>
        </CardHeader>
        <CardContent>
          {planQueryLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
          ) : planList.length === 0 ? (
            <div className="py-10 text-center">
              <p className="font-semibold">No plans found.</p>
              <p className="mt-2 text-sm text-muted-foreground">Try changing the search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shop</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Catalog limit</TableHead>
                    <TableHead>Upgrade requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planList.map((p) => {
                    const isRowBusy = !!busy[`plan:${p.id}`];
                    const shopName = p.vendors?.shop_name ?? p.vendor_id;
                    return (
                      <TableRow key={p.id} className="cursor-pointer" onClick={() => onReview(p)}>
                        <TableCell className="font-semibold">{shopName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.tier}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.catalog_limit}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.upgrade_requested ? "Yes" : "No"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button variant="outline" size="sm" disabled={isRowBusy} onClick={() => onReview(p)}>
                              Review
                            </Button>
                            <Button
                              variant="hero"
                              size="sm"
                              disabled={isRowBusy || !p.upgrade_requested}
                              onClick={() => onApproveUpgrade(p)}
                            >
                              Approve
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

type OrdersSectionProps = {
  orderFilter: OrderFilter;
  setOrderFilter: (v: OrderFilter) => void;
  orderCounts: Record<OrderFilter, number>;
  ordersLoading: boolean;
  orderList: AdminOrderRow[];
  busy: Record<string, boolean>;
  onReview: (o: AdminOrderRow) => void;
};

function OrdersSection({
  orderFilter,
  setOrderFilter,
  orderCounts,
  ordersLoading,
  orderList,
  busy,
  onReview,
}: OrdersSectionProps) {
  return (
    <TabsContent value="orders" className="mt-4 space-y-3">
      <Tabs value={orderFilter} onValueChange={(v) => setOrderFilter(v as OrderFilter)}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="placed">Placed ({orderCounts.placed})</TabsTrigger>
          <TabsTrigger value="accepted">Accepted ({orderCounts.accepted})</TabsTrigger>
          <TabsTrigger value="preparing">Preparing ({orderCounts.preparing})</TabsTrigger>
          <TabsTrigger value="ready">Ready ({orderCounts.ready})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({orderCounts.completed})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({orderCounts.cancelled})</TabsTrigger>
          <TabsTrigger value="all">All ({orderCounts.all})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Total orders</p>
            <p className="mt-1 font-display text-2xl">{orderCounts.all}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Placed</p>
            <p className="mt-1 font-display text-2xl">{orderCounts.placed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Ready</p>
            <p className="mt-1 font-display text-2xl">{orderCounts.ready}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Orders</CardTitle>
          <p className="text-sm text-muted-foreground">Click a row to review.</p>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
          ) : orderList.length === 0 ? (
            <div className="py-10 text-center">
              <p className="font-semibold">No orders found.</p>
              <p className="mt-2 text-sm text-muted-foreground">Try changing the filter or search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderList.map((o) => {
                    const total = orderTotal(o.order_items ?? []);
                    const isRowBusy = !!busy[`order:${o.id}`];
                    return (
                      <TableRow
                        key={o.id}
                        className={isRowBusy ? "cursor-not-allowed opacity-70" : "cursor-pointer"}
                        onClick={() => (isRowBusy ? null : onReview(o))}
                      >
                        <TableCell className="font-semibold">#{o.id.slice(0, 8)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{o.vendors?.shop_name ?? o.vendor_id}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{o.status}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{o.payment_mode}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{shortId(o.customer_user_id)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatInr(total)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

export default function Admin() {
  const { toast } = useToast();

  const [section, setSection] = useState<AdminSection>("vendors");
  const [q, setQ] = useState("");

  const [vendorFilter, setVendorFilter] = useState<VendorFilter>("pending");
  const [selectedVendor, setSelectedVendor] = useState<VendorAdminRow | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const [planSelected, setPlanSelected] = useState<PlanRow | null>(null);
  const [planNextLimit, setPlanNextLimit] = useState<Record<string, string>>({});

  const [orderFilter, setOrderFilter] = useState<OrderFilter>("placed");
  const [orderSelected, setOrderSelected] = useState<AdminOrderRow | null>(null);
  const [orderNextStatus, setOrderNextStatus] = useState<Record<string, OrderStatus>>({});

  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const setRowBusy = (key: string, v: boolean) => setBusy((s) => ({ ...s, [key]: v }));

  const notify = async (ownerUserId: string, title: string, body: string) => {
    const { error } = await supabase.from("notifications").insert({ user_id: ownerUserId, title, body });
    if (error) console.warn("admin: failed to send notification", error);
  };

  const vendorQuery = useQuery({
    queryKey: ["admin_vendors", vendorFilter, q, section],
    enabled: section === "vendors",
    queryFn: async () => {
      const query = supabase
        .from("vendors")
        .select(
          "id, shop_name, vendor_type, city, state, opening_note, selfie_with_shop_image_url, verification_status, rejection_reason, owner_user_id, is_online, created_at",
        )
        .order("created_at", { ascending: false });

      if (vendorFilter !== "all") query.eq("verification_status", vendorFilter);
      if (q.trim()) query.ilike("shop_name", `%${q.trim()}%`);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as VendorAdminRow[];
    },
  });

  const vendorCounts = useMemo(() => {
    const all = vendorQuery.data ?? [];
    return {
      all: all.length,
      pending: all.filter((v) => v.verification_status === "pending").length,
      approved: all.filter((v) => v.verification_status === "approved").length,
      rejected: all.filter((v) => v.verification_status === "rejected").length,
    };
  }, [vendorQuery.data]);

  const getSelfieUrl = async (path: string | null) => {
    if (!path) return null;
    const { data, error } = await supabase.storage.from("vendor-selfies").createSignedUrl(path, 60 * 15);
    if (error) return null;
    return data.signedUrl;
  };

  const approveVendor = async (vendor: VendorAdminRow) => {
    setRowBusy(`vendor:${vendor.id}`, true);
    try {
      const { error } = await supabase
        .from("vendors")
        .update({ verification_status: "approved", rejection_reason: null })
        .eq("id", vendor.id);

      if (error) throw error;

      await notify(
        vendor.owner_user_id,
        "You’re verified!",
        "Your store is approved. You can go online and add your catalog now.",
      );

      toast({ title: "Approved" });
      vendorQuery.refetch();
      setSelectedVendor((s) =>
        s?.id === vendor.id ? { ...vendor, verification_status: "approved", rejection_reason: null } : s,
      );
    } catch (e: any) {
      toast({ title: "Approve failed", description: e?.message ?? "Please try again", variant: "destructive" });
    } finally {
      setRowBusy(`vendor:${vendor.id}`, false);
    }
  };

  const rejectVendor = async (vendor: VendorAdminRow) => {
    const reason = (rejectReason[vendor.id] ?? vendor.rejection_reason ?? "").trim();
    if (!reason) {
      toast({ title: "Reason required", description: "Add a rejection reason.", variant: "destructive" });
      return;
    }

    setRowBusy(`vendor:${vendor.id}`, true);
    try {
      const { error } = await supabase
        .from("vendors")
        .update({ verification_status: "rejected", rejection_reason: reason })
        .eq("id", vendor.id);

      if (error) throw error;

      await notify(vendor.owner_user_id, "Verification rejected", `Reason: ${reason}`);

      toast({ title: "Rejected" });
      vendorQuery.refetch();
      setSelectedVendor((s) =>
        s?.id === vendor.id ? { ...vendor, verification_status: "rejected", rejection_reason: reason } : s,
      );
    } catch (e: any) {
      toast({ title: "Reject failed", description: e?.message ?? "Please try again", variant: "destructive" });
    } finally {
      setRowBusy(`vendor:${vendor.id}`, false);
    }
  };

  const toggleVendorOnline = async (vendor: VendorAdminRow) => {
    setRowBusy(`vendor:${vendor.id}`, true);
    try {
      const next = !vendor.is_online;
      const { error } = await supabase.from("vendors").update({ is_online: next }).eq("id", vendor.id);
      if (error) throw error;
      toast({ title: next ? "Set online" : "Set offline" });
      vendorQuery.refetch();
      setSelectedVendor((s) => (s?.id === vendor.id ? { ...vendor, is_online: next } : s));
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message ?? "Please try again", variant: "destructive" });
    } finally {
      setRowBusy(`vendor:${vendor.id}`, false);
    }
  };

  const planQuery = useQuery({
    queryKey: ["admin_plans", q, section],
    enabled: section === "plans",
    queryFn: async () => {
      const query = supabase
        .from("vendor_plans")
        .select("id, vendor_id, tier, catalog_limit, upgrade_requested, updated_at, vendors(shop_name, owner_user_id)")
        .order("updated_at", { ascending: false });

      // When searching, search by vendor shop name (join) is not supported directly by ilike on nested.
      // We'll filter client-side for now.
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as PlanRow[];
    },
  });

  const planList = useMemo(() => {
    const all = planQuery.data ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((p) => (p.vendors?.shop_name ?? "").toLowerCase().includes(needle));
  }, [planQuery.data, q]);

  const planCounts = useMemo(() => {
    const all = planList;
    return {
      all: all.length,
      upgrade: all.filter((p) => p.upgrade_requested).length,
      pro: all.filter((p) => p.tier === "pro").length,
      free: all.filter((p) => p.tier === "free").length,
    };
  }, [planList]);

  const ordersQuery = useQuery({
    queryKey: ["admin_orders", q, section],
    enabled: section === "orders",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, created_at, status, payment_mode, pickup_note, customer_user_id, vendor_id, vendors(shop_name, owner_user_id), order_items(id, title_snapshot, unit_snapshot, qty, price_snapshot_inr)",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as AdminOrderRow[];
    },
  });

  const orderCounts = useMemo(() => {
    const base: Record<OrderFilter, number> = {
      all: 0,
      placed: 0,
      accepted: 0,
      preparing: 0,
      ready: 0,
      completed: 0,
      cancelled: 0,
    };
    const all = ordersQuery.data ?? [];
    base.all = all.length;
    for (const o of all) base[o.status] = (base[o.status] ?? 0) + 1;
    return base;
  }, [ordersQuery.data]);

  const orderList = useMemo(() => {
    const all = ordersQuery.data ?? [];
    const needle = q.trim().toLowerCase();
    const filtered = orderFilter === "all" ? all : all.filter((o) => o.status === orderFilter);
    if (!needle) return filtered;
    return filtered.filter((o) => {
      const vendor = (o.vendors?.shop_name ?? "").toLowerCase();
      return (
        o.id.toLowerCase().includes(needle) ||
        o.customer_user_id.toLowerCase().includes(needle) ||
        o.vendor_id.toLowerCase().includes(needle) ||
        vendor.includes(needle)
      );
    });
  }, [ordersQuery.data, orderFilter, q]);

  const updateOrderStatus = async (order: AdminOrderRow, next: OrderStatus) => {
    if (!next || next === order.status) return;
    setRowBusy(`order:${order.id}`, true);
    try {
      const { error } = await supabase.from("orders").update({ status: next }).eq("id", order.id);
      if (error) throw error;

      if (order.vendors?.owner_user_id) {
        await notify(order.vendors.owner_user_id, "Order updated", `Order #${order.id.slice(0, 8)} status: ${next}.`);
      }
      await notify(order.customer_user_id, "Order updated", `Order #${order.id.slice(0, 8)} status: ${next}.`);

      toast({ title: "Order updated" });
      ordersQuery.refetch();
      setOrderSelected((s) => (s?.id === order.id ? { ...s, status: next } : s));
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message ?? "Please try again", variant: "destructive" });
    } finally {
      setRowBusy(`order:${order.id}`, false);
    }
  };

  const approveUpgrade = async (plan: PlanRow) => {
    const nextLimitStr = (planNextLimit[plan.id] ?? "").trim();
    const nextLimit = nextLimitStr ? Number(nextLimitStr) : Math.max(plan.catalog_limit, 50);

    if (!Number.isFinite(nextLimit) || nextLimit <= 0) {
      toast({ title: "Invalid catalog limit", description: "Enter a positive number.", variant: "destructive" });
      return;
    }

    setRowBusy(`plan:${plan.id}`, true);
    try {
      const { error } = await supabase
        .from("vendor_plans")
        .update({ tier: "pro", catalog_limit: nextLimit, upgrade_requested: false })
        .eq("id", plan.id);

      if (error) throw error;

      const ownerUserId = plan.vendors?.owner_user_id;
      if (ownerUserId) {
        await notify(
          ownerUserId,
          "Upgrade approved",
          `Your plan is now Pro. Catalog limit: ${nextLimit}.`,
        );
      }

      toast({ title: "Upgrade approved" });
      planQuery.refetch();
      setPlanSelected((s) =>
        s?.id === plan.id ? { ...plan, tier: "pro", catalog_limit: nextLimit, upgrade_requested: false } : s,
      );
    } catch (e: any) {
      toast({ title: "Approve failed", description: e?.message ?? "Please try again", variant: "destructive" });
    } finally {
      setRowBusy(`plan:${plan.id}`, false);
    }
  };

  const clearUpgradeRequest = async (plan: PlanRow) => {
    setRowBusy(`plan:${plan.id}`, true);
    try {
      const { error } = await supabase.from("vendor_plans").update({ upgrade_requested: false }).eq("id", plan.id);
      if (error) throw error;

      const ownerUserId = plan.vendors?.owner_user_id;
      if (ownerUserId) {
        await notify(ownerUserId, "Upgrade request updated", "Your upgrade request was reviewed.");
      }

      toast({ title: "Request cleared" });
      planQuery.refetch();
      setPlanSelected((s) => (s?.id === plan.id ? { ...plan, upgrade_requested: false } : s));
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message ?? "Please try again", variant: "destructive" });
    } finally {
      setRowBusy(`plan:${plan.id}`, false);
    }
  };

  const vendorList = vendorQuery.data ?? [];
  const planListSafe = planList;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminHeader section={section} q={q} setQ={setQ} />

      <Tabs value={section} onValueChange={(v) => setSection(v as any)}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="plans">Plans & payments</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <VendorsSection
          vendorFilter={vendorFilter}
          setVendorFilter={setVendorFilter}
          vendorCounts={vendorCounts}
          vendorQueryLoading={vendorQuery.isLoading}
          vendorList={vendorList}
          busy={busy}
          onReview={(v) => setSelectedVendor(v)}
          onApprove={approveVendor}
          onReject={rejectVendor}
          onToggleOnline={toggleVendorOnline}
        />

        <PlansSection
          planCounts={planCounts}
          planQueryLoading={planQuery.isLoading}
          planList={planListSafe}
          busy={busy}
          onReview={(p) => setPlanSelected(p)}
          onApproveUpgrade={approveUpgrade}
        />

        <OrdersSection
          orderFilter={orderFilter}
          setOrderFilter={setOrderFilter}
          orderCounts={orderCounts}
          ordersLoading={ordersQuery.isLoading}
          orderList={orderList}
          busy={busy}
          onReview={(o) => {
            setOrderSelected(o);
            setOrderNextStatus((s) => ({ ...s, [o.id]: o.status }));
          }}
        />
      </Tabs>

      <VendorReviewDialog
        open={!!selectedVendor}
        vendor={selectedVendor}
        onOpenChange={(o) => !o && setSelectedVendor(null)}
        rejectReason={selectedVendor ? rejectReason[selectedVendor.id] ?? selectedVendor.rejection_reason ?? "" : ""}
        setRejectReason={(next) =>
          selectedVendor && setRejectReason((s) => ({ ...s, [selectedVendor.id]: next }))
        }
        rejectionTemplates={rejectionTemplates}
        getSelfieUrl={getSelfieUrl}
        busy={selectedVendor ? !!busy[`vendor:${selectedVendor.id}`] : false}
        onApprove={selectedVendor ? () => approveVendor(selectedVendor) : undefined}
        onReject={selectedVendor ? () => rejectVendor(selectedVendor) : undefined}
        onToggleOnline={selectedVendor ? () => toggleVendorOnline(selectedVendor) : undefined}
      />

      <PlanReviewDialog
        open={!!planSelected}
        plan={planSelected}
        onOpenChange={(o) => !o && setPlanSelected(null)}
        busy={planSelected ? !!busy[`plan:${planSelected.id}`] : false}
        nextLimit={planSelected ? planNextLimit[planSelected.id] ?? "" : ""}
        setNextLimit={(v) => planSelected && setPlanNextLimit((s) => ({ ...s, [planSelected.id]: v }))}
        onApprove={planSelected ? () => approveUpgrade(planSelected) : undefined}
        onClearRequest={planSelected ? () => clearUpgradeRequest(planSelected) : undefined}
      />

      <OrderReviewDialog
        open={!!orderSelected}
        order={orderSelected}
        onOpenChange={(o) => !o && setOrderSelected(null)}
        busy={orderSelected ? !!busy[`order:${orderSelected.id}`] : false}
        nextStatus={orderSelected ? orderNextStatus[orderSelected.id] ?? orderSelected.status : "placed"}
        setNextStatus={(v) => orderSelected && setOrderNextStatus((s) => ({ ...s, [orderSelected.id]: v }))}
        onUpdate={() =>
          orderSelected ? updateOrderStatus(orderSelected, orderNextStatus[orderSelected.id] ?? orderSelected.status) : null
        }
      />
    </div>
  );
}

function VendorReviewDialog(props: {
  open: boolean;
  vendor: VendorAdminRow | null;
  onOpenChange: (open: boolean) => void;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  rejectionTemplates: string[];
  getSelfieUrl: (path: string | null) => Promise<string | null>;
  busy: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onToggleOnline?: () => void;
}) {
  const { vendor } = props;

  const signed = useQuery({
    queryKey: ["admin_selfie", vendor?.selfie_with_shop_image_url],
    enabled: !!vendor?.selfie_with_shop_image_url && props.open,
    queryFn: () => props.getSelfieUrl(vendor?.selfie_with_shop_image_url ?? null),
  });

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{vendor?.shop_name ?? "Vendor"}</DialogTitle>
          <DialogDescription>
            {vendor
              ? `${vendor.vendor_type === "moving_stall" ? "Moving stall" : "Fixed shop"}`
              : ""}
            {vendor?.city ? ` • ${vendor.city}` : ""}
            {vendor?.state ? `, ${vendor.state}` : ""}
          </DialogDescription>
        </DialogHeader>

        {vendor ? (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-3">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm font-semibold">Status</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {vendor.verification_status}
                  {vendor.verification_status === "approved" ? (vendor.is_online ? " • online" : " • offline") : ""}
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm font-semibold">Opening note</p>
                <p className="mt-1 text-sm text-muted-foreground">{vendor.opening_note || "—"}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reject_reason">Rejection reason</Label>
                <Input
                  id="reject_reason"
                  value={props.rejectReason}
                  onChange={(e) => props.setRejectReason(e.target.value)}
                  placeholder="Required to reject"
                />
                <div className="flex flex-wrap gap-2">
                  {props.rejectionTemplates.map((t) => (
                    <Button
                      key={t}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => props.setRejectReason(t)}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold">Selfie / verification photo</p>
              {!vendor.selfie_with_shop_image_url ? (
                <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">No selfie uploaded.</div>
              ) : !signed.data ? (
                <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">Loading photo…</div>
              ) : (
                <div className="overflow-hidden rounded-xl border bg-card">
                  <img
                    src={signed.data}
                    alt="Vendor selfie with shop for verification"
                    className="h-64 w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2">
          {vendor?.verification_status === "approved" ? (
            <Button variant={vendor.is_online ? "outline" : "hero"} onClick={props.onToggleOnline} disabled={props.busy}>
              {vendor.is_online ? "Set offline" : "Set online"}
            </Button>
          ) : null}

          {vendor?.verification_status !== "approved" ? (
            <Button variant="hero" onClick={props.onApprove} disabled={props.busy}>
              Approve
            </Button>
          ) : null}

          {vendor ? (
            <Button variant="outline" onClick={props.onReject} disabled={props.busy}>
              Reject
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanReviewDialog(props: {
  open: boolean;
  plan: PlanRow | null;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  nextLimit: string;
  setNextLimit: (v: string) => void;
  onApprove?: () => void;
  onClearRequest?: () => void;
}) {
  const plan = props.plan;
  const shopName = plan?.vendors?.shop_name ?? plan?.vendor_id ?? "Vendor";

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{shopName}</DialogTitle>
          <DialogDescription>Review plan tier, catalog limit, and upgrade request.</DialogDescription>
        </DialogHeader>

        {plan ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm font-semibold">Current tier</p>
                <p className="mt-1 text-sm text-muted-foreground">{plan.tier}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm font-semibold">Current catalog limit</p>
                <p className="mt-1 text-sm text-muted-foreground">{plan.catalog_limit}</p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm font-semibold">Upgrade requested</p>
              <p className="mt-1 text-sm text-muted-foreground">{plan.upgrade_requested ? "Yes" : "No"}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="catalog_limit">New catalog limit (when approving)</Label>
              <Input
                id="catalog_limit"
                inputMode="numeric"
                value={props.nextLimit}
                onChange={(e) => props.setNextLimit(e.target.value)}
                placeholder={String(Math.max(plan.catalog_limit, 50))}
              />
              <p className="text-xs text-muted-foreground">
                If empty, we’ll default to {Math.max(plan.catalog_limit, 50)}.
              </p>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2">
          {plan?.upgrade_requested ? (
            <Button variant="hero" onClick={props.onApprove} disabled={props.busy}>
              Approve upgrade
            </Button>
          ) : null}

          {plan ? (
            <Button variant="outline" onClick={props.onClearRequest} disabled={props.busy}>
              Clear request
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderReviewDialog(props: {
  open: boolean;
  order: AdminOrderRow | null;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  nextStatus: OrderStatus;
  setNextStatus: (v: OrderStatus) => void;
  onUpdate?: () => void;
}) {
  const order = props.order;
  const total = order ? orderTotal(order.order_items ?? []) : 0;
  const vendorName = order?.vendors?.shop_name ?? order?.vendor_id ?? "Vendor";

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Order #{order?.id.slice(0, 8)}</DialogTitle>
          <DialogDescription>
            {vendorName}
            {order?.created_at ? ` • ${new Date(order.created_at).toLocaleString()}` : ""}
          </DialogDescription>
        </DialogHeader>

        {order ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm font-semibold">Status</p>
                <p className="mt-1 text-sm text-muted-foreground">{order.status}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm font-semibold">Payment</p>
                <p className="mt-1 text-sm text-muted-foreground">{order.payment_mode}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm font-semibold">Customer</p>
                <p className="mt-1 text-sm text-muted-foreground">{shortId(order.customer_user_id)}</p>
              </div>
            </div>

            {order.pickup_note ? (
              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm font-semibold">Pickup note</p>
                <p className="mt-1 text-sm text-muted-foreground">{order.pickup_note}</p>
              </div>
            ) : null}

            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm font-semibold">Items</p>
              <div className="mt-3 grid gap-2">
                {(order.order_items ?? []).map((it) => (
                  <div key={it.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{it.title_snapshot}</p>
                      <p className="text-sm text-muted-foreground">
                        {it.qty} × {it.unit_snapshot}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{formatInr((it.price_snapshot_inr ?? 0) * (it.qty ?? 0))}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <p className="text-sm font-semibold">Total</p>
                <p className="text-sm font-semibold">{formatInr(total)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_order_status">Update status</Label>
              <select
                id="admin_order_status"
                value={props.nextStatus}
                onChange={(e) => props.setNextStatus(e.target.value as OrderStatus)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Update order status"
              >
                <option value="placed">placed</option>
                <option value="accepted">accepted</option>
                <option value="preparing">preparing</option>
                <option value="ready">ready</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => props.onOpenChange(false)} disabled={props.busy}>
            Close
          </Button>
          <Button variant="hero" onClick={props.onUpdate} disabled={props.busy || !order}>
            Update status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
