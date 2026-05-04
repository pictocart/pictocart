import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  const now = new Date()
  const stages: Array<{ stage: 'day_3' | 'day_1'; days: number }> = [
    { stage: 'day_3', days: 3 },
    { stage: 'day_1', days: 1 },
  ]

  let processed = 0
  let sent = 0
  const errors: string[] = []

  for (const { stage, days } of stages) {
    const windowStart = new Date(now.getTime() + (days - 0.5) * 86400000).toISOString()
    const windowEnd = new Date(now.getTime() + (days + 0.5) * 86400000).toISOString()

    const { data: subs, error } = await supabase
      .from('subscriptions')
      .select('id, store_id, plan, status, current_period_end, stores(name, owner_id)')
      .eq('status', 'trialing')
      .gte('current_period_end', windowStart)
      .lt('current_period_end', windowEnd)

    if (error) { errors.push(`fetch ${stage}: ${error.message}`); continue }

    for (const sub of subs || []) {
      processed++
      // Skip if already sent this stage
      const { data: existing } = await supabase
        .from('trial_reminders_sent')
        .select('id')
        .eq('subscription_id', sub.id)
        .eq('stage', stage)
        .maybeSingle()
      if (existing) continue

      const store: any = sub.stores
      if (!store?.owner_id) continue

      // Resolve owner email
      const { data: userResp } = await supabase.auth.admin.getUserById(store.owner_id)
      const email = userResp?.user?.email
      const fullName = (userResp?.user?.user_metadata as any)?.full_name as string | undefined
      if (!email) continue

      const endDate = sub.current_period_end
        ? new Date(sub.current_period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : undefined

      const { error: invokeError } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'trial-ending',
          recipientEmail: email,
          idempotencyKey: `trial-${stage}-${sub.id}`,
          purpose: 'transactional',
          templateData: {
            name: fullName?.split(' ')[0],
            storeName: store.name,
            daysLeft: days,
            planName: (sub.plan as string)?.charAt(0).toUpperCase() + (sub.plan as string)?.slice(1),
            endDate,
          },
        },
      })

      if (invokeError) { errors.push(`send ${sub.id}: ${invokeError.message}`); continue }

      await supabase.from('trial_reminders_sent').insert({
        subscription_id: sub.id,
        store_id: sub.store_id,
        stage,
        recipient_email: email,
      })
      sent++
    }
  }

  return new Response(
    JSON.stringify({ processed, sent, errors }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
