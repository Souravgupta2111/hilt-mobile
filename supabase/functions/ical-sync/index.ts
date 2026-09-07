// Supabase Edge Function: ical-sync
// Fetches an external .ics feed (Airbnb/MMT), parses VEVENT blocks and stores
// them as availability blocks — never as fake bookings.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const { property_id, ical_url, source = "airbnb" } = await req.json();

    if (!property_id || !ical_url) {
      return new Response(JSON.stringify({ error: "Missing property_id or ical_url" }), { status: 400 });
    }

    const icsRes = await fetch(ical_url);
    if (!icsRes.ok) throw new Error(`Feed fetch failed (${icsRes.status})`);
    const icsText = await icsRes.text();

    // Collect every blocked calendar date in the feed.
    const blocked = new Set<string>();
    const eventBlocks = icsText.split("BEGIN:VEVENT");
    for (let i = 1; i < eventBlocks.length; i++) {
      const block = eventBlocks[i];
      const startMatch = block.match(/DTSTART(?:;VALUE=DATE)?:(\d{8})/);
      const endMatch = block.match(/DTEND(?:;VALUE=DATE)?:(\d{8})/);
      if (!startMatch || !endMatch) continue;
      const fmt = (s: string) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
      let cur = new Date(fmt(startMatch[1]));
      const end = new Date(fmt(endMatch[1]));
      while (cur < end) {
        blocked.add(cur.toISOString().split("T")[0]);
        cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    for (const date of blocked) {
      await supabase.from("property_blocks").upsert(
        { property_id, blocked_date: date, source },
        { onConflict: "property_id,blocked_date" }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        source,
        events_synced: blocked.size,
        synced_at: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
