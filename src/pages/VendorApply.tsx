import { useState } from "react";
import { BadgeCheck, Camera, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = 1 | 2 | 3 | 4 | 5;

type VendorType = "moving" | "fixed";

export default function VendorApply() {
  const [step, setStep] = useState<Step>(1);
  const [vendorType, setVendorType] = useState<VendorType>("moving");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-muted-foreground">Vendor onboarding</p>
        <h1 className="mt-2 font-display text-4xl leading-tight">Apply to get verified</h1>
        <p className="mt-3 text-muted-foreground">
          This is the UI-first flow. In step 3+ we’ll connect OTP, image upload, and admin approval to the backend.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">Step {step} of 5</CardTitle>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <span
                key={n}
                className={`h-2.5 w-2.5 rounded-full ${n <= step ? "bg-primary" : "bg-muted"}`}
                aria-hidden
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Vendor type</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setVendorType("moving")}
                    className={`rounded-xl border p-4 text-left transition-colors hover:bg-accent ${
                      vendorType === "moving" ? "bg-accent" : "bg-card"
                    }`}
                  >
                    <p className="font-display text-xl">Moving stall</p>
                    <p className="mt-1 text-sm text-muted-foreground">You change your location daily.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVendorType("fixed")}
                    className={`rounded-xl border p-4 text-left transition-colors hover:bg-accent ${
                      vendorType === "fixed" ? "bg-accent" : "bg-card"
                    }`}
                  >
                    <p className="font-display text-xl">Fixed shop</p>
                    <p className="mt-1 text-sm text-muted-foreground">Your shop stays in one place.</p>
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="hero" onClick={() => setStep(2)}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Shop / Stall name</Label>
                  <Input placeholder="Kaveri Fruit Cart" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input placeholder="Fruit & Veg" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Landmark / Address note</Label>
                  <Input placeholder="Near metro gate, Opp. SBI ATM…" />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input placeholder="Bengaluru" />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input placeholder="Karnataka" />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button variant="hero" onClick={() => setStep(3)}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold">Capture your current location</p>
                    <p className="text-sm text-muted-foreground">
                      For moving stalls, you’ll update this daily. If GPS fails, we’ll allow a manual pin.
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="hero">
                    <MapPin className="h-4 w-4" /> Use GPS
                  </Button>
                  <Button variant="outline">Set pin manually</Button>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button variant="hero" onClick={() => setStep(4)}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <Camera className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold">Upload selfie with your stall/shop</p>
                    <p className="text-sm text-muted-foreground">
                      This helps admin verify you are real. We’ll store the image securely (URL saved in database).
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <Input type="file" accept="image/*" />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}>
                  Back
                </Button>
                <Button variant="hero" onClick={() => setStep(5)}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <Phone className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold">Verify phone via OTP</p>
                    <p className="text-sm text-muted-foreground">
                      Next step: send OTP, verify OTP, then submit application.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input placeholder="+91 9xxxxxxxxx" />
                  </div>
                  <div className="space-y-2">
                    <Label>OTP</Label>
                    <Input placeholder="123456" />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline">Send OTP</Button>
                  <Button variant="hero">Verify & Submit</Button>
                </div>

                <div className="mt-4 rounded-xl bg-accent p-4 text-accent-foreground">
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-5 w-5" />
                    <div>
                      <p className="font-semibold">After approval</p>
                      <p className="text-sm opacity-90">
                        You can add up to 5 catalog items for free, toggle online/offline, and update location daily.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(4)}>
                  Back
                </Button>
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Start over
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
