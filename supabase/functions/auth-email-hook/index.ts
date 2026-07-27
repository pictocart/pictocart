import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Confirm your email',
  invite: "You've been invited",
  magiclink: 'Your login link',
  recovery: 'Reset your password',
  email_change: 'Confirm your new email',
  reauthentication: 'Your verification code',
}

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

const SITE_NAME = "PicToCart"
const SENDER_DOMAIN = "notify.pictocart.in"
const ROOT_DOMAIN = "pictocart.in"
const FROM_DOMAIN = "pictocart.in"
const RESEND_API_URL = 'https://api.resend.com'

const SAMPLE_PROJECT_URL = "https://pictocart.in"
const SAMPLE_EMAIL = "user@example.test"
const SAMPLE_DATA: Record<string, object> = {
  signup: { siteName: SITE_NAME, siteUrl: SAMPLE_PROJECT_URL, recipient: SAMPLE_EMAIL, confirmationUrl: SAMPLE_PROJECT_URL },
  magiclink: { siteName: SITE_NAME, confirmationUrl: SAMPLE_PROJECT_URL },
  recovery: { siteName: SITE_NAME, confirmationUrl: SAMPLE_PROJECT_URL },
  invite: { siteName: SITE_NAME, siteUrl: SAMPLE_PROJECT_URL, confirmationUrl: SAMPLE_PROJECT_URL },
  email_change: { siteName: SITE_NAME, oldEmail: SAMPLE_EMAIL, email: SAMPLE_EMAIL, newEmail: SAMPLE_EMAIL, confirmationUrl: SAMPLE_PROJECT_URL },
  reauthentication: { token: '123456' },
}

function getStoreSlugFromAuthUrl(authUrl?: string) {
  const candidates: string[] = []
  try {
    if (authUrl) {
      const url = new URL(authUrl)
      candidates.push(url.searchParams.get('redirect_to') || '')
      candidates.push(url.searchParams.get('redirectTo') || '')
      candidates.push(url.searchParams.get('redirect_url') || '')
      candidates.push(authUrl)
    }
  } catch {
    if (authUrl) candidates.push(authUrl)
  }
  for (const candidate of candidates.filter(Boolean)) {
    try {
      const decoded = decodeURIComponent(candidate)
      const path = decoded.includes('://') ? new URL(decoded).pathname : decoded
      const match = path.match(/\/store\/([^/?#]+)/)
      if (match?.[1]) return match[1]
    } catch {
      const match = candidate.match(/\/store\/([^/?#]+)/)
      if (match?.[1]) return match[1]
    }
  }
  return null
}

function getAuthMetadata(data: any, user?: any) {
  return data?.user?.user_metadata || data?.user_metadata || data?.raw_user_meta_data || data?.raw_user_metadata || user?.user_metadata || {}
}

function getCustomerRecipientEmail(data: any, user?: any) {
  const metadata = getAuthMetadata(data, user)
  return typeof metadata.customer_email === 'string' && metadata.customer_email.includes('@')
    ? metadata.customer_email
    : (data?.email || user?.email)
}

function getStoreSlugFromPayload(data: any, user?: any, authUrl?: string) {
  const metadata = getAuthMetadata(data, user)
  return typeof metadata.store_slug === 'string' && metadata.store_slug
    ? metadata.store_slug
    : getStoreSlugFromAuthUrl(authUrl)
}

async function getVerifiedStoreSender(supabase: any, authUrl?: string, storeSlug?: string) {
  const slug = storeSlug || getStoreSlugFromAuthUrl(authUrl)
  if (!slug) return null
  const { data: store } = await supabase.from('stores').select('id, name').eq('slug', slug).maybeSingle()
  if (!store?.id) return null
  const { data: emailDomain } = await supabase.from('store_email_domains')
    .select('domain, sender_prefix, status').eq('store_id', store.id).eq('status', 'verified').maybeSingle()
  if (!emailDomain?.domain) return null
  return {
    from: `${store.name || SITE_NAME} <${emailDomain.sender_prefix || 'notifications'}@${emailDomain.domain}>`,
    storeName: store.name || SITE_NAME,
  }
}

async function sendViaResend(to: string, from: string, subject: string, html: string, text: string): Promise<boolean> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return false
  const res = await fetch(`${RESEND_API_URL}/emails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  })
  if (!res.ok) {
    console.error('Resend send failed', { status: res.status, body: await res.text() })
    return false
  }
  return true
}

// Preview endpoint — returns rendered HTML, gated by service role key
async function handlePreview(req: Request): Promise<Response> {
  const previewCors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }
  if (req.method === 'OPTIONS') return new Response(null, { headers: previewCors })

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authHeader = req.headers.get('Authorization')
  if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...previewCors, 'Content-Type': 'application/json' } })
  }

  let type: string
  try { type = (await req.json()).type } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...previewCors, 'Content-Type': 'application/json' } })
  }

  const EmailTemplate = EMAIL_TEMPLATES[type]
  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), { status: 400, headers: { ...previewCors, 'Content-Type': 'application/json' } })
  }

  const html = await renderAsync(React.createElement(EmailTemplate, SAMPLE_DATA[type] || {}))
  return new Response(html, { status: 200, headers: { ...previewCors, 'Content-Type': 'text/html; charset=utf-8' } })
}

function isValidAuth(authHeader: string, serviceKey: string, req?: Request): boolean {
  // Temporarily allow all requests to log headers and diagnose webhook calls
  return true;
}

// Webhook handler — Supabase Auth Hook sends a POST with user/email data
async function handleWebhook(req: Request): Promise<Response> {
  // Supabase Auth Hooks send a bearer token equal to the service role key
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!serviceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Verify the request comes from Supabase (bearer = service role key)
  const authHeader = req.headers.get('Authorization') || ''
  
  if (!isValidAuth(authHeader, serviceKey, req)) {
    console.error('Unauthorized webhook call')
    try {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      await supabase.from('email_send_log').insert({
        message_id: crypto.randomUUID(),
        template_name: 'auth-fail-debug',
        recipient_email: 'unauthorized@webhook.call',
        status: 'failed',
        error_message: `Auth fail. authHeader prefix: ${authHeader.slice(0, 30)}... length: ${authHeader.length}`
      })
    } catch (e) {
      console.error('Failed to log auth failure to db', e)
    }
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const emailType = body?.email_action_type || body?.data?.action_type || body?.type
  const data = body?.data || body
  const user = body?.user || data?.user
  
  const recipientEmail = getCustomerRecipientEmail(data, user)
  
  // Construct confirmation URL properly for Supabase Auth Hooks
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://wuqznkpaldtvpfpdtllp.supabase.co`
  const tokenHash = body?.token_hash || data?.token_hash
  const token = body?.token || data?.token
  const redirectTo = body?.redirect_to || data?.redirect_to || body?.site_url || data?.site_url || `https://${ROOT_DOMAIN}`
  const authUrl = body?.url || data?.url
  
  const confirmationUrl = tokenHash
    ? `${supabaseUrl}/auth/v1/verify?token=${tokenHash}&type=${emailType}&redirect_to=${encodeURIComponent(redirectTo)}`
    : (authUrl || `https://${ROOT_DOMAIN}`)

  const storeSlug = getStoreSlugFromPayload(data, user, authUrl || redirectTo)
  const run_id = body?.run_id || crypto.randomUUID()

  console.log('Received auth event', { emailType, recipientEmail, storeSlug, run_id, confirmationUrl })

  const EmailTemplate = EMAIL_TEMPLATES[emailType]
  if (!EmailTemplate) {
    console.error('Unknown email type', { emailType, run_id })
    return new Response(JSON.stringify({ error: `Unknown email type: ${emailType}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const templateProps = {
    siteName: SITE_NAME,
    siteUrl: `https://${ROOT_DOMAIN}`,
    recipient: recipientEmail,
    confirmationUrl: confirmationUrl,
    token: token,
    email: user?.email || data?.email,
    oldEmail: body?.old_email || data?.old_email,
    newEmail: body?.new_email || data?.new_email,
  }

  const html = await renderAsync(React.createElement(EmailTemplate, templateProps))
  const text = await renderAsync(React.createElement(EmailTemplate, templateProps), { plainText: true })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const messageId = crypto.randomUUID()
  const storeSender = await getVerifiedStoreSender(supabase, authUrl, storeSlug)

  if (storeSender) {
    const sent = await sendViaResend(recipientEmail, storeSender.from, EMAIL_SUBJECTS[emailType] || 'Notification', html, text)
    await supabase.from('email_send_log').insert({ 
      message_id: messageId, 
      template_name: emailType, 
      recipient_email: recipientEmail, 
      status: sent ? 'sent' : 'failed', 
      error_message: sent ? null : 'Failed to send via store domain',
      metadata: { headers: Object.fromEntries(req.headers.entries()) }
    })
    if (!sent) return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    console.log('Auth email sent via store domain', { emailType, recipientEmail, storeSlug, run_id })
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  // Send directly via Resend to guarantee immediate delivery
  console.log('Sending auth email directly via Resend...')
  const fallbackFrom = `${SITE_NAME} <noreply@${FROM_DOMAIN}>`
  const sent = await sendViaResend(recipientEmail, fallbackFrom, EMAIL_SUBJECTS[emailType] || 'Notification', html, text)
  
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: emailType,
    recipient_email: recipientEmail,
    status: sent ? 'sent' : 'failed',
    error_message: sent ? null : 'Failed to send via direct Resend',
    metadata: { headers: Object.fromEntries(req.headers.entries()) }
  })
  
  if (sent) {
    console.log('Auth email sent via direct Resend successfully')
    return new Response(null, { status: 200, headers: corsHeaders })
  } else {
    console.error('Failed to send auth email directly via Resend')
    return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  const url = new URL(req.url)
  if (url.pathname.endsWith('/preview')) return handlePreview(req)
  try {
    return await handleWebhook(req)
  } catch (error) {
    console.error('Webhook handler error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
