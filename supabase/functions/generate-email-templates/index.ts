import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { store_id } = await req.json();
    if (!store_id) {
      return new Response(JSON.stringify({ error: 'store_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch store details
    const { data: store, error: storeErr } = await supabase
      .from('stores')
      .select('name, logo_url, category, theme, description')
      .eq('id', store_id)
      .single();

    if (storeErr || !store) {
      return new Response(JSON.stringify({ error: 'Store not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const theme = (store.theme as any) || {};
    const primaryColor = theme.primary_color || '#F97316';
    const storeName = store.name || 'My Store';
    const logoUrl = store.logo_url || '';
    const category = store.category || 'general';

    const prompt = `You are an expert email template designer. Generate 5 professional, branded HTML email templates for an e-commerce store.

STORE DETAILS:
- Store Name: ${storeName}
- Category: ${category}
- Primary Brand Color: ${primaryColor}
- Logo URL: ${logoUrl}
- Description: ${store.description || 'An online store'}

REQUIREMENTS:
1. Each template must be complete, inline-styled HTML (no external CSS)
2. Use the store's primary color (${primaryColor}) as the accent color
3. Include the store logo (${logoUrl}) in the header if available — use <img src="${logoUrl}" alt="${storeName}" style="max-height:60px;"> 
4. Store name must appear prominently in header
5. ZERO mention of any platform, technology, or third-party service
6. Professional, mobile-responsive design using table-based layout
7. Use these exact placeholders for dynamic data:
   - {{customer_name}} — customer's name
   - {{order_number}} — order ID
   - {{items_table}} — HTML table of ordered items (will be injected)
   - {{total}} — order total formatted with ₹
   - {{tracking_number}} — shipment tracking number
   - {{store_name}} — store name
   - {{payment_method}} — payment method used
   - {{customer_email}} — customer email
   - {{customer_phone}} — customer phone

Generate exactly these 5 templates:

1. order_confirmed — Sent when order is placed. Show order items, total, "being processed" message.
2. order_shipped — Sent when shipped. Show tracking number prominently, estimated delivery message.
3. order_delivered — Sent when delivered. Thank customer, encourage them to leave a review.
4. new_order_seller — Sent TO the seller. Show customer details, items, payment method. Business-focused.
5. welcome_customer — Sent on first purchase. Welcome message, store intro, encourage browsing.

Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "order_confirmed": { "subject": "...", "html": "..." },
  "order_shipped": { "subject": "...", "html": "..." },
  "order_delivered": { "subject": "...", "html": "..." },
  "new_order_seller": { "subject": "...", "html": "..." },
  "welcome_customer": { "subject": "...", "html": "..." }
}`;

    const aiRes = await fetch(AI_GATEWAY, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a professional email template designer. Return only valid JSON, no markdown fences.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('AI gateway error:', aiRes.status, errText);
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || '';
    
    // Clean markdown fences if present
    content = content.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim();
    
    let templates: any;
    try {
      templates = JSON.parse(content);
    } catch {
      console.error('Failed to parse AI response:', content.substring(0, 500));
      return new Response(JSON.stringify({ error: 'Failed to parse generated templates' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate required keys
    const requiredKeys = ['order_confirmed', 'order_shipped', 'order_delivered', 'new_order_seller', 'welcome_customer'];
    for (const key of requiredKeys) {
      if (!templates[key]?.html || !templates[key]?.subject) {
        return new Response(JSON.stringify({ error: `Missing template: ${key}` }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Upsert into store_email_templates
    const { error: upsertErr } = await supabase
      .from('store_email_templates')
      .upsert({
        store_id,
        templates,
        generated_at: new Date().toISOString(),
      }, { onConflict: 'store_id' });

    if (upsertErr) {
      console.error('Upsert error:', upsertErr);
      return new Response(JSON.stringify({ error: 'Failed to save templates' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, templates }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Generate templates error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
