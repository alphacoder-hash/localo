// Dev-only admin bootstrap: grants current user the admin role when a setup code matches.
// Called from web app via supabase.functions.invoke("admin-bootstrap")

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const jwt = authHeader.slice("Bearer ".length).trim();

    const payload = (await req.json().catch(() => ({}))) as { setup_code?: string };
    const providedCode = (payload.setup_code ?? "").trim();

    if (!providedCode) return json(400, { error: "Missing setup_code" });

    const expectedCode = (Deno.env.get("ADMIN_SETUP_CODE") ?? "").trim();
    if (!expectedCode) {
      console.error("admin-bootstrap: ADMIN_SETUP_CODE secret not configured");
      return json(500, { error: "Server not configured" });
    }

    if (providedCode !== expectedCode) {
      console.warn("admin-bootstrap: invalid setup code");
      return json(403, { error: "Invalid setup code" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error: claimsErr } = await supabase.auth.getClaims(jwt);
    const userId = (data as any)?.claims?.sub as string | undefined;
    if (claimsErr || !userId) {
      console.error("admin-bootstrap: unauthorized", claimsErr);
      return json(401, { error: "Unauthorized" });
    }

    const { error: upsertErr } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

    if (upsertErr) {
      console.error("admin-bootstrap: failed to upsert role", upsertErr);
      return json(500, { error: "Could not grant admin role" });
    }

    console.log("admin-bootstrap: admin role granted", { userId });
    return json(200, { ok: true });
  } catch (e) {
    console.error("admin-bootstrap: unhandled", e);
    return json(500, { error: "Server error" });
  }
});
