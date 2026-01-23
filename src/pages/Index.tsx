import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Apple,
  CheckCircle2,
  Clock,
  Coffee,
  LocateFixed,
  MapPin,
  Navigation,
  ShieldCheck,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Star,
  Store,
  Utensils,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn, getDemoBanner } from "@/lib/utils";
import { getCatalogImagePublicUrl } from "@/lib/storage";
import { useGeoLocation } from "@/providers/LocationProvider";

type VendorType = "moving_stall" | "fixed_shop";

type VendorPublic = {
  id: string;
  shop_name: string;
  primary_category: string;
  vendor_type: VendorType;
  is_online: boolean;
  last_location_updated_at: string | null;
  location_lat: number | null;
  location_lng: number | null;
  opening_note: string | null;
  city: string | null;
  state: string | null;
  selfie_with_shop_image_url: string | null;
  banner_image_url: string | null;
};

type GeoPoint = { lat: number; lng: number };

function haversineKm(a: GeoPoint, b: GeoPoint) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(sa)));
}

const Index = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { coords, geoError, isLocating, requestLocation, setGeoError, setCoords } = useGeoLocation();
  const queryClient = useQueryClient();
  const [radiusKm, setRadiusKm] = useState(10);
  const [category, setCategory] = useState<string>("All");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");

  // Clear location on mount so user has to click "Use my location" again
  useEffect(() => {
    setCoords(null);
    localStorage.removeItem("last_coords");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    const channel = supabase
      .channel("vendors_public_updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "vendors", filter: "verification_status=eq.approved" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["vendors_public"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "vendors", filter: "verification_status=eq.approved" },
        (payload) => {
          const nextRow = (payload as any).new as { banner_image_url?: string | null } | undefined;
          const prevRow = (payload as any).old as { banner_image_url?: string | null } | undefined;

          if (nextRow?.banner_image_url !== prevRow?.banner_image_url) {
            queryClient.invalidateQueries({ queryKey: ["vendors_public"] });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const vendorsQuery = useQuery({
    queryKey: ["vendors_public"],
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors_public")
        .select(
          "id, shop_name, primary_category, vendor_type, is_online, last_location_updated_at, location_lat, location_lng, opening_note, city, state, selfie_with_shop_image_url",
        )
        .limit(200);

      if (error) {
        console.error("Error fetching vendors:", error);
        return [];
      }
      return (data ?? []) as VendorPublic[];
    },
  });

  const urlQ = searchParams.get("q") ?? "";

  useEffect(() => {
    if (urlQ !== q) setQ(urlQ);
  }, [urlQ]);

  useEffect(() => {
    if (q === urlQ) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (q) next.set("q", q);
      else next.delete("q");
      setSearchParams(next, { replace: true });
    }, 250);

    return () => clearTimeout(timer);
  }, [q, setSearchParams]);

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    (vendorsQuery.data ?? []).forEach((v) => set.add(v.primary_category));
    return Array.from(set);
  }, [vendorsQuery.data]);

  const stats = useMemo(() => {
    const list = vendorsQuery.data ?? [];
    const onlineCount = list.filter((v) => v.is_online).length;
    const categoriesCount = new Set(list.map((v) => v.primary_category)).size;
    return { onlineCount, categoriesCount, totalCount: list.length };
  }, [vendorsQuery.data]);

  const withDistance = useMemo(() => {
    if (!coords) return [];

    const origin = coords;
    const now = Date.now();

    return (vendorsQuery.data ?? [])
      .filter((v) => v.location_lat != null && v.location_lng != null)
      .map((v) => {
        const distanceKm = haversineKm(origin, {
          lat: v.location_lat as number,
          lng: v.location_lng as number,
        });

        const updatedMs = v.last_location_updated_at
          ? new Date(v.last_location_updated_at).getTime()
          : 0;
        const updatedToday = updatedMs
          ? now - updatedMs < 24 * 60 * 60 * 1000
          : false;

        return { ...v, distanceKm, updatedToday };
      })
      .filter((v) => v.distanceKm <= radiusKm)
      .filter((v) => (category === "All" ? true : v.primary_category === category))
      .filter((v) => (onlineOnly ? v.is_online : true))
      .filter((v) => {
        const hay = `${v.shop_name} ${v.primary_category} ${v.opening_note ?? ""}`.toLowerCase();
        return hay.includes(q.trim().toLowerCase());
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [vendorsQuery.data, coords, radiusKm, category, onlineOnly, q]);

  const nearestId = withDistance[0]?.id;
  const topCategories = useMemo(() => categories.filter((c) => c !== "All").slice(0, 10), [categories]);

  return (
    <div className="space-y-10">
      <section className="grid gap-6 md:grid-cols-12 md:items-end">
        <div className="md:col-span-7">
          <p className="text-sm font-semibold text-muted-foreground">India • moving stalls + local shops</p>
          <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">
            {t("hero.title_part1")}
            <span className="text-primary">{t("hero.title_part2")}</span>.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            {t("hero.subtitle")}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild variant="hero">
              <Link to="/vendor/apply">
                <Store className="h-4 w-4" /> {t("hero.register")}
              </Link>
            </Button>
            <Button
              variant={!coords ? "default" : "outline"}
              onClick={requestLocation}
              disabled={isLocating}
              className={cn("gap-2 transition-all", !coords && "shadow-lg scale-105 font-bold ring-4 ring-primary/30 animate-pulse")}
              id="use-my-location-btn"
            >
              <LocateFixed className="h-4 w-4" />
              {isLocating ? "Locating..." : t("hero.use_location")}
            </Button>
          </div>

          {geoError && (
            <div className="mt-3 rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                {geoError}
              </div>
            </div>
          )}

          {coords ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm shadow-sm animate-in fade-in">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-semibold">{t("hero.using_location")}</span>
              <span className="text-muted-foreground">
                {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}
              </span>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="outline" className="pointer-events-none">
              {stats.totalCount} {t("stats.vendors")}
            </Button>
            <Button variant="outline" className="pointer-events-none">
              {stats.categoriesCount} {t("stats.categories")}
            </Button>
            <Button variant={stats.onlineCount ? "default" : "secondary"} className="pointer-events-none">
              {stats.onlineCount} {t("stats.online_now")}
            </Button>
          </div>

        </div>

        <Card className="md:col-span-5">
          <CardHeader>
            <CardTitle className="text-base">{t("filters.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="hidden gap-2 md:grid" id="search-container">
              <p className="text-sm font-semibold text-muted-foreground">{t("search.label")}</p>
              <Input
                value={q}
                onClick={() => {
                  if (!coords) {
                    toast.error(t("search.alert_title"), {
                      description: t("search.alert_desc"),
                      action: {
                        label: t("search.alert_action"),
                        onClick: () => requestLocation(),
                      },
                    });
                    document.getElementById("location-alert")?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setGeoError(t("search.alert_desc"));
                  }
                }}
                onChange={(e) => {
                  if (!coords) return;
                  setQ(e.target.value);
                }}
                // Remove disabled prop so click events fire
                placeholder={coords ? t("search.placeholder_enabled") : t("search.placeholder_disabled")}
                className={cn(!coords && "cursor-not-allowed opacity-70")}
              />
            </div>
            <div className="grid gap-2" id="filters-container">
              <p className="text-sm font-semibold text-muted-foreground">{t("filters.category")}</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      if (!coords) {
                        toast.error(t("search.alert_title"), {
                          description: t("filters.alert_desc"),
                          action: {
                            label: t("search.alert_action"),
                            onClick: () => requestLocation(),
                          },
                        });
                        document.getElementById("location-alert")?.scrollIntoView({ behavior: "smooth", block: "center" });
                        setGeoError(t("filters.alert_desc"));
                        return;
                      }
                      setCategory(c);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm font-semibold transition-colors hover:bg-accent",
                      category === c && "bg-accent",
                      !coords && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-semibold text-muted-foreground">{t("filters.radius")}</p>
              <div className="flex items-center gap-3">
                <input
                  aria-label="Radius in kilometers"
                  type="range"
                  min={1}
                  max={8}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-full"
                />
                <span className="min-w-10 text-right text-sm font-semibold">{radiusKm}</span>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={onlineOnly}
                onChange={(e) => setOnlineOnly(e.target.checked)}
              />
              {t("filters.online_only")}
            </label>
          </CardContent>
        </Card>
      </section>

      {topCategories.length ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl">{t("sections.top_categories")}</h2>
              <p className="text-sm text-muted-foreground">{t("sections.top_categories_sub")}</p>
            </div>
          </div>

          <ScrollArea className="w-full whitespace-nowrap pb-4">
            <div className="flex w-max space-x-4">
              {topCategories.map((c) => {
                let Icon = Store;
                const l = c.toLowerCase();
                if (l.includes("fruit") || l.includes("veg")) Icon = Apple;
                else if (l.includes("food") || l.includes("meal") || l.includes("snack") || l.includes("chai"))
                  Icon = Utensils;
                else if (l.includes("coffee") || l.includes("tea")) Icon = Coffee;
                else if (l.includes("cloth") || l.includes("fashion")) Icon = Shirt;

                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCategory(c);
                      document.getElementById("vendors")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={cn(
                      "group flex min-w-[100px] flex-col items-center justify-center gap-2 rounded-xl border bg-card p-4 transition-all hover:bg-accent hover:shadow-sm",
                      category === c && "border-primary bg-primary/5 ring-1 ring-primary",
                    )}
                  >
                    <div
                      className={cn(
                        "grid h-10 w-10 place-items-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20",
                        category === c && "bg-primary text-primary-foreground group-hover:bg-primary",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">{c}</span>
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      ) : null}

      <section id="vendors" className="space-y-4 scroll-mt-24">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl">{t("sections.nearby_vendors")}</h2>
            <p className="text-sm text-muted-foreground">
              {vendorsQuery.isLoading
                ? t("sections.loading")
                : vendorsQuery.data?.length
                  ? t("sections.showing")
                  : t("sections.no_vendors")}
            </p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/vendor/apply">
              <ShoppingBasket className="h-4 w-4" /> {t("sections.become_vendor")}
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {withDistance.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="font-display text-2xl">{t("sections.empty_radius")}</p>
                <p className="mt-2 text-muted-foreground">{t("sections.empty_radius_sub")}</p>
              </CardContent>
            </Card>
          ) : (
            withDistance.map((v) => (
              <Card
                key={v.id}
                className={cn(
                  "hover-lift relative overflow-hidden",
                  v.id === nearestId && "ring-1 ring-primary/30",
                )}
              >
                <CardContent className="p-0">
                  <div className="h-32 w-full bg-muted relative">
                     <div className="h-full w-full bg-gradient-to-r from-muted to-accent" />
                     <img
                       src={
                         getCatalogImagePublicUrl(v.banner_image_url ?? `banners/${v.id}.jpg`) ||
                         getCatalogImagePublicUrl(`banners/${v.id}.jpg`) ||
                         ""
                       }
                       alt={v.shop_name}
                       className="absolute inset-0 h-full w-full object-cover"
                       onError={(e) => {
                         const target = e.currentTarget;
                         const demo = getDemoBanner(v.primary_category);
                         if (target.src !== demo) {
                           target.src = demo;
                         } else {
                           target.style.display = "none";
                         }
                       }}
                     />
                     {v.id === nearestId && (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute left-3 top-3 h-4 w-4 rounded-full bg-primary/20 ring-1 ring-primary/30 animate-pulse-ring z-10"
                      />
                    )}
                  </div>
                  <div className="p-6">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <span>{v.primary_category}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          {t("card.pay_at_pickup")}
                        </span>
                      </div>
                      <h3 className="mt-1 font-display text-xl leading-tight">{v.shop_name}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                    </div>
                  </div>

                  {v.opening_note && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{v.opening_note}</p>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-muted-foreground">{t("card.distance")}</span>
                      <span className="font-semibold text-foreground">{v.distanceKm.toFixed(1)} km</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${v.location_lat},${v.location_lng}`;
                          window.open(url, "_blank", "noopener,noreferrer");
                        }}
                        aria-label="Get directions"
                      >
                        <Navigation className="h-4 w-4" />
                      </Button>
                      <Button asChild size="sm" className="h-8">
                        <Link to={`/vendor/${v.id}`}>{t("card.view")}</Link>
                      </Button>
                    </div>
                  </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-6">
        <div className="grid gap-6 md:grid-cols-[1fr,280px] md:items-center">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">{t("how_it_works.new_here")}</p>
            <h2 className="mt-2 font-display text-2xl">{t("how_it_works.title")}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {t("how_it_works.subtitle")}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-background p-4">
                <p className="text-sm font-semibold">{t("how_it_works.step1_title")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("how_it_works.step1_desc")}</p>
              </div>
              <div className="rounded-xl border bg-background p-4">
                <p className="text-sm font-semibold">{t("how_it_works.step2_title")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("how_it_works.step2_desc")}</p>
              </div>
              <div className="rounded-xl border bg-background p-4">
                <p className="text-sm font-semibold">{t("how_it_works.step3_title")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("how_it_works.step3_desc")}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Button asChild variant="hero" className="h-12">
              <Link to="/how-it-works">{t("how_it_works.read_guide")}</Link>
            </Button>
            <Button asChild variant="outline" className="h-12">
              <Link to="/vendor/apply">{t("how_it_works.register")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-background p-6">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <p className="text-sm font-semibold text-muted-foreground">{t("bottom_cta.tag")}</p>
            <h2 className="mt-2 font-display text-3xl leading-tight">{t("bottom_cta.title")}</h2>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              {t("bottom_cta.desc")}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(t("bottom_cta.features", { returnObjects: true }) as string[]).map((ft) => (
                <div key={ft} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold leading-snug">{ft}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="hero"
                onClick={() => document.getElementById("vendors")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                {t("bottom_cta.browse")}
              </Button>
              <Button asChild variant="outline">
                <Link to="/auth">
                  <ShieldCheck className="h-4 w-4" /> {t("bottom_cta.signup")}
                </Link>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative overflow-hidden rounded-2xl border bg-card">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-accent/20" />
              <div className="relative grid gap-4 p-5 sm:grid-cols-2 sm:items-center">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-semibold">
                    <Smartphone className="h-4 w-4 text-primary" />
                    {t("bottom_cta.preview_tag")}
                  </div>
                  <p className="font-display text-2xl leading-tight">{t("bottom_cta.preview_title")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("bottom_cta.preview_desc")}
                  </p>
                </div>
                <img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80"
                  alt="People viewing an app on a smartphone"
                  className="h-48 w-full rounded-xl object-cover sm:h-56"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-6">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <p className="text-sm font-semibold text-muted-foreground">{t("faq.title")}</p>
            <h2 className="mt-2 font-display text-3xl leading-tight">{t("faq.heading")}</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("faq.subheading")}
            </p>
          </div>
          <div className="lg:col-span-7">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="q1">
                <AccordionTrigger>{t("faq.q1")}</AccordionTrigger>
                <AccordionContent>{t("faq.a1")}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="q2">
                <AccordionTrigger>{t("faq.q2")}</AccordionTrigger>
                <AccordionContent>
                  {t("faq.a2")}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q3">
                <AccordionTrigger>{t("faq.q3")}</AccordionTrigger>
                <AccordionContent>{t("faq.a3")}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="q4">
                <AccordionTrigger>{t("faq.q4")}</AccordionTrigger>
                <AccordionContent>{t("faq.a4")}</AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
