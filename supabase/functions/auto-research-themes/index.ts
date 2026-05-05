import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const SCHEMA = {
  type: "object",
  properties: {
    palette: { type: "array", items: { type: "string" } },
    fonts: { type: "array", items: { type: "string" } },
    section_order: { type: "array", items: { type: "string" } },
    hero_style: { type: "string" },
    copy_motifs: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
  },
};

const SEED_URLS = [
  "https://themes.shopify.com/themes/dawn",
  "https://themes.shopify.com/themes/sense",
  "https://themes.shopify.com/themes/origin",
  "https://themes.shopify.com/themes/refresh",
  "https://themes.shopify.com/themes/studio",
  "https://themes.shopify.com/themes/colorblock",
  "https://www.awwwards.com/websites/e-commerce/",
  "https://land-book.com/?category=ecommerce",
  "https://www.siteinspire.com/websites?categories=15",
  "https://onepagelove.com/category/store",
];

async function firecrawlSearch(query: string, limit = 10): Promise<string[]> {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) return [];
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit }),
    });
    if (!r.ok) { console.error("firecrawl search", r.status, await r.text()); return []; }
    const data = await r.json();
    const items = data?.data ?? data?.web?.results ?? data?.results?.web ?? [];
    return items.map((x: any) => x.url).filter(Boolean);
  } catch (e) { console.error("firecrawl search error", e); return []; }
}

async function scrape(url: string) {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) throw new Error("FIRECRAWL_API_KEY missing");
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["branding", { type: "json", schema: SCHEMA, prompt: "Extract e-commerce theme design system." }, "summary"], onlyMainContent: true }),
  });
  if (!res.ok) throw new Error(`Firecrawl ${res.status}: ${await res.text()}`);
  return await res.json();
}

async function processOne(url: string, category: string) {
  const { data: existing } = await supabase.from("theme_research_corpus").select("id").eq("source_url", url).gte("scraped_at", new Date(Date.now() - 7 * 86400_000).toISOString()).maybeSingle();
  if (existing) { await supabase.from("theme_research_corpus").update({ reuse_count: 1 }).eq("id", existing.id); return { url, status: "reused" }; }
  const fc = await scrape(url);
  const branding = fc.branding ?? fc.data?.branding;
  const d = fc.json ?? fc.data?.json ?? {};
  const palette = (d.palette && d.palette.length ? d.palette : [branding?.colors?.primary, branding?.colors?.secondary, branding?.colors?.accent, branding?.colors?.background].filter(Boolean));
  const fonts = (d.fonts && d.fonts.length ? d.fonts : (branding?.fonts ?? []).map((f: any) => f.family));
  const host = (() => { try { return new URL(url).host; } catch { return url; } })();
  await supabase.from("theme_research_corpus").insert({
    source_url: url, source_site: host, category,
    insights: { ...d, branding_summary: fc.summary ?? fc.data?.summary }, palette, fonts,
    section_order: d.section_order ?? null, hero_style: d.hero_style ?? null, copy_motifs: d.copy_motifs ?? null,
  });
  return { url, status: "scraped" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const query: string | undefined = body.query?.trim();
    const category: string = body.category ?? "general";
    const limit: number = Math.max(3, Math.min(15, Number(body.limit ?? 8)));
    const jobId: string | undefined = body.job_id;

    const queries = query
      ? [query, `${query} site:themes.shopify.com`, `${query} site:awwwards.com`]
      : ["best ecommerce theme inspiration 2026", "luxury ecommerce website design", "minimalist shopify theme showcase", "indian ecommerce store design inspiration"];
    const found = new Set<string>();
    for (const q of queries) {
      for (const u of await firecrawlSearch(q, Math.ceil(limit / queries.length) + 2)) {
        if (!u.startsWith("http")) continue;
        if (u.includes("/login") || u.includes("/signup")) continue;
        found.add(u);
      }
    }
    SEED_URLS.forEach((u) => found.add(u));
    const urls = Array.from(found).slice(0, limit);

    if (jobId) await supabase.from("research_jobs").update({ status: "running", total: urls.length, found_urls: urls, query: query ?? null }).eq("id", jobId);

    const results: any[] = [];
    for (let i = 0; i < urls.length; i++) {
      try { results.push(await processOne(urls[i], category)); }
      catch (e) { results.push({ url: urls[i], status: "error", error: e instanceof Error ? e.message : String(e) }); }
      if (jobId) await supabase.from("research_jobs").update({ completed: i + 1, results }).eq("id", jobId);
    }
    if (jobId) await supabase.from("research_jobs").update({ status: "completed", finished_at: new Date().toISOString() }).eq("id", jobId);
    await supabase.from("theme_settings").update({ last_research_at: new Date().toISOString() }).eq("id", 1);
    return json({ ok: true, urls, results });
  } catch (e) {
    if (req.method === "POST") {
      try { const b = await req.clone().json(); if (b.job_id) await supabase.from("research_jobs").update({ status: "failed", error: e instanceof Error ? e.message : String(e), finished_at: new Date().toISOString() }).eq("id", b.job_id); } catch {}
    }
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
