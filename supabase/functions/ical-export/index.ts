// Supabase Edge Function: ical-export
// RFC 5545 feed of real confirmed bookings + host blocks for a property.
// Empty calendar when nothing is blocked — never a sample event.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const url = new URL(req.url);
  const propertyId = url.searchParams.get("property_id") || "";
  if (!propertyId) {
    return new Response("Missing property_id", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const [{ data: bookings }, { data: blocks }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, check_in, check_out")
      .eq("property_id", propertyId)
      .in("status", ["confirmed", "completed"]),
    supabase.from("property_blocks").select("blocked_date").eq("property_id", propertyId),
  ]);

  const ics: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hilt Mountain Hospitality//Calendar Sync 1.0//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Hilt Property ${propertyId}`,
  ];
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  for (const b of bookings || []) {
    ics.push(
      "BEGIN:VEVENT",
      `UID:hilt_booking_${b.id}@hilt.travel`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${b.check_in.replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${b.check_out.replace(/-/g, "")}`,
      "SUMMARY:Reserved on Hilt",
      `DESCRIPTION:Hilt Booking ${b.id}`,
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  }

  for (const blk of blocks || []) {
    const d = blk.blocked_date.replace(/-/g, "");
    const next = new Date(new Date(blk.blocked_date).getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]
      .replace(/-/g, "");
    ics.push(
      "BEGIN:VEVENT",
      `UID:hilt_block_${propertyId}_${d}@hilt.travel`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d}`,
      `DTEND;VALUE=DATE:${next}`,
      "SUMMARY:Unavailable",
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  }

  ics.push("END:VCALENDAR");

  return new Response(ics.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="hilt_calendar_${propertyId}.ics"`,
      "Access-Control-Allow-Origin": "*",
    },
  });
});
