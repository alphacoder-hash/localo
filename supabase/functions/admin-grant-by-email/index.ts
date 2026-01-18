// Dev-only admin bootstrap: grants admin role to a target email when setup code matches.
// Called from web app via supabase.functions.invoke("admin-grant-by-email")

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Json = Record<string, unknown>;

function json(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    // Require a logged-in caller (dev-only but avoids unauthenticated role grants)
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const jwt = authHeader.slice("Bearer ".length).trim();

    const payload = (await req.json().catch(() => ({}))) as {
      setup_code?: string;
      target_email?: string;
    };

    const providedCode = (payload.setup_code ?? "").trim();
    const targetEmail = (payload.target_email ?? "").trim().toLowerCase();

    if (!providedCode) return json(400, { error: "Missing setup_code" });
    if (!targetEmail || !isEmail(targetEmail)) return json(400, { error: "Invalid target_email" });

    const expectedCode = (Deno.env.get("ADMIN_SETUP_CODE") ?? "").trim();
    if (!expectedCode) {
      console.error("admin-grant-by-email: ADMIN_SETUP_CODE secret not configured");
      return json(500, { error: "Server not configured" });
    }

    if (providedCode !== expectedCode) {
      console.warn("admin-grant-by-email: invalid setup code");
      return json(403, { error: "Invalid setup code" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate caller JWT
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(jwt);
    const callerUserId = (claimsData as any)?.claims?.sub as string | undefined;
    if (claimsErr || !callerUserId) {
      console.error("admin-grant-by-email: unauthorized caller", claimsErr);
      return json(401, { error: "Unauthorized" });
    }

    // Find target user by email (auth admin API does not support direct lookup by email here,
    // so we scan users in pages; OK for dev-only bootstrap)
    let targetUserId: string | undefined;
    const perPage = 1000;

    for (let page = 1; page <= 10 && !targetUserId; page++) {
      const { data: listRes, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage });
      if (listErr) {
        console.error("admin-grant-by-email: listUsers failed", listErr);
        return json(500, { error: "Could not find user" });
      }

      const match = (listRes?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === targetEmail);
      if (match?.id) targetUserId = match.id;

      if ((listRes?.users ?? []).length < perPage) break; // no more pages
    }

    if (!targetUserId) return json(404, { error: "User not found. Ask them to sign up first." });

    const { error: upsertErr } = await supabase
      .from("user_roles")
      .upsert({ user_id: targetUserId, role: "admin" }, { onConflict: "user_id,role" });

    if (upsertErr) {
      console.error("admin-grant-by-email: failed to upsert role", upsertErr);
      return json(500, { error: "Could not grant admin role" });
    }

    console.log("admin-grant-by-email: admin role granted", { targetUserId, targetEmail, callerUserId });
    return json(200, { ok: true, target_user_id: targetUserId });
  } catch (e) {
    console.error("admin-grant-by-email: unhandled", e);
    return json(500, { error: "Server error" });
  }
});
