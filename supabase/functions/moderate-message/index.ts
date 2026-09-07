// Supabase Edge Function: moderate-message
// Server-side enforcement backstop for chat (Wayzyy Pathway C).
// The full Wayzyy engine runs on-device; this function re-validates
// authorship + contact-exfiltration patterns and inserts allowed messages.
// Deploy: supabase functions deploy moderate-message

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PHONE_LIKE = /(\+?\d[\d\s\-().]{7,}\d)/;
const EMAIL_LIKE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const URL_LIKE = /(https?:\/\/|www\.|[a-z0-9-]+\.(com|in|net|org|io|me|app)\b)/i;
const UPI_LIKE = /[\w.\-]{2,}@(ok[a-z]+|ybl|ibl|axl|upi|paytm)/i;

function serverScreen(text: string): { ok: boolean; reasons: string[]; masked: string } {
  const reasons: string[] = [];
  let masked = text;
  if (PHONE_LIKE.test(text)) {
    reasons.push("PHONE_NUMBER");
    masked = masked.replace(PHONE_LIKE, "[redacted]");
  }
  if (EMAIL_LIKE.test(text)) {
    reasons.push("EMAIL");
    masked = masked.replace(EMAIL_LIKE, "[redacted]");
  }
  if (UPI_LIKE.test(text)) {
    reasons.push("PAYMENT_RAIL");
    masked = masked.replace(UPI_LIKE, "[redacted]");
  }
  if (URL_LIKE.test(text)) reasons.push("EXTERNAL_LINK");
  return { ok: reasons.length === 0, reasons, masked };
}

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
    const { text, conversation_id, sender_id, client_action } = await req.json();
    if (!text || !conversation_id || !sender_id) {
      return new Response(JSON.stringify({ error: "Missing text, conversation_id or sender_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authorship: sender must be a participant of the conversation.
    const { data: convo, error: convoErr } = await supabase
      .from("conversations")
      .select("id, traveler_id, host_id")
      .eq("id", conversation_id)
      .single();
    if (convoErr || !convo) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), { status: 404 });
    }
    if (sender_id !== convo.traveler_id && sender_id !== convo.host_id) {
      return new Response(JSON.stringify({ error: "Not a participant" }), { status: 403 });
    }

    // Never trust a client "allow" that carries exfiltration signals.
    const screen = serverScreen(text);
    if (client_action === "allow" && !screen.ok) {
      return new Response(
        JSON.stringify({ allowed: false, action: "mask", reasons: screen.reasons, text: screen.masked }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!screen.ok && screen.reasons.includes("EXTERNAL_LINK")) {
      return new Response(
        JSON.stringify({ allowed: false, action: "block", reasons: screen.reasons }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const finalText = screen.ok ? text : screen.masked;
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id,
        sender_id,
        text: finalText,
        moderation_action: screen.ok ? (client_action || "allow") : "mask",
        moderation_score: screen.ok ? 0 : 0.7,
        flagged: !screen.ok,
      })
      .select("*")
      .single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation_id);

    return new Response(JSON.stringify({ allowed: true, message: data }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
