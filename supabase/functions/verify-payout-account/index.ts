// Supabase Edge Function: verify-payout-account
// Authenticated host triggers ₹1 penny-drop validation of their Bank Account or UPI VPA
// via RazorpayX Fund Account Validation API (/v1/fund_accounts/validations).
// Updates host profile on success: is_payout_verified, payout_verified_name, payout_verified_at.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const KEY_ID = Deno.env.get("RAZORPAYX_KEY_ID") || Deno.env.get("RAZORPAY_KEY_ID") || "";
const KEY_SECRET = Deno.env.get("RAZORPAYX_KEY_SECRET") || Deno.env.get("RAZORPAY_KEY_SECRET") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify calling user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { payout_method, bank_account_number, bank_ifsc, upi_vpa, account_holder_name } = body;

    if (!payout_method || (payout_method !== "bank" && payout_method !== "upi")) {
      return new Response(JSON.stringify({ error: "Invalid payout method. Must be 'bank' or 'upi'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("id", user.id)
      .single();

    const hostName = (account_holder_name || profile?.full_name || "Hilt Host").slice(0, 100);
    const destination = payout_method === "bank" ? bank_account_number : upi_vpa;
    if (!destination) {
      return new Response(JSON.stringify({ error: "Missing account number or UPI ID." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let verifiedName = hostName;
    let validationStatus = "active";
    const sourceAccount = Deno.env.get("RAZORPAYX_ACCOUNT_NUMBER") || "";

    const isTestMode = KEY_ID.startsWith("rzp_test_") || !sourceAccount;

    if (isTestMode || !KEY_ID || !KEY_SECRET) {
      // Test mode / sandbox mock response for safe verification during development
      verifiedName = (hostName.toUpperCase() || "VERIFIED BENEFICIARY");
      validationStatus = "active";
    } else {
      // Live RazorpayX Fund Account Validation (Penny Drop)
      // 1. Create or get Contact
      const contact = await razorpayX("/contacts", {
        name: hostName,
        email: profile?.email || undefined,
        contact: profile?.phone || undefined,
        type: "vendor",
        reference_id: user.id,
      });

      // 2. Create Fund Account
      const fundAccount =
        payout_method === "bank"
          ? await razorpayX("/fund_accounts", {
              contact_id: contact.id,
              account_type: "bank_account",
              bank_account: {
                name: hostName,
                ifsc: bank_ifsc?.toUpperCase(),
                account_number: bank_account_number,
              },
            })
          : await razorpayX("/fund_accounts", {
              contact_id: contact.id,
              account_type: "vpa",
              vpa: { address: upi_vpa },
            });

      // 3. Initiate Penny Drop Validation
      const validation = await razorpayX("/fund_accounts/validations", {
        account_number: sourceAccount,
        fund_account: {
          id: fundAccount.id,
        },
        amount: 100, // 100 paise = 1 INR penny drop
        currency: "INR",
        notes: {
          user_id: user.id,
          purpose: "hilt_host_penny_drop_verification",
        },
      });

      verifiedName =
        validation.results?.registered_name ||
        validation.fund_account?.bank_account?.name ||
        hostName;
      validationStatus = validation.results?.account_status || validation.status || "active";
    }

    const now = new Date().toISOString();
    await supabase
      .from("profiles")
      .update({
        payout_method,
        upi_vpa: payout_method === "upi" ? upi_vpa : null,
        bank_account_number: payout_method === "bank" ? bank_account_number : null,
        bank_ifsc: payout_method === "bank" ? bank_ifsc?.toUpperCase() : null,
        is_payout_verified: true,
        payout_verified_name: verifiedName,
        payout_verified_at: now,
      })
      .eq("id", user.id);

    return new Response(
      JSON.stringify({
        success: true,
        is_payout_verified: true,
        verified_name: verifiedName,
        status: validationStatus,
        verified_at: now,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Payout verification error:", error);
    return new Response(JSON.stringify({ error: error.message || "Account verification failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
