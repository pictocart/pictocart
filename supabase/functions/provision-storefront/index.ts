import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REQUIRED_PLACEHOLDERS = ["store_name", "slug", "store_id", "logo_url", "primary", "accent"] as const;

const BodySchema = z.object({
  store_id: z.string().uuid(),
  theme_master_id: z.string().uuid().optional(),
  client_patch_payload: z.record(z.unknown()).default({}),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, service);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = parsed.data;

    // Load store
    const { data: store, error: sErr } = await admin
      .from("stores").select("id, name, slug, category, logo_url, custom_domain, user_id").eq("id", body.store_id).single();
    if (sErr || !store) throw new Error("Store not found");

    // Authorization: store owner or admin
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (store.user_id !== user.id && !isAdmin) throw new Error("Forbidden");

    // Resolve theme master: explicit -> default for category -> any active fallback
    let themeMasterId = body.theme_master_id ?? null;
    if (!themeMasterId && store.category) {
      const { data: def } = await admin.from("theme_master_projects")
        .select("id").eq("category", store.category).eq("is_default", true).eq("is_active", true).maybeSingle();
      themeMasterId = def?.id ?? null;
    }
    if (!themeMasterId) {
      const { data: any } = await admin.from("theme_master_projects")
        .select("id").eq("is_active", true).limit(1).maybeSingle();
      themeMasterId = any?.id ?? null;
    }
    if (!themeMasterId) throw new Error("No active theme master available");

    // Build payload merging defaults from store
    const fullPayload: Record<string, unknown> = {
      store_name: store.name,
      slug: store.slug,
      store_id: store.id,
      logo_url: store.logo_url,
      custom_domain: store.custom_domain,
      ...body.client_patch_payload,
    };

    const missing = REQUIRED_PLACEHOLDERS.filter((k) => {
      const v = fullPayload[k];
      return v === undefined || v === null || String(v).trim() === "";
    });
    if (missing.length) {
      return new Response(JSON.stringify({ error: "Missing required placeholders", missing }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: req_, error: insErr } = await admin.from("provision_requests").insert({
      store_id: store.id,
      theme_master_id: themeMasterId,
      status: "queued",
      client_patch_payload: fullPayload,
      next_run_at: new Date().toISOString(),
    }).select().single();
    if (insErr) throw insErr;

    await admin.from("provision_job_logs").insert({
      request_id: req_.id, step: "queued", status: "info",
      message: `Queued for theme master ${themeMasterId}`,
    });

    return new Response(JSON.stringify({ success: true, request: req_ }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
