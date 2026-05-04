// Public storefront bundle: single round-trip for store + theme + content + featured products + categories + recent blog
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let slug = url.searchParams.get('slug') || undefined;
    let host = url.searchParams.get('host') || undefined;

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      slug = slug || body.slug;
      host = host || body.host;
    }

    if (!slug && !host) {
      return new Response(JSON.stringify({ error: 'slug or host required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // Resolve store
    let storeQuery = supabase.from('stores').select('*').eq('is_published', true).limit(1);
    if (host) {
      const cleanHost = host.replace(/^www\./, '');
      storeQuery = supabase
        .from('stores')
        .select('*')
        .eq('is_published', true)
        .or(`custom_domain.eq.${cleanHost},custom_domain.eq.www.${cleanHost}`)
        .limit(1);
    } else if (slug) {
      storeQuery = supabase.from('stores').select('*').eq('is_published', true).eq('slug', slug).limit(1);
    }

    const { data: storeRows, error: storeErr } = await storeQuery;
    if (storeErr) throw storeErr;
    const store = storeRows?.[0];
    if (!store) {
      return new Response(JSON.stringify({ error: 'store not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const storeId = store.id as string;

    // Parallel fetch
    const [contentRes, productsRes, categoriesRes, blogRes, productsCountRes] = await Promise.all([
      supabase.from('store_content').select('section_key, content, updated_at').eq('store_id', storeId),
      supabase
        .from('products')
        .select('id, title, price, compare_at_price, images, slug:id, short_description, inventory_count')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(12),
      supabase.from('categories').select('id, name, parent_id, sort_order').eq('store_id', storeId).order('sort_order'),
      supabase
        .from('blog_posts')
        .select('id, title, slug, cover_image, thumbnail_image, seo_description, created_at')
        .eq('store_id', storeId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('store_id', storeId).eq('is_active', true),
    ]);

    const contentMap: Record<string, unknown> = {};
    let contentVersion = 0;
    for (const row of contentRes.data ?? []) {
      contentMap[row.section_key] = row.content;
      const ts = new Date(row.updated_at as string).getTime();
      if (ts > contentVersion) contentVersion = ts;
    }

    const theme = store.theme ?? {};
    const themeId = (theme as Record<string, unknown>).theme_id || (theme as Record<string, unknown>).name || 'minimal-light';

    const bundle = {
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        description: store.description,
        logo_url: store.logo_url,
        banner_url: store.banner_url,
        custom_domain: store.custom_domain,
        category: store.category,
        settings: store.settings,
      },
      theme: { theme_id: themeId, ...theme },
      content: contentMap,
      content_version: contentVersion,
      products: {
        featured: productsRes.data ?? [],
        all_count: productsCountRes.count ?? 0,
      },
      categories: categoriesRes.data ?? [],
      blog_recent: blogRes.data ?? [],
    };

    return new Response(JSON.stringify(bundle), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
