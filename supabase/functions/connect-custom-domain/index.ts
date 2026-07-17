// @ts-nocheck
/**
 * connect-custom-domain
 *
 * Called by the merchant from DomainSettings when they submit their domain.
 * Steps:
 *   1. Validate domain format
 *   2. Check no other store already owns this domain
 *   3. Add domain to Vercel project via API
 *   4. Save custom_domain + domain_status = 'pending_dns' to stores row
 *   5. Return DNS instructions to show in the UI
 *
 * Requires env secrets (set via `supabase secrets set`):
 *   VERCEL_TOKEN        — Vercel API token (Account > Settings > Tokens)
 *   VERCEL_PROJECT_ID   — Project ID from Vercel project settings
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client — respects RLS, used to fetch authenticated user
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    // Admin client — bypasses RLS for cross-tenant uniqueness check + write
    const admin = createClient(supabaseUrl, supabaseService);

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    // ── Parse body ────────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const { store_id, domain: rawDomain, action } = body as {
      store_id?: string;
      domain?: string;
      action?: "connect" | "disconnect";
    };

    if (!store_id) return json({ error: "store_id is required" }, 400);

    // ── Verify store ownership ────────────────────────────────────────────────
    const { data: store, error: storeErr } = await admin
      .from("stores")
      .select("id, slug, user_id, custom_domain, domain_status")
      .eq("id", store_id)
      .single();

    if (storeErr || !store) return json({ error: "Store not found" }, 404);

    // Check if user is admin
    const { data: isAdminRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isOwner = store.user_id === user.id;
    const isAdmin = !!isAdminRole;

    if (!isOwner && !isAdmin) return json({ error: "Forbidden" }, 403);

    const vercelToken = Deno.env.get("VERCEL_TOKEN");
    const vercelProjectId = Deno.env.get("VERCEL_PROJECT_ID");

    // ── DISCONNECT ────────────────────────────────────────────────────────────
    if (action === "disconnect") {
      const oldDomain = store.custom_domain;
      if (oldDomain && vercelToken && vercelProjectId) {
        // Remove from Vercel (best-effort — don't fail if already gone)
        await fetch(
          `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${oldDomain}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${vercelToken}` } }
        ).catch(() => {});
        // Also try www. variant
        await fetch(
          `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/www.${oldDomain}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${vercelToken}` } }
        ).catch(() => {});
      }

      await admin
        .from("stores")
        .update({
          custom_domain: null,
          domain_status: "none",
          domain_added_to_vercel_at: null,
          domain_verification_token: null,
        })
        .eq("id", store_id);

      return json({ success: true, action: "disconnected" });
    }

    // ── CONNECT ───────────────────────────────────────────────────────────────
    if (!rawDomain) return json({ error: "domain is required" }, 400);

    // Normalise: strip protocol, www, trailing slashes, lowercase
    const domain = rawDomain
      .replace(/^(https?:\/\/)?(www\.)?/i, "")
      .replace(/\/.*$/, "")
      .trim()
      .toLowerCase();

    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(domain)) {
      return json({ error: "Invalid domain format. Use: yourbrand.com" }, 400);
    }

    // Block platform domains
    const blocked = ["pictocart.in", "vercel.app", "supabase.co", "localhost"];
    if (blocked.some((b) => domain === b || domain.endsWith(`.${b}`))) {
      return json({ error: "Cannot use a platform domain" }, 400);
    }

    // Uniqueness check — no two stores can share a domain
    const { data: existing } = await admin
      .from("stores")
      .select("id")
      .eq("custom_domain", domain)
      .neq("id", store_id)
      .maybeSingle();

    if (existing) {
      return json({ error: "This domain is already connected to another store" }, 409);
    }

    // ── Add to Vercel ─────────────────────────────────────────────────────────
    let vercelAdded = false;
    let vercelError: string | null = null;

    if (vercelToken && vercelProjectId) {
      // Add apex domain
      const addRes = await fetch(
        `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: domain }),
        }
      );
      const addData = await addRes.json() as any;

      if (addRes.ok || addData?.error?.code === "domain_already_in_team") {
        vercelAdded = true;
      } else {
        vercelError = addData?.error?.message ?? `Vercel error ${addRes.status}`;
        console.error("Vercel add domain error:", addData);
      }

      // Also add www. variant (non-blocking)
      if (vercelAdded) {
        await fetch(
          `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${vercelToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: `www.${domain}`, redirect: domain }),
          }
        ).catch(() => {});
      }
    } else {
      // No Vercel creds configured — still save domain so DNS check can work
      // Admin will need to add to Vercel manually (dev/staging env)
      console.warn("VERCEL_TOKEN or VERCEL_PROJECT_ID not set — skipping Vercel API call");
      vercelAdded = true; // Allow flow to continue so merchant sees DNS instructions
    }

    if (!vercelAdded) {
      // Save as pending anyway so merchant can still see instructions and retry
      await admin.from("stores").update({
        custom_domain: domain,
        domain_status: "pending_dns",
        domain_verification_token: crypto.randomUUID(),
      }).eq("id", store_id);

      return json({
        success: false,
        domain,
        status: "pending_dns",
        warning: `Domain saved but Vercel registration had an issue: ${vercelError}. Our team will resolve this shortly.`,
        dns_instructions: buildDnsInstructions(domain),
      });
    }

    // ── Save to DB ────────────────────────────────────────────────────────────
    const token = crypto.randomUUID().replace(/-/g, "");
    await admin.from("stores").update({
      custom_domain: domain,
      domain_status: "active",
      domain_added_to_vercel_at: new Date().toISOString(),
      domain_verification_token: token,
    }).eq("id", store_id);

    return json({
      success: true,
      domain,
      status: "active",
      dns_instructions: buildDnsInstructions(domain),
    });
  } catch (err) {
    console.error("connect-custom-domain error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});

function parseDomain(domain: string) {
  const clean = domain.replace(/^(https?:\/\/)?(www\.)?/i, "").replace(/\/.*$/, "").trim().toLowerCase();
  const parts = clean.split(".");
  
  const multiPartSuffixes = [
    "co.uk", "me.uk", "org.uk", "ltd.uk", "plc.uk", "net.uk", "sch.uk",
    "co.in", "net.in", "org.in", "gen.in", "ind.in", "firm.in",
    "co.jp", "or.jp", "ne.jp", "ac.jp", "ad.jp",
    "co.kr", "ne.kr",
    "co.za", "net.za", "org.za",
    "com.br", "net.br", "org.br",
    "com.cn", "net.cn", "org.cn", "gov.cn"
  ];

  if (parts.length <= 2) {
    return { isApex: true, subdomain: null, apexDomain: clean };
  }

  const lastTwo = parts.slice(-2).join(".");
  if (parts.length === 3) {
    if (multiPartSuffixes.includes(lastTwo)) {
      return { isApex: true, subdomain: null, apexDomain: clean };
    } else {
      return { isApex: false, subdomain: parts[0], apexDomain: parts.slice(1).join(".") };
    }
  }

  // 4 or more parts
  const secondAndThird = parts.slice(-3, -1).join(".");
  if (multiPartSuffixes.includes(secondAndThird)) {
    return { isApex: false, subdomain: parts.slice(0, -3).join("."), apexDomain: parts.slice(-3).join(".") };
  } else {
    return { isApex: false, subdomain: parts.slice(0, -2).join("."), apexDomain: parts.slice(-2).join(".") };
  }
}

/**
 * Returns the exact DNS records the merchant needs to add at their registrar.
 * Vercel IPs: https://vercel.com/docs/projects/domains/add-a-domain#dns-records
 */
function buildDnsInstructions(domain: string) {
  const domainInfo = parseDomain(domain);
  return {
    primary: domainInfo.isApex
      ? {
          type: "A",
          name: "@",
          value: "76.76.21.21",
          note: "Root domain (apex) — use A record",
        }
      : {
          type: "CNAME",
          name: domainInfo.subdomain || "www",
          value: "cname.vercel-dns.com",
          note: "Subdomain — use CNAME record",
        },
    // Always recommend adding www as well if they entered apex
    www: domainInfo.isApex
      ? {
          type: "CNAME",
          name: "www",
          value: "cname.vercel-dns.com",
          note: "Optional: also add www so both work",
        }
      : null,
    ttl: "3600 (or lowest available)",
    propagation_note:
      "DNS changes take 5 minutes to 48 hours to propagate worldwide. Click 'Check Status' after adding the record.",
  };
}
