import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LocateFixed, MapPin, Navigation, ShoppingBasket, Store } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  const [coords, setCoords] = useState<GeoPoint | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(3);
  const [category, setCategory] = useState<string>("All");
  const [onlineOnly, setOnlineOnly] = useState(true);
  const [q, setQ] = useState("");

  const vendorsQuery = useQuery({
    queryKey: ["vendors_public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors_public")
        .select(
          "id, shop_name, primary_category, vendor_type, is_online, last_location_updated_at, location_lat, location_lng, opening_note, city, state",
        )
        .limit(200);
      if (error) throw error;
      return (data ?? []) as VendorPublic[];
    },
  });

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    (vendorsQuery.data ?? []).forEach((v) => set.add(v.primary_category));
    return Array.from(set);
  }, [vendorsQuery.data]);

  const withDistance = useMemo(() => {
    const origin = coords ?? { lat: 12.9716, lng: 77.5946 };
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

  const requestLocation = () => {
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("Location not supported on this device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setGeoError("Couldn’t access your location. You can still browse with the default city.");
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 5000 },
    );
  };

  return (
    <div className="space-y-10">
      <section className="grid gap-6 md:grid-cols-12 md:items-end">
        <div className="md:col-span-7">
          <p className="text-sm font-semibold text-muted-foreground">India • moving stalls + local shops</p>
          <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">
            Find the nearest vendors—
            <span className="text-primary"> even moving stalls</span>.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            Turn on location to see who’s nearby right now. Browse quick catalogs, get directions, and pay at pickup (UPI or cash).
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button variant="hero" onClick={requestLocation}>
              <LocateFixed className="h-4 w-4" /> Use my location
            </Button>
            <Button asChild variant="outline">
              <Link to="/vendor/apply">
                <Store className="h-4 w-4" /> Register as vendor
              </Link>
            </Button>
          </div>

          {geoError && <p className="mt-3 text-sm text-muted-foreground">{geoError}</p>}

          {coords && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm shadow-sm">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-semibold">Using your location</span>
              <span className="text-muted-foreground">
                {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}
              </span>
            </div>
          )}
        </div>

        <Card className="md:col-span-5">
          <CardHeader>
            <CardTitle className="text-base">Quick filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <p className="text-sm font-semibold text-muted-foreground">Search</p>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Fruit cart, chai, near metro…" />
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-semibold text-muted-foreground">Category</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm font-semibold transition-colors hover:bg-accent",
                      category === c && "bg-accent",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-semibold text-muted-foreground">Radius (km)</p>
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
              Show online only
            </label>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl">Nearby vendors</h2>
            <p className="text-sm text-muted-foreground">
              {vendorsQuery.isLoading
                ? "Loading approved vendors…"
                : vendorsQuery.data?.length
                  ? "Showing approved vendors near you."
                  : "No approved vendors yet — be the first to register."}
            </p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/vendor/apply">
              <ShoppingBasket className="h-4 w-4" /> Become a vendor
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {withDistance.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="font-display text-2xl">No vendors in this radius.</p>
                <p className="mt-2 text-muted-foreground">Try increasing distance or turning off “online only”.</p>
              </CardContent>
            </Card>
          ) : (
            withDistance.map((v) => (
              <Card
                key={v.id}
                className={cn(
                  "relative overflow-hidden",
                  v.id === nearestId && "ring-1 ring-primary/30",
                )}
              >
                {v.id === nearestId && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute left-5 top-5 h-6 w-6 rounded-full bg-primary/20 ring-1 ring-primary/30 animate-pulse-ring"
                  />
                )}

                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">{v.primary_category}</p>
                      <h3 className="mt-1 font-display text-2xl leading-tight">{v.shop_name}</h3>
                      {v.opening_note && (
                        <p className="mt-2 text-sm text-muted-foreground">{v.opening_note}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{v.distanceKm.toFixed(1)} km</p>
                      <div className="mt-2 flex flex-wrap justify-end gap-2">
                        <Badge variant={v.is_online ? "default" : "secondary"}>
                          {v.is_online ? "Online" : "Offline"}
                        </Badge>
                        <Badge variant="outline">
                          {v.vendor_type === "moving_stall" ? "Moving stall" : "Fixed shop"}
                        </Badge>
                        <Badge variant="secondary">
                          {v.updatedToday ? "Updated today" : "Stale location"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link to={`/vendor/${v.id}`}>View store</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${v.location_lat},${v.location_lng}`;
                        window.open(url, "_blank", "noopener,noreferrer");
                      }}
                    >
                      <Navigation className="h-4 w-4" /> Directions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Index;
