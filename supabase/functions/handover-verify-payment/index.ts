import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { token, password, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!token || !password || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error("Missing required fields");
    }
    if (String(password).length < 8) throw new Error("Password too short");

    const expected = createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (expected !== razorpay_signature) throw new Error("Invalid payment signature");

    const tokenHash = await sha256Hex(token);
    const { data: handover } = await admin
      .from("store_handovers")
      .select("id, store_id, plan, billing_cycle, client_email, accepted_at, expires_at, razorpay_order_id")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (!handover) throw new Error("Invalid invite");
    if (handover.accepted_at) throw new Error("Invite already used");
    if (handover.razorpay_order_id && handover.razorpay_order_id !== razorpay_order_id) {
      throw new Error("Payment order mismatch");
    }

    // Create/update auth user
    let userId: string | null = null;
    const { data: existing } = await admin.auth.admin.listUsers({ perPage: 200 });
    const found = existing?.users?.find((u: any) => u.email?.toLowerCase() === handover.client_email.toLowerCase());
    if (found) {
      userId = found.id;
      await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    } else {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: handover.client_email,
        password,
        email_confirm: true,
        user_metadata: { is_seller: true },
      });
      if (cErr) throw cErr;
      userId = created.user!.id;
    }

    await admin.from("store_handovers").update({
      razorpay_payment_id,
    }).eq("id", handover.id);

    const { error: tErr } = await admin.rpc("transfer_store_to_client", {
      _store_id: handover.store_id,
      _client_user_id: userId,
      _handover_id: handover.id,
      _plan: handover.plan,
      _billing_cycle: handover.billing_cycle || "annual",
    });
    if (tErr) throw tErr;

    const { data: store } = await admin.from("stores").select("slug").eq("id", handover.store_id).single();

    return new Response(JSON.stringify({
      success: true,
      email: handover.client_email,
      store_slug: store?.slug,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("handover-verify-payment error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
