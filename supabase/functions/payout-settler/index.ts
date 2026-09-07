// Supabase Edge Function: payout-settler
// Hourly: completes past trips, then moves REAL money via RazorpayX payouts.
// Retries transient failures (attempt_count); gives up after 5 tries.
// Skips unverified hosts and missing destinations — money never moves blind.
// Secrets: RAZORPAYX_KEY_ID, RAZORPAYX_KEY_SECRET (test keys work in test mode).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const KEY_ID = Deno.env.get("RAZORPAYX_KEY_ID") || Deno.env.get("RAZORPAY_KEY_ID") || "";
const KEY_SECRET = Deno.env.get("RAZORPAYX_KEY_SECRET") || Deno.env.get("RAZORPAY_KEY_SECRET") || "";
const MAX_ATTEMPTS = 5;

async function razorpayX(path: string, body: unknown) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${KEY_ID}:${KEY_SECRET}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error?.description || `RazorpayX ${path} failed (${res.status})`);
  }
  return data;
}

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    // 1. Trips whose checkout passed become completed.
    const { data: finished } = await supabase
      .from("bookings")
      .select("id")
      .eq("status", "confirmed")
      .lt("check_out", today);
    for (const b of finished || []) {
      await supabase.from("bookings").update({ status: "completed" }).eq("id", b.id);
    }

    // 2. Settle due payouts — only for host-confirmed or completed stays.
    const { data: due } = await supabase
      .from("host_payouts")
      .select("id, booking_id, host_id, gross_amount, net_payout, attempt_count, bookings!inner(status)")
      .eq("payout_status", "scheduled")
      .lte("scheduled_payout_date", now)
      .lt("attempt_count", MAX_ATTEMPTS);
    let settled = 0;
    const errors: string[] = [];
    const settledHosts = new Set<string>();

    for (const p of due || []) {
      const bookingStatus = (p.bookings as any)?.status;
      if (bookingStatus !== "confirmed" && bookingStatus !== "completed") continue;

      try {
        if (!KEY_ID || !KEY_SECRET) throw new Error("Payout provider not configured.");

        const { data: host } = await supabase
          .from("profiles")
          .select("full_name, email, phone, upi_vpa, bank_account_number, bank_ifsc, payout_method, is_identity_verified, pan_number, is_payout_verified")
          .eq("id", p.host_id)
          .single();
        if (!host) throw new Error("Host profile missing.");
        if (!host.is_identity_verified) throw new Error("Host identity not verified.");
        const destination =
          host.payout_method === "bank" ? host.bank_account_number : host.upi_vpa;
        if (!destination) throw new Error("No payout destination on file.");

        // TDS Section 194-O Calculation (Finance (No. 2) Act 2024, effective Oct 1, 2024):
        // 1. Without PAN: 5% under Section 206AA
        // 2. With PAN:
        //    - Resident individual/HUF with FY gross <= Rs 5,00,000: 0% TDS (s.194-O(2))
        //    - Cumulative FY gross > Rs 5,00,000: 0.1% TDS
        const pan = (host.pan_number || "").trim().toUpperCase();
        const hasValidPan = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);

        let tdsRate = 0.05; // 5% default without PAN
        if (hasValidPan) {
          const { data: fyGross } = await supabase.rpc("host_fy_gross", {
            p_host_id: p.host_id,
          });
          const totalGross = Number(fyGross || 0);
          if (totalGross <= 500000) {
            tdsRate = 0.0; // 0% exemption threshold
          } else {
            tdsRate = 0.001; // 0.1% standard rate
          }
        }

        const gross = p.gross_amount || p.net_payout;
        const tdsAmount = Math.round(gross * tdsRate);
        const actualNetPayout = Math.max(0, p.net_payout - tdsAmount);
        const payablePaise = Math.round(actualNetPayout * 100);

        if (payablePaise <= 0) {
          throw new Error("Payout amount after TDS deduction is zero.");
        }

        const contact = await razorpayX("/contacts", {
          name: (host.full_name || "Hilt Host").slice(0, 100),
          email: host.email || undefined,
          contact: host.phone || undefined,
          type: "vendor",
          reference_id: p.host_id,
        });

        const fundAccount =
          host.payout_method === "bank"
            ? await razorpayX("/fund_accounts", {
                contact_id: contact.id,
                account_type: "bank_account",
                bank_account: {
                  name: (host.full_name || "Hilt Host").slice(0, 100),
                  ifsc: host.bank_ifsc,
                  account_number: destination,
                },
              })
            : await razorpayX("/fund_accounts", {
                contact_id: contact.id,
                account_type: "vpa",
                vpa: { address: destination },
              });

        const sourceAccount = Deno.env.get("RAZORPAYX_ACCOUNT_NUMBER") || "";
        if (!sourceAccount) throw new Error("RazorpayX source account not configured.");

        const payout = await razorpayX("/payouts", {
          account_number: sourceAccount,
          fund_account_id: fundAccount.id,
          amount: payablePaise,
          currency: "INR",
          mode: host.payout_method === "bank" ? "NEFT" : "UPI",
          purpose: "payout",
          reference_id: p.booking_id,
          narration: `Hilt payout TDS ${(tdsRate * 100).toFixed(1)}%`,
        });

        await supabase
          .from("host_payouts")
          .update({
            payout_status: "completed",
            settled_at: now,
            razorpayx_payout_id: payout.id,
            payout_destination: destination,
            tds_amount: tdsAmount,
            tds_rate: tdsRate,
            last_error: null,
          })
          .eq("id", p.id);
        settled++;
        settledHosts.add(p.host_id);
      } catch (e) {
        const attempts = (p.attempt_count || 0) + 1;
        await supabase
          .from("host_payouts")
          .update({
            attempt_count: attempts,
            last_error: String((e as Error)?.message || e).slice(0, 300),
            ...(attempts >= MAX_ATTEMPTS ? { payout_status: "failed" } : {}),
          })
          .eq("id", p.id);
        errors.push(`${p.id}: ${String((e as Error)?.message || e).slice(0, 120)}`);
      }
    }

    // Notify paid hosts (fire-and-forget).
    let pushNotified = 0;
    try {
      const internalSecret = Deno.env.get("INTERNAL_NOTIFY_SECRET") || "";
      if (internalSecret && settledHosts.size > 0) {
        const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": internalSecret,
          },
          body: JSON.stringify({ action: "payouts_settled", host_ids: [...settledHosts] }),
        });
        const data = await res.json().catch(() => null);
        pushNotified = data?.notified ?? 0;
      }
    } catch (pushErr) {
      console.error("Payout push failed:", pushErr);
    }

    return new Response(
      JSON.stringify({
        completed_trips: (finished || []).length,
        settled_payouts: settled,
        push_notified: pushNotified,
        errors,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
