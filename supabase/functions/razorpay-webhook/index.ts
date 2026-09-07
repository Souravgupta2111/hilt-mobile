// Supabase Edge Function: razorpay-webhook
// Verifies the Razorpay signature, then confirms the exact booking from the
// order notes. Idempotent on razorpay_order_id (safe retires).
// Set secret: supabase secrets set RAZORPAY_WEBHOOK_SECRET=...

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") || "";

async function verifySignature(rawBody: string, signature: string): Promise<boolean> {
  if (!WEBHOOK_SECRET || !signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === signature;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    if (!(await verifySignature(rawBody, signature))) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(rawBody);
    if (body.event !== "payment.captured") {
      return new Response(JSON.stringify({ received: true, ignored: body.event }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const payment = body.payload?.payment?.entity;
    if (!payment?.order_id) {
      return new Response(JSON.stringify({ error: "Missing payment entity" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const n = payment.notes || {};
    const required = ["property_id", "traveler_id", "check_in", "check_out", "total_amount"];
    for (const k of required) {
      if (!n[k]) {
        return new Response(JSON.stringify({ error: `Order notes missing ${k}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Idempotency: an abandoned-then-retried WebView must not double-book.
    const { data: existing } = await supabase
      .from("bookings")
      .select("id")
      .eq("razorpay_order_id", payment.order_id)
      .single();
    if (existing) {
      return new Response(JSON.stringify({ received: true, deduped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const subtotal = parseInt(n.subtotal || "0", 10);
    const platformFee = parseInt(n.platform_fee || "0", 10);
    const gstAmount = parseInt(n.gst_amount || "0", 10);

    const { data: booking, error: bookErr } = await supabase
      .from("bookings")
      .insert({
        property_id: n.property_id,
        room_id: n.room_id || null,
        traveler_id: n.traveler_id,
        booking_type: n.booking_type || "entire_villa",
        check_in: n.check_in,
        check_out: n.check_out,
        guests_count: parseInt(n.guests_count || "2", 10),
        total_nights: parseInt(n.total_nights || "1", 10),
        nightly_rate: parseInt(n.nightly_rate || "0", 10),
        subtotal,
        cleaning_fee: parseInt(n.cleaning_fee || "0", 10),
        platform_fee: platformFee,
        gst_amount: gstAmount,
        total_amount: parseInt(n.total_amount || "0", 10),
        payment_status: "captured_in_escrow",
        razorpay_order_id: payment.order_id,
        razorpay_payment_id: payment.id,
        status: n.initial_status === "pending" ? "pending" : "confirmed",
      })
      .select("id, property_id")
      .single();
    if (bookErr || !booking) throw bookErr || new Error("Booking insert failed");

    // Generate sequential GST tax invoice number (series HILT/<FY>/<seq>)
    let invoiceNumber: string | null = null;
    try {
      const { data: inv } = await supabase.rpc("generate_invoice_number", {
        p_booking_id: booking.id,
      });
      invoiceNumber = inv;
    } catch (invErr) {
      console.error("Invoice number generation failed:", invErr);
    }

    // Schedule the host payout (settled later by payout-settler).
    const { data: prop } = await supabase
      .from("properties")
      .select("host_id, host:profiles(upi_vpa)")
      .eq("id", booking.property_id)
      .single();
    if (prop) {
      const releaseAt = new Date();
      releaseAt.setHours(releaseAt.getHours() + 24);
      await supabase.from("host_payouts").insert({
        booking_id: booking.id,
        host_id: prop.host_id,
        gross_amount: subtotal,
        platform_fee: platformFee,
        net_payout: subtotal - platformFee,
        payout_destination: (prop.host as any)?.upi_vpa || "",
        payout_status: "scheduled",
        scheduled_payout_date: releaseAt.toISOString(),
      });
    }

    // Notify the host (fire-and-forget; never fails the booking).
    try {
      const internalSecret = Deno.env.get("INTERNAL_NOTIFY_SECRET") || "";
      if (internalSecret) {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": internalSecret,
          },
          body: JSON.stringify({ action: "booking_created", booking_id: booking.id }),
        });
      }
    } catch (pushErr) {
      console.error("Host push failed:", pushErr);
    }

    return new Response(JSON.stringify({ received: true, booking_id: booking.id }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
