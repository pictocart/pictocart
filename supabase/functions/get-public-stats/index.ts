// Public stats for the landing page — published stores, products, orders, themes.
// No auth required. Cached in-memory for 60s per warm instance.
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Stats = {
  stores_live: number;
  products_listed: number;
  orders_processed: number;
  themes_available: number;
  fetched_at: string;
};

let cache: { at: number; data: Stats } | null = null;
const TTL_MS = 60_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (cache && Date.now() - cache.at < TTL_MS) {
      return new Response(JSON.stringify(cache.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [stores, products, orders, themes] = await Promise.all([
      admin.from("stores").select("id", { count: "exact", head: true }).eq("is_published", true),
      admin.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
      admin.from("orders").select("id", { count: "exact", head: true }),
      admin.from("theme_master_projects").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);

    const data: Stats = {
      stores_live: stores.count ?? 0,
      products_listed: products.count ?? 0,
      orders_processed: orders.count ?? 0,
      themes_available: themes.count ?? 0,
      fetched_at: new Date().toISOString(),
    };
    cache = { at: Date.now(), data };

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
