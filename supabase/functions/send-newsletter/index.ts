import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function getResendHeaders() {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": RESEND_API_KEY,
  };
}

async function sendEmail(from: string, to: string, subject: string, html: string) {
  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: getResendHeaders(),
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("Resend error:", res.status, t);
    return false;
  }
  return true;
}

function welcomeHtml(storeName: string, storeUrl: string) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff;color:#1a1a1a;">
    <div style="text-align:center;padding-bottom:24px;border-bottom:2px solid #f0f0f0;margin-bottom:24px;">
      <h1 style="font-size:22px;margin:0;">Welcome to ${storeName}! 🎉</h1>
    </div>
    <p>Thanks for subscribing to our newsletter. You'll be the first to know about new arrivals, exclusive offers, and stories from our community.</p>
    <p style="margin:24px 0;text-align:center;">
      <a href="${storeUrl}" style="display:inline-block;padding:12px 28px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Visit Our Store</a>
    </p>
    <p style="color:#666;font-size:13px;text-align:center;margin-top:32px;">— The ${storeName} Team</p>
  </div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { mode, store_id, subject, html, email } = body;

    // Resolve store info & sender
    const { data: store } = await supabase.from("stores").select("name, slug").eq("id", store_id).maybeSingle();
    if (!store) throw new Error("Store not found");

    const { data: domain } = await supabase
      .from("store_email_domains")
      .select("domain, sender_prefix, status")
      .eq("store_id", store_id)
      .maybeSingle();

    const fromEmail = domain && domain.status === "verified"
      ? `${store.name} <${domain.sender_prefix}@${domain.domain}>`
      : `${store.name} <onboarding@resend.dev>`;

    const storeUrl = `https://store-on-tips.lovable.app/store/${store.slug}`;

    if (mode === "welcome") {
      if (!email) throw new Error("email required");
      const ok = await sendEmail(fromEmail, email, `Welcome to ${store.name}!`, welcomeHtml(store.name, storeUrl));
      return new Response(JSON.stringify({ sent: ok }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "broadcast") {
      if (!subject || !html) throw new Error("subject and html required");
      const { data: subs } = await supabase
        .from("newsletter_subscribers")
        .select("email")
        .eq("store_id", store_id);
      const emails = (subs || []).map((s) => s.email);
      let sent = 0, failed = 0;
      // Throttle: 2/sec
      for (const to of emails) {
        const ok = await sendEmail(fromEmail, to, subject, html);
        ok ? sent++ : failed++;
        await new Promise((r) => setTimeout(r, 500));
      }
      return new Response(JSON.stringify({ sent, failed, total: emails.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error("Invalid mode");
  } catch (e) {
    console.error("send-newsletter error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
