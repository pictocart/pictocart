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
  language?: string; // BCP-47 like "hi-IN"
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const SARVAM_API_KEY = Deno.env.get('SARVAM_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!SARVAM_API_KEY && !LOVABLE_API_KEY) throw new Error('Missing SARVAM_API_KEY / LOVABLE_API_KEY');

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

    const systemPrompt = buildSystemPrompt(ctx, body.language);

    // Primary: Sarvam (multilingual, India-first). Fallback: Lovable AI Gateway.
    const useSarvam = !!SARVAM_API_KEY;
    const endpoint = useSarvam
      ? 'https://api.sarvam.ai/v1/chat/completions'
      : 'https://ai.gateway.lovable.dev/v1/chat/completions';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (useSarvam) {
      headers['api-subscription-key'] = SARVAM_API_KEY!;
      headers['Authorization'] = `Bearer ${SARVAM_API_KEY}`;
    } else {
      headers['Authorization'] = `Bearer ${LOVABLE_API_KEY}`;
    }
    const modelName = useSarvam ? 'sarvam-m' : 'google/gemini-3-flash-preview';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelName,
        temperature: 0.5,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('[merchant-assistant] AI error', res.status, txt);
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
  const isFoodService = ['food', 'grocery'].includes((store.category || '').toLowerCase());
  const orderSummary = {
    total: orders.count ?? allOrders.length,
    pending: allOrders.filter((o) => o.status === 'pending' || o.status === 'placed').length,
    paid: allOrders.filter((o) => o.payment_status === 'paid').length,
    // For food/cafe stores, "unshipped" doesn't apply — orders are served in-house.
    unshipped: isFoodService
      ? 0
      : allOrders.filter((o) => !o.tracking_number && o.payment_status === 'paid' && !['delivered', 'cancelled', 'returned'].includes(o.status)).length,
    unfulfilled_dinein: isFoodService
      ? allOrders.filter((o) => !['delivered', 'cancelled', 'returned'].includes(o.status)).length
      : 0,
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

const LANG_LABEL: Record<string, string> = {
  'hi-IN': 'Hindi (हिन्दी, Devanagari script)',
  'en-IN': 'English',
  'bn-IN': 'Bengali (বাংলা)',
  'ta-IN': 'Tamil (தமிழ்)',
  'te-IN': 'Telugu (తెలుగు)',
  'mr-IN': 'Marathi (मराठी)',
  'gu-IN': 'Gujarati (ગુજરાતી)',
  'kn-IN': 'Kannada (ಕನ್ನಡ)',
  'ml-IN': 'Malayalam (മലയാളം)',
  'pa-IN': 'Punjabi (ਪੰਜਾਬੀ, Gurmukhi)',
  'od-IN': 'Odia (ଓଡ଼ିଆ)',
};

function buildSystemPrompt(ctx: any, language?: string): string {
  const langInstr = language && LANG_LABEL[language]
    ? `\n\n**Preferred language:** Reply in ${LANG_LABEL[language]} unless the merchant clearly writes in another language. Keep dashboard route names like /payment-settings in English.`
    : '';
  if (!ctx.store) {
    return `You are PicToCart's merchant support assistant. This user has not finished creating a store yet. Warmly guide them to complete the 7-step onboarding wizard at /onboarding (Store name → Category → Logo → AI Product → Theme → Payment Setup → Go Live). Keep replies under 5 sentences. Use markdown bullets when listing steps. ALWAYS reply in the same language and script the merchant writes in — fully supports English, हिन्दी, Hinglish, বাংলা, தமிழ், తెలుగు, मराठी, ગુજરાતી, ಕನ್ನಡ, മലയാളം, ਪੰਜਾਬੀ, ଓଡ଼ିଆ, and اردو. Keep route names like /onboarding in English.${langInstr}`;
  }

  const isFoodService = ['food', 'grocery'].includes((ctx.store.category || '').toLowerCase());
  const businessModeBlock = isFoodService
    ? `## Business mode: FOOD / CAFE / RESTAURANT (dine-in / pay-at-counter)
This merchant runs a food-service business (category="${ctx.store.category}"). Treat orders as **in-house / counter / table orders**, NOT shipped e-commerce orders.
- **Never** tell them to "ship" orders, generate AWB labels, or use Shiprocket / shipping settings.
- COD here means **"Pay at Counter"** — they can rename the label in checkout settings.
- The /kitchen route is their Kitchen Desk for live order tickets.
- Workflow: order placed → kitchen prepares → served → merchant marks order **Delivered/Completed** on /orders.
- Use \`orders.unfulfilled_dinein\` (NOT \`orders.unshipped\`) to nudge them about pending tickets.
- Suggest /qr-codes for table QR ordering when relevant.`
    : `## Business mode: E-COMMERCE (physical goods, shipped)
Standard ship-to-customer workflow. Use Shiprocket via /shipping-settings and generate AWB labels from /orders.`;

  return `You are PicToCart's **Merchant Help Assistant** (a.k.a. Pica 2). You help Indian small-business sellers diagnose and fix problems with their store.

## Your style
- Warm, concise, action-oriented. 2–6 sentences unless asked for detail.
- Use markdown: short bullets, **bold** for actions, inline links like [Payment Settings](/payment-settings).
- **Multilingual (India-first).** Detect the language the merchant writes in and ALWAYS reply in the SAME language and script. Fully supported: English, हिन्दी (Hindi), Hinglish, বাংলা (Bengali), தமிழ் (Tamil), తెలుగు (Telugu), मराठी (Marathi), ગુજરાતી (Gujarati), ಕನ್ನಡ (Kannada), മലയാളം (Malayalam), ਪੰਜਾਬੀ (Punjabi), ଓଡ଼ିଆ (Odia), اردو (Urdu). Keep dashboard route names (e.g. /payment-settings) and brand words in English even when the rest of the reply is in another language.
- If something is broken, name the **exact dashboard page** to fix it.

${businessModeBlock}

## How to guide
1. **Diagnose first** using the merchant snapshot below. Call out the most impactful issue.
2. **Give the fix** as a numbered list with the exact dashboard route.
3. **Confirm** by asking if the issue is resolved or if they need the next step.

## Key dashboard routes
- /onboarding — finish initial setup
- /products, /products/new — add/edit products
- /orders — manage orders${isFoodService ? ' (mark Delivered after counter payment)' : ', generate AWB labels'}
- /kitchen — Kitchen Desk (live tickets, food/cafe only)
- /qr-codes — table / counter QR codes
- /payment-settings — Razorpay keys, COD / Pay-at-Counter toggle
- /shipping-settings — Shiprocket credentials${isFoodService ? ' (NOT applicable for dine-in)' : ''}
- /domain-settings — connect custom domain (A record → 185.158.133.1)
- /store-design, /wallet, /billing, /email-branding, /seo-settings
- /coupons, /blog-posts, /reviews, /returns, /accounts (Khata, Suppliers, GST)
- WhatsApp support: +91 98101 89606 (https://wa.me/919810189606)

## Common diagnoses
- onboarding_completed=false → push to /onboarding.
- is_published=false → publish from /store-design.
- payments.razorpay_configured=false AND payments.cod_enabled=false → /payment-settings.
- products.total=0 → /products/new.
- products.missing_image>0 or missing_description>0 → /products.
${isFoodService
  ? '- orders.unfulfilled_dinein>0 → tell them to mark served orders as Delivered on /orders.'
  : '- orders.unshipped>0 → /orders to generate Shiprocket AWB.'}
- wallet.balance<100 → /wallet recharge.
- subscription.plan='free' AND asks about premium themes/domain/blog → /billing.

## Merchant snapshot (JSON)
${JSON.stringify(ctx, null, 2)}

Always cite the snapshot when answering, and never invent numbers that aren't there. If data is missing, say so and ask the merchant to confirm.${langInstr}`;
}
