import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function AdminSetup() {
  const [code, setCode] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const makeMeAdmin = async () => {
    const setupCode = code.trim();
    if (!setupCode) {
      toast({
        title: "Enter the setup code",
        description: "Ask the developer for the one-time admin setup code.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-bootstrap", {
        body: { setup_code: setupCode },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error("Setup failed");

      toast({ title: "Admin enabled", description: "Redirecting to Admin…" });
      navigate("/admin", { replace: true });
    } catch (e: any) {
      toast({
        title: "Could not enable admin",
        description: e?.message ?? "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const grantByEmail = async () => {
    const setupCode = code.trim();
    const email = targetEmail.trim();

    if (!setupCode) {
      toast({ title: "Enter the setup code", variant: "destructive" });
      return;
    }

    if (!email) {
      toast({ title: "Enter the target email", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-grant-by-email", {
        body: { setup_code: setupCode, target_email: email },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error("Grant failed");

      toast({ title: "Admin granted", description: `Admin enabled for ${email}` });
    } catch (e: any) {
      toast({
        title: "Could not grant admin",
        description: e?.message ?? "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl">Admin setup (dev only)</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the one-time setup code to grant admin access.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="setup_code">Setup code</Label>
            <Input
              id="setup_code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code"
              autoComplete="one-time-code"
            />
          </div>

          <Button variant="hero" className="w-full" onClick={makeMeAdmin} disabled={loading}>
            {loading ? "Enabling…" : "Make me admin"}
          </Button>

          <div className="pt-2 border-t border-border" />

          <div className="space-y-2">
            <Label htmlFor="target_email">Grant admin to email</Label>
            <Input
              id="target_email"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              type="email"
              placeholder="contactcloshop@gmail.com"
              autoComplete="email"
            />
          </div>

          <Button variant="outline" className="w-full" onClick={grantByEmail} disabled={loading}>
            {loading ? "Granting…" : "Grant admin to this email"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Dev-only: the target email must already have an account created.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
