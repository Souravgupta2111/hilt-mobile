// Supabase Edge Function: rate-limit
// Single endpoint used by all chat/booking edge functions to throttle
// abusive callers. Bypassed when the caller is a Supabase service role.
// Body: { user_id: uuid, action: text, window_seconds?: int, max?: int }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const DEFAULTS: Record<string, { window: number; max: number }> = {
  send_message: { window: 60, max: 30 },
  send_otp: { window: 600, max: 5 },
  create_booking: { window: 60, max: 5 },
  create_review: { window: 86400, max: 10 },
};

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const body = await req.json();
    const action = String(body.action || "");
    const userId = String(body.user_id || "");
    if (!action || !userId) {
      return new Response(JSON.stringify({ error: "Missing action or user_id" }), { status: 400 });
    }
    const cfg = DEFAULTS[action] || { window: 60, max: 30 };
    const window = Math.max(1, Math.min(86400, Number(body.window_seconds ?? cfg.window)));
    const max = Math.max(1, Math.min(1000, Number(body.max ?? cfg.max)));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: count, error } = await supabase.rpc("rate_limit_window", {
      p_user_id: userId,
      p_action: action,
      p_window_seconds: window,
    });
    if (error) throw error;
    const allowed = (count ?? 0) < max;
    return new Response(
      JSON.stringify({ allowed, count: count ?? 0, limit: max, window_seconds: window }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
