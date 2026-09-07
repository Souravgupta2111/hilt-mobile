// Supabase Edge Function: send-push
// Authenticated fan-out for booking / chat / payout notifications via Expo Push.
// - User mode: caller passes their Supabase JWT; the function verifies the
//   caller is a participant before notifying the OTHER side. No spoofing.
// - Internal mode (cron/settler/webhook): x-internal-secret header must match
//   INTERNAL_NOTIFY_SECRET. Set it with:
//   supabase secrets set INTERNAL_NOTIFY_SECRET=$(openssl rand -hex 32)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const INTERNAL_SECRET = Deno.env.get("INTERNAL_NOTIFY_SECRET") || "";

async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>
) {
  if (tokens.length === 0) return { ok: 0 };
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      tokens.map((to) => ({ to, sound: "default", title, body, data }))
    ),
  });
  return { ok: res.ok ? tokens.length : 0 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
      },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const body = await req.json();
    const { action } = body;
    const isInternal = req.headers.get("x-internal-secret") === INTERNAL_SECRET && INTERNAL_SECRET !== "";

    let callerId: string | null = null;
    if (!isInternal) {
      const jwt = (req.headers.get("authorization") || "").replace("Bearer ", "");
      if (!jwt) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      const { data: { user }, error } = await supabase.auth.getUser(jwt);
      if (error || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      callerId = user.id;
    }

    const tokensFor = async (userId: string): Promise<string[]> => {
      const { data } = await supabase.from("push_tokens").select("token").eq("user_id", userId);
      return (data || []).map((t: any) => t.token);
    };

    if (action === "booking_created") {
      // Caller must be the traveler; the host gets notified.
      const { data: booking } = await supabase
        .from("bookings")
        .select("id, traveler_id, check_in, check_out, property:properties(title, host_id)")
        .eq("id", body.booking_id)
        .single();
      if (!booking) throw new Error("Booking not found.");
      if (!isInternal && (booking as any).traveler_id !== callerId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
      }
      const hostId = (booking as any).property?.host_id;
      if (!hostId) return new Response(JSON.stringify({ received: true, notified: 0 }));
      const r = await sendExpoPush(
        await tokensFor(hostId),
        "New booking request",
        `${(booking as any).property?.title || "Your stay"} · ${(booking as any).check_in} → ${(booking as any).check_out}`,
        { type: "booking", booking_id: booking.id }
      );
      return Response.json({ received: true, notified: r.ok });
    }

    if (action === "booking_decided") {
      // Caller must be the host; the traveler gets notified.
      const { data: booking } = await supabase
        .from("bookings")
        .select("id, traveler_id, status, property:properties(title, host_id)")
        .eq("id", body.booking_id)
        .single();
      if (!booking) throw new Error("Booking not found.");
      if (!isInternal && (booking as any).property?.host_id !== callerId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
      }
      const decided = (booking as any).status === "confirmed" ? "confirmed 🎉" : "declined";
      const r = await sendExpoPush(
        await tokensFor((booking as any).traveler_id),
        `Booking ${decided}`,
        (booking as any).property?.title || "Your trip"
        ,
        { type: "booking", booking_id: booking.id }
      );
      return Response.json({ received: true, notified: r.ok });
    }

    if (action === "message") {
      // Caller must be a participant; the other side gets notified.
      const { data: convo } = await supabase
        .from("conversations")
        .select("id, traveler_id, host_id")
        .eq("id", body.conversation_id)
        .single();
      if (!convo) throw new Error("Conversation not found.");
      if (
        !isInternal &&
        (convo as any).traveler_id !== callerId &&
        (convo as any).host_id !== callerId
      ) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
      }
      const peer =
        body.sender_id === (convo as any).traveler_id
          ? (convo as any).host_id
          : (convo as any).traveler_id;
      const r = await sendExpoPush(
        await tokensFor(peer),
        "New message",
        String(body.preview || "You have a new message.").slice(0, 120),
        { type: "message", conversation_id: convo.id }
      );
      return Response.json({ received: true, notified: r.ok });
    }

    if (action === "payouts_settled") {
      // Internal only (called by payout-settler).
      if (!isInternal) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
      const hostIds: string[] = body.host_ids || [];
      let notified = 0;
      for (const hostId of hostIds) {
        const r = await sendExpoPush(
          await tokensFor(hostId),
          "Payout on the way 💸",
          "Your host earnings were released.",
          { type: "payout" }
        );
        notified += r.ok;
      }
      return Response.json({ received: true, notified });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
