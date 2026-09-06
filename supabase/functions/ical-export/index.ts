// Supabase Edge Function: ical-export
// Generates standard RFC 5545 iCalendar (.ics) feed of all confirmed bookings for a Hilt property,
// allowing Airbnb, MakeMyTrip, and Vrbo to pull real-time blocked dates.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://eccqfucljzppqomaiwgp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  const url = new URL(req.url);
  const propertyId = url.searchParams.get("property_id") || "default";

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("property_id", propertyId)
    .in("status", ["confirmed", "checked_in"]);

  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hilt Mountain Hospitality//Calendar Sync 1.0//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Hilt Property ${propertyId}`,
  ];

  if (bookings && bookings.length > 0) {
    for (const b of bookings) {
      const dtStart = b.check_in.replace(/-/g, "");
      const dtEnd = b.check_out.replace(/-/g, "");
      icsContent.push(
        "BEGIN:VEVENT",
        `UID:hilt_booking_${b.id}@hilt.travel`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `SUMMARY:Reserved on Hilt (2% Fair Platform)`,
        `DESCRIPTION:Hilt Booking Ref: ${b.id}`,
        "STATUS:CONFIRMED",
        "END:VEVENT"
      );
    }
  } else {
    // Add sample placeholder event so calendar clients validate format
    icsContent.push(
      "BEGIN:VEVENT",
      `UID:sample_blocked_date@hilt.travel`,
      `DTSTAMP:20260905T120000Z`,
      `DTSTART;VALUE=DATE:20260912`,
      `DTEND;VALUE=DATE:20260915`,
      `SUMMARY:Reserved on Hilt`,
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  }

  icsContent.push("END:VCALENDAR");

  return new Response(icsContent.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="hilt_calendar_${propertyId}.ics"`,
      "Access-Control-Allow-Origin": "*",
    },
  });
});
