// Per-store XML sitemap. Accessible at /functions/v1/store-sitemap?slug=<store-slug>&origin=<origin>
// Includes home, products, blog posts, and policy pages.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const urlNode = (loc: string, lastmod?: string, priority = "0.7") =>
  `  <url><loc>${xmlEscape(loc)}</loc>${lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : ""}<priority>${priority}</priority></url>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug") || "";
    const origin = url.searchParams.get("origin") || `${url.protocol}//${url.host}`;
    if (!slug) return new Response("slug required", { status: 400, headers: corsHeaders });

    const { data: store } = await supabase
      .from("stores")
      .select("id, slug, is_published, updated_at")
      .eq("slug", slug)
      .maybeSingle();
    if (!store || !store.is_published) {
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
        headers: { ...corsHeaders, "Content-Type": "application/xml" },
      });
    }

    const base = `${origin}/store/${slug}`;
    const urls: string[] = [];
    urls.push(urlNode(base, store.updated_at, "1.0"));
    urls.push(urlNode(`${base}/blog`, undefined, "0.6"));

    // Products
    const { data: products } = await supabase
      .from("products")
      .select("id, updated_at")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .limit(2000);
    (products || []).forEach((p: any) => urls.push(urlNode(`${base}/product/${p.id}`, p.updated_at, "0.8")));

    // Blog posts
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug, updated_at, status")
      .eq("store_id", store.id)
      .eq("status", "published")
      .limit(1000);
    (posts || []).forEach((p: any) => urls.push(urlNode(`${base}/blog/${p.slug}`, p.updated_at, "0.6")));

    // Policy pages
    ["privacy", "refund", "terms", "shipping"].forEach((p) => urls.push(urlNode(`${base}/policy/${p}`, undefined, "0.3")));

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=1800",
      },
    });
  } catch (e) {
    return new Response("error", { status: 500, headers: corsHeaders });
  }
});
