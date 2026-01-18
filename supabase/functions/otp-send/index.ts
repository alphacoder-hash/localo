// Twilio Verify: send OTP
// Called from web app via supabase.functions.invoke("otp-send")

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

    const payload = (await req.json().catch(() => ({}))) as { phone_e164?: string };
    const phone = (payload.phone_e164 ?? "").trim();

    if (!isE164(phone)) {
      return json(400, { error: "Invalid phone. Use E.164 format like +919876543210" });
    }

    // Rate limit: 3 per 15 min; also enforce 60s resend cooldown
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();

    const { data: recent, error: recentErr } = await supabase
      .from("otp_send_requests")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", fifteenMinsAgo)
      .order("created_at", { ascending: false });

    if (recentErr) {
      console.error("otp-send: failed to check rate limit", recentErr);
      return json(500, { error: "Could not process request" });
    }

    const sentCount = recent?.length ?? 0;
    if (sentCount >= 3) {
      return json(429, { error: "Too many OTP requests. Try again later.", retry_after_seconds: 15 * 60 });
    }

    const lastSentAt = recent?.[0]?.created_at as string | undefined;
    if (lastSentAt && lastSentAt > sixtySecondsAgo) {
      const retryAfter = Math.max(1, 60 - Math.floor((Date.now() - new Date(lastSentAt).getTime()) / 1000));
      return json(429, { error: "Please wait before resending OTP.", retry_after_seconds: retryAfter });
    }

    // Log the send attempt first (prevents racey double-sends)
    const { error: logErr } = await supabase
      .from("otp_send_requests")
      .insert({ user_id: userId, phone_e164: phone });

    if (logErr) {
      console.error("otp-send: failed to log send", logErr);
      return json(500, { error: "Could not process request" });
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const verifyServiceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID")!;

    const url = `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`;
    const body = new URLSearchParams({ To: phone, Channel: "sms" });

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
      console.error("otp-send: twilio error", twilioRes.status, twilioText);
      return json(400, { error: "Failed to send OTP. Check Twilio Verify settings." });
    }

    return json(200, { ok: true, cooldown_seconds: 60 });
  } catch (e) {
    console.error("otp-send: unhandled", e);
    return json(500, { error: "Server error" });
  }
});
