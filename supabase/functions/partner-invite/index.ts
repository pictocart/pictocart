import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateToken(len = 32) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const body = await req.json();
    const {
      email, name, company_name, phone,
      partner_type = "freelancer",
      license_qty = 1,
      license_unit_price = 0,
      notes,
    } = body || {};

    if (!email || !name) throw new Error("email and name are required");
    if (!["agency", "freelancer", "intern"].includes(partner_type)) throw new Error("invalid partner_type");
    const qty = Math.max(1, parseInt(String(license_qty), 10));
    const unitPrice = partner_type === "intern" ? 0 : Math.max(0, Number(license_unit_price) || 0);
    const totalInr = qty * unitPrice;

    // 1) Upsert partner row (idempotent by email)
    let partnerId: string;
    const { data: existing } = await admin.from("partners").select("id").eq("email", email).maybeSingle();
    if (existing) {
      partnerId = existing.id;
      await admin.from("partners").update({
        name, company_name, phone, partner_type, notes,
        invited_by_admin: user.id,
      }).eq("id", partnerId);
    } else {
      // Need referral_code (legacy NOT NULL column). Generate via RPC if it exists, else random.
      let referral_code: string;
      try {
        const { data: code } = await admin.rpc("generate_referral_code");
        referral_code = code as string;
      } catch {
        referral_code = "PT" + Math.random().toString(36).slice(2, 9).toUpperCase();
      }
      const { data: created, error: cErr } = await admin.from("partners").insert({
        email, name, company_name, phone, partner_type, notes,
        invited_by_admin: user.id,
        invite_status: "pending",
        referral_code,
      }).select("id").single();
      if (cErr) throw cErr;
      partnerId = created.id;
    }

    // 2) Create license batch (trigger will generate license rows)
    const { error: bErr } = await admin.from("partner_license_batches").insert({
      partner_id: partnerId,
      qty,
      unit_price_inr: unitPrice,
      total_inr: totalInr,
      notes,
      issued_by: user.id,
    });
    if (bErr) throw bErr;

    // 3) Create invite token
    const rawToken = generateToken(32);
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: invErr } = await admin.from("partner_invites").insert({
      partner_id: partnerId,
      email,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: user.id,
    });
    if (invErr) throw invErr;

    // 4) Send branded email via existing transactional-email function
    const origin = req.headers.get("origin") || "https://pictocart.in";
    const acceptUrl = `${origin}/partner/accept?token=${rawToken}`;

    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "partner-invite",
          recipientEmail: email,
          idempotencyKey: `partner-invite-${partnerId}-${Date.now()}`,
          templateData: {
            partnerName: name,
            licenseCount: qty,
            acceptUrl,
            partnerType: partner_type,
          },
        },
      });
    } catch (e) {
      console.error("send-transactional-email failed", e);
      // do not fail the whole call — admin can resend
    }

    return new Response(JSON.stringify({
      success: true,
      partner_id: partnerId,
      accept_url: acceptUrl,
      licenses_issued: qty,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("partner-invite error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
