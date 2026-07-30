import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { template as customerOtp } from '../_shared/transactional-email-templates/customer-otp.tsx'

const SITE_NAME = "Pic To Cart"
const SENDER_DOMAIN = "pictocart.in"
const FROM_DOMAIN = "pictocart.in"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  let email: string
  let otp: string
  try {
    const body = await req.json()
    email = body.email
    otp = body.otp
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (!email || !otp) {
    return new Response(
      JSON.stringify({ error: 'email and otp are required' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const normalizedEmail = email.toLowerCase()

  // 1. Check suppression list
  const { data: suppressed, error: suppressionError } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (suppressionError) {
    console.error('Suppression check failed', suppressionError)
    return new Response(
      JSON.stringify({ error: 'Failed to verify suppression status' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (suppressed) {
    return new Response(
      JSON.stringify({ success: false, reason: 'email_suppressed' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // 2. Unsubscribe token lookup / creation
  let unsubscribeToken: string
  const { data: tokens, error: tokenLookupError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalizedEmail)
    .order('created_at', { ascending: false })
    .limit(1)

  if (tokenLookupError) {
    console.error('Token lookup failed', tokenLookupError)
    return new Response(
      JSON.stringify({ error: 'Failed to prepare email' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  const existingToken = tokens?.[0] || null
  if (existingToken && !existingToken.used_at) {
    unsubscribeToken = existingToken.token
  } else {
    unsubscribeToken = generateToken()
    const { error: tokenError } = await supabase
      .from('email_unsubscribe_tokens')
      .insert({ token: unsubscribeToken, email: normalizedEmail })

    if (tokenError) {
      console.error('Failed to create unsubscribe token', tokenError)
      return new Response(
        JSON.stringify({ error: 'Failed to prepare email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
  }

  // 3. Render email
  const templateData = {
    storeName: "PicToCart Partner Program",
    otp: otp,
    purpose: "verification",
  }

  const html = await renderAsync(
    React.createElement(customerOtp.component, templateData)
  )
  const plainText = await renderAsync(
    React.createElement(customerOtp.component, templateData),
    { plainText: true }
  )

  const resolvedSubject = `${otp} is your PicToCart Partner Program verification code`
  const messageId = crypto.randomUUID()

  // Log pending
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'customer-otp',
    recipient_email: normalizedEmail,
    status: 'pending',
  })

  // 4. Enqueue or Direct Send Fallback
  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: normalizedEmail,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: resolvedSubject,
      html,
      text: plainText,
      purpose: 'transactional',
      label: 'customer-otp',
      idempotency_key: messageId,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    console.warn('Failed to enqueue, calling Resend API fallback...', enqueueError)
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (resendApiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            to: normalizedEmail,
            subject: resolvedSubject,
            html: html,
          }),
        })

        if (res.ok) {
          console.log('OTP sent directly via Resend')
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: 'customer-otp',
            recipient_email: normalizedEmail,
            status: 'sent',
            metadata: { direct_send: true },
          })
          return new Response(
            JSON.stringify({ success: true, sent_directly: true }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }
      } catch (directErr) {
        console.error('Resend fallback failed', directErr)
      }
    }

    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'customer-otp',
      recipient_email: normalizedEmail,
      status: 'failed',
      error_message: 'Failed to enqueue and direct send fallback failed',
    })

    return new Response(
      JSON.stringify({ error: 'Failed to send email' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  console.log('OTP email enqueued successfully')
  return new Response(
    JSON.stringify({ success: true, queued: true }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
})
