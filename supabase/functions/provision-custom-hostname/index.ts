import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonError('Unauthorized', 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonError('Unauthorized', 401);

    const { store_id, domain } = await req.json();
    if (!store_id || !domain) return jsonError('store_id and domain required', 400);

    const cleanDomain = String(domain).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleanDomain)) {
      return jsonError('Invalid domain format', 400);
    }

    // Verify ownership of the store
    const { data: store } = await supabase
      .from('stores').select('id, user_id, cloudflare_hostname_id').eq('id', store_id).maybeSingle();
    if (!store || store.user_id !== user.id) return jsonError('Forbidden', 403);

    // If a hostname is already provisioned, delete it first (so domain edits work)
    const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN')!;
    const zoneId = Deno.env.get('CLOUDFLARE_ZONE_ID')!;
    const fallback = Deno.env.get('CLOUDFLARE_FALLBACK_TARGET') ?? 'fallback.pictocart.in';

    const deleteHostname = async (id: string) => {
      await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiToken}` },
      }).catch(() => {});
    };

    if (store.cloudflare_hostname_id) {
      await deleteHostname(store.cloudflare_hostname_id);
    }

    const provision = async () => {
      const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostname: cleanDomain,
          ssl: { method: 'txt', type: 'dv', settings: { min_tls_version: '1.2' } },
          custom_origin_server: fallback,
        }),
      });
      return { res, data: await res.json() };
    };

    let { res: cfRes, data: cfData } = await provision();

    // Code 1406 = Duplicate custom hostname → orphan in CF, look it up and delete then retry
    if (!cfRes.ok && cfData?.errors?.[0]?.code === 1406) {
      console.log('Duplicate hostname found in CF, attempting cleanup & retry');
      const lookup = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames?hostname=${encodeURIComponent(cleanDomain)}`,
        { headers: { Authorization: `Bearer ${apiToken}` } },
      );
      const lookupData = await lookup.json();
      const existing = lookupData?.result?.[0];
      if (existing?.id) {
        await deleteHostname(existing.id);
        await new Promise((r) => setTimeout(r, 1500));
        ({ res: cfRes, data: cfData } = await provision());
      }
    }

    if (!cfRes.ok || !cfData.success) {
      console.error('Cloudflare provision failed', JSON.stringify(cfData));
      const cfErr = cfData.errors?.[0];
      const code = cfErr?.code ? ` (code ${cfErr.code})` : '';
      const msg = cfErr?.message ?? 'Cloudflare API error';
      const hint = cfErr?.code === 10000
        ? ' — Your Cloudflare API token is invalid or lacks "SSL and Certificates: Edit" + "Zone: Read" permissions on the zone. Please update the CLOUDFLARE_API_TOKEN secret.'
        : '';
      return jsonError(`Cloudflare: ${msg}${code}${hint}`, 400);
    }

    const hostnameId = cfData.result.id as string;
    const sslStatus = cfData.result.ssl?.status ?? 'pending';

    await supabase.from('stores').update({
      custom_domain: cleanDomain,
      cloudflare_hostname_id: hostnameId,
      ssl_status: sslStatus,
      ssl_last_checked_at: new Date().toISOString(),
    }).eq('id', store_id);

    return new Response(JSON.stringify({
      success: true,
      domain: cleanDomain,
      hostname_id: hostnameId,
      ssl_status: sslStatus,
      cname_target: fallback,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return jsonError(err.message ?? 'Server error', 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
