// Manual actions from the Cloudflare Auto-Pilot dashboard.
// Admin-only. Actions: reprovision | force_ssl | delete | recheck
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

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonError('Unauthorized', 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify admin role
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) return jsonError('Forbidden — admin only', 403);

    const { action, store_id } = await req.json();
    if (!action || !store_id) return jsonError('action and store_id required', 400);

    const { data: store } = await supabase.from('stores')
      .select('id, name, user_id, custom_domain, cloudflare_hostname_id')
      .eq('id', store_id).maybeSingle();
    if (!store) return jsonError('Store not found', 404);

    const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN')!;
    const zoneId = Deno.env.get('CLOUDFLARE_ZONE_ID')!;
    const fallback = Deno.env.get('CLOUDFLARE_FALLBACK_TARGET') ?? 'fallback.pictocart.in';

    if (action === 'delete') {
      if (store.cloudflare_hostname_id) {
        await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${store.cloudflare_hostname_id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${apiToken}` },
        });
      }
      await supabase.from('stores').update({
        cloudflare_hostname_id: null, ssl_status: null, custom_domain: null,
        consecutive_failures: 0, downtime_started_at: null, downtime_notified_at: null,
      }).eq('id', store_id);
      await logIncident(supabase, store, 'admin_deleted', 'warning', { by: user.email });
      return ok({ success: true, action });
    }

    if (action === 'reprovision') {
      // Delete existing first if present
      if (store.cloudflare_hostname_id) {
        await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${store.cloudflare_hostname_id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${apiToken}` },
        }).catch(() => {});
      }
      const cfRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostname: store.custom_domain,
          ssl: { method: 'txt', type: 'dv', settings: { min_tls_version: '1.2' } },
          custom_origin_server: fallback,
        }),
      });
      const cfData = await cfRes.json();
      if (!cfRes.ok || !cfData.success) {
        const msg = cfData.errors?.[0]?.message ?? 'Cloudflare API error';
        await logIncident(supabase, store, 'admin_reprovision_failed', 'error', { error: msg });
        return jsonError(`Cloudflare: ${msg}`, 400);
      }
      await supabase.from('stores').update({
        cloudflare_hostname_id: cfData.result.id,
        ssl_status: cfData.result.ssl?.status ?? 'pending',
        consecutive_failures: 0,
        downtime_started_at: null,
        downtime_notified_at: null,
      }).eq('id', store_id);
      await logIncident(supabase, store, 'admin_reprovisioned', 'info', {
        hostname_id: cfData.result.id,
        by: user.email,
        ssl_method: 'txt',
        validation_records: cfData.result.ssl?.txt_name ? {
          ssl_txt_name: cfData.result.ssl.txt_name,
          ssl_txt_value: cfData.result.ssl.txt_value,
        } : null,
        ownership_verification: cfData.result.ownership_verification,
      });
      return ok({
        success: true,
        action,
        hostname_id: cfData.result.id,
        ssl_validation: {
          name: cfData.result.ssl?.txt_name,
          value: cfData.result.ssl?.txt_value,
        },
        ownership_verification: cfData.result.ownership_verification,
      });
    }

    if (action === 'force_ssl') {
      if (!store.cloudflare_hostname_id) return jsonError('No hostname provisioned', 400);
      // Force re-issuance by switching to TXT validation (works even when origin is unreachable)
      const cfRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${store.cloudflare_hostname_id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssl: { method: 'txt', type: 'dv', settings: { min_tls_version: '1.2' } } }),
      });
      const cfData = await cfRes.json();
      if (!cfRes.ok || !cfData.success) {
        return jsonError(cfData.errors?.[0]?.message ?? 'Cloudflare API error', 400);
      }
      await logIncident(supabase, store, 'admin_force_ssl', 'info', {
        by: user.email,
        ssl_method: 'txt',
        validation_records: cfData.result.ssl?.txt_name ? {
          ssl_txt_name: cfData.result.ssl.txt_name,
          ssl_txt_value: cfData.result.ssl.txt_value,
        } : null,
      });
      return ok({
        success: true,
        action,
        ssl_validation: {
          name: cfData.result.ssl?.txt_name,
          value: cfData.result.ssl?.txt_value,
        },
      });
    }

    if (action === 'recheck' || action === 'refresh_validation_token') {
      if (!store.cloudflare_hostname_id) return jsonError('No hostname provisioned', 400);
      const cfRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${store.cloudflare_hostname_id}`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      const cfData = await cfRes.json();
      if (!cfRes.ok || !cfData.success) {
        // Stale ID — auto-clear so the agent reprovisions next tick
        if (cfRes.status === 404 || cfData?.errors?.[0]?.code === 1436) {
          await supabase.from('stores').update({ cloudflare_hostname_id: null }).eq('id', store_id);
          await logIncident(supabase, store, 'admin_cleared_stale_id', 'warning', { by: user.email });
          return jsonError('Hostname was stale and has been cleared. It will reprovision automatically.', 410);
        }
        return jsonError(cfData.errors?.[0]?.message ?? 'Cloudflare API error', 400);
      }
      const sslStatus = cfData.result.ssl?.status ?? 'pending';
      const txt_name = cfData.result.ssl?.txt_name ?? null;
      const txt_value = cfData.result.ssl?.txt_value ?? null;
      await supabase.from('stores').update({
        ssl_status: sslStatus,
        last_health_check_at: new Date().toISOString(),
        ssl_validation_name: txt_name,
        ssl_validation_value: txt_value,
      }).eq('id', store_id);
      return ok({ success: true, action, ssl_status: sslStatus, ssl_validation: { name: txt_name, value: txt_value } });
    }

    if (action === 'clear_stale_id') {
      await supabase.from('stores').update({ cloudflare_hostname_id: null }).eq('id', store_id);
      await logIncident(supabase, store, 'admin_cleared_stale_id', 'warning', { by: user.email });
      return ok({ success: true, action });
    }

    return jsonError('Unknown action', 400);
  } catch (err: any) {
    return jsonError(err?.message ?? 'Server error', 500);
  }
});

async function logIncident(supabase: any, store: any, action: string, severity: string, details: any) {
  await supabase.from('agent_incidents').insert({
    store_id: store.id, domain: store.custom_domain, action, severity, details,
  });
}

function ok(body: any) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
