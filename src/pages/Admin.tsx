import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type VendorAdminRow = {
  id: string;
  shop_name: string;
  vendor_type: "moving_stall" | "fixed_shop";
  city: string | null;
  state: string | null;
  opening_note: string | null;
  selfie_with_shop_image_url: string | null;
  verification_status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  owner_user_id: string;
};

export default function Admin() {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const pendingQuery = useQuery({
    queryKey: ["admin_pending_vendors", q],
    queryFn: async () => {
      const query = supabase
        .from("vendors")
        .select(
          "id, shop_name, vendor_type, city, state, opening_note, selfie_with_shop_image_url, verification_status, rejection_reason, owner_user_id",
        )
        .eq("verification_status", "pending")
        .order("created_at", { ascending: false });

      const { data, error } = await (q.trim()
        ? query.ilike("shop_name", `%${q.trim()}%`)
        : query);

      if (error) throw error;
      return (data ?? []) as VendorAdminRow[];
    },
  });

  const getSelfieUrl = async (path: string | null) => {
    if (!path) return null;
    const { data, error } = await supabase
      .storage
      .from("vendor-selfies")
      .createSignedUrl(path, 60 * 15);
    if (error) return null;
    return data.signedUrl;
  };

  const approve = async (vendorId: string, ownerUserId: string) => {
    const { error } = await supabase
      .from("vendors")
      .update({ verification_status: "approved", rejection_reason: null })
      .eq("id", vendorId);

    if (error) {
      toast({ title: "Approve failed", description: error.message, variant: "destructive" });
      return;
    }

    await supabase.from("notifications").insert({
      user_id: ownerUserId,
      title: "You’re verified!",
      body: "Your store is approved. You can go online and add your catalog now.",
    });

    toast({ title: "Approved" });
    pendingQuery.refetch();
  };

  const reject = async (vendorId: string, ownerUserId: string) => {
    const reason = (rejectReason[vendorId] ?? "").trim();
    if (!reason) {
      toast({ title: "Reason required", description: "Add a rejection reason.", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("vendors")
      .update({ verification_status: "rejected", rejection_reason: reason })
      .eq("id", vendorId);

    if (error) {
      toast({ title: "Reject failed", description: error.message, variant: "destructive" });
      return;
    }

    await supabase.from("notifications").insert({
      user_id: ownerUserId,
      title: "Verification rejected",
      body: `Reason: ${reason}`,
    });

    toast({ title: "Rejected" });
    pendingQuery.refetch();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Admin</p>
          <h1 className="mt-2 font-display text-4xl leading-tight">Verification queue</h1>
          <p className="mt-3 text-muted-foreground">Review pending vendor applications.</p>
        </div>
        <div className="w-full sm:w-72">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendor…" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(pendingQuery.data ?? []).length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="py-10 text-center">
              <p className="font-semibold">No pending applications.</p>
              <p className="mt-2 text-muted-foreground">When vendors apply, they will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          (pendingQuery.data ?? []).map((v) => (
            <Card key={v.id}>
              <CardHeader>
                <CardTitle className="text-base">{v.shop_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {v.vendor_type === "moving_stall" ? "Moving stall" : "Fixed shop"}
                  {v.city ? ` • ${v.city}` : ""}
                  {v.state ? `, ${v.state}` : ""}
                  {v.opening_note ? ` • ${v.opening_note}` : ""}
                </p>

                <SelfiePreview path={v.selfie_with_shop_image_url} getUrl={getSelfieUrl} />

                <div className="grid gap-2">
                  <Input
                    value={rejectReason[v.id] ?? ""}
                    onChange={(e) => setRejectReason((s) => ({ ...s, [v.id]: e.target.value }))}
                    placeholder="Rejection reason (required to reject)"
                  />
                  <div className="flex gap-2">
                    <Button variant="hero" onClick={() => approve(v.id, v.owner_user_id)}>
                      Approve
                    </Button>
                    <Button variant="outline" onClick={() => reject(v.id, v.owner_user_id)}>
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function SelfiePreview({
  path,
  getUrl,
}: {
  path: string | null;
  getUrl: (path: string | null) => Promise<string | null>;
}) {
  const signed = useQuery({
    queryKey: ["selfie", path],
    enabled: !!path,
    queryFn: () => getUrl(path),
  });

  if (!path) {
    return (
      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        No selfie uploaded.
      </div>
    );
  }

  if (!signed.data) {
    return (
      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        Loading selfie…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <img src={signed.data} alt="Vendor selfie with shop" className="h-44 w-full object-cover" loading="lazy" />
    </div>
  );
}
