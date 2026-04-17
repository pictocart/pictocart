// Lightweight DNS lookup via Cloudflare DNS-over-HTTPS.
// No auth required — pure read-only DNS resolver. Used by the merchant
// domain page to show ✅/❌ next to each required CNAME record live.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { domain, expected_target } = await req.json();
    if (!domain || !expected_target) {
      return json({ error: 'domain and expected_target required' }, 400);
    }

    const clean = String(domain).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    const target = String(expected_target).toLowerCase().replace(/\.$/, '');

    // Look up both apex + www. We accept CNAME OR A (some apex setups
    // flatten CNAMEs to A records pointing at the target's resolved IPs).
    const [apex, www, targetA] = await Promise.all([
      lookup(clean),
      lookup(`www.${clean}`),
      lookup(target, 'A'),
    ]);
    const targetIps = new Set((targetA.records ?? []).map((r) => r.toLowerCase()));

    const apexOk = matches(apex, target, targetIps);
    const wwwOk = matches(www, target, targetIps);

    return json({
      success: true,
      apex: { host: clean, ok: apexOk, records: apex.records, type: apex.type },
      www: { host: `www.${clean}`, ok: wwwOk, records: www.records, type: www.type },
      target,
      target_ips: [...targetIps],
    });
  } catch (err: any) {
    return json({ error: err?.message ?? 'Server error' }, 500);
  }
});

async function lookup(host: string, preferType: 'CNAME' | 'A' = 'CNAME'): Promise<{ type: string; records: string[] }> {
  // Try CNAME first, fall back to A.
  const types = preferType === 'A' ? ['A'] : ['CNAME', 'A'];
  for (const t of types) {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${t}`, {
      headers: { Accept: 'application/dns-json' },
    });
    const data = await res.json();
    const answers = (data?.Answer ?? []) as Array<{ type: number; data: string }>;
    // type 5 = CNAME, type 1 = A
    const wanted = t === 'CNAME' ? 5 : 1;
    const records = answers
      .filter((a) => a.type === wanted)
      .map((a) => a.data.replace(/\.$/, '').toLowerCase());
    if (records.length) return { type: t, records };
  }
  return { type: 'NONE', records: [] };
}

function matches(result: { type: string; records: string[] }, target: string, targetIps: Set<string>): boolean {
  if (!result.records.length) return false;
  if (result.type === 'CNAME') {
    return result.records.some((r) => r === target);
  }
  if (result.type === 'A') {
    return result.records.some((r) => targetIps.has(r));
  }
  return false;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
