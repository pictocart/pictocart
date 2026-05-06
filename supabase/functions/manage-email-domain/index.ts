import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.22.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const AddSchema = z.object({
  action: z.literal('add'),
  store_id: z.string().uuid(),
  domain: z.string().min(3).max(253),
  sender_prefix: z.string().min(1).max(64).default('notifications'),
});

const VerifySchema = z.object({
  action: z.literal('verify'),
  store_id: z.string().uuid(),
});

const RemoveSchema = z.object({
  action: z.literal('remove'),
  store_id: z.string().uuid(),
});

const RequestSchema = z.discriminatedUnion('action', [AddSchema, VerifySchema, RemoveSchema]);

function getResendHeaders() {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    'X-Connection-Api-Key': RESEND_API_KEY,
  };
}

async function handleAdd(data: z.infer<typeof AddSchema>) {
  const headers = getResendHeaders();

  // Register domain with Resend
  const res = await fetch(`${GATEWAY_URL}/domains`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: data.domain }),
  });

  const resendData = await res.json();
  if (!res.ok) {
    // Surface the human-readable Resend message rather than the raw payload
    const msg = resendData?.message || `Provider error [${res.status}]`;
    throw new Error(msg);
  }

  // Extract DNS records from Resend response
  const dnsRecords = resendData.records || [];
  const resendDomainId = resendData.id;

  // Upsert into store_email_domains
  const { error } = await supabase
    .from('store_email_domains')
    .upsert({
      store_id: data.store_id,
      domain: data.domain,
      resend_domain_id: resendDomainId,
      status: 'pending',
      dns_records: dnsRecords,
      sender_prefix: data.sender_prefix,
      verified_at: null,
    }, { onConflict: 'store_id' });

  if (error) throw new Error(`DB upsert failed: ${error.message}`);

  return { success: true, domain_id: resendDomainId, dns_records: dnsRecords, status: 'pending' };
}

async function handleVerify(data: z.infer<typeof VerifySchema>) {
  // Get current domain config
  const { data: domainConfig, error: fetchErr } = await supabase
    .from('store_email_domains')
    .select('*')
    .eq('store_id', data.store_id)
    .single();

  if (fetchErr || !domainConfig) throw new Error('No email domain configured for this store');

  const headers = getResendHeaders();

  // Trigger verification at Resend
  await fetch(`${GATEWAY_URL}/domains/${domainConfig.resend_domain_id}/verify`, {
    method: 'POST',
    headers,
  });

  // Check domain status
  const statusRes = await fetch(`${GATEWAY_URL}/domains/${domainConfig.resend_domain_id}`, {
    method: 'GET',
    headers,
  });

  const statusData = await statusRes.json();
  if (!statusRes.ok) {
    throw new Error(`Resend status check failed [${statusRes.status}]: ${JSON.stringify(statusData)}`);
  }

  const isVerified = statusData.status === 'verified';
  const newStatus = isVerified ? 'verified' : 'pending';

  // Update DB
  const { error: updateErr } = await supabase
    .from('store_email_domains')
    .update({
      status: newStatus,
      dns_records: statusData.records || domainConfig.dns_records,
      ...(isVerified ? { verified_at: new Date().toISOString() } : {}),
    })
    .eq('store_id', data.store_id);

  if (updateErr) throw new Error(`DB update failed: ${updateErr.message}`);

  return {
    success: true,
    status: newStatus,
    verified: isVerified,
    dns_records: statusData.records || domainConfig.dns_records,
  };
}

async function handleRemove(data: z.infer<typeof RemoveSchema>) {
  const { data: domainConfig } = await supabase
    .from('store_email_domains')
    .select('resend_domain_id')
    .eq('store_id', data.store_id)
    .maybeSingle();

  // Idempotent — if nothing exists, treat as already removed.
  if (!domainConfig) {
    return { success: true, removed: true, already_absent: true };
  }

  // Best-effort delete at Resend (don't fail the whole call if Resend errors).
  if (domainConfig.resend_domain_id) {
    try {
      const headers = getResendHeaders();
      const delRes = await fetch(`${GATEWAY_URL}/domains/${domainConfig.resend_domain_id}`, {
        method: 'DELETE',
        headers,
      });
      if (!delRes.ok) {
        console.error('Resend domain deletion failed:', await delRes.text());
      }
    } catch (e) {
      console.error('Resend deletion threw:', e);
    }
  }

  const { error } = await supabase
    .from('store_email_domains')
    .delete()
    .eq('store_id', data.store_id);

  if (error) throw new Error(`DB delete failed: ${error.message}`);

  return { success: true, removed: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result;
    switch (parsed.data.action) {
      case 'add':
        result = await handleAdd(parsed.data);
        break;
      case 'verify':
        result = await handleVerify(parsed.data);
        break;
      case 'remove':
        result = await handleRemove(parsed.data);
        break;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('manage-email-domain error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
