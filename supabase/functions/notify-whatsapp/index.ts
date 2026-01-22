// Notify via WhatsApp (Twilio)
// Called from web app via supabase.functions.invoke("notify-whatsapp")

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify auth (optional but recommended: ensure caller is logged in)
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });
    const jwt = authHeader.slice("Bearer ".length).trim();
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !user) return json(401, { error: "Unauthorized" });

    const payload = (await req.json().catch(() => ({}))) as {
      order_id?: string;
      type?: "new_order" | "status_update";
    };

    const { order_id, type } = payload;
    if (!order_id || !type) return json(400, { error: "Missing order_id or type" });

    // 1. Fetch Order Details
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        customer_user_id,
        pickup_note,
        vendor_id,
        order_items (
          qty,
          price_snapshot_inr,
          title_snapshot
        )
      `)
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      console.error("Order fetch error", orderErr);
      return json(404, { error: "Order not found" });
    }

    // 1.1 Fetch Customer Phone (if needed for status update)
    let customerPhone = "";
    if (type === "status_update" && order.customer_user_id) {
      const { data: phoneData, error: phoneErr } = await supabase
        .from("phone_verifications")
        .select("phone_e164")
        .eq("user_id", order.customer_user_id)
        .order("verified_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!phoneErr && phoneData) {
        customerPhone = phoneData.phone_e164;
      } else {
         // Fallback to otp_send_requests if verification record missing
         const { data: otpData } = await supabase
          .from("otp_send_requests")
          .select("phone_e164")
          .eq("user_id", order.customer_user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
         if (otpData) customerPhone = otpData.phone_e164;
      }
    }

    // 2. Fetch Vendor Details
    const { data: vendor, error: vendorErr } = await supabase
      .from("vendors")
      .select("shop_name")
      .eq("id", order.vendor_id)
      .single();

    if (vendorErr || !vendor) {
      return json(404, { error: "Vendor not found" });
    }

    // 3. Determine Recipient and Message
    let toPhone = "";
    let messageBody = "";

    const total = (order.order_items || []).reduce(
      (sum: number, item: any) => sum + (item.price_snapshot_inr * item.qty),
      0
    );
    const itemCount = (order.order_items || []).length;

    if (type === "new_order") {
      // Send to Vendor
      const { data: contact, error: contactErr } = await supabase
        .from("vendor_contacts")
        .select("phone_e164")
        .eq("vendor_id", order.vendor_id)
        .single();
      
      if (contactErr || !contact?.phone_e164) {
        return json(400, { error: "Vendor has no phone number" });
      }
      toPhone = contact.phone_e164;
      messageBody = `📦 *New Order Received!*
Shop: ${vendor.shop_name}
Order #${order.id.slice(0, 8)}
Items: ${itemCount}
Total: ₹${total}
Note: ${order.pickup_note || "None"}

Please check your dashboard to accept.`;

    } else if (type === "status_update") {
      // Send to Customer
      if (!customerPhone) {
        return json(200, { message: "No customer phone linked to order, skipping notification." });
      }
      toPhone = customerPhone;
      
      const statusEmoji: Record<string, string> = {
        accepted: "✅",
        preparing: "👨‍🍳",
        ready: "🥡",
        completed: "🥳",
        cancelled: "❌",
      };
      const emoji = statusEmoji[order.status] || "🔔";
      
      messageBody = `${emoji} *Order Update*
Your order at *${vendor.shop_name}* is now: *${order.status.toUpperCase()}*.
Order #${order.id.slice(0, 8)}

${order.status === 'ready' ? 'Your order is ready for pickup!' : ''}
${order.status === 'cancelled' ? 'Sorry, your order was cancelled.' : ''}`;
    } else {
      return json(400, { error: "Invalid type" });
    }

    // 4. Send via Twilio
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromPhone = Deno.env.get("TWILIO_WHATSAPP_FROM"); // e.g. "whatsapp:+14155238886"

    if (!accountSid || !authToken || !fromPhone) {
      console.error("Missing Twilio credentials");
      // Fallback: Just log it if creds are missing (for dev)
      console.log(`[MOCK SEND] To: ${toPhone}, Msg: ${messageBody}`);
      return json(200, { ok: true, mocked: true });
    }

    // Ensure 'to' has 'whatsapp:' prefix if using Twilio WhatsApp
    // If toPhone is "+91...", make it "whatsapp:+91..."
    const toWhatsapp = toPhone.startsWith("whatsapp:") ? toPhone : `whatsapp:${toPhone}`;
    const fromWhatsapp = fromPhone.startsWith("whatsapp:") ? fromPhone : `whatsapp:${fromPhone}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: toWhatsapp,
      From: fromWhatsapp,
      Body: messageBody,
    });

    const basicAuth = btoa(`${accountSid}:${authToken}`);
    const twilioRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!twilioRes.ok) {
      const text = await twilioRes.text();
      console.error("Twilio Error:", text);
      return json(400, { error: "Twilio failed", details: text });
    }

    return json(200, { ok: true });

  } catch (e: any) {
    console.error("notify-whatsapp error", e);
    return json(500, { error: e.message });
  }
});
