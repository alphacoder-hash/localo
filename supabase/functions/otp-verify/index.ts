// Twilio Verify: check OTP
// Called from web app via supabase.functions.invoke("otp-verify")

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

function isE164(phone: string) {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

function isOtp(code: string) {
  return /^\d{4,8}$/.test(code);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const jwt = authHeader.slice("Bearer ".length).trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error: claimsErr } = await supabase.auth.getClaims(jwt);
    const userId = (data as any)?.claims?.sub as string | undefined;
    if (claimsErr || !userId) return json(401, { error: "Unauthorized" });

    const payload = (await req.json().catch(() => ({}))) as { phone_e164?: string; code?: string };
    const phone = (payload.phone_e164 ?? "").trim();
    const code = (payload.code ?? "").trim();

    if (!isE164(phone)) return json(400, { error: "Invalid phone" });
    if (!isOtp(code)) return json(400, { error: "Invalid OTP" });

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const verifyServiceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID")!;

    const url = `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`;
    const body = new URLSearchParams({ To: phone, Code: code });
    const basicAuth = btoa(`${accountSid}:${authToken}`);

    const twilioRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const twilioText = await twilioRes.text();
    if (!twilioRes.ok) {
      console.error("otp-verify: twilio error", twilioRes.status, twilioText);
      return json(400, { error: "OTP verification failed" });
    }

    // Twilio returns JSON, but we only need status
    let status = "";
    try {
      const parsed = JSON.parse(twilioText);
      status = String(parsed.status ?? "");
    } catch {
      // ignore
    }

    if (status !== "approved") {
      return json(400, { error: "Invalid OTP" });
    }

    // userId is from JWT claims above

    const { error: upsertErr } = await supabase
      .from("phone_verifications")
      .upsert(
        { user_id: userId, phone_e164: phone, verified_at: new Date().toISOString() },
        { onConflict: "user_id,phone_e164" },
      );

    if (upsertErr) {
      console.error("otp-verify: failed to store verification", upsertErr);
      return json(500, { error: "Verified, but could not store verification" });
    }

    return json(200, { ok: true });
  } catch (e) {
    console.error("otp-verify: unhandled", e);
    return json(500, { error: "Server error" });
  }
});
