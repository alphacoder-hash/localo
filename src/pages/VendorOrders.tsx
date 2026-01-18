import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type OrderStatus = "placed" | "accepted" | "preparing" | "ready" | "completed" | "cancelled";
type PaymentMode = "upi" | "cash";

type VendorRow = { id: string; shop_name: string };

type OrderItemRow = {
  id: string;
  title_snapshot: string;
  unit_snapshot: string;
  qty: number;
  price_snapshot_inr: number;
};

type OrderRow = {
  id: string;
  created_at: string;
  status: OrderStatus;
  payment_mode: PaymentMode;
  pickup_note: string | null;
  order_items: OrderItemRow[];
};

function formatInr(amount: number) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
      amount,
    );
  } catch {
    return `₹${amount}`;
  }
}

function orderTotal(items: OrderItemRow[]) {
  return items.reduce((sum, it) => sum + (it.price_snapshot_inr ?? 0) * (it.qty ?? 0), 0);
}

function canTransition(from: OrderStatus, to: OrderStatus) {
  const allowed: Record<OrderStatus, OrderStatus[]> = {
    placed: ["accepted", "cancelled"],
    accepted: ["preparing", "cancelled"],
    preparing: ["ready"],
    ready: ["completed"],
    completed: [],
    cancelled: [],
  };
  return allowed[from]?.includes(to) ?? false;
}

function labelForStatus(s: OrderStatus) {
  switch (s) {
    case "accepted":
      return "Accept";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancel";
    default:
      return s;
  }
}

export default function VendorOrders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const vendorQuery = useQuery({
    queryKey: ["my_vendor_for_orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, shop_name")
        .eq("owner_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as VendorRow | null;
    },
  });

  const vendor = vendorQuery.data;

  const ordersQuery = useQuery({
    queryKey: ["vendor_orders", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, created_at, status, payment_mode, pickup_note, order_items(id, title_snapshot, unit_snapshot, qty, price_snapshot_inr)",
        )
        .eq("vendor_id", vendor!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
  });

  const rows = ordersQuery.data ?? [];

  const counts = useMemo(() => {
    const byStatus = new Map<OrderStatus, number>();
    for (const o of rows) byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);
    return byStatus;
  }, [rows]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-sm font-semibold text-muted-foreground">Vendor</p>
        <h1 className="mt-2 font-display text-4xl leading-tight">Orders</h1>
        <p className="mt-3 text-muted-foreground">
          All customer orders for <span className="font-semibold">{vendor?.shop_name ?? "your shop"}</span>.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Total orders</p>
            <p className="mt-1 font-display text-2xl">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Placed</p>
            <p className="mt-1 font-display text-2xl">{counts.get("placed") ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Ready</p>
            <p className="mt-1 font-display text-2xl">{counts.get("ready") ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Order list</CardTitle>
          <Button variant="outline" onClick={() => ordersQuery.refetch()} disabled={ordersQuery.isFetching}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {!vendor ? (
            <div className="py-10 text-center">
              <p className="font-semibold">No vendor profile yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">Apply as a vendor to start receiving orders.</p>
            </div>
          ) : ordersQuery.isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center">
              <p className="font-semibold">No orders yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">Once customers place orders, they’ll show up here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((o) => {
                    const total = orderTotal(o.order_items ?? []);
                    return (
                      <TableRow key={o.id} className="cursor-pointer" onClick={() => setSelected(o)}>
                        <TableCell className="font-semibold">#{o.id.slice(0, 8)}</TableCell>
                        <TableCell>
                          <Badge variant={o.status === "cancelled" ? "secondary" : "default"}>{o.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{o.payment_mode}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{(o.order_items ?? []).length}</TableCell>
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

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order #{selected?.id.slice(0, 8)}</DialogTitle>
            <DialogDescription>
              {selected?.created_at ? new Date(selected.created_at).toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-sm font-semibold">Status</p>
                  <p className="mt-1 text-sm text-muted-foreground">{selected.status}</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-sm font-semibold">Payment</p>
                  <p className="mt-1 text-sm text-muted-foreground">{selected.payment_mode}</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-sm font-semibold">Total</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatInr(orderTotal(selected.order_items ?? []))}</p>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm font-semibold">Update status</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Move orders forward as you prepare them. Cancelling is only allowed before preparing.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["accepted", "preparing", "ready", "completed", "cancelled"] as OrderStatus[]).map((next) => {
                    const allowed = canTransition(selected.status, next);
                    const isCancel = next === "cancelled";
                    return (
                      <Button
                        key={next}
                        type="button"
                        variant={isCancel ? "outline" : "hero"}
                        disabled={!allowed || statusBusy}
                        onClick={async () => {
                          if (!allowed) return;
                          setStatusBusy(true);
                          try {
                            const { error } = await supabase
                              .from("orders")
                              .update({ status: next })
                              .eq("id", selected.id);
                            if (error) throw error;

                            toast({ title: "Status updated", description: `Marked as ${next}.` });
                            setSelected((prev) => (prev ? { ...prev, status: next } : prev));
                            ordersQuery.refetch();
                          } catch (e: any) {
                            toast({
                              title: "Update failed",
                              description: e?.message ?? "Please try again",
                              variant: "destructive",
                            });
                          } finally {
                            setStatusBusy(false);
                          }
                        }}
                      >
                        {labelForStatus(next)}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {selected.pickup_note ? (
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-sm font-semibold">Pickup note</p>
                  <p className="mt-1 text-sm text-muted-foreground">{selected.pickup_note}</p>
                </div>
              ) : null}

              <div>
                <p className="text-sm font-semibold">Items</p>
                <div className="mt-2 overflow-x-auto rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selected.order_items ?? []).map((it) => (
                        <TableRow key={it.id}>
                          <TableCell className="font-semibold">{it.title_snapshot}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{it.qty}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {formatInr(it.price_snapshot_inr)} / {it.unit_snapshot}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
