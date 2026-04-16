import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
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

    switch (event) {
      case 'subscription.activated': {
        const entity = payload.subscription.entity;
        await supabase.from('subscriptions').upsert({
          store_id: storeId,
          plan: 'premium',
          status: 'active',
          razorpay_subscription_id: subscriptionId,
          razorpay_plan_id: entity.plan_id,
          current_period_start: new Date(entity.current_start * 1000).toISOString(),
          current_period_end: new Date(entity.current_end * 1000).toISOString(),
        }, { onConflict: 'store_id' });
        break;
      }

      case 'subscription.charged': {
        const entity = payload.subscription.entity;
        await supabase.from('subscriptions').upsert({
          store_id: storeId,
          plan: 'premium',
          status: 'active',
          razorpay_subscription_id: subscriptionId,
          current_period_start: new Date(entity.current_start * 1000).toISOString(),
          current_period_end: new Date(entity.current_end * 1000).toISOString(),
        }, { onConflict: 'store_id' });

        // Log event
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
        // Downgrade to free
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
