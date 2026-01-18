import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VendorDashboard() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Vendor dashboard</p>
          <h1 className="mt-2 font-display text-4xl leading-tight">Your stall, your control</h1>
        </div>
        <Button asChild variant="outline">
          <Link to="/vendor/apply">Edit application</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Verification</p>
              <p className="mt-1 font-semibold">
                <Badge variant="secondary">Pending (demo)</Badge>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Shop status</p>
              <p className="mt-1 font-semibold">
                <Badge>Online</Badge>
              </p>
            </div>
            <Button variant="hero">Toggle Online/Offline</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today’s location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Update daily for moving stalls.</p>
            <Button variant="hero" className="w-full">
              Update location
            </Button>
            <Button variant="outline" className="w-full">
              Set pin manually
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catalog (0/5 free)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Add up to 5 items free. Upgrade later to add more.
          </p>
          <div className="flex gap-2">
            <Button variant="hero">Add item</Button>
            <Button variant="outline">Upgrade</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
