// Supabase Edge Function: ical-sync
// Fetches external .ics calendar feeds from Airbnb/MakeMyTrip, parses VEVENT blocks,
// and blocks corresponding dates in Hilt's availability calendar.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://eccqfucljzppqomaiwgp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

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

    // 1. Fetch remote .ics file
    const icsRes = await fetch(ical_url);
    const icsText = await icsRes.text();

    // 2. Parse VEVENT blocks
    const events: Array<{ start: string; end: string; summary: string }> = [];
    const eventBlocks = icsText.split("BEGIN:VEVENT");

    for (let i = 1; i < eventBlocks.length; i++) {
      const block = eventBlocks[i];
      const startMatch = block.match(/DTSTART(?:;VALUE=DATE)?:(\d{8})/);
      const endMatch = block.match(/DTEND(?:;VALUE=DATE)?:(\d{8})/);
      const summaryMatch = block.match(/SUMMARY:(.*)/);

      if (startMatch && endMatch) {
        events.push({
          start: `${startMatch[1].slice(0, 4)}-${startMatch[1].slice(4, 6)}-${startMatch[1].slice(6, 8)}`,
          end: `${endMatch[1].slice(0, 4)}-${endMatch[1].slice(4, 6)}-${endMatch[1].slice(6, 8)}`,
          summary: summaryMatch ? summaryMatch[1].trim() : `Blocked on ${source}`,
        });
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 3. Save blocked dates
    for (const evt of events) {
      await supabase.from("bookings").upsert({
        property_id,
        check_in: evt.start,
        check_out: evt.end,
        status: "external_blocked",
        notes: `Imported from ${source} calendar sync`,
      }, { onConflict: "property_id,check_in" });
    }

    return new Response(
      JSON.stringify({
        success: true,
        source,
        events_synced: events.length,
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
