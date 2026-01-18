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

const rejectionTemplates = [
  "Selfie/photo is unclear",
  "Shop name/details incomplete",
  "Address/location info missing",
  "Duplicate vendor application",
  "Could not verify shop ownership",
];

export default function Admin() {
  const { toast } = useToast();

  const [section, setSection] = useState<"vendors" | "plans">("vendors");
  const [q, setQ] = useState("");

  // Vendors UI state
  const [vendorFilter, setVendorFilter] = useState<VendorFilter>("pending");
  const [selectedVendor, setSelectedVendor] = useState<VendorAdminRow | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  // Plans UI state
  const [planSelected, setPlanSelected] = useState<PlanRow | null>(null);
  const [planNextLimit, setPlanNextLimit] = useState<Record<string, string>>({});

  // Shared busy state
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const setRowBusy = (key: string, v: boolean) => setBusy((s) => ({ ...s, [key]: v }));

  const notify = async (ownerUserId: string, title: string, body: string) => {
    const { error } = await supabase.from("notifications").insert({ user_id: ownerUserId, title, body });
    if (error) console.warn("admin: failed to send notification", error);
  };

  // ----------------------- Vendors -----------------------
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

  // ----------------------- Plans -----------------------
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

  // ----------------------- UI -----------------------
  const vendorList = vendorQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Admin</p>
          <h1 className="mt-2 font-display text-4xl leading-tight">Operations</h1>
          <p className="mt-3 text-muted-foreground">Verify vendors and manage plans.</p>
        </div>

        <div className="w-full sm:w-80">
          <Label className="sr-only" htmlFor="admin_search">
            Search
          </Label>
          <Input
            id="admin_search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={section === "vendors" ? "Search vendor…" : "Search by shop name…"}
          />
        </div>
      </header>

      <Tabs value={section} onValueChange={(v) => setSection(v as any)}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="plans">Plans & payments</TabsTrigger>
        </TabsList>

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
              {vendorQuery.isLoading ? (
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
                          <TableRow key={v.id} className="cursor-pointer" onClick={() => setSelectedVendor(v)}>
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
                                    <Button variant="hero" size="sm" disabled={isRowBusy} onClick={() => approveVendor(v)}>
                                      Approve
                                    </Button>
                                    <Button variant="outline" size="sm" disabled={isRowBusy} onClick={() => rejectVendor(v)}>
                                      Reject
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button variant="outline" size="sm" disabled={isRowBusy} onClick={() => setSelectedVendor(v)}>
                                      Review
                                    </Button>
                                    <Button
                                      variant={v.is_online ? "outline" : "hero"}
                                      size="sm"
                                      disabled={isRowBusy || v.verification_status !== "approved"}
                                      onClick={() => toggleVendorOnline(v)}
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
              {planQuery.isLoading ? (
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
                          <TableRow key={p.id} className="cursor-pointer" onClick={() => setPlanSelected(p)}>
                            <TableCell className="font-semibold">{shopName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{p.tier}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{p.catalog_limit}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{p.upgrade_requested ? "Yes" : "No"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button variant="outline" size="sm" disabled={isRowBusy} onClick={() => setPlanSelected(p)}>
                                  Review
                                </Button>
                                <Button
                                  variant="hero"
                                  size="sm"
                                  disabled={isRowBusy || !p.upgrade_requested}
                                  onClick={() => approveUpgrade(p)}
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
