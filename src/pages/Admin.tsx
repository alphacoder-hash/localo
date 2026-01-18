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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const rejectionTemplates = [
  "Selfie/photo is unclear",
  "Shop name/details incomplete",
  "Address/location info missing",
  "Duplicate vendor application",
  "Could not verify shop ownership",
];

export default function Admin() {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<VendorFilter>("pending");

  const [selected, setSelected] = useState<VendorAdminRow | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const vendorQuery = useQuery({
    queryKey: ["admin_vendors", filter, q],
    queryFn: async () => {
      const query = supabase
        .from("vendors")
        .select(
          "id, shop_name, vendor_type, city, state, opening_note, selfie_with_shop_image_url, verification_status, rejection_reason, owner_user_id, is_online, created_at",
        )
        .order("created_at", { ascending: false });

      if (filter !== "all") query.eq("verification_status", filter);
      if (q.trim()) query.ilike("shop_name", `%${q.trim()}%`);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as VendorAdminRow[];
    },
  });

  const counts = useMemo(() => {
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

  const setRowBusy = (vendorId: string, v: boolean) => setBusy((s) => ({ ...s, [vendorId]: v }));

  const notify = async (ownerUserId: string, title: string, body: string) => {
    const { error } = await supabase.from("notifications").insert({ user_id: ownerUserId, title, body });
    if (error) console.warn("admin: failed to send notification", error);
  };

  const approve = async (vendor: VendorAdminRow) => {
    setRowBusy(vendor.id, true);
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
      setSelected((s) => (s?.id === vendor.id ? { ...vendor, verification_status: "approved", rejection_reason: null } : s));
    } catch (e: any) {
      toast({ title: "Approve failed", description: e?.message ?? "Please try again", variant: "destructive" });
    } finally {
      setRowBusy(vendor.id, false);
    }
  };

  const reject = async (vendor: VendorAdminRow) => {
    const reason = (rejectReason[vendor.id] ?? vendor.rejection_reason ?? "").trim();
    if (!reason) {
      toast({ title: "Reason required", description: "Add a rejection reason.", variant: "destructive" });
      return;
    }

    setRowBusy(vendor.id, true);
    try {
      const { error } = await supabase
        .from("vendors")
        .update({ verification_status: "rejected", rejection_reason: reason })
        .eq("id", vendor.id);

      if (error) throw error;

      await notify(vendor.owner_user_id, "Verification rejected", `Reason: ${reason}`);

      toast({ title: "Rejected" });
      vendorQuery.refetch();
      setSelected((s) => (s?.id === vendor.id ? { ...vendor, verification_status: "rejected", rejection_reason: reason } : s));
    } catch (e: any) {
      toast({ title: "Reject failed", description: e?.message ?? "Please try again", variant: "destructive" });
    } finally {
      setRowBusy(vendor.id, false);
    }
  };

  const toggleOnline = async (vendor: VendorAdminRow) => {
    setRowBusy(vendor.id, true);
    try {
      const next = !vendor.is_online;
      const { error } = await supabase.from("vendors").update({ is_online: next }).eq("id", vendor.id);
      if (error) throw error;
      toast({ title: next ? "Set online" : "Set offline" });
      vendorQuery.refetch();
      setSelected((s) => (s?.id === vendor.id ? { ...vendor, is_online: next } : s));
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message ?? "Please try again", variant: "destructive" });
    } finally {
      setRowBusy(vendor.id, false);
    }
  };

  const list = vendorQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Admin</p>
          <h1 className="mt-2 font-display text-4xl leading-tight">Vendor dashboard</h1>
          <p className="mt-3 text-muted-foreground">Verify vendors, manage status, and toggle online/offline.</p>
        </div>
        <div className="w-full sm:w-80">
          <Label className="sr-only" htmlFor="vendor_search">
            Search vendor
          </Label>
          <Input id="vendor_search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by shop name…" />
        </div>
      </header>

      <section className="space-y-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as VendorFilter)}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">Vendors</CardTitle>
            <p className="text-sm text-muted-foreground">Click a row to review.</p>
          </CardHeader>
          <CardContent>
            {vendorQuery.isLoading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
            ) : list.length === 0 ? (
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
                    {list.map((v) => {
                      const isRowBusy = !!busy[v.id];
                      return (
                        <TableRow key={v.id} className="cursor-pointer" onClick={() => setSelected(v)}>
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
                                  <Button variant="hero" size="sm" disabled={isRowBusy} onClick={() => approve(v)}>
                                    Approve
                                  </Button>
                                  <Button variant="outline" size="sm" disabled={isRowBusy} onClick={() => reject(v)}>
                                    Reject
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isRowBusy}
                                    onClick={() => setSelected(v)}
                                  >
                                    Review
                                  </Button>
                                  <Button
                                    variant={v.is_online ? "outline" : "hero"}
                                    size="sm"
                                    disabled={isRowBusy || v.verification_status !== "approved"}
                                    onClick={() => toggleOnline(v)}
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
      </section>

      <VendorReviewDialog
        open={!!selected}
        vendor={selected}
        onOpenChange={(o) => !o && setSelected(null)}
        rejectReason={selected ? rejectReason[selected.id] ?? selected.rejection_reason ?? "" : ""}
        setRejectReason={(next) =>
          selected && setRejectReason((s) => ({ ...s, [selected.id]: next }))
        }
        rejectionTemplates={rejectionTemplates}
        getSelfieUrl={getSelfieUrl}
        busy={selected ? !!busy[selected.id] : false}
        onApprove={selected ? () => approve(selected) : undefined}
        onReject={selected ? () => reject(selected) : undefined}
        onToggleOnline={selected ? () => toggleOnline(selected) : undefined}
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
