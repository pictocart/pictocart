// Customer auth for storefronts. Server-authoritative tenancy:
// every (email, store) pair maps to a deterministic alias address that lives
// in `auth.users`. The seller's real gmail address is NEVER used as an
// auth.users email, so there is no possibility of collision between a seller
// account and a customer account on any storefront.
//
// Actions:
//   { action: "signup",  storeSlug, email, password, fullName?, phone? }
//   { action: "signin",  storeSlug, email, password }
//   { action: "request_password_reset", storeSlug, email, redirectTo? }
//
// Returns sign-in/up tokens that the browser passes to supabase.auth.setSession.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TENANT_DOMAIN = "customers.pictocart.in";

const normalizeEmail = (v: string) => v.trim().toLowerCase();

const tenantEmail = (email: string, storeSlug: string) => {
  const local = normalizeEmail(email)
    .replace("@", "-at-")
    .replace(/[^a-z0-9.\-_]/g, "-");
  return `${local}@${storeSlug}.${TENANT_DOMAIN}`;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function getStore(slug: string) {
  const { data, error } = await admin
    .from("stores")
    .select("id, slug, name, is_published")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function passwordGrant(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  return { ok: res.ok, status: res.status, body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const action = String(payload?.action || "");
  const storeSlug = String(payload?.storeSlug || "").trim().toLowerCase();
  const email = String(payload?.email || "").trim().toLowerCase();

  if (!action || !storeSlug || !email) {
    return json({ error: "missing_required_fields" }, 400);
  }
  if (!/^[a-z0-9-]+$/.test(storeSlug)) {
    return json({ error: "invalid_store_slug" }, 400);
  }

  const store = await getStore(storeSlug);
  if (!store) return json({ error: "store_not_found" }, 404);

  const alias = tenantEmail(email, storeSlug);

  try {
    if (action === "signup") {
      const password = String(payload?.password || "");
      const fullName = String(payload?.fullName || "").trim();
      const phone = String(payload?.phone || "").trim();
      if (password.length < 6) {
        return json({ error: "password_too_short" }, 400);
      }

      const { data: created, error: createErr } = await admin.auth.admin
        .createUser({
          email: alias,
          password,
          email_confirm: true, // alias is non-deliverable; real-email verification is handled separately
          user_metadata: {
            is_customer: true,
            store_slug: storeSlug,
            customer_email: email,
            full_name: fullName || null,
            phone: phone || null,
          },
        });

      if (createErr) {
        const msg = (createErr as any).message || "";
        if (/already.*registered|already exists|duplicate/i.test(msg)) {
          return json({ error: "already_registered_for_this_store" }, 409);
        }
        console.error("createUser failed", createErr);
        return json({ error: "signup_failed", detail: msg }, 400);
      }

      // Generate a verification link via the auth-email-hook pipeline.
      const redirectTo = String(payload?.redirectTo || "");
      const { error: linkErr } = await admin.auth.admin.generateLink({
        type: "signup",
        email: alias,
        password,
        options: redirectTo ? { redirectTo } : undefined,
      });
      if (linkErr) console.warn("generateLink (signup) failed", linkErr);

      // Immediately password-grant so the user is logged in even before
      // verifying email — matches the previous customer UX.
      const grant = await passwordGrant(alias, password);
      if (!grant.ok) {
        return json({
          ok: true,
          requires_signin: true,
          user_id: created.user?.id,
        });
      }
      return json({ ok: true, session: grant.body, user_id: created.user?.id });
    }

    if (action === "signin") {
      const password = String(payload?.password || "");
      if (!password) return json({ error: "missing_password" }, 400);
      const grant = await passwordGrant(alias, password);
      if (!grant.ok) {
        const code = grant.body?.error_code || grant.body?.error || "";
        if (/invalid_credentials|invalid_grant|400/.test(String(code) + grant.status)) {
          return json({ error: "invalid_credentials" }, 401);
        }
        return json({ error: "signin_failed", detail: grant.body }, grant.status);
      }
      return json({ ok: true, session: grant.body });
    }

    if (action === "request_password_reset") {
      const redirectTo = String(payload?.redirectTo || "");
      const { error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: alias,
        options: redirectTo ? { redirectTo } : undefined,
      });
      if (error) {
        console.error("generateLink (recovery) failed", error);
        // Don't leak which addresses exist.
        return json({ ok: true });
      }
      return json({ ok: true });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("customer-auth fatal", e);
    return json({ error: "internal_error", detail: String((e as any)?.message || e) }, 500);
  }
});
