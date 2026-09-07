// Supabase Edge Function: razorpay-create-order
// Creates a Razorpay order carrying the full booking intent in notes so the
// signature-verified webhook can confirm the exact booking (no guessing).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const body = await req.json();
    const {
      amount,
      currency = "INR",
      property_id,
      traveler_id,
      room_id,
      booking_type = "entire_villa",
      check_in,
      check_out,
      guests_count = 2,
      total_nights = 1,
      nightly_rate,
      subtotal,
      cleaning_fee = 0,
      platform_fee,
      gst_amount = 0,
      initial_status = 'confirmed',
      guest_email,
    } = body;

    if (!amount || !property_id || !traveler_id || !check_in || !check_out) {
      return new Response(JSON.stringify({ error: "Missing required booking fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fee = platform_fee ?? Math.round((subtotal ?? amount) * 0.02);
    const sub = subtotal ?? amount - fee;

    const authHeader = `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`;
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // paise
        currency,
        receipt: `rcpt_${property_id.substring(0, 8)}_${Date.now()}`,
        notes: {
          property_id,
          traveler_id,
          room_id: room_id || "",
          booking_type,
          check_in,
          check_out,
          guests_count: String(guests_count),
          total_nights: String(total_nights),
          nightly_rate: String(nightly_rate ?? 0),
          subtotal: String(sub),
          cleaning_fee: String(cleaning_fee),
          platform_fee: String(fee),
          gst_amount: String(gst_amount),
          total_amount: String(amount),
          initial_status: initial_status === "pending" ? "pending" : "confirmed",
          guest_email: guest_email || "",
          hillcover_protected: "true",
        },
      }),
    });

    const orderData = await razorpayResponse.json();
    if (!razorpayResponse.ok) {
      return new Response(
        JSON.stringify({ error: orderData?.error?.description || "Razorpay order failed" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: orderData,
        escrow_summary: {
          total_inr: amount,
          host_payout_inr: sub - fee,
          hilt_fair_fee_inr: fee,
          escrow_hold_hours: 24,
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
