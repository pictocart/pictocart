import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RAZORPAY_KEY_ID = 'rzp_test_Se7Yf4ajKPSPlS'
const RAZORPAY_PLAN_ID = 'plan_Se7h5qEQgrcbu0'

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
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const userId = claimsData.claims.sub

    const { store_id } = await req.json()
    if (!store_id) {
      return new Response(JSON.stringify({ error: 'store_id is required' }), {
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

    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: 'Razorpay secret not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        plan_id: RAZORPAY_PLAN_ID,
        total_count: 120,
        quantity: 1,
        notes: { store_id },
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('Razorpay error:', errBody)
      return new Response(JSON.stringify({ error: 'Failed to create subscription' }), {
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
