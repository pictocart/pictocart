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
    const { store_id } = await req.json()
    if (!store_id) {
      return new Response(JSON.stringify({ error: 'store_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get Razorpay key_secret from platform config or env
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: 'Razorpay secret not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create Razorpay Subscription
    const res = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        plan_id: RAZORPAY_PLAN_ID,
        total_count: 120, // max billing cycles
        quantity: 1,
        notes: { store_id },
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('Razorpay error:', errBody)
      return new Response(JSON.stringify({ error: 'Failed to create subscription' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
