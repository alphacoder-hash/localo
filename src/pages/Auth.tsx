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

const signupSchema = authSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type Mode = "login" | "signup";

const isDev = import.meta.env.MODE !== "production";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [postAuthPath, setPostAuthPath] = useState<string | null>(null);
  const { toast } = useToast();

  const navigate = useNavigate();
  const location = useLocation() as unknown as { state?: { from?: string } };

  const fallbackTarget = useMemo(() => location.state?.from ?? "/profile", [location.state]);
  const target = postAuthPath ?? fallbackTarget;

  const submit = async () => {
    if (mode === "signup") {
      const parsed = signupSchema.safeParse({ email, password, confirmPassword });
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
        const redirectUrl = `${window.location.origin}/`;
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });
        if (error) throw error;

        // Force logout if auto-logged in, to enforce manual login
        if (data.session) {
          await supabase.auth.signOut();
        }

        toast({
          title: "Account created",
          description: "Registration successful. Please login to access your account.",
        });
        
        setMode("login");
        setPassword("");
        setConfirmPassword("");
      } catch (e: any) {
        toast({
          title: "Signup failed",
          description: e?.message ?? "Please try again",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    } else {
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
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast({ title: "Logged in" });
        navigate(target, { replace: true });
      } catch (e: any) {
        toast({
          title: "Login failed",
          description: e?.message ?? "Please try again",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
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
          Login is required to access your profile and dashboards.
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

          {mode === "signup" && (
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                placeholder="Re-enter password"
                autoComplete="new-password"
              />
            </div>
          )}

          <Button variant="hero" className="w-full" onClick={submit} disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Login" : "Create account"}
          </Button>

          {isDev && (
            <button
              type="button"
              className="text-left text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => {
                setPostAuthPath("/admin-setup");
                toast({
                  title: "Dev shortcut enabled",
                  description: "After login you’ll be sent to Admin setup.",
                });
              }}
            >
              Developer? Continue to Admin setup after login
            </button>
          )}

          <p className="text-sm text-muted-foreground">
            Vendors verify phone during onboarding.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
