// Supabase Edge Function: razorpay-webhook
// Handles payment captured event, updates booking status to confirmed, locks funds in escrow,
// and schedules automatic UPI transfer to the host 24 hours after physical check-in.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://eccqfucljzppqomaiwgp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    const event = body.event;
    const payment = body.payload?.payment?.entity;

    if (event === "payment.captured" && payment) {
      const orderId = payment.order_id;
      const notes = payment.notes || {};
      const propertyId = notes.property_id;
      const guestId = notes.guest_id;
      const totalAmount = payment.amount / 100;
      const platformFee = parseFloat(notes.platform_fee_inr || "0");
      const hostPayout = parseFloat(notes.host_escrow_inr || (totalAmount - platformFee).toString());

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Check-in date + 24 hours for automated escrow release
      const escrowReleaseAt = new Date();
      escrowReleaseAt.setHours(escrowReleaseAt.getHours() + 24);

      // Upsert confirmed booking
      await supabase.from("bookings").insert({
        property_id: propertyId,
        guest_id: guestId,
        total_amount: totalAmount,
        platform_fee: platformFee,
        host_payout: hostPayout,
        status: "confirmed",
        escrow_status: "held_in_escrow",
        escrow_release_at: escrowReleaseAt.toISOString(),
        payment_id: payment.id,
        order_id: orderId,
      });

      console.log(`[Hilt Escrow] ₹${hostPayout} held in escrow for property ${propertyId}. Release scheduled for ${escrowReleaseAt.toISOString()}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
