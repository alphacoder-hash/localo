import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Admin() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-muted-foreground">Admin</p>
        <h1 className="mt-2 font-display text-4xl leading-tight">Verification queue</h1>
        <p className="mt-3 text-muted-foreground">
          Demo screen. In step 6 we’ll connect this to real pending applications.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kaveri Fruit Cart</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Moving stall • Bengaluru • Near metro gate</p>
            <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
              Selfie preview (storage URL later)
            </div>
            <div className="flex gap-2">
              <Button variant="hero">Approve</Button>
              <Button variant="outline">Reject</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chai Junction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Fixed shop • Bengaluru • Opp. SBI ATM</p>
            <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
              Map preview (later)
            </div>
            <div className="flex gap-2">
              <Button variant="hero">Approve</Button>
              <Button variant="outline">Reject</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
