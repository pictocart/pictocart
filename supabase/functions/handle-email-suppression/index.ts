import { createClient } from 'npm:@supabase/supabase-js@2'

// Suppression event payload sent when Resend/email provider reports
// a bounce, complaint, or unsubscribe.
interface SuppressionPayload {
  email: string
  reason: 'bounce' | 'complaint' | 'unsubscribe'
  message_id?: string
  metadata?: Record<string, unknown>
  is_retry: boolean
  retry_count: number
}

function parseSuppressionPayload(body: string): SuppressionPayload {
  const parsed = JSON.parse(body)
  const data = parsed.data as SuppressionPayload
  if (!data?.email || !data?.reason) {
    throw new Error('Missing required fields: email, reason')
  }
  return data
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Verify HMAC-SHA256 signature using Web Crypto API
async function verifyHmacSignature(secret: string, signature: string, body: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const sigBytes = hexToBytes(signature)
    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(body))
  } catch {
    return false
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const webhookSecret = Deno.env.get('WEBHOOK_SIGNING_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables')
    return jsonResponse({ error: 'Server configuration error' }, 500)
  }

  const rawBody = await req.text()
  let payload: SuppressionPayload

  // Verify HMAC signature if secret is configured
  if (webhookSecret) {
    const signature = req.headers.get('x-webhook-signature') || req.headers.get('x-signature') || ''
    if (signature) {
      const valid = await verifyHmacSignature(webhookSecret, signature, rawBody)
      if (!valid) {
        console.error('Invalid webhook signature')
        return jsonResponse({ error: 'Invalid signature' }, 401)
      }
    }
  }

  try {
    payload = parseSuppressionPayload(rawBody)
  } catch (error) {
    console.error('Invalid payload', { error })
    return jsonResponse({ error: 'Invalid payload' }, 400)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const normalizedEmail = payload.email.toLowerCase()

  // 1. Upsert to suppressed_emails (idempotent — safe for retries)
  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert(
      { email: normalizedEmail, reason: payload.reason, metadata: payload.metadata ?? null },
      { onConflict: 'email' }
    )

  if (suppressError) {
    console.error('Failed to upsert suppressed email', { error: suppressError })
    return jsonResponse({ error: 'Failed to write suppression' }, 500)
  }

  // 2. Append a log entry for the suppression event
  await supabase.from('email_send_log').insert({
    message_id: payload.message_id ?? null,
    template_name: 'system',
    recipient_email: normalizedEmail,
    status: mapReasonToStatus(payload.reason),
    error_message: mapReasonToMessage(payload.reason),
    metadata: payload.metadata ?? null,
  })

  console.log('Suppression processed', {
    email_redacted: normalizedEmail[0] + '***@' + normalizedEmail.split('@')[1],
    reason: payload.reason,
    is_retry: payload.is_retry,
  })

  return jsonResponse({ success: true })
})

function mapReasonToStatus(reason: string): 'bounced' | 'complained' | 'suppressed' {
  switch (reason) {
    case 'bounce': return 'bounced'
    case 'complaint': return 'complained'
    default: return 'suppressed'
  }
}

function mapReasonToMessage(reason: string): string {
  switch (reason) {
    case 'bounce': return 'Permanent bounce — email address is invalid or rejected'
    case 'complaint': return 'Spam complaint — recipient marked email as spam'
    case 'unsubscribe': return 'Recipient unsubscribed'
    default: return 'Email suppressed'
  }
}
