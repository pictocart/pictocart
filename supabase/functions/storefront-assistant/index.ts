import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ChatMsg = { role: 'user' | 'assistant'; content: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { store_slug, messages } = await req.json() as { store_slug: string; messages: ChatMsg[] };
    if (!store_slug || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'store_slug and messages are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('Missing LOVABLE_API_KEY');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch store
    const { data: store, error: storeErr } = await supabase
      .from('stores')
      .select('id, name, slug, description, category, settings')
      .eq('slug', store_slug)
      .eq('is_published', true)
      .maybeSingle();
    if (storeErr) throw storeErr;
    if (!store) {
      return new Response(JSON.stringify({ error: 'Store not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pull a compact product catalog (top 60) to ground the assistant
    const { data: products } = await supabase
      .from('products')
      .select('id, title, price, compare_at_price, short_description, inventory_count, category, tags')
      .eq('store_id', store.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(60);

    const catalog = (products || []).map((p: any) => ({
      title: p.title,
      price: p.price,
      mrp: p.compare_at_price,
      desc: (p.short_description || '').slice(0, 140),
      stock: p.inventory_count,
      category: p.category,
      tags: p.tags,
      url: `/store/${store.slug}/product/${p.id}`,
    }));

    const systemPrompt = `You are the friendly shopping assistant for "${store.name}" — an online store${store.category ? ` in the ${store.category} category` : ''}.
${store.description ? `About the store: ${store.description}\n` : ''}
Your job:
- Help customers find the right products from THIS store's catalog.
- Recommend products by name and include the relative product URL exactly as provided so the storefront can link to them.
- Answer questions about price (in INR ₹), availability, sizing, materials, shipping, returns — in a warm, concise tone.
- If something isn't in the catalog, say so honestly and suggest the closest alternatives.
- Keep replies short (2–5 sentences) unless the customer asks for detail. Use markdown bullet lists when recommending multiple items.
- Never invent products, prices, or policies. If unsure, suggest contacting the store.

CATALOG (JSON, up to 60 most recent active products):
${JSON.stringify(catalog)}`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: 'Too many requests. Please try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${res.status} ${txt}`);
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content || 'Sorry, I could not generate a reply.';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('storefront-assistant error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
