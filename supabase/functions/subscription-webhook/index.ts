import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!RAZORPAY_WEBHOOK_SECRET) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const signature = req.headers.get('x-razorpay-signature');
    const rawBody = await req.text();

    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const expected = await hmacSha256Hex(rawBody, RAZORPAY_WEBHOOK_SECRET);
    if (!timingSafeEqual(expected, signature)) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = JSON.parse(rawBody);
    const event = body.event;
    const payload = body.payload;

    if (!event || !payload) {
      return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subscriptionId = payload.subscription?.entity?.id;
    const notes = payload.subscription?.entity?.notes || {};
    const storeId = notes.store_id;

    if (!storeId) {
      console.log('No store_id in subscription notes, skipping');
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve which plan this subscription belongs to from notes (preferred) or razorpay_plan_id
    const planFromNotes = notes.plan;
    let resolvedPlan: string | null = ['starter', 'growth', 'scale'].includes(planFromNotes)
      ? planFromNotes
      : null;
    if (!resolvedPlan) {
      const rzpPlanId = payload.subscription?.entity?.plan_id;
      if (rzpPlanId) {
        const { data: pc } = await supabase
          .from('plan_configs').select('plan').eq('razorpay_plan_id', rzpPlanId).maybeSingle();
        if (pc?.plan) resolvedPlan = pc.plan;
      }
    }
    if (!resolvedPlan) resolvedPlan = 'starter';

    switch (event) {
      case 'subscription.activated': {
        const entity = payload.subscription.entity;
        const status = entity.status === 'trialing' ? 'trialing' : 'active';
        await supabase.from('subscriptions').upsert({
          store_id: storeId,
          plan: resolvedPlan,
          status,
          razorpay_subscription_id: subscriptionId,
          razorpay_plan_id: entity.plan_id,
          current_period_start: entity.current_start ? new Date(entity.current_start * 1000).toISOString() : null,
          current_period_end: entity.current_end ? new Date(entity.current_end * 1000).toISOString() : null,
        }, { onConflict: 'store_id' });
        break;
      }

      case 'subscription.charged': {
        const entity = payload.subscription.entity;
        await supabase.from('subscriptions').upsert({
          store_id: storeId,
          plan: resolvedPlan,
          status: 'active',
          razorpay_subscription_id: subscriptionId,
          razorpay_plan_id: entity.plan_id,
          current_period_start: new Date(entity.current_start * 1000).toISOString(),
          current_period_end: new Date(entity.current_end * 1000).toISOString(),
        }, { onConflict: 'store_id' });

        const { data: sub } = await supabase.from('subscriptions')
          .select('id').eq('store_id', storeId).single();
        if (sub) {
          await supabase.from('subscription_events').insert({
            subscription_id: sub.id,
            event_type: 'charged',
            razorpay_event_id: payload.payment?.entity?.id,
            amount: (payload.payment?.entity?.amount || 0) / 100,
          });
        }
        break;
      }

      case 'subscription.cancelled': {
        await supabase.from('subscriptions').update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        }).eq('store_id', storeId);
        break;
      }

      case 'subscription.paused':
      case 'subscription.pending': {
        await supabase.from('subscriptions').update({
          status: 'past_due',
        }).eq('store_id', storeId);
        break;
      }

      case 'subscription.halted': {
        await supabase.from('subscriptions').update({
          plan: 'free',
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        }).eq('store_id', storeId);
        break;
      }

      default:
        console.log(`Unhandled event: ${event}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
