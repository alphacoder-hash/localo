import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { BadgeCheck, Camera, MapPin, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Step = 1 | 2 | 3 | 4 | 5;

type VendorType = "moving" | "fixed";

const vendorSchema = z.object({
  vendorType: z.enum(["moving", "fixed"]),
  shopName: z.string().trim().min(2).max(80),
  category: z.string().trim().min(2).max(40),
  note: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().max(40).optional().or(z.literal("")),
  state: z.string().trim().max(40).optional().or(z.literal("")),
  phone: z.string().trim().min(10).max(20),
});

export default function VendorApply() {
  const [step, setStep] = useState<Step>(1);
  const [vendorType, setVendorType] = useState<VendorType>("moving");

  const [shopName, setShopName] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");

  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const mappedType = useMemo(
    () => (vendorType === "moving" ? "moving_stall" : "fixed_shop"),
    [vendorType],
  );

  const grabGps = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS not available", variant: "destructive" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        toast({ title: "Location captured" });
      },
      () => toast({ title: "Couldn’t get location", variant: "destructive" }),
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 5000 },
    );
  };

  const submit = async () => {
    if (!user) return;

    const parsed = vendorSchema.safeParse({
      vendorType,
      shopName,
      category,
      note,
      city,
      state,
      phone,
    });

    if (!parsed.success) {
      toast({
        title: "Fix your details",
        description: parsed.error.errors[0]?.message ?? "Invalid input",
        variant: "destructive",
      });
      return;
    }

    if (!coords) {
      toast({ title: "Add your location", description: "Use GPS before submitting.", variant: "destructive" });
      return;
    }

    if (!selfieFile) {
      toast({ title: "Selfie required", description: "Upload a selfie with your stall/shop.", variant: "destructive" });
      return;
    }

    // Note: Real SMS OTP depends on SMS provider configuration.
    // For now we accept the OTP field as a UI placeholder.
    if (otp.trim().length < 4) {
      toast({ title: "Enter OTP", description: "OTP is required (we’ll wire SMS next).", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // 1) Upload selfie to storage (never store image in DB)
      const ext = selfieFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase
        .storage
        .from("vendor-selfies")
        .upload(path, selfieFile, { upsert: false });

      if (uploadErr) throw uploadErr;

      // 2) Create vendor record
      const { data: vendor, error: vendorErr } = await supabase
        .from("vendors")
        .insert({
          owner_user_id: user.id,
          shop_name: parsed.data.shopName,
          primary_category: parsed.data.category,
          vendor_type: mappedType,
          opening_note: parsed.data.note || null,
          city: parsed.data.city || null,
          state: parsed.data.state || null,
          location_lat: coords.lat,
          location_lng: coords.lng,
          location_accuracy_meters: coords.accuracy ? Math.round(coords.accuracy) : null,
          last_location_updated_at: new Date().toISOString(),
          selfie_with_shop_image_url: path,
          verification_status: "pending",
          is_online: false,
        })
        .select("id")
        .maybeSingle();

      if (vendorErr) throw vendorErr;
      if (!vendor?.id) throw new Error("Could not create vendor profile");

      // 3) Store phone in separate table
      const { error: contactErr } = await supabase
        .from("vendor_contacts")
        .insert({ vendor_id: vendor.id, phone_e164: parsed.data.phone });

      if (contactErr) throw contactErr;

      // 4) Ensure a plan row exists
      await supabase.from("vendor_plans").insert({ vendor_id: vendor.id }).throwOnError();

      toast({
        title: "Application submitted",
        description: "Your request is pending admin approval.",
      });
      navigate("/vendor/dashboard", { replace: true });
    } catch (e: any) {
      toast({ title: "Couldn’t submit", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-muted-foreground">Vendor onboarding</p>
        <h1 className="mt-2 font-display text-4xl leading-tight">Apply to get verified</h1>
        <p className="mt-3 text-muted-foreground">
          You’ll submit your shop details + selfie. Admin approves you, then customers can discover you.
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
                  <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Kaveri Fruit Cart" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Fruit & Veg" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Landmark / Address note</Label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Near metro gate, Opp. SBI ATM…" />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bengaluru" />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="Karnataka" />
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
                      For moving stalls, you’ll update this daily.
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="hero" onClick={grabGps}>
                    <MapPin className="h-4 w-4" /> Use GPS
                  </Button>
                  <Button variant="outline" disabled>
                    Set pin manually (next)
                  </Button>
                </div>
                {coords && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Saved: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                  </p>
                )}
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
                      We store the image in secure file storage; only the path is saved.
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)}
                  />
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
                      SMS provider setup comes next. For now this captures the phone number.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9xxxxxxxxx" />
                  </div>
                  <div className="space-y-2">
                    <Label>OTP</Label>
                    <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" disabled>
                    Send OTP (next)
                  </Button>
                  <Button variant="hero" onClick={submit} disabled={loading}>
                    {loading ? "Submitting…" : "Verify & Submit"}
                  </Button>
                </div>

                <div className="mt-4 rounded-xl bg-accent p-4 text-accent-foreground">
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-5 w-5" />
                    <div>
                      <p className="font-semibold">After approval</p>
                      <p className="text-sm opacity-90">
                        You can add up to 5 catalog items free, toggle online/offline, and update location daily.
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
