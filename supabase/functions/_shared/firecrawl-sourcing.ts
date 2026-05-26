// Firecrawl helpers for sourcing products (IndiaMART, JustDial, Google Maps, Meesho)
// Adapted from the India Data Explorer project's firecrawl.server.ts —
// shape changed from "lead" to "product".

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2";

export type SourceKey = "indiamart" | "justdial" | "gmaps" | "meesho" | "tradeindia";

export interface RawSourcedProduct {
  title?: string;
  description?: string;
  hero_image?: string;
  images?: string[];
  moq?: number;
  price_min?: number;
  price_max?: number;
  category?: string;
  rating?: number;
  reviews_count?: number;
  supplier_name?: string;
  supplier_city?: string;
  supplier_phone?: string;
  supplier_email?: string;
  supplier_website?: string;
  listing_url?: string;
  tags?: string[];
}

const productJsonSchema = {
  type: "object",
  properties: {
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Product name / listing title" },
          description: { type: "string", description: "Short product description" },
          hero_image: { type: "string", description: "Primary product image URL" },
          images: { type: "array", items: { type: "string" }, description: "Additional product image URLs" },
          moq: { type: "number", description: "Minimum order quantity (units)" },
          price_min: { type: "number", description: "Lowest price in INR (rupees, digits only)" },
          price_max: { type: "number", description: "Highest price in INR (rupees, digits only)" },
          category: { type: "string" },
          rating: { type: "number", description: "0-5" },
          reviews_count: { type: "number" },
          supplier_name: { type: "string", description: "Selling company / supplier name" },
          supplier_city: { type: "string" },
          supplier_phone: { type: "string", description: "Digits only" },
          supplier_email: { type: "string" },
          supplier_website: { type: "string" },
          listing_url: { type: "string", description: "URL of this product listing page" },
          tags: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
  required: ["products"],
};

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("-");
}

export function buildSourceUrl(source: SourceKey, query: string, city: string | null, page: number): string {
  const cityRaw = (city || "").trim();
  switch (source) {
    case "gmaps": {
      const q = encodeURIComponent(cityRaw ? `wholesale ${query} suppliers ${cityRaw}` : `wholesale ${query} suppliers India`);
      return `https://www.google.com/maps/search/${q}`;
    }
    case "justdial": {
      if (!cityRaw) {
        const base = `https://www.justdial.com/search?q=${encodeURIComponent("wholesale " + query)}`;
        return page > 1 ? `${base}&page=${page}` : base;
      }
      const citySlug = titleCase(cityRaw);
      const querySlug = titleCase("wholesale " + query);
      const base = `https://www.justdial.com/${citySlug}/${querySlug}`;
      return page > 1 ? `${base}/page-${page}` : base;
    }
    case "indiamart": {
      const ss = query.trim().replace(/\s+/g, "+");
      const cq = cityRaw.replace(/\s+/g, "+");
      const base = `https://dir.indiamart.com/search.mp?ss=${ss}${cq ? `&cq=${cq}` : ""}`;
      return page > 1 ? `${base}&start=${(page - 1) * 25}` : base;
    }
    case "meesho": {
      const ss = encodeURIComponent(query);
      return `https://supplier.meeshosupplychain.com/search?q=${ss}`;
    }
    case "tradeindia": {
      const ss = query.trim().replace(/\s+/g, "-");
      return `https://www.tradeindia.com/search.html?keyword=${encodeURIComponent(ss)}`;
    }
  }
}

function buildPrompt(opts: { limit: number; city: string | null; query: string }): string {
  const cityClause = opts.city
    ? ` Prefer suppliers in or shipping from "${opts.city}".`
    : "";
  return `Extract up to ${opts.limit} WHOLESALE product listings matching "${opts.query}".${cityClause} For each return: title, description, hero_image (primary product image URL), images (additional URLs), moq, price_min, price_max (in INR rupees, digits only — convert "₹120/piece" to 120), category, rating, reviews_count, supplier_name, supplier_city, supplier_phone (digits only), supplier_email, supplier_website, listing_url, tags. Skip ads, sponsored slots, and navigation items. Only real wholesale product listings visible on the page.`;
}

async function scrapeOnce(opts: {
  source: SourceKey;
  url: string;
  prompt: string;
  apiKey: string;
}): Promise<{ products: RawSourcedProduct[]; error?: string }> {
  const actions =
    opts.source === "justdial"
      ? [
          { type: "wait", milliseconds: 2000 },
          { type: "click", selector: "span.callNowAnchor, .callcontent, [data-track='Call']", all: true },
          { type: "wait", milliseconds: 1500 },
        ]
      : undefined;

  const body: Record<string, unknown> = {
    url: opts.url,
    formats: [{ type: "json", schema: productJsonSchema, prompt: opts.prompt }],
    onlyMainContent: true,
    waitFor: opts.source === "gmaps" ? 3000 : 1500,
    timeout: opts.source === "gmaps" ? 60000 : 45000,
  };
  if (actions) body.actions = actions;

  try {
    const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      return { products: [], error: `Firecrawl ${res.status}: ${text.slice(0, 300)}` };
    }
    const json = await res.json();
    const products = json?.data?.json?.products ?? [];
    return { products };
  } catch (err) {
    return { products: [], error: err instanceof Error ? err.message : "Unknown scrape error" };
  }
}

export async function scrapeProductsFromSource(opts: {
  source: SourceKey;
  query: string;
  city: string | null;
  limit: number;
}): Promise<{ products: RawSourcedProduct[]; sourceUrl: string; error?: string }> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not configured");

  const prompt = buildPrompt(opts);
  const firstUrl = buildSourceUrl(opts.source, opts.query, opts.city, 1);

  const all: RawSourcedProduct[] = [];
  const errors: string[] = [];
  const first = await scrapeOnce({ source: opts.source, url: firstUrl, prompt, apiKey });
  if (first.error) errors.push(first.error);
  all.push(...first.products);

  // Note: page-2 pagination removed to stay within edge function 150s budget.


  return {
    products: all.slice(0, opts.limit),
    sourceUrl: firstUrl,
    error: all.length === 0 && errors.length ? errors.join(" | ") : undefined,
  };
}

export function dedupeHashFor(source: string, title: string, phone?: string): string {
  const p = (phone || "").replace(/\D/g, "");
  if (p.length >= 7) return `${source}:phone:${p}:${title.slice(0, 30).toLowerCase()}`;
  return `${source}:title:${(title || "").trim().toLowerCase().slice(0, 80)}`;
}

export function maskPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return null;
  return digits.slice(0, 2) + "*".repeat(Math.max(0, digits.length - 4)) + digits.slice(-2);
}

export function scoreProduct(p: {
  rating?: number;
  reviews_count?: number;
  hero_image?: string;
  supplier_phone?: string;
  supplier_website?: string;
  price_min?: number;
}): number {
  let s = 0;
  if (p.hero_image) s += 20;
  if (p.supplier_phone && p.supplier_phone.replace(/\D/g, "").length >= 10) s += 20;
  if (p.supplier_website) s += 10;
  if (typeof p.rating === "number" && p.rating >= 4) s += 20;
  else if (typeof p.rating === "number" && p.rating >= 3) s += 10;
  if (typeof p.reviews_count === "number" && p.reviews_count >= 10) s += 15;
  if (typeof p.price_min === "number" && p.price_min > 0) s += 15;
  return Math.min(100, s);
}
