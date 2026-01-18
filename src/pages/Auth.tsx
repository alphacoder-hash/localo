import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const authSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
});

type Mode = "login" | "signup";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const navigate = useNavigate();
  const location = useLocation() as unknown as { state?: { from?: string } };

  const target = useMemo(() => location.state?.from ?? "/", [location.state]);

  const submit = async () => {
    const parsed = authSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast({
        title: "Check your details",
        description: parsed.error.errors[0]?.message ?? "Invalid input",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast({ title: "Logged in" });
        navigate(target, { replace: true });
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: redirectUrl },
        });
        if (error) throw error;
        toast({
          title: "Account created",
          description: "You can now continue.",
        });
        navigate(target, { replace: true });
      }
    } catch (e: any) {
      toast({
        title: "Auth failed",
        description: e?.message ?? "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-12 md:items-start">
      <div className="md:col-span-6">
        <p className="text-sm font-semibold text-muted-foreground">Account</p>
        <h1 className="mt-2 font-display text-4xl leading-tight">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          Login is required for vendor applications, vendor dashboard, and placing orders.
        </p>

        <div className="mt-6 flex gap-2">
          <Button
            variant={mode === "login" ? "hero" : "outline"}
            onClick={() => setMode("login")}
          >
            Login
          </Button>
          <Button
            variant={mode === "signup" ? "hero" : "outline"}
            onClick={() => setMode("signup")}
          >
            Sign up
          </Button>
        </div>
      </div>

      <Card className="md:col-span-6">
        <CardHeader>
          <CardTitle className="text-base">{mode === "login" ? "Login" : "Sign up"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Minimum 8 characters"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          <Button variant="hero" className="w-full" onClick={submit} disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Login" : "Create account"}
          </Button>

          <p className="text-sm text-muted-foreground">
            Vendor phone OTP is part of the onboarding flow next.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
