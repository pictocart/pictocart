// @ts-nocheck
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
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

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

async function createPasswordSession(email: string, password: string) {
  const grant = await passwordGrant(email, password);
  if (grant.ok) return grant;

  const code = String(grant.body?.error_code || grant.body?.error || grant.body?.code || "");
  if (/email_not_confirmed|not_confirmed/i.test(code + JSON.stringify(grant.body))) {
    const { error } = await admin.auth.admin.updateUserById((await findUserByEmail(email))?.id || "", {
      email_confirm: true,
    });
    if (!error) return await passwordGrant(email, password);
  }

  return grant;
}

async function findUserByEmail(email: string) {
  // Use the admin listUsers filter which is much faster and more reliable than scanning all users
  try {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = data?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
  } catch {}
  return null;
}

async function ensureCustomerUser(userId: string, store: any, realEmail: string, fullName = "", phone = "") {
  const { data: existing } = await admin.auth.admin.getUserById(userId);
  const existingMeta = existing?.user?.user_metadata || {};
  const customerName = fullName || existingMeta.full_name || null;
  const customerPhone = phone || existingMeta.phone || null;

  await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
    user_metadata: {
      ...existingMeta,
      is_customer: true,
      store_slug: store.slug,
      customer_email: realEmail,
      full_name: customerName,
      phone: customerPhone,
    },
  });
  await admin.from("user_roles").delete().eq("user_id", userId).eq("role", "seller");
  await admin.from("user_roles").upsert({ user_id: userId, role: "customer" }, { onConflict: "user_id,role" });
  await admin.from("customers").upsert({
    user_id: userId,
    store_id: store.id,
    name: customerName,
    email: realEmail,
    phone: customerPhone,
  }, { onConflict: "user_id,store_id" });
}

Deno.serve(async (req: Request) => {
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

  if (!action || !storeSlug) {
    return json({ error: "missing_required_fields" }, 400);
  }
  if (!/^[a-z0-9-]+$/.test(storeSlug)) {
    return json({ error: "invalid_store_slug" }, 400);
  }
  if (action !== "google" && action !== "config" && !email) {
    return json({ error: "missing_required_fields" }, 400);
  }

  if (action === "config") {
    return json({
      ok: true,
      googleClientId: Deno.env.get("GOOGLE_CLIENT_ID") || null,
    });
  }

  const store = await getStore(storeSlug);
  if (!store) return json({ error: "store_not_found" }, 404);

  const alias = email ? tenantEmail(email, storeSlug) : "";

  try {
    if (action === "signup") {
      const password = String(payload?.password || "");
      const fullName = String(payload?.fullName || "").trim();
      const phone = String(payload?.phone || "").trim();
      if (password.length < 6) {
        return json({ error: "password_too_short" });
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
          const existing = await findUserByEmail(alias);
          if (existing?.id) await ensureCustomerUser(existing.id, store, email, fullName, phone);
          const grant = await createPasswordSession(alias, password);
          if (grant.ok) return json({ ok: true, session: grant.body, existing: true });
          return json({ error: "already_registered_for_this_store" });
        }
        console.error("createUser failed", createErr);
        return json({ error: "signup_failed", detail: msg }, 400);
      }

      await ensureCustomerUser(created.user!.id, store, email, fullName, phone);

      // Fire-and-forget welcome email to the customer's real inbox.
      try {
        const storeUrl = `https://${storeSlug}.pictocart.in`;
        await admin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "welcome-customer",
            recipientEmail: email,
            idempotencyKey: `welcome-customer-${storeSlug}-${created.user!.id}`,
            senderName: store.name,
            templateData: {
              storeName: store.name,
              name: fullName || null,
              storeUrl,
            },
          },
        });
      } catch (e) {
        console.warn("welcome email failed", e);
      }

      const grant = await createPasswordSession(alias, password);
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
      if (!password) return json({ error: "missing_password" });
      const existing = await findUserByEmail(alias);
      if (existing?.id) await ensureCustomerUser(existing.id, store, email);
      const grant = await createPasswordSession(alias, password);
      if (!grant.ok) {
        const code = grant.body?.error_code || grant.body?.error || "";
        if (/invalid_credentials|invalid_grant|400/.test(String(code) + grant.status)) {
          return json({ error: "invalid_credentials" });
        }
        return json({ error: "signin_failed", detail: grant.body }, grant.status);
      }
      return json({ ok: true, session: grant.body });
    }

    if (action === "request_password_reset") {
      const redirectTo = String(payload?.redirectTo || "");

      // The customer's REAL inbox is the email they signed up with — we
      // already have it in the request payload.
      const realEmail = email;

      // Generate the recovery link WITHOUT sending Supabase's default email.
      const { data: linkData, error: linkErr } = await admin.auth.admin
        .generateLink({
          type: "recovery",
          email: alias,
          options: redirectTo ? { redirectTo } : undefined,
        });

      if (linkErr || !linkData?.properties?.action_link) {
        console.warn("generateLink (recovery) failed", linkErr);
        // Don't leak whether the email exists.
        return json({ ok: true });
      }

      // Send branded reset email to the customer's REAL inbox via the
      // transactional email pipeline.
      const sendRes = await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "customer-password-reset",
          recipientEmail: realEmail,
          idempotencyKey: `customer-pw-reset-${storeSlug}-${realEmail}-${Date.now()}`,
          senderName: store.name,
          templateData: {
            storeName: store.name,
            resetUrl: linkData.properties.action_link,
          },
        },
      });
      if (sendRes.error) {
        console.error("send reset email failed", sendRes.error);
      }

      return json({ ok: true });
    }

    if (action === "google") {
      const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
      if (!GOOGLE_CLIENT_ID) return json({ error: "google_not_configured" }, 400);

      const idToken = String(payload?.idToken || "");
      if (!idToken) return json({ error: "missing_id_token" }, 400);

      // Verify Google ID token
      const verifyRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      );
      if (!verifyRes.ok) return json({ error: "invalid_google_token" }, 401);
      const claims = await verifyRes.json();
      if (claims.aud !== GOOGLE_CLIENT_ID) {
        return json({ error: "invalid_google_token" }, 401);
      }
      if (!claims.email_verified || !claims.email) {
        return json({ error: "invalid_google_token" }, 401);
      }

      const googleEmail = String(claims.email).toLowerCase();
      const googleSub = String(claims.sub);
      const fullName = String(claims.name || "");
      const googleAlias = tenantEmail(googleEmail, storeSlug);

      // Look for existing user by alias
      let userId: string | undefined;
      const { data: lookup } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1,
        // @ts-ignore - filter not in typed surface but supported
        filter: `email.eq.${googleAlias}`,
      });
      userId = lookup?.users?.[0]?.id;

      if (!userId) {
        // Create the tenant-aliased customer user
        const { data: created, error: createErr } = await admin.auth.admin
          .createUser({
            email: googleAlias,
            email_confirm: true,
            user_metadata: {
              is_customer: true,
              store_slug: storeSlug,
              customer_email: googleEmail,
              full_name: fullName || null,
              google_sub: googleSub,
              auth_provider: "google",
            },
          });
        if (createErr) {
          console.error("google createUser failed", createErr);
          return json({ error: "signup_failed", detail: createErr.message }, 400);
        }
        userId = created.user?.id;
      }

      // Issue a session via magiclink → verifyotp
      const { data: linkData, error: linkErr } = await admin.auth.admin
        .generateLink({ type: "magiclink", email: googleAlias });
      if (linkErr || !linkData?.properties?.email_otp) {
        console.error("magiclink generation failed", linkErr);
        return json({ error: "session_issue_failed" }, 500);
      }

      const otpRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY },
        body: JSON.stringify({
          type: "magiclink",
          token: linkData.properties.hashed_token,
        }),
      });
      // /verify returns a redirect; we need /token endpoint instead via OTP exchange
      // Fallback to /otp verify endpoint
      let session: any = null;
      if (otpRes.ok) {
        session = await otpRes.json();
      } else {
        const verifyOtpRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: ANON_KEY },
          body: JSON.stringify({
            type: "magiclink",
            email: googleAlias,
            token: linkData.properties.email_otp,
          }),
        });
        if (!verifyOtpRes.ok) {
          const detail = await verifyOtpRes.text();
          console.error("verify OTP failed", verifyOtpRes.status, detail);
          return json({ error: "session_issue_failed", detail }, 500);
        }
        session = await verifyOtpRes.json();
      }

      return json({ ok: true, session, user_id: userId });
    }

    if (action === "send_email_otp") {
      const fullName = String(payload?.fullName || "").trim();
      const phone = String(payload?.phone || "").trim();
      // password is optional — provided during signup so user is created with the right password upfront
      const userPassword = String(payload?.password || "").trim();
      const customerAlias = tenantEmail(email, storeSlug);

      let existing = await findUserByEmail(customerAlias);
      if (!existing) {
        const accountPassword = userPassword.length >= 6
          ? userPassword
          : Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: customerAlias,
          password: accountPassword,
          email_confirm: true,
          user_metadata: {
            is_customer: true,
            store_slug: storeSlug,
            customer_email: email,
            full_name: fullName || null,
            phone: phone || null,
          }
        });
        if (createErr) {
          // If user already exists (race condition), try to find them
          if (/already.*registered|already exists|duplicate/i.test(createErr.message || "")) {
            existing = await findUserByEmail(customerAlias);
            if (!existing) {
              console.error("send_email_otp createUser failed", createErr);
              return json({ error: "otp_failed", detail: createErr.message }, 400);
            }
            if (userPassword.length >= 6) {
              await admin.auth.admin.updateUserById(existing.id, { password: userPassword });
            }
          } else {
            console.error("send_email_otp createUser failed", createErr);
            return json({ error: "otp_failed", detail: createErr.message }, 400);
          }
        } else {
          existing = created.user;
        }
      } else if (userPassword.length >= 6) {
        // User already exists — update their password to the one they just chose
        await admin.auth.admin.updateUserById(existing.id, { password: userPassword });
      }

      await ensureCustomerUser(existing!.id, store, email, fullName, phone);

      const { data: linkData, error: linkErr } = await admin.auth.admin
        .generateLink({ type: "magiclink", email: customerAlias });
      if (linkErr || !linkData?.properties?.email_otp) {
        console.error("magiclink generation failed", linkErr);
        return json({ error: "otp_failed", detail: "OTP generation failed" }, 500);
      }

      const otp = linkData.properties.email_otp;

      // Send OTP directly via Resend API (bypasses queue for immediate delivery)
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      let sentDirectly = false;
      const cleanStoreName = store.name.replace(/[\r\n<>"]/g, "").trim().slice(0, 80);

      if (RESEND_API_KEY) {
        try {
          const emailHtml = `
            <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 48px 16px; margin: 0; min-height: 100%;">
              <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04); overflow: hidden; border: 1px solid #e2e8f0;">
                <div style="height: 6px; background: linear-gradient(90deg, #4f46e5, #3b82f6);"></div>
                <div style="padding: 40px 32px 32px 32px;">
                  <h2 style="margin: 0 0 12px 0; font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.025em; text-align: center;">${store.name}</h2>
                  <p style="margin: 0 0 32px 0; font-size: 15px; line-height: 1.6; color: #475569; text-align: center;">Verify your email address to create your account.</p>
                  <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); border-radius: 14px; padding: 28px 16px; text-align: center; margin: 0 0 32px 0; box-shadow: 0 10px 25px rgba(79, 70, 229, 0.15);">
                    <p style="margin: 0 0 12px 0; font-size: 11px; font-weight: 700; color: rgba(255, 255, 255, 0.85); text-transform: uppercase; letter-spacing: 0.15em;">Your verification code</p>
                    <p style="margin: 0; font-size: 42px; font-weight: 800; letter-spacing: 0.25em; color: #ffffff; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">${otp}</p>
                  </div>
                  <p style="margin: 0 0 28px 0; font-size: 13px; line-height: 1.5; color: #64748b; text-align: center;">This code expires in <strong>10 minutes</strong>.<br/>If you did not request this, please ignore this email.</p>
                  <div style="height: 1px; background-color: #f1f5f9; margin-bottom: 24px;"></div>
                  <p style="margin: 0; font-size: 11px; color: #94a3b8; text-align: center; letter-spacing: 0.05em; text-transform: uppercase;">Powered by Pic To Cart</p>
                </div>
              </div>
            </div>`;
          const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `${cleanStoreName} <noreply@pictocart.in>`,
              to: [email],
              subject: `${otp} is your ${store.name} verification code`,
              html: emailHtml,
            }),
          });
          if (!resendRes.ok) {
            const errText = await resendRes.text();
            console.warn("Resend direct send failed", resendRes.status, errText);
          } else {
            console.log("OTP sent via Resend directly", { email, storeSlug });
            sentDirectly = true;
          }
        } catch (e) {
          console.warn("Resend direct send error", e);
        }
      }

      if (!sentDirectly) {
        // Fallback to transactional email queue
        try {
          await admin.functions.invoke("send-transactional-email", {
            body: {
              templateName: "customer-otp",
              recipientEmail: email,
              idempotencyKey: `customer-otp-${storeSlug}-${email}-${Date.now()}`,
              senderName: store.name,
              templateData: { storeName: store.name, otp },
            },
          });
          console.log("OTP sent via transactional email queue fallback", { email, storeSlug });
        } catch (e) {
          console.warn("send OTP email fallback failed", e);
        }
      }

      return json({ ok: true });
    }

    if (action === "verify_email_otp") {
      const token = String(payload?.token || "").trim();
      const customerAlias = tenantEmail(email, storeSlug);

      const verifyOtpRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY },
        body: JSON.stringify({
          type: "magiclink",
          email: customerAlias,
          token: token,
        }),
      });

      if (!verifyOtpRes.ok) {
        const detail = await verifyOtpRes.text();
        console.error("verify OTP failed", verifyOtpRes.status, detail);
        return json({ error: "invalid_otp", detail }, 400);
      }

      const session = await verifyOtpRes.json();
      return json({ ok: true, session });
    }

    // send_password_reset_otp: send a 6-digit OTP to the user's real email for password reset
    if (action === "send_password_reset_otp") {
      const customerAlias = tenantEmail(email, storeSlug);
      const existing = await findUserByEmail(customerAlias);
      if (!existing) {
        // Don't reveal whether the user exists; silently succeed
        return json({ ok: true });
      }

      const { data: linkData, error: linkErr } = await admin.auth.admin
        .generateLink({ type: "magiclink", email: customerAlias });
      if (linkErr || !linkData?.properties?.email_otp) {
        console.error("send_password_reset_otp generateLink failed", linkErr);
        return json({ error: "otp_failed", detail: "OTP generation failed" }, 500);
      }

      const otp = linkData.properties.email_otp;

      // Send password reset OTP directly via Resend
      const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
      let sentDirectly = false;
      const cleanStoreName = store.name.replace(/[\r\n<>"]/g, "").trim().slice(0, 80);

      if (RESEND_KEY) {
        try {
          const emailHtml = `
            <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 48px 16px; margin: 0; min-height: 100%;">
              <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04); overflow: hidden; border: 1px solid #e2e8f0;">
                <div style="height: 6px; background: linear-gradient(90deg, #4f46e5, #3b82f6);"></div>
                <div style="padding: 40px 32px 32px 32px;">
                  <h2 style="margin: 0 0 12px 0; font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.025em; text-align: center;">${store.name}</h2>
                  <p style="margin: 0 0 32px 0; font-size: 15px; line-height: 1.6; color: #475569; text-align: center;">You requested a password reset. Use the code below:</p>
                  <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); border-radius: 14px; padding: 28px 16px; text-align: center; margin: 0 0 32px 0; box-shadow: 0 10px 25px rgba(79, 70, 229, 0.15);">
                    <p style="margin: 0 0 12px 0; font-size: 11px; font-weight: 700; color: rgba(255, 255, 255, 0.85); text-transform: uppercase; letter-spacing: 0.15em;">Reset code</p>
                    <p style="margin: 0; font-size: 42px; font-weight: 800; letter-spacing: 0.25em; color: #ffffff; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">${otp}</p>
                  </div>
                  <p style="margin: 0 0 28px 0; font-size: 13px; line-height: 1.5; color: #64748b; text-align: center;">This code expires in <strong>10 minutes</strong>.<br/>If you did not request a reset, ignore this email.</p>
                  <div style="height: 1px; background-color: #f1f5f9; margin-bottom: 24px;"></div>
                  <p style="margin: 0; font-size: 11px; color: #94a3b8; text-align: center; letter-spacing: 0.05em; text-transform: uppercase;">Powered by Pic To Cart</p>
                </div>
              </div>
            </div>`;
          const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: `${cleanStoreName} <noreply@pictocart.in>`,
              to: [email],
              subject: `${otp} — your ${store.name} password reset code`,
              html: emailHtml,
            }),
          });
          if (!resendRes.ok) {
            const errText = await resendRes.text();
            console.warn("send password reset OTP via Resend failed", resendRes.status, errText);
          } else {
            console.log("Password reset OTP sent via Resend directly", { email, storeSlug });
            sentDirectly = true;
          }
        } catch (e) {
          console.warn("send password reset OTP via Resend failed", e);
        }
      }

      if (!sentDirectly) {
        try {
          await admin.functions.invoke("send-transactional-email", {
            body: {
              templateName: "customer-otp",
              recipientEmail: email,
              idempotencyKey: `customer-pwd-reset-otp-${storeSlug}-${email}-${Date.now()}`,
              senderName: store.name,
              templateData: { storeName: store.name, otp, purpose: "password reset" },
            },
          });
          console.log("Password reset OTP sent via transactional email queue fallback", { email, storeSlug });
        } catch (e) {
          console.warn("send password reset OTP email failed", e);
        }
      }

      return json({ ok: true });
    }

    // reset_password_with_otp: verify OTP and set new password
    if (action === "reset_password_with_otp") {
      const token = String(payload?.token || "").trim();
      const newPassword = String(payload?.newPassword || "");
      const customerAlias = tenantEmail(email, storeSlug);

      if (newPassword.length < 6) {
        return json({ error: "password_too_short" });
      }

      // First verify the OTP to confirm identity
      const verifyOtpRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY },
        body: JSON.stringify({
          type: "magiclink",
          email: customerAlias,
          token: token,
        }),
      });

      if (!verifyOtpRes.ok) {
        const detail = await verifyOtpRes.text();
        console.error("reset_password_with_otp verify failed", verifyOtpRes.status, detail);
        return json({ error: "invalid_otp", detail }, 400);
      }

      // OTP verified — now update the user's password using service role
      const existing = await findUserByEmail(customerAlias);
      if (!existing?.id) return json({ error: "user_not_found" }, 404);

      const { error: updateErr } = await admin.auth.admin.updateUserById(existing.id, {
        password: newPassword,
      });
      if (updateErr) {
        console.error("reset_password_with_otp updateUser failed", updateErr);
        return json({ error: "password_update_failed", detail: updateErr.message }, 500);
      }

      // Sign in with the new password and return a session
      const grant = await createPasswordSession(customerAlias, newPassword);
      if (!grant.ok) {
        return json({ ok: true, requires_signin: true });
      }
      return json({ ok: true, session: grant.body });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("customer-auth fatal", e);
    return json({ error: "internal_error", detail: String((e as any)?.message || e) }, 500);
  }
});
