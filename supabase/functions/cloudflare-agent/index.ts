// Custom Domain Auto-Pilot v2 — state-machine driven agent.
// Runs every 2 min via pg_cron. For each store with a custom_domain it advances
// the domain through a deterministic state machine:
//
//   entered → dns_detect → (ns_at_cf_ours | ns_at_cf_theirs | ns_at_registrar)
//             → ssl_pending → ssl_active → healthy
//             → degraded / down (auto-heal)
//
// Key behaviors:
//  - DoH NS lookup decides strategy (saas | direct | manual) per tick.
//  - SaaS: auto-switches SSL validation http → txt when stuck > 5 min.
//  - "Custom hostname not found" self-heals by clearing cloudflare_hostname_id.
//  - Live TXT validation token is stored on stores.ssl_validation_{name,value}.
//  - Health probe + downtime/recovery emails preserved from v1.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Strategy = 'saas' | 'direct' | 'manual';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN')!;
  const zoneId = Deno.env.get('CLOUDFLARE_ZONE_ID')!;
  const fallback = Deno.env.get('CLOUDFLARE_FALLBACK_TARGET') ?? 'store-on-tips.lovable.app';

  const { data: settings } = await supabase.from('admin_settings').select('*').eq('id', 1).maybeSingle();
  const downtimeThresholdMin = settings?.downtime_threshold_minutes ?? 10;
  const autoHeal = settings?.auto_heal_enabled ?? true;
  const notifyMerchants = settings?.notify_merchants ?? true;
  const alertEmail = settings?.alert_email ?? null;

  const { data: stores } = await supabase
    .from('stores')
    .select('id, name, slug, user_id, custom_domain, cloudflare_hostname_id, ssl_status, consecutive_failures, downtime_started_at, downtime_notified_at, domain_state, domain_strategy, ns_provider, state_entered_at')
    .not('custom_domain', 'is', null);

  const summary: any[] = [];
  for (const store of stores ?? []) {
    try {
      const result = await processStore(store, {
        supabase, apiToken, zoneId, fallback,
        autoHeal, notifyMerchants, alertEmail, downtimeThresholdMin,
      });
      summary.push({ domain: store.custom_domain, ...result });
    } catch (err: any) {
      console.error('agent error', store.custom_domain, err?.message);
      await logIncident(supabase, store, 'agent_error', 'error', { error: err?.message });
      summary.push({ domain: store.custom_domain, error: err?.message });
    }
  }

  return new Response(JSON.stringify({ success: true, processed: summary.length, summary }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

async function processStore(store: any, ctx: any) {
  const { supabase, apiToken, zoneId, fallback, autoHeal, notifyMerchants, alertEmail, downtimeThresholdMin } = ctx;
  const domain = (store.custom_domain as string).toLowerCase();

  // --- 1. DNS_DETECT — figure out which branch we're on ---
  const ns = await dohQuery(domain, 'NS');
  const nsHosts = ns.map((r) => r.toLowerCase());
  const isCloudflareNs = nsHosts.some((h) => h.endsWith('.ns.cloudflare.com'));
  // We can't distinguish "ours" vs "theirs" purely from NS without comparing
  // against our account's nameserver pair. For now: if NS=cloudflare AND we
  // have no cloudflare_hostname_id, assume merchant's own CF account → direct.
  // If we have a hostname_id, we're using SaaS Custom Hostnames (ours).
  let strategy: Strategy;
  let nsProvider: string;
  if (isCloudflareNs) {
    if (store.cloudflare_hostname_id) {
      strategy = 'saas';
      nsProvider = 'cloudflare-ours';
    } else {
      strategy = 'direct';
      nsProvider = 'cloudflare-theirs';
    }
  } else if (nsHosts.length > 0) {
    strategy = 'manual';
    nsProvider = inferRegistrar(nsHosts[0]);
  } else {
    strategy = 'manual';
    nsProvider = 'unknown';
  }

  await setState(supabase, store, { ns_provider: nsProvider, domain_strategy: strategy });

  // --- 2. Strategy-specific provisioning ---
  let cfStatus: any = null;
  let validationName: string | null = null;
  let validationValue: string | null = null;

  if (strategy === 'saas') {
    const r = await runSaasFlow({ supabase, store, domain, apiToken, zoneId, fallback, autoHeal });
    cfStatus = r.cfStatus;
    validationName = r.validationName;
    validationValue = r.validationValue;
  } else if (strategy === 'direct') {
    // Merchant has CF zone — they need a CNAME @/www → fallback. SSL is automatic
    // via Cloudflare Universal SSL once the CNAME resolves to our origin.
    await setState(supabase, store, {
      ssl_validation_name: 'CNAME @ and www',
      ssl_validation_value: fallback,
    });
  } else {
    // manual / registrar — they need A 185.158.133.1 + TXT verification.
    await setState(supabase, store, {
      ssl_validation_name: 'A @ / A www',
      ssl_validation_value: '185.158.133.1',
    });
  }

  const sslStatus = cfStatus?.ssl?.status ?? store.ssl_status ?? (strategy === 'direct' ? 'managed_by_merchant' : 'pending');

  // --- 3. Health probe ---
  const start = Date.now();
  let httpCode: number | null = null;
  let healthy = false;
  let errorMessage: string | null = null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(`https://${domain}`, { method: 'HEAD', signal: ctrl.signal, redirect: 'follow' });
    clearTimeout(timer);
    httpCode = res.status;
    healthy = res.status >= 200 && res.status < 400;
    if (!healthy) {
      const servedBy = res.headers.get('server')?.toLowerCase() ?? '';
      errorMessage = servedBy.includes('cloudflare') && res.status === 403
        ? 'Cloudflare blocked the request (likely proxy/cross-account issue)'
        : `HTTP ${res.status}`;
    }
  } catch (err: any) {
    errorMessage = err?.message ?? 'fetch failed';
  }
  const responseMs = Date.now() - start;

  await supabase.from('domain_health_log').insert({
    store_id: store.id, domain,
    status: healthy ? 'up' : 'down',
    http_code: httpCode, ssl_valid: sslStatus === 'active',
    response_ms: responseMs, error_message: errorMessage,
  });

  // --- 4. State + downtime tracking ---
  const updates: any = {
    last_health_check_at: new Date().toISOString(),
    ssl_status: sslStatus,
  };
  if (validationName && validationValue) {
    updates.ssl_validation_name = validationName;
    updates.ssl_validation_value = validationValue;
  }

  let nextState: string;
  if (healthy && (sslStatus === 'active' || strategy === 'direct')) nextState = 'healthy';
  else if (healthy) nextState = 'ssl_pending';
  else if (strategy === 'saas' && !cfStatus) nextState = 'dns_propagating';
  else nextState = 'down';

  if (store.domain_state !== nextState) {
    updates.domain_state = nextState;
    updates.state_entered_at = new Date().toISOString();
    await logIncident(supabase, store, `state→${nextState}`, 'info', { strategy, ns_provider: nsProvider });
  }

  if (healthy) {
    if (store.downtime_notified_at && notifyMerchants) {
      const downMs = store.downtime_started_at ? Date.now() - new Date(store.downtime_started_at).getTime() : 0;
      await sendEmail(supabase, store, 'recovered', { duration_min: Math.round(downMs / 60_000) }, alertEmail);
      await logIncident(supabase, store, 'recovered', 'info', { duration_min: Math.round(downMs / 60_000) });
    }
    updates.consecutive_failures = 0;
    updates.downtime_started_at = null;
    updates.downtime_notified_at = null;
  } else {
    const failures = (store.consecutive_failures ?? 0) + 1;
    updates.consecutive_failures = failures;
    if (failures >= 3 && !store.downtime_started_at) updates.downtime_started_at = new Date().toISOString();
    const downStart = store.downtime_started_at ? new Date(store.downtime_started_at) : (updates.downtime_started_at ? new Date(updates.downtime_started_at) : null);
    const downMin = downStart ? (Date.now() - downStart.getTime()) / 60_000 : 0;
    if (failures >= 5 && downMin >= downtimeThresholdMin && !store.downtime_notified_at) {
      if (notifyMerchants) await sendEmail(supabase, store, 'downtime', { duration_min: Math.round(downMin) }, alertEmail);
      await logIncident(supabase, store, 'downtime_alert', 'error', { failures, downtime_min: Math.round(downMin), error: errorMessage });
      updates.downtime_notified_at = new Date().toISOString();
    }
  }

  await supabase.from('stores').update(updates).eq('id', store.id);

  return { strategy, ns_provider: nsProvider, state: nextState, healthy, ssl: sslStatus, http: httpCode, response_ms: responseMs };
}

// ---------- SaaS Custom Hostname flow ----------
async function runSaasFlow(args: any) {
  const { supabase, store, domain, apiToken, zoneId, fallback, autoHeal } = args;
  const baseHeaders = { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' };
  let cfStatus: any = null;
  let validationName: string | null = null;
  let validationValue: string | null = null;

  // Fetch current hostname
  if (store.cloudflare_hostname_id) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${store.cloudflare_hostname_id}`, { headers: baseHeaders });
    const d = await r.json();
    if (r.ok && d.success) {
      cfStatus = d.result;
    } else if (r.status === 404 || d?.errors?.[0]?.code === 1436) {
      // Stale ID self-heal
      await supabase.from('stores').update({ cloudflare_hostname_id: null }).eq('id', store.id);
      await logIncident(supabase, store, 'cleared_stale_id', 'warning', { error: d?.errors });
      store.cloudflare_hostname_id = null;
    }
  }

  // Re-provision if missing
  if (!cfStatus && autoHeal) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames`, {
      method: 'POST', headers: baseHeaders,
      body: JSON.stringify({
        hostname: domain,
        ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2' } },
        custom_origin_server: fallback,
      }),
    });
    const d = await r.json();
    if (r.ok && d.success) {
      await supabase.from('stores').update({
        cloudflare_hostname_id: d.result.id,
        ssl_status: d.result.ssl?.status ?? 'pending',
      }).eq('id', store.id);
      await logIncident(supabase, store, 'reprovisioned', 'info', { hostname_id: d.result.id });
      cfStatus = d.result;
    } else {
      await logIncident(supabase, store, 'reprovision_failed', 'error', { error: d.errors });
    }
  }

  // Auto-switch HTTP → TXT validation if stuck > 5 min
  if (cfStatus?.ssl?.status === 'pending_validation' && cfStatus.ssl.method === 'http') {
    const created = new Date(cfStatus.created_at ?? cfStatus.ssl.created_at ?? Date.now());
    const ageMin = (Date.now() - created.getTime()) / 60_000;
    if (ageMin > 5) {
      const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${store.cloudflare_hostname_id}`, {
        method: 'PATCH', headers: baseHeaders,
        body: JSON.stringify({ ssl: { method: 'txt', type: 'dv' } }),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        cfStatus = d.result;
        await logIncident(supabase, store, 'switched_to_txt', 'info', { age_min: Math.round(ageMin) });
      }
    }
  }

  // Extract TXT validation record (live)
  const errs = cfStatus?.ssl?.validation_errors ?? [];
  const records = cfStatus?.ssl?.txt_name && cfStatus?.ssl?.txt_value
    ? [{ name: cfStatus.ssl.txt_name, value: cfStatus.ssl.txt_value }]
    : [];
  if (records.length) {
    validationName = records[0].name;
    validationValue = records[0].value;
  }

  return { cfStatus, validationName, validationValue };
}

// ---------- Helpers ----------
async function dohQuery(name: string, type: string): Promise<string[]> {
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, {
      headers: { Accept: 'application/dns-json' },
    });
    const d = await r.json();
    return (d.Answer ?? []).map((a: any) => (a.data ?? '').replace(/\.$/, ''));
  } catch {
    return [];
  }
}

function inferRegistrar(host: string): string {
  if (host.includes('hostinger')) return 'hostinger';
  if (host.includes('godaddy') || host.includes('domaincontrol')) return 'godaddy';
  if (host.includes('namecheap') || host.includes('registrar-servers')) return 'namecheap';
  if (host.includes('googledomains') || host.includes('google')) return 'google-domains';
  if (host.includes('bigrock')) return 'bigrock';
  return host;
}

async function setState(supabase: any, store: any, patch: Record<string, unknown>) {
  await supabase.from('stores').update(patch).eq('id', store.id);
  Object.assign(store, patch);
}

async function logIncident(supabase: any, store: any, action: string, severity: string, details: any) {
  await supabase.from('agent_incidents').insert({
    store_id: store.id, domain: store.custom_domain, action, severity, details,
  });
}

async function sendEmail(supabase: any, store: any, kind: 'downtime' | 'recovered', vars: any, alertEmail: string | null) {
  const { data: userData } = await supabase.auth.admin.getUserById(store.user_id);
  const merchantEmail = userData?.user?.email;
  const recipients = [merchantEmail, alertEmail].filter(Boolean);
  if (!recipients.length) return;

  const subject = kind === 'downtime'
    ? `⚠️ Your store ${store.name} is unreachable`
    : `✅ ${store.name} is back online`;
  const html = kind === 'downtime'
    ? `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px"><h2 style="color:#dc2626">Store unreachable</h2><p>Hi,</p><p><strong>${store.name}</strong> (${store.custom_domain}) has been unreachable for about <strong>${vars.duration_min} minutes</strong>.</p><p>Our auto-pilot is investigating and will retry automatically.</p><p style="color:#64748b;font-size:13px">— Pictocart Auto-Pilot</p></div>`
    : `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px"><h2 style="color:#16a34a">Back online</h2><p>Hi,</p><p><strong>${store.name}</strong> (${store.custom_domain}) is back online. Total downtime: <strong>${vars.duration_min} minutes</strong>.</p><p style="color:#64748b;font-size:13px">— Pictocart Auto-Pilot</p></div>`;

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!RESEND_API_KEY || !LOVABLE_API_KEY) return;

  await fetch('https://connector-gateway.lovable.dev/resend/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: 'Pictocart Auto-Pilot <onboarding@resend.dev>',
      to: recipients, subject, html,
    }),
  }).catch((e) => console.error('email failed', e?.message));
}
