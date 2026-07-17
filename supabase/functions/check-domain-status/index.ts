/**
 * check-domain-status
 *
 * Called by the merchant's "Check Status" button in DomainSettings.
 * Steps:
 *   1. Load store's custom_domain from DB
 *   2. Query DNS-over-HTTPS (Google + Cloudflare) for A / CNAME records
 *   3. If domain resolves to Vercel → mark domain_status = 'active'
 *   4. Return detailed status so UI can show exactly what's missing
 *
 * No secrets needed — only reads public DNS.
 * Auth required — only store owner can trigger.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Vercel's known IPs and CNAME targets
const VERCEL_IPS = new Set([
  "76.76.21.21",   // primary A record
  "76.76.19.61",   // secondary
  "76.223.126.88", // additional
]);
const VERCEL_CNAME = "cname.vercel-dns.com";

// Also check if the domain resolves to ANY Vercel IP range (76.76.x.x)
const isVercelIp = (ip: string) => ip.startsWith("76.76.") || VERCEL_IPS.has(ip);

interface DnsAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

async function dnsLookup(name: string, type: "A" | "CNAME"): Promise<DnsAnswer[]> {
  // Try Google DoH first, fall back to Cloudflare
  const providers = [
    `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
  ];

  for (const url of providers) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/dns-json" },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const data = await res.json() as { Answer?: DnsAnswer[]; Status: number };
      if (data.Status === 0 && data.Answer?.length) {
        return data.Answer;
      }
    } catch {
      // try next provider
    }
  }
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, supabaseService);

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    // ── Parse body ────────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const { store_id } = body as { store_id?: string };
    if (!store_id) return json({ error: "store_id is required" }, 400);

    // ── Load store ────────────────────────────────────────────────────────────
    const { data: store, error: storeErr } = await admin
      .from("stores")
      .select("id, user_id, custom_domain, domain_status")
      .eq("id", store_id)
      .single();

    if (storeErr || !store) return json({ error: "Store not found" }, 404);
    if (store.user_id !== user.id) return json({ error: "Forbidden" }, 403);
    if (!store.custom_domain) return json({ error: "No custom domain configured" }, 400);

    const domain = store.custom_domain as string;
    const isApex = !domain.startsWith("www.");

    // ── DNS checks ────────────────────────────────────────────────────────────
    let aRecordOk = false;
    let cnameOk = false;
    let foundIps: string[] = [];
    let foundCname: string | null = null;

    if (isApex) {
      // Apex domain — need A record pointing to Vercel IP
      const aAnswers = await dnsLookup(domain, "A");
      foundIps = aAnswers.map((a) => a.data);
      aRecordOk = foundIps.some(isVercelIp);

      // Also check www CNAME as bonus
      const cnameAnswers = await dnsLookup(`www.${domain}`, "CNAME");
      foundCname = cnameAnswers[0]?.data?.replace(/\.$/, "") ?? null;
      cnameOk = !!foundCname && (
        foundCname === VERCEL_CNAME ||
        foundCname.endsWith(".vercel-dns.com") ||
        foundCname.endsWith(".vercel.app")
      );
    } else {
      // Subdomain (www.x.com) — need CNAME pointing to Vercel
      const cnameAnswers = await dnsLookup(domain, "CNAME");
      foundCname = cnameAnswers[0]?.data?.replace(/\.$/, "") ?? null;
      cnameOk = !!foundCname && (
        foundCname === VERCEL_CNAME ||
        foundCname.endsWith(".vercel-dns.com") ||
        foundCname.endsWith(".vercel.app")
      );

      // Fall back: some registrars flatten CNAME to A — check IPs too
      if (!cnameOk) {
        const aAnswers = await dnsLookup(domain, "A");
        foundIps = aAnswers.map((a) => a.data);
        aRecordOk = foundIps.some(isVercelIp);
      }
    }

    const isVerified = isApex ? aRecordOk : (cnameOk || aRecordOk);

    // ── Update DB if verified ─────────────────────────────────────────────────
    if (isVerified && store.domain_status !== "active") {
      await admin
        .from("stores")
        .update({ domain_status: "active" })
        .eq("id", store_id);
    }

    // ── Build human-readable diagnosis ───────────────────────────────────────
    let diagnosis: string;
    if (isVerified) {
      diagnosis = `✅ DNS is correctly configured. Your store is live at https://${domain}`;
    } else if (isApex) {
      if (foundIps.length === 0) {
        diagnosis = `No A record found for ${domain}. Add an A record pointing to 76.76.21.21 at your domain registrar.`;
      } else {
        diagnosis = `A record found (${foundIps.join(", ")}) but it does not point to Vercel. Change it to 76.76.21.21.`;
      }
    } else {
      if (!foundCname) {
        diagnosis = `No CNAME record found for ${domain}. Add a CNAME record pointing to cname.vercel-dns.com.`;
      } else {
        diagnosis = `CNAME found (${foundCname}) but it does not point to Vercel. Change it to cname.vercel-dns.com.`;
      }
    }

    return json({
      domain,
      is_apex: isApex,
      verified: isVerified,
      status: isVerified ? "active" : (store.domain_status ?? "pending_dns"),
      diagnosis,
      dns_found: {
        a_records: foundIps,
        cname: foundCname,
      },
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("check-domain-status error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
