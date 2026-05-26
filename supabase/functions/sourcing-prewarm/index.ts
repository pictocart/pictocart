// sourcing-prewarm: pre-scrape ONE category and cache rows tagged with category_key.
// Designed to fit within 150s edge timeout by using a single source (indiamart) per call.
// Invoked by pg_cron (one row per category, staggered) or manually with a system secret.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  scrapeProductsFromSource,
  dedupeHashFor,
  maskPhone,
  scoreProduct,
} from "../_shared/firecrawl-sourcing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORY_QUERIES: Record<string, string> = {
  beauty: "beauty cosmetics personal care",
  home: "home decor",
  fashion: "fashion apparel clothing",
  kitchen: "kitchen utensils",
  festive: "festive pooja diya",
  tech: "mobile accessories",
  toys: "toys kids",
  wellness: "wellness ayurvedic",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const categoryKey = String(body.category_key ?? "");
    const source = (body.source as "indiamart" | "justdial") ?? "indiamart";
    const limit = Math.min(15, Number(body.limit ?? 12));

    if (!categoryKey || !CATEGORY_QUERIES[categoryKey]) {
      return new Response(JSON.stringify({ error: "Invalid or missing category_key" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const query = CATEGORY_QUERIES[categoryKey];
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { products, sourceUrl, error: scrapeErr } = await scrapeProductsFromSource({
      source, query, city: null, limit, timeoutMs: 110000,
    });

    let inserted = 0;
    const seen = new Set<string>();
    const insertErrors: string[] = [];
    for (const raw of products) {
      const title = (raw.title || "").trim();
      if (!title) continue;
      const hash = dedupeHashFor(source, title, raw.supplier_phone);
      if (seen.has(hash)) continue;
      seen.add(hash);

      let supplierId: string | null = null;
      if (raw.supplier_name) {
        const { data: existingSup } = await supabaseAdmin
          .from("sourcing_suppliers").select("id").eq("company_name", raw.supplier_name).maybeSingle();
        if (existingSup?.id) supplierId = existingSup.id;
        else {
          const { data: newSup, error: supErr } = await supabaseAdmin
            .from("sourcing_suppliers").insert({
              company_name: raw.supplier_name,
              city: raw.supplier_city ?? null,
              phone: raw.supplier_phone ?? null,
              email: raw.supplier_email ?? null,
              website: raw.supplier_website ?? null,
              status: "approved",
              source: "scraped",
              source_url: sourceUrl,
              rating: raw.rating ?? 0,
              categories: [categoryKey],
            }).select("id").single();
          if (supErr) insertErrors.push(`supplier: ${supErr.message}`);
          supplierId = newSup?.id ?? null;
        }
      }

      const score = scoreProduct(raw);
      const tagsArr = Array.from(new Set([...(raw.tags ?? []).filter((t) => typeof t === "string"), categoryKey]));
      const imagesArr = (raw.images ?? []).filter((i) => typeof i === "string");
      const row = {
        supplier_id: supplierId,
        source,
        source_url: sourceUrl,
        title,
        description: raw.description ?? null,
        category: categoryKey,
        tags: tagsArr,
        images: imagesArr,
        hero_image: raw.hero_image ?? (imagesArr[0] ?? null),
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

      // Manual upsert: partial unique index can't be referenced by ON CONFLICT
      const { data: existing } = await supabaseAdmin
        .from("sourcing_products").select("id").eq("dedupe_hash", hash).maybeSingle();
      if (existing?.id) {
        const { error: updErr } = await supabaseAdmin
          .from("sourcing_products").update(row).eq("id", existing.id);
        if (updErr) insertErrors.push(`update: ${updErr.message}`);
        else inserted++;
      } else {
        const { error: insErr } = await supabaseAdmin
          .from("sourcing_products").insert(row);
        if (insErr) insertErrors.push(`insert: ${insErr.message}`);
        else inserted++;
      }
    }

    return new Response(JSON.stringify({
      ok: true, category_key: categoryKey, scraped: products.length, inserted,
      scrape_error: scrapeErr ?? null,
      insert_errors: insertErrors.slice(0, 3),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
