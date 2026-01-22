import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Pencil, Trash2, QrCode, Share2, Copy, Check, Camera, Clock, MessageCircle, MapPin } from "lucide-react";
import QRCode from "react-qr-code";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDescriptionText,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

const profileSchema = z.object({
  shop_name: z.string().trim().min(2).max(100),
});

type VendorRow = {
  id: string;
  shop_name: string;
  verification_status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  is_online: boolean;
  vendor_type: "moving_stall" | "fixed_shop";
  last_location_updated_at: string | null;
  opening_note: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_notes: string | null;
  banner_image_url: string | null;
  selfie_with_shop_image_url: string | null;
};

type BannerMeta = {
  bucket: string;
  path: string;
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

type VendorHeaderCardProps = {
  vendor: VendorRow;
  bannerUrl?: string;
  vendorIconUrl?: string;
  bannerUploading: boolean;
  onUploadBanner: (file: File) => void;
  onEditProfile: () => void;
  onOpenQr: () => void;
  onShare: () => void;
  onShareWhatsApp: () => void;
  isBusy: boolean;
  onSetBusy15: () => void;
  onClearBusy: () => void;
  pendingOrders: number;
};

function VendorHeaderCard({
  vendor,
  bannerUrl,
  vendorIconUrl,
  bannerUploading,
  onUploadBanner,
  onEditProfile,
  onOpenQr,
  onShare,
  onShareWhatsApp,
  isBusy,
  onSetBusy15,
  onClearBusy,
  pendingOrders,
}: VendorHeaderCardProps) {
  return (
    <Card className="overflow-hidden" id="vendor-header-card">
      <div className="relative h-40 w-full bg-muted">
        {bannerUrl ? (
          <img src={bannerUrl} alt="Shop banner" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-muted to-accent" />
        )}
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <Label
            htmlFor="bannerUpload"
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            <Camera className="mr-2 h-4 w-4" />
            {bannerUploading ? "Uploading…" : "Change banner"}
          </Label>
          <Input
            id="bannerUpload"
            type="file"
            accept="image/*"
            disabled={bannerUploading}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.currentTarget.value = "";
              if (!f) return;
              onUploadBanner(f);
            }}
          />
        </div>
      </div>
      <CardContent className="pt-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-full border bg-muted">
              {vendorIconUrl ? <img src={vendorIconUrl} alt="Vendor photo" className="h-full w-full object-cover" /> : null}
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Vendor dashboard</p>
              <div className="flex items-center gap-2">
                <h1 className="mt-1 font-display text-4xl leading-tight">{vendor.shop_name}</h1>
                <Button variant="ghost" size="icon" className="mt-1" onClick={onEditProfile}>
                  <Pencil className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onOpenQr}>
              <QrCode className="mr-2 h-4 w-4" />
              QR Code
            </Button>
            <Button variant="outline" onClick={onShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" onClick={onShareWhatsApp}>
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
            {isBusy ? (
              <Button variant="secondary" onClick={onClearBusy}>
                <Clock className="mr-2 h-4 w-4" />
                Back online
              </Button>
            ) : (
              <Button variant="outline" onClick={onSetBusy15}>
                <Clock className="mr-2 h-4 w-4" />
                Busy 15m
              </Button>
            )}
            <Button asChild variant="hero">
              <Link to="/vendor/orders" id="vendor-orders-link">
                Orders
                {pendingOrders ? (
                  <Badge variant="secondary" className="ml-2 bg-white text-primary hover:bg-white">
                    {pendingOrders}
                  </Badge>
                ) : null}
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type StatsGridProps = {
  pendingOrders: number;
  todayRevenue: number;
  totalItems: number;
};

function StatsGrid({ pendingOrders, todayRevenue, totalItems }: StatsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="hover-lift">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pending Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingOrders}</div>
        </CardContent>
      </Card>
      <Card className="hover-lift">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Today's Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{todayRevenue}</div>
        </CardContent>
      </Card>
      <Card className="hover-lift">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalItems}</div>
        </CardContent>
      </Card>
    </div>
  );
}

type StatusCardProps = {
  vendor: VendorRow;
  statusBadge: ReactNode;
  isBusy: boolean;
  busyBackAt: string;
  onOpen: () => void;
  onClose: () => void;
};

function StatusCard({ vendor, statusBadge, isBusy, busyBackAt, onOpen, onClose }: StatusCardProps) {
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Status</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Verification</p>
          <div className="mt-1 font-semibold">{statusBadge}</div>
          {vendor.verification_status === "rejected" && vendor.rejection_reason ? (
            <p className="mt-2 text-sm text-muted-foreground">Reason: {vendor.rejection_reason}</p>
          ) : null}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Shop status</p>
          <p className="mt-1 font-semibold">
            <Badge variant={vendor.is_online ? "default" : "secondary"}>{vendor.is_online ? "Online" : "Offline"}</Badge>
          </p>
          {isBusy ? (
            <p className="mt-2 text-xs text-muted-foreground">Busy until {busyBackAt}</p>
          ) : vendor.opening_note ? (
            <p className="mt-2 text-xs text-muted-foreground">{vendor.opening_note}</p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            {vendor.last_location_updated_at
              ? `Last updated: ${new Date(vendor.last_location_updated_at).toLocaleString()}`
              : "No location update yet"}
          </p>
        </div>
        {vendor.is_online ? (
          <Button variant="outline" onClick={onClose} id="vendor-toggle-open">
            Close shop
          </Button>
        ) : (
          <Button variant="hero" onClick={onOpen} id="vendor-toggle-open">
            Open shop
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

type QuickActionsCardProps = {
  vendor: VendorRow;
  isBusy: boolean;
  busyBackAt: string;
  onToggleOpen: () => void;
  onSetBusy15: () => void;
  onClearBusy: () => void;
  onUpdateLocationToday: () => void;
  onShareLocationWhatsApp: () => void;
  onShareShopWhatsApp: () => void;
};

function QuickActionsCard({
  vendor,
  isBusy,
  busyBackAt,
  onToggleOpen,
  onSetBusy15,
  onClearBusy,
  onUpdateLocationToday,
  onShareLocationWhatsApp,
  onShareShopWhatsApp,
}: QuickActionsCardProps) {
  return (
    <Card id="vendor-quick-actions">
      <CardHeader>
        <CardTitle className="text-base">Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isBusy ? (
          <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
            <div className="min-w-0">
              <p className="font-semibold">Busy</p>
              <p className="text-sm text-muted-foreground">Back at {busyBackAt}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={onClearBusy}>
              Back online
            </Button>
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant={vendor.is_online ? "outline" : "hero"}
            className="h-12 w-full justify-start"
            onClick={onToggleOpen}
          >
            <MapPin className="h-4 w-4" />
            {vendor.is_online ? "Close shop" : "Open shop"}
          </Button>

          <Button variant="outline" className="h-12 w-full justify-start" onClick={onSetBusy15}>
            <Clock className="h-4 w-4" />
            Busy 15 min
          </Button>

          <Button variant="outline" className="h-12 w-full justify-start" onClick={onUpdateLocationToday}>
            <MapPin className="h-4 w-4" />
            I’m here
          </Button>

          <Button variant="outline" className="h-12 w-full justify-start" onClick={onShareLocationWhatsApp}>
            <MessageCircle className="h-4 w-4" />
            Share location
          </Button>

          <Button variant="outline" className="h-12 w-full justify-start sm:col-span-2" onClick={onShareShopWhatsApp}>
            <MessageCircle className="h-4 w-4" />
            Share shop link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VendorDashboard({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const vendorQuery = useQuery({
    queryKey: ["my_vendor", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("owner_user_id", user!.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as VendorRow | null;
    },
  });

  const vendor = vendorQuery.data ?? null;
  const shopUrl = vendor ? `${window.location.origin}/vendor/${vendor.id}` : "";

  const latestBannerPathQuery = useQuery({
    queryKey: ["vendor_latest_banner_path", user?.id, vendor?.id],
    enabled: !!user?.id && !!vendor?.id,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("catalog-images").list(user!.id, {
        limit: 100,
        search: `${vendor!.id}-banner-`,
      });
      if (error) throw error;
      const items = (data ?? []).filter((it) => it.name.includes(`${vendor!.id}-banner-`));
      if (!items.length) return null;
      const best = items
        .slice()
        .sort((a, b) => {
          const at = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const bt = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return bt - at;
        })[0];
      return `${user!.id}/${best.name}`;
    },
    staleTime: 60 * 1000,
    retry: false,
  });

  const localBannerMeta = useMemo(() => {
    if (!vendor?.id) return null;
    try {
      const raw = localStorage.getItem(`vendor_banner_${vendor.id}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as BannerMeta;
      if (!parsed?.bucket || !parsed?.path) return null;
      return parsed;
    } catch {
      return null;
    }
  }, [vendor?.id]);

  const bannerMeta = useMemo(() => {
    if (localBannerMeta) return localBannerMeta;
    if (vendor?.banner_image_url) return { bucket: "catalog-images", path: vendor.banner_image_url } as BannerMeta;
    if (latestBannerPathQuery.data) return { bucket: "catalog-images", path: latestBannerPathQuery.data } as BannerMeta;
    return null;
  }, [localBannerMeta, vendor?.banner_image_url, latestBannerPathQuery.data]);

  const bannerUrlQuery = useQuery({
    queryKey: ["vendor_banner_url", bannerMeta?.bucket, bannerMeta?.path],
    enabled: !!bannerMeta,
    queryFn: async () => {
      if (bannerMeta!.bucket === "catalog-images") {
        return supabase.storage.from("catalog-images").getPublicUrl(bannerMeta!.path).data.publicUrl;
      }

      const { data, error } = await supabase.storage.from(bannerMeta!.bucket).createSignedUrl(bannerMeta!.path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 50 * 60 * 1000,
    refetchInterval: 50 * 60 * 1000,
    retry: false,
  });

  const vendorIconUrlQuery = useQuery({
    queryKey: ["vendor_icon_url", vendor?.selfie_with_shop_image_url],
    enabled: !!vendor?.selfie_with_shop_image_url,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("vendor-selfies")
        .createSignedUrl(vendor!.selfie_with_shop_image_url!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 50 * 60 * 1000,
    refetchInterval: 50 * 60 * 1000,
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editShopName, setEditShopName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const statsQuery = useQuery({
    queryKey: ["vendor_stats", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: pendingCount, error: pendingError } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("vendor_id", vendor!.id)
        .eq("status", "pending");

      if (pendingError) throw pendingError;

      const { data: todayOrders, error: revenueError } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("vendor_id", vendor!.id)
        .eq("status", "completed")
        .gte("created_at", today.toISOString());

      if (revenueError) throw revenueError;

      const todayRevenue = todayOrders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      return {
        pendingOrders: pendingCount || 0,
        todayRevenue,
      };
    },
    refetchInterval: 30000,
  });

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
  const [showProBenefits, setShowProBenefits] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const plan = planQuery.data;
  const limit = plan?.catalog_limit ?? 5;
  const count = catalogQuery.data?.length ?? 0;

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "stock" | "price_asc" | "price_desc">("stock");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  const [easyMode, setEasyMode] = useState(() => {
    try {
      return localStorage.getItem("vendor_easy_mode") === "1";
    } catch {
      return false;
    }
  });
  const [lowStockIds, setLowStockIds] = useState<Set<string>>(() => new Set());
  const [busyUntil, setBusyUntil] = useState<number | null>(null);

  useEffect(() => {
    if (!vendor?.id) return;
    try {
      const raw = localStorage.getItem(`vendor_low_stock_${vendor.id}`);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      setLowStockIds(new Set(parsed));
    } catch {
      setLowStockIds(new Set());
    }
  }, [vendor?.id]);

  useEffect(() => {
    if (!vendor?.id) return;
    try {
      const raw = localStorage.getItem(`vendor_busy_until_${vendor.id}`);
      const ts = raw ? Number(raw) : null;
      setBusyUntil(Number.isFinite(ts as any) ? ts : null);
    } catch {
      setBusyUntil(null);
    }
  }, [vendor?.id]);

  useEffect(() => {
    if (!vendor?.id) return;
    if (!busyUntil) return;
    const ms = busyUntil - Date.now();
    if (ms <= 0) {
      setBusyUntil(null);
      try {
        localStorage.removeItem(`vendor_busy_until_${vendor.id}`);
      } catch {}
      return;
    }
    const t = window.setTimeout(() => {
      setBusyUntil(null);
      try {
        localStorage.removeItem(`vendor_busy_until_${vendor.id}`);
      } catch {}
    }, ms);
    return () => window.clearTimeout(t);
  }, [busyUntil, vendor?.id]);

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

  const isBusy = !!busyUntil && Date.now() < busyUntil;
  const busyBackAt = busyUntil ? new Date(busyUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  const setOnline = async (next: boolean) => {
    if (!vendor) return;
    const patch: any = { is_online: next };
    if (next) patch.opening_note = null;
    const { error } = await supabase.from("vendors").update(patch).eq("id", vendor.id);
    if (error) {
      toast({ title: "Couldn’t update", description: error.message, variant: "destructive" });
      return;
    }
    vendorQuery.refetch();
  };

  const setBusy = async (minutes: number) => {
    if (!vendor) return;
    const until = Date.now() + minutes * 60_000;
    setBusyUntil(until);
    try {
      localStorage.setItem(`vendor_busy_until_${vendor.id}`, String(until));
    } catch {}
    const backAt = new Date(until).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const { error } = await supabase
      .from("vendors")
      .update({ is_online: false, opening_note: `Busy. Back at ${backAt}` })
      .eq("id", vendor.id);
    if (error) toast({ title: "Couldn’t set busy", description: error.message, variant: "destructive" });
    else toast({ title: "Busy mode on", description: `Back at ${backAt}` });
    vendorQuery.refetch();
  };

  const clearBusy = async () => {
    if (!vendor) return;
    setBusyUntil(null);
    try {
      localStorage.removeItem(`vendor_busy_until_${vendor.id}`);
    } catch {}
    const { error } = await supabase.from("vendors").update({ opening_note: null }).eq("id", vendor.id);
    if (error) toast({ title: "Couldn’t clear busy", description: error.message, variant: "destructive" });
    await setOnline(true);
  };

  const openWhatsApp = (text: string) => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareShopOnWhatsApp = () => {
    if (!vendor) return;
    const text = `Shop: ${vendor.shop_name}\nOrder: ${shopUrl}`;
    openWhatsApp(text);
  };

  const openEditProfile = () => {
    if (!vendor) return;
    setEditShopName(vendor.shop_name);
    setIsEditingProfile(true);
  };

  const saveProfile = async () => {
    if (!vendor) return;
    const parsed = profileSchema.safeParse({ shop_name: editShopName });
    if (!parsed.success) {
      toast({ title: "Invalid input", description: parsed.error.errors[0]?.message, variant: "destructive" });
      return;
    }

    setSavingProfile(true);
    try {
      const { error } = await supabase.from("vendors").update({ shop_name: parsed.data.shop_name }).eq("id", vendor.id);
      if (error) throw error;
      toast({ title: "Profile updated" });
      setIsEditingProfile(false);
      vendorQuery.refetch();
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const copyShopLink = () => {
    navigator.clipboard.writeText(shopUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast({ title: "Link copied!" });
  };

  const shareShop = async () => {
    if (!vendor) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: vendor.shop_name,
          text: `Check out ${vendor.shop_name} on LocalO!`,
          url: shopUrl,
        });
      } catch {}
    } else {
      copyShopLink();
    }
  };

  const uploadBanner = async (file: File) => {
    if (!user || !vendor) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please choose an image.", variant: "destructive" });
      return;
    }

    setBannerUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${vendor.id}-banner-${Date.now()}.${ext}`;
      const bucket = "catalog-images";

      const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      localStorage.setItem(`vendor_banner_${vendor.id}`, JSON.stringify({ bucket, path } as BannerMeta));

      await supabase.from("vendors").update({ banner_image_url: path }).eq("id", vendor.id);
      toast({ title: "Banner updated" });

      vendorQuery.refetch();
      latestBannerPathQuery.refetch();
      bannerUrlQuery.refetch();
    } catch (e: any) {
      toast({ title: "Couldn’t upload banner", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setBannerUploading(false);
    }
  };

  const shareLocationOnWhatsApp = () => {
    if (!vendor) return;
    if (!navigator.geolocation) {
      toast({ title: "GPS not available", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const maps = `https://www.google.com/maps?q=${lat},${lng}`;
        const text = `${vendor.shop_name}\nI am here now: ${maps}\nOrder: ${shopUrl}`;
        openWhatsApp(text);
      },
      () => toast({ title: "Couldn’t get location", variant: "destructive" }),
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 5000 },
    );
  };

  const toggleEasyMode = () => {
    setEasyMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("vendor_easy_mode", next ? "1" : "0");
      } catch {}
      if (next) {
        setSort("stock");
        setCategoryFilter("");
        setTagFilter([]);
      }
      return next;
    });
  };

  const toggleLowStock = (itemId: string) => {
    if (!vendor?.id) return;
    setLowStockIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      try {
        localStorage.setItem(`vendor_low_stock_${vendor.id}`, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
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

  const setStockStatus = async (it: CatalogRow, status: "ok" | "low" | "out") => {
    setTogglingItemId(it.id);
    try {
      const nextInStock = status !== "out";
      const { error } = await supabase
        .from("vendor_catalog_items")
        .update({ in_stock: nextInStock })
        .eq("id", it.id);
      if (error) throw error;

      const isLow = lowStockIds.has(it.id);
      if (status === "low" && !isLow) toggleLowStock(it.id);
      if (status !== "low" && isLow) toggleLowStock(it.id);

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

  if (!user) {
    return (
      <div className={embedded ? "space-y-4" : "mx-auto max-w-4xl space-y-4"}>
        <h1 className="font-display text-4xl">Vendor dashboard</h1>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-semibold">Sign in required</p>
            <p className="mt-2 text-sm text-muted-foreground">Please sign in to access vendor tools.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (vendorQuery.isLoading) {
    return (
      <div className={embedded ? "space-y-4" : "mx-auto max-w-4xl space-y-4"}>
        <h1 className="font-display text-4xl">Vendor dashboard</h1>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Loading vendor…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (vendorQuery.isError) {
    return (
      <div className={embedded ? "space-y-4" : "mx-auto max-w-4xl space-y-4"}>
        <h1 className="font-display text-4xl">Vendor dashboard</h1>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-semibold">Couldn’t load vendor</p>
            <p className="mt-2 text-sm text-muted-foreground">Please try again.</p>
            <div className="mt-5 flex justify-center">
              <Button variant="outline" onClick={() => vendorQuery.refetch()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
    <div className={embedded ? "space-y-6" : "mx-auto max-w-5xl space-y-6"}>
      <VendorHeaderCard
        vendor={vendor}
        bannerUrl={bannerUrlQuery.data}
        vendorIconUrl={vendorIconUrlQuery.data}
        bannerUploading={bannerUploading}
        onUploadBanner={uploadBanner}
        onEditProfile={openEditProfile}
        onOpenQr={() => setShowQRCode(true)}
        onShare={shareShop}
        onShareWhatsApp={shareShopOnWhatsApp}
        isBusy={isBusy}
        onSetBusy15={() => setBusy(15)}
        onClearBusy={clearBusy}
        pendingOrders={statsQuery.data?.pendingOrders || 0}
      />

      <StatsGrid
        pendingOrders={statsQuery.data?.pendingOrders || 0}
        todayRevenue={statsQuery.data?.todayRevenue || 0}
        totalItems={count}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard
          vendor={vendor}
          statusBadge={statusBadge}
          isBusy={isBusy}
          busyBackAt={busyBackAt}
          onOpen={() => setOnline(true)}
          onClose={() => setOnline(false)}
        />

        <div className="space-y-4">
          <QuickActionsCard
            vendor={vendor}
            isBusy={isBusy}
            busyBackAt={busyBackAt}
            onToggleOpen={() => setOnline(!vendor.is_online)}
            onSetBusy15={() => setBusy(15)}
            onClearBusy={clearBusy}
            onUpdateLocationToday={updateLocationToday}
            onShareLocationWhatsApp={shareLocationOnWhatsApp}
            onShareShopWhatsApp={shareShopOnWhatsApp}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today’s location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {vendor.location_notes ? `Notes: ${vendor.location_notes}` : "Update daily for moving stalls."}
              </p>
              <Button variant="hero" className="w-full" onClick={updateLocationToday} id="vendor-update-location">
                Update location
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current</p>
                  <p className="mt-1 font-semibold">
                    <Badge variant={plan?.tier === "pro" ? "default" : "secondary"}>
                      {plan?.tier === "pro" ? "Pro" : "Free"}
                    </Badge>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Catalog limit</p>
                  <p className="mt-1 font-semibold">{limit}</p>
                </div>
              </div>

              {plan?.tier === "pro" ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Pro is active. You can add up to {limit} items.</p>
                  <Button variant="outline" className="w-full" onClick={() => setShowProBenefits(true)}>
                    View Pro benefits
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Free plan allows {limit} items. Upgrade to unlock a higher catalog limit.
                  </p>

                  <div className="grid gap-2">
                    <Button
                      variant={plan?.upgrade_requested ? "outline" : "hero"}
                      className="w-full"
                      onClick={requestUpgrade}
                      disabled={plan?.upgrade_requested}
                    >
                      {plan?.upgrade_requested ? "Upgrade requested" : "Request upgrade"}
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => setShowProBenefits(true)}>
                      View Pro benefits
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Once approved by admin, your plan will update automatically.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">
            Catalog ({count}/{limit} {plan?.tier === "pro" ? "Pro" : "Free"})
          </CardTitle>
          <Button type="button" size="sm" variant={easyMode ? "secondary" : "outline"} onClick={toggleEasyMode}>
            {easyMode ? "Easy mode: ON" : "Easy mode"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1" id="vendor-add-item">
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
                {!easyMode ? (
                  <>
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
                  </>
                ) : null}
                <Button variant="hero" className="w-full" onClick={addItem}>
                  Add
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

                  {!easyMode ? (
                    <>
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
                    </>
                  ) : null}
                </div>

                {!easyMode && availableTags.length ? (
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
                    const low = lowStockIds.has(it.id);

                    return (
                      <div
                        key={it.id}
                        className="hover-lift flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
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
                            {!it.in_stock ? (
                              <Badge variant="destructive">Out</Badge>
                            ) : low ? (
                              <Badge variant="outline" className="border-yellow-500/40 bg-yellow-500/10">
                                Low
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10">
                                OK
                              </Badge>
                            )}

                            {easyMode ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15"
                                  onClick={() => setStockStatus(it, "ok")}
                                  disabled={busy}
                                >
                                  OK
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500/15"
                                  onClick={() => setStockStatus(it, "low")}
                                  disabled={busy}
                                >
                                  Low
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-destructive/40 bg-destructive/10 hover:bg-destructive/15"
                                  onClick={() => setStockStatus(it, "out")}
                                  disabled={busy}
                                >
                                  Out
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500/15"
                                  onClick={() => setStockStatus(it, low ? "ok" : "low")}
                                  disabled={busy}
                                >
                                  {low ? "Not low" : "Low stock"}
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleInStock(it)}
                                  disabled={busy}
                                >
                                  Toggle stock
                                </Button>
                              </>
                            )}

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
                                  <AlertDialogDescriptionText>
                                    This will permanently remove the item from your catalog.
                                  </AlertDialogDescriptionText>
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

      <Dialog open={showProBenefits} onOpenChange={setShowProBenefits}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pro benefits</DialogTitle>
            <DialogDescription>What you unlock when you upgrade.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <p className="font-semibold">Higher catalog limit</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add more items than the Free plan limit. Your exact limit depends on your plan approval.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <p className="font-semibold">Priority listing (coming soon)</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pro vendors will be boosted in nearby results and category listings.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <p className="font-semibold">Faster support & verification (coming soon)</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Get quicker resolution for issues and faster review for updates.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <p className="font-semibold">More features</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We’ll add Pro-only tools like bulk catalog upload and promotions.
              </p>
            </div>
          </div>

          <DialogFooter>
            {plan?.tier !== "pro" ? (
              <Button
                variant={plan?.upgrade_requested ? "outline" : "hero"}
                onClick={() => {
                  setShowProBenefits(false);
                  requestUpgrade();
                }}
                disabled={plan?.upgrade_requested}
              >
                {plan?.upgrade_requested ? "Upgrade requested" : "Request upgrade"}
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setShowProBenefits(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update your shop name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Shop name</Label>
            <Input value={editShopName} onChange={(e) => setEditShopName(e.target.value)} placeholder="Shop name" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingProfile(false)} disabled={savingProfile}>
              Cancel
            </Button>
            <Button variant="hero" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shop QR code</DialogTitle>
            <DialogDescription>Scan to open your shop page.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-xl border bg-white p-4">
              <QRCode value={shopUrl} size={200} />
            </div>
            <Button type="submit" size="sm" className="px-3" onClick={copyShopLink}>
              <Copy className="mr-2 h-4 w-4" />
              {copiedLink ? "Copied" : "Copy link"}
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setShowQRCode(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
