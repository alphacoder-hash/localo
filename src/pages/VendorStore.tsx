import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VendorStore() {
  const { vendorId } = useParams();

  const vendor = useMemo(() => {
    // Demo-only lookup; will be fetched from backend later.
    return {
      id: vendorId ?? "unknown",
      name: vendorId === "v-kr" ? "Kaveri Fruit Cart" : "Local Vendor",
      category: "Fruit & Veg",
      isOnline: true,
      lat: 12.9716,
      lng: 77.5946,
      note: "Near metro gate",
      updatedToday: true,
    };
  }, [vendorId]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Store</p>
          <h1 className="mt-2 font-display text-4xl leading-tight">{vendor.name}</h1>
          <p className="mt-2 text-muted-foreground">{vendor.note}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{vendor.isOnline ? "Online" : "Offline"}</Badge>
            <Badge variant="outline">{vendor.category}</Badge>
            <Badge variant="secondary">{vendor.updatedToday ? "Updated today" : "Stale location"}</Badge>
          </div>
        </div>

        <Button
          variant="hero"
          onClick={() => {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${vendor.lat},${vendor.lng}`;
            window.open(url, "_blank", "noopener,noreferrer");
          }}
        >
          <Navigation className="h-4 w-4" /> Get directions
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-12">
        <Card className="md:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">Catalog</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border bg-card p-4">
              <p className="font-semibold">Bananas</p>
              <p className="text-sm text-muted-foreground">₹40 / dozen</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="font-semibold">Tomato</p>
              <p className="text-sm text-muted-foreground">₹30 / kg</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Ordering UI comes next (step 10+). For step 3+ we’ll load real items from the backend.
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-5">
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="hero" className="w-full" disabled>
              Add to cart (coming soon)
            </Button>
            <Button variant="outline" className="w-full" disabled>
              Place order (pay at pickup)
            </Button>
            <p className="text-sm text-muted-foreground">
              Payment is always at pickup: UPI or cash.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
