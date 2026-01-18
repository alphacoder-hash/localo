import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-12 md:items-start">
      <div className="md:col-span-6">
        <p className="text-sm font-semibold text-muted-foreground">Account</p>
        <h1 className="mt-2 font-display text-4xl leading-tight">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          This is the UI shell. In step 3 we’ll connect real authentication.
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
            <Input type="email" placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <Button variant="hero" className="w-full" disabled>
            {mode === "login" ? "Login" : "Create account"} (coming soon)
          </Button>
          <p className="text-sm text-muted-foreground">
            Next: OTP verification for vendors during application.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
