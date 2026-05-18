// Merchant Help Assistant — diagnoses store status and guides the seller.
// Uses Lovable AI Gateway (Gemini) and persists messages to merchant_chat_* tables.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ChatMsg = { role: 'user' | 'assistant'; content: string };

interface ReqBody {
  thread_id?: string | null;
  message: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('Missing LOVABLE_API_KEY');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // user-scoped client to validate the JWT
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: uerr } = await userClient.auth.getUser();
    if (uerr || !userData?.user?.id) return json({ error: 'Unauthorized' }, 401);
    const userId = userData.user.id;

    const body = (await req.json()) as ReqBody;
    if (!body?.message || body.message.length > 4000) {
      return json({ error: 'message is required (<=4000 chars)' }, 400);
    }

    // service client for trusted ops
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Resolve or create thread (RLS via user_id check)
    let threadId = body.thread_id || null;
    if (threadId) {
      const { data: t } = await admin
        .from('merchant_chat_threads')
        .select('id, user_id')
        .eq('id', threadId)
        .maybeSingle();
      if (!t || t.user_id !== userId) return json({ error: 'Thread not found' }, 404);
    } else {
      const title = body.message.slice(0, 60);
      const { data: nt, error: nerr } = await admin
        .from('merchant_chat_threads')
        .insert({ user_id: userId, title })
        .select('id')
        .single();
      if (nerr) throw nerr;
      threadId = nt.id;
    }

    // Persist the user message
    await admin.from('merchant_chat_messages').insert({
      thread_id: threadId,
      role: 'user',
      content: body.message,
    });

    // Build merchant context snapshot
    const ctx = await loadMerchantContext(admin, userId);

    // Pull last 20 messages for memory
    const { data: history } = await admin
      .from('merchant_chat_messages')
      .select('role, content')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(20);

    const messages: ChatMsg[] = (history || [])
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .map((m: any) => ({ role: m.role, content: m.content }));

    const systemPrompt = buildSystemPrompt(ctx);

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 429) return json({ error: 'Rate limited. Try again in a moment.' }, 429);
      if (res.status === 402) return json({ error: 'AI credits exhausted. Please add credits.' }, 402);
      throw new Error(`AI gateway: ${res.status} ${txt}`);
    }
    const data = await res.json();
    const reply: string = data?.choices?.[0]?.message?.content?.trim() || '(no reply)';

    // Persist assistant message + bump thread
    await admin.from('merchant_chat_messages').insert({
      thread_id: threadId,
      role: 'assistant',
      content: reply,
    });
    await admin
      .from('merchant_chat_threads')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', threadId);

    return json({ ok: true, thread_id: threadId, reply });
  } catch (err: any) {
    console.error('[merchant-assistant]', err);
    return json({ error: err?.message || 'Internal error' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ----------------- Context loaders -----------------
async function loadMerchantContext(admin: any, userId: string) {
  const { data: store } = await admin
    .from('stores')
    .select('id, name, slug, category, description, is_published, logo_url, settings, onboarding_step, custom_domain, theme, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!store) return { store: null };

  const sid = store.id;
  const [products, orders, wallet, sub] = await Promise.all([
    admin.from('products').select('id, title, price, inventory_count, is_active, images, short_description', { count: 'exact' }).eq('store_id', sid).limit(200),
    admin.from('orders').select('id, status, payment_status, total, created_at, tracking_number', { count: 'exact' }).eq('store_id', sid).order('created_at', { ascending: false }).limit(50),
    admin.from('ai_credit_wallets').select('balance, lifetime_used, low_balance_notified_at').eq('store_id', sid).maybeSingle(),
    admin.from('subscriptions').select('plan, status, current_period_end').eq('store_id', sid).maybeSingle(),
  ]);

  const allProducts = (products.data || []) as any[];
  const allOrders = (orders.data || []) as any[];
  const productSummary = {
    total: products.count ?? allProducts.length,
    active: allProducts.filter((p) => p.is_active).length,
    out_of_stock: allProducts.filter((p) => (p.inventory_count ?? 0) <= 0).length,
    missing_description: allProducts.filter((p) => !p.short_description).length,
    missing_image: allProducts.filter((p) => !p.images || p.images.length === 0).length,
  };
  const orderSummary = {
    total: orders.count ?? allOrders.length,
    pending: allOrders.filter((o) => o.status === 'pending' || o.status === 'placed').length,
    paid: allOrders.filter((o) => o.payment_status === 'paid').length,
    unshipped: allOrders.filter((o) => !o.tracking_number && o.payment_status === 'paid').length,
    last_30d_revenue: allOrders
      .filter((o) => o.payment_status === 'paid' && Date.now() - new Date(o.created_at).getTime() < 30 * 86400000)
      .reduce((s, o) => s + Number(o.total || 0), 0),
  };

  const settings = (store.settings || {}) as any;
  const payments = {
    razorpay_configured: !!(settings.razorpay_key_id || settings.payment?.razorpay_key_id),
    cod_enabled: !!(settings.cod_enabled ?? settings.payment?.cod_enabled),
  };

  return {
    store: {
      name: store.name,
      slug: store.slug,
      category: store.category,
      description: store.description,
      is_published: store.is_published,
      onboarding_step: store.onboarding_step,
      onboarding_completed: (store.onboarding_step ?? 0) >= 7,
      has_logo: !!store.logo_url,
      theme: store.theme,
      custom_domain: store.custom_domain,
      created_at: store.created_at,
    },
    products: productSummary,
    orders: orderSummary,
    wallet: wallet?.data ?? null,
    subscription: sub?.data ?? null,
    payments,
  };
}

function buildSystemPrompt(ctx: any): string {
  if (!ctx.store) {
    return `You are PicToCart's merchant support assistant. This user has not finished creating a store yet. Warmly guide them to complete the 7-step onboarding wizard at /onboarding (Store name → Category → Logo → AI Product → Theme → Payment Setup → Go Live). Keep replies under 5 sentences. Use markdown bullets when listing steps. Always answer in the language the user writes in (English or Hindi).`;
  }

  return `You are PicToCart's **Merchant Help Assistant**. You help Indian small-business sellers diagnose and fix problems with their store.

## Your style
- Warm, concise, action-oriented. 2–6 sentences unless asked for detail.
- Use markdown: short bullets, **bold** for actions, inline links like [Payment Settings](/payment-settings).
- Answer in the language the user writes (English or Hindi/Hinglish).
- If something is broken, name the **exact dashboard page** to fix it.

## How to guide
1. **Diagnose first** using the merchant snapshot below. Call out the most impactful issue.
2. **Give the fix** as a numbered list with the exact dashboard route.
3. **Confirm** by asking if the issue is resolved or if they need the next step.

## Key dashboard routes
- /onboarding — finish initial setup
- /products, /products/new — add/edit products
- /orders — manage orders, generate AWB labels
- /payment-settings — Razorpay keys, COD toggle
- /shipping-settings — Delhivery, weight defaults
- /domain-settings — connect a custom domain (A record → 185.158.133.1, TXT verification)
- /store-design — themes, header, footer, sections
- /wallet — recharge AI/shipping credits
- /billing — change subscription plan (Starter / Growth / Pro)
- /email-branding — custom sender, logo
- /seo-settings — meta title/description, OG image
- /coupons, /blog-posts, /reviews, /returns
- WhatsApp support: +91 98101 89606 (https://wa.me/919810189606)

## Common diagnoses to look for in the snapshot
- onboarding_completed=false → push them to finish /onboarding.
- is_published=false → tell them to publish from /store-design or finish onboarding.
- payments.razorpay_configured=false AND payments.cod_enabled=false → no way to accept money. Send to /payment-settings.
- products.total=0 → no catalog. Send to /products/new (mention AI product creation).
- products.missing_image>0 or missing_description>0 → suggest /products to fix.
- orders.unshipped>0 → guide to /orders to generate Delhivery AWB.
- wallet.balance<100 → suggest /wallet recharge so shipping/AI doesn't fail.
- domain.status!='active' → guide to /domain-settings DNS records.
- subscription.plan='free' AND they ask about premium themes/custom domain/blog → suggest upgrading via /billing.

## Merchant snapshot (JSON)
${JSON.stringify(ctx, null, 2)}

Always cite the snapshot when answering, and never invent numbers that aren't there. If data is missing, say so and ask the merchant to confirm.`;
}
