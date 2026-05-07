// Per-store robots.txt — accessible at /functions/v1/store-robots?slug=<store-slug>
// Returns plain-text robots directives + reference to the store's sitemap.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug") || url.pathname.split("/").pop() || "";
    const origin = url.searchParams.get("origin") || `${url.protocol}//${url.host}`;

    let allow = true;
    let storeSlug = slug;

    if (slug) {
      const { data } = await supabase
        .from("stores")
        .select("slug, is_published, settings")
        .eq("slug", slug)
        .maybeSingle();
      if (!data || !data.is_published) allow = false;
      if (data?.settings && (data.settings as any)?.seo?.noindex === true) allow = false;
      storeSlug = data?.slug || slug;
    }

    const lines = [
      "User-agent: *",
      allow ? "Allow: /" : "Disallow: /",
      `Sitemap: ${origin}/functions/v1/store-sitemap?slug=${encodeURIComponent(storeSlug)}&origin=${encodeURIComponent(origin)}`,
      "",
    ];

    return new Response(lines.join("\n"), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return new Response("User-agent: *\nDisallow:\n", {
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }
});
