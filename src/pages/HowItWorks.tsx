import { Link } from "react-router-dom";
import { MapPin, QrCode, ShoppingBasket, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-semibold text-muted-foreground">NearNow</p>
        <h1 className="font-display text-4xl leading-tight md:text-5xl">How it works</h1>
        <p className="max-w-2xl text-muted-foreground">
          Find nearby vendors in real time, check prices quickly, and pay at pickup. Vendors can keep location and
          catalog updated in seconds.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="text-base">For customers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <MapPin className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">Turn on location</p>
                <p className="text-sm text-muted-foreground">See who’s nearby right now, including moving stalls.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <ShoppingBasket className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">Browse & pick</p>
                <p className="text-sm text-muted-foreground">Open a vendor store, view items, and place an order.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <QrCode className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">Pay at pickup</p>
                <p className="text-sm text-muted-foreground">UPI or cash — quick, simple, and local.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="text-base">For vendors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <Store className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">Register & verify</p>
                <p className="text-sm text-muted-foreground">Submit your details and selfie to get approved.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <ShoppingBasket className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">Add your catalog</p>
                <p className="text-sm text-muted-foreground">Set price/unit, stock status, and tags for fast search.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <MapPin className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">Update today’s location</p>
                <p className="text-sm text-muted-foreground">One tap to stay visible in nearby results.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Button asChild variant="hero" className="h-12 justify-start">
          <Link to="/">Find nearby vendors</Link>
        </Button>
        <Button asChild variant="outline" className="h-12 justify-start">
          <Link to="/vendor/apply">Register as vendor</Link>
        </Button>
      </section>
    </div>
  );
}
