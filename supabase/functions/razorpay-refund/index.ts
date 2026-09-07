// Supabase Edge Function: razorpay-refund
// Issues a Razorpay refund for a captured payment (cancellations).
// Body: { razorpay_payment_id: string, amount_inr?: number }
// Secrets: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

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
    const { razorpay_payment_id, amount_inr } = await req.json();
    if (!razorpay_payment_id) {
      return new Response(JSON.stringify({ error: "Missing razorpay_payment_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const auth = `Basic ${btoa(`${KEY_ID}:${KEY_SECRET}`)}`;
    const res = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}/refund`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(amount_inr ? { amount: Math.round(amount_inr * 100) } : {}),
    });
    const data = await res.json();
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: data?.error?.description || "Refund failed" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ success: true, refund: data }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
