import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FALLBACK_RAZORPAY_KEY_ID = 'rzp_test_SlF6JsCqM0XzQJ'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userErr } = await userClient.auth.getUser(token)
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const userId = userData.user.id

    const { store_id, plan } = await req.json()
    if (!store_id || !plan) {
      return new Response(JSON.stringify({ error: 'store_id and plan are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!['starter', 'growth', 'scale'].includes(plan)) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Verify caller owns the store
    const { data: store, error: storeErr } = await admin
      .from('stores')
      .select('id, user_id')
      .eq('id', store_id)
      .maybeSingle()
    if (storeErr || !store || store.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Lookup the Razorpay plan id from plan_configs
    const { data: planConfig } = await admin
      .from('plan_configs')
      .select('razorpay_plan_id, trial_days, display_name, price_inr')
      .eq('plan', plan)
      .maybeSingle()

    if (!planConfig?.razorpay_plan_id) {
      return new Response(JSON.stringify({ error: `Razorpay plan id not configured for ${plan}. Set it in Admin → Plans.` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') || FALLBACK_RAZORPAY_KEY_ID
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: 'Razorpay secret not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const subBody: Record<string, unknown> = {
      plan_id: planConfig.razorpay_plan_id,
      total_count: 120,
      quantity: 1,
      notes: { store_id, plan },
    }
    if (planConfig.trial_days && planConfig.trial_days > 0) {
      subBody.start_at = Math.floor(Date.now() / 1000) + planConfig.trial_days * 86400
    }

    const res = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify(subBody),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('Razorpay error:', errBody, 'key_id:', RAZORPAY_KEY_ID, 'plan_id:', planConfig.razorpay_plan_id)
      return new Response(JSON.stringify({ error: 'Razorpay rejected the request', details: errBody }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const subscription = await res.json()

    return new Response(JSON.stringify({
      subscription_id: subscription.id,
      razorpay_key_id: RAZORPAY_KEY_ID,
      short_url: subscription.short_url,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
