import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.22.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://api.resend.com';
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

function normalizeDnsValue(value: string) {
  return value
    .replace(/^\d+\s+/, '')
    .replace(/\.$/, '')
    .replace(/"/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function recordHost(recordName: string | null | undefined, domain: string) {
  const cleanName = (recordName || '@').replace(/\.$/, '');
  if (cleanName === '@' || cleanName === domain) return domain;
  if (cleanName.endsWith(`.${domain}`)) return cleanName;
  return `${cleanName}.${domain}`;
}

async function checkDnsRecords(domain: string, records: any[]) {
  const checks = await Promise.all((records || []).map(async (record: any) => {
    const host = recordHost(record.name, domain);
    const type = String(record.type || '').toUpperCase();
    const expected = normalizeDnsValue(String(record.value || ''));

    try {
      const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=${type}`);
      const data = await res.json();
      const answers = Array.isArray(data.Answer) ? data.Answer : [];
      const matched = answers.some((answer: any) => normalizeDnsValue(String(answer.data || '')).includes(expected));

      return { ...record, status: matched ? 'verified' : (record.status || 'pending'), dns_host: host, dns_verified: matched };
    } catch (error) {
      console.error('DNS lookup failed:', host, type, error);
      return { ...record, status: record.status || 'pending', dns_host: host, dns_verified: false };
    }
  }));

  return {
    records: checks,
    verified: checks.length > 0 && checks.every((record: any) => record.dns_verified),
  };
}

function getResendHeaders() {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${RESEND_API_KEY}`,
  };
}

async function handleAdd(data: z.infer<typeof AddSchema>) {
  const headers = getResendHeaders();

  // Register domain with Resend in Tokyo region (ap-northeast-1)
  // — closest Resend region to India for best deliverability to .in inboxes
  const res = await fetch(`${GATEWAY_URL}/domains`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: data.domain, region: 'ap-northeast-1' }),
  });

  const resendData = await res.json();
  if (!res.ok) {
    const rawMsg = resendData?.message || `Provider error [${res.status}]`;
    // Detect Resend free-tier "only 1 domain allowed" / Pro-required errors
    const lower = rawMsg.toLowerCase();
    const isPlanLimit =
      lower.includes('upgrade') ||
      lower.includes('pro plan') ||
      lower.includes('only allowed') ||
      lower.includes('domain limit') ||
      lower.includes('maximum number of domains');
    if (isPlanLimit) {
      const err: any = new Error(
        'White-label email is not available yet — the platform email plan needs to be upgraded. Once upgraded, click "Set Up Email Domain" again and it will work instantly.'
      );
      err.code = 'plan_limit';
      err.status = 402;
      throw err;
    }
    throw new Error(rawMsg);
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

  const providerRecords = statusData.records || domainConfig.dns_records || [];
  const dnsCheck = await checkDnsRecords(domainConfig.domain, providerRecords);
  const isVerified = statusData.status === 'verified' || dnsCheck.verified;
  const newStatus = isVerified ? 'verified' : 'pending';

  // Update DB
  const { error: updateErr } = await supabase
    .from('store_email_domains')
    .update({
      status: newStatus,
      dns_records: dnsCheck.records,
      ...(isVerified ? { verified_at: new Date().toISOString() } : {}),
    })
    .eq('store_id', data.store_id);

  if (updateErr) throw new Error(`DB update failed: ${updateErr.message}`);

  return {
    success: true,
    status: newStatus,
    verified: isVerified,
    provider_status: statusData.status,
    dns_verified: dnsCheck.verified,
    dns_records: dnsCheck.records,
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
    const status = err?.status === 402 ? 402 : 500;
    return new Response(JSON.stringify({ error: err.message, code: err?.code }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
