import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

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
    const { data: userData, error: userErr } = await userClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { store_id, new_plan } = await req.json()
    if (!store_id || !['free', 'starter', 'growth'].includes(new_plan)) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const admin = createClient(supabaseUrl, serviceKey)

    const { data: store } = await admin.from('stores').select('id, user_id')
      .eq('id', store_id).maybeSingle()
    if (!store || store.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use RPC to classify upgrade vs downgrade — set auth for RPC
    const { data: rpcRes, error: rpcErr } = await userClient.rpc('schedule_plan_change', {
      _store_id: store_id, _new_plan: new_plan,
    })
    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const action = (rpcRes as any)?.action

    if (action === 'downgrade_scheduled') {
      return new Response(JSON.stringify({
        action,
        effective_at: (rpcRes as any).effective_at,
        message: 'Downgrade scheduled at end of current billing period',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Upgrade → caller should invoke create-razorpay-subscription separately.
    return new Response(JSON.stringify({ action: 'upgrade' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
