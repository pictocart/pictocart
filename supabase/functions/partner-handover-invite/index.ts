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

    const { store_id, client_email, plan = "starter" } = await req.json();
    if (!store_id || !client_email) throw new Error("store_id and client_email required");
    if (!["starter", "growth"].includes(plan)) throw new Error("invalid plan");

    // Verify the caller is the partner that owns the store
    const { data: partner } = await admin.from("partners").select("id, name").eq("user_id", user.id).maybeSingle();
    if (!partner) throw new Error("Not a partner");

    const { data: store } = await admin.from("stores").select("id, name, owned_by_partner_id").eq("id", store_id).maybeSingle();
    if (!store || store.owned_by_partner_id !== partner.id) throw new Error("Store not owned by you");

    const rawToken = generateToken(32);
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const { error: insErr } = await admin.from("store_handovers").insert({
      store_id,
      partner_id: partner.id,
      client_email,
      plan,
      billing_cycle: "annual",
      token_hash: tokenHash,
      expires_at: expiresAt,
      status: "pending",
    });
    if (insErr) throw insErr;

    await admin.from("stores").update({ partner_handover_status: "pending" }).eq("id", store_id);

    const origin = req.headers.get("origin") || "https://pictocart.in";
    const acceptUrl = `${origin}/store-invite/accept?token=${rawToken}`;

    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "client-store-invite",
          recipientEmail: client_email,
          idempotencyKey: `store-handover-${store_id}-${Date.now()}`,
          templateData: {
            storeName: store.name,
            partnerName: partner.name,
            plan: plan.charAt(0).toUpperCase() + plan.slice(1),
            acceptUrl,
          },
        },
      });
    } catch (e) {
      console.error("send-transactional-email failed", e);
    }

    return new Response(JSON.stringify({ success: true, accept_url: acceptUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("partner-handover-invite error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
