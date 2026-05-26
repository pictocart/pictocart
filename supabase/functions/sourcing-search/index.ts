// sourcing-search: scrape supplier products from IndiaMART / JustDial / Google Maps via Firecrawl
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  scrapeProductsFromSource,
  dedupeHashFor,
  maskPhone,
  scoreProduct,
  type SourceKey,
} from "../_shared/firecrawl-sourcing.ts";

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
    const query = String(body.query ?? "").trim();
    const city = body.city ? String(body.city).trim() : null;
    const storeId = String(body.store_id ?? "");
    const sources: SourceKey[] = Array.isArray(body.sources) && body.sources.length > 0
      ? body.sources
      : ["indiamart", "justdial"];
    const limitPerSource = Math.min(20, Number(body.limit ?? 10));

    if (!query || !storeId) {
      return new Response(JSON.stringify({ error: "Missing query or store_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify store ownership
    const { data: store } = await supabaseAdmin
      .from("stores").select("id, user_id").eq("id", storeId).maybeSingle();
    if (!store || store.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Debit credits
    const { data: chargedBalance, error: chargeErr } = await supabaseAdmin
      .rpc("consume_credits", { _store_id: storeId, _action_key: "sourcing_search", _cache_hit: false });
    if (chargeErr) {
      return new Response(JSON.stringify({ error: chargeErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (chargedBalance === -1) {
      return new Response(JSON.stringify({ error: "INSUFFICIENT_CREDITS", balance: 0 }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Scrape in parallel
    const results = await Promise.all(
      sources.map(async (source) => {
        try {
          return { source, ...(await scrapeProductsFromSource({ source, query, city, limit: limitPerSource })) };
        } catch (err) {
          return { source, products: [], sourceUrl: "", error: err instanceof Error ? err.message : String(err) };
        }
      })
    );

    // Flatten + upsert
    const inserted: any[] = [];
    const seen = new Set<string>();
    for (const r of results) {
      for (const raw of r.products) {
        const title = (raw.title || "").trim();
        if (!title) continue;
        const hash = dedupeHashFor(r.source, title, raw.supplier_phone);
        if (seen.has(hash)) continue;
        seen.add(hash);

        // Upsert sourcing_supplier if we have a name
        let supplierId: string | null = null;
        if (raw.supplier_name) {
          const { data: existingSup } = await supabaseAdmin
            .from("sourcing_suppliers").select("id").eq("company_name", raw.supplier_name).maybeSingle();
          if (existingSup?.id) {
            supplierId = existingSup.id;
          } else {
            const { data: newSup } = await supabaseAdmin
              .from("sourcing_suppliers").insert({
                company_name: raw.supplier_name,
                city: raw.supplier_city ?? null,
                phone: raw.supplier_phone ?? null,
                email: raw.supplier_email ?? null,
                website: raw.supplier_website ?? null,
                status: "approved", // scraped & visible by default
                source: "scraped",
                source_url: r.sourceUrl,
                rating: raw.rating ?? 0,
                categories: raw.category ? [raw.category] : [],
              }).select("id").single();
            supplierId = newSup?.id ?? null;
          }
        }

        const score = scoreProduct(raw);
        const rowData = {
          supplier_id: supplierId,
          source: r.source,
          source_url: r.sourceUrl,
          title,
          description: raw.description ?? null,
          category: raw.category ?? query,
          tags: raw.tags ?? [query],
          images: raw.images ?? [],
          hero_image: raw.hero_image ?? (raw.images?.[0] ?? null),
          moq: raw.moq ?? null,
          price_min: raw.price_min ?? null,
          price_max: raw.price_max ?? null,
          supplier_name_cached: raw.supplier_name ?? null,
          supplier_city_cached: raw.supplier_city ?? null,
          supplier_phone_masked: maskPhone(raw.supplier_phone),
          supplier_phone_full: raw.supplier_phone ?? null,
          supplier_email_full: raw.supplier_email ?? null,
          rating: raw.rating ?? null,
          reviews_count: raw.reviews_count ?? null,
          ai_score: score,
          raw_json: raw as any,
          dedupe_hash: hash,
          is_active: true,
        };
        const selectCols = "id, supplier_id, source, title, description, category, hero_image, images, moq, price_min, price_max, currency, supplier_name_cached, supplier_city_cached, supplier_phone_masked, rating, reviews_count, ai_score";
        const { data: existingProd } = await supabaseAdmin
          .from("sourcing_products").select("id").eq("dedupe_hash", hash).maybeSingle();
        let row: any = null;
        if (existingProd?.id) {
          const { data } = await supabaseAdmin
            .from("sourcing_products").update(rowData).eq("id", existingProd.id).select(selectCols).single();
          row = data;
        } else {
          const { data } = await supabaseAdmin
            .from("sourcing_products").insert(rowData).select(selectCols).single();
          row = data;
        }
        if (row) inserted.push(row);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      balance: chargedBalance,
      count: inserted.length,
      products: inserted,
      source_errors: results.filter((r) => r.error).map((r) => ({ source: r.source, error: r.error })),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
