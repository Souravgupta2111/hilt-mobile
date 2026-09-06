// Supabase Edge Function: razorpay-create-order
// Handles creation of Razorpay order with automated 2% Hilt fee split and 98% Escrow hold.

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
    const { amount, currency = "INR", property_id, guest_id, nights } = await req.json();

    if (!amount || !property_id) {
      return new Response(JSON.stringify({ error: "Missing required booking fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const platformFee = Math.round(amount * 0.02); // 2% Hilt Commission
    const hostEscrowAmount = amount - platformFee; // 98% Held for host

    // Call Razorpay Orders API
    const authHeader = `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`;
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // in paise
        currency,
        receipt: `rcpt_${property_id.substring(0, 8)}_${Date.now()}`,
        notes: {
          property_id,
          guest_id: guest_id || "guest_direct",
          platform_fee_inr: platformFee.toString(),
          host_escrow_inr: hostEscrowAmount.toString(),
          nights: nights.toString(),
          hillcover_protected: "true",
        },
      }),
    });

    const orderData = await razorpayResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        order: orderData,
        escrow_summary: {
          total_inr: amount,
          host_payout_inr: hostEscrowAmount,
          hilt_fair_fee_inr: platformFee,
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
