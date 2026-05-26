// sourcing-reveal-contact: charge 5 credits to unlock supplier contact (idempotent per store+supplier)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const storeId = String(body.store_id ?? "");
    const productId = String(body.product_id ?? "");
    if (!storeId || !productId) {
      return new Response(JSON.stringify({ error: "Missing store_id or product_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: store } = await supabaseAdmin
      .from("stores").select("id, user_id").eq("id", storeId).maybeSingle();
    if (!store || store.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: product } = await supabaseAdmin
      .from("sourcing_products")
      .select("id, supplier_id, supplier_name_cached, supplier_city_cached, supplier_phone_full, supplier_email_full")
      .eq("id", productId).maybeSingle();
    if (!product) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check idempotent unlock
    if (product.supplier_id) {
      const { data: existing } = await supabaseAdmin
        .from("merchant_supplier_unlocks")
        .select("id, credits_charged")
        .eq("store_id", storeId)
        .eq("supplier_id", product.supplier_id)
        .maybeSingle();
      if (existing) {
        // Already unlocked — return contact for free
        const { data: sup } = await supabaseAdmin
          .from("sourcing_suppliers")
          .select("id, company_name, contact_name, phone, whatsapp, email, website, city, address, gstin, gst_verified, rating, reviews_count")
          .eq("id", product.supplier_id).maybeSingle();
        return new Response(JSON.stringify({ ok: true, already_unlocked: true, supplier: sup }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Debit credits
    const { data: balance, error: chargeErr } = await supabaseAdmin
      .rpc("consume_credits", { _store_id: storeId, _action_key: "sourcing_reveal_contact", _cache_hit: false });
    if (chargeErr) {
      return new Response(JSON.stringify({ error: chargeErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (balance === -1) {
      return new Response(JSON.stringify({ error: "INSUFFICIENT_CREDITS" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record unlock
    if (product.supplier_id) {
      await supabaseAdmin.from("merchant_supplier_unlocks").insert({
        store_id: storeId,
        user_id: user.id,
        supplier_id: product.supplier_id,
        product_id: productId,
        credits_charged: 5,
      });
    }

    const { data: sup } = product.supplier_id
      ? await supabaseAdmin
          .from("sourcing_suppliers")
          .select("id, company_name, contact_name, phone, whatsapp, email, website, city, address, gstin, gst_verified, rating, reviews_count")
          .eq("id", product.supplier_id).maybeSingle()
      : { data: null };

    return new Response(JSON.stringify({
      ok: true,
      balance,
      supplier: sup ?? {
        company_name: product.supplier_name_cached,
        city: product.supplier_city_cached,
        phone: product.supplier_phone_full,
        email: product.supplier_email_full,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
