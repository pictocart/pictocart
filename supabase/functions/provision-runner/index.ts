import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;

// Linear progression of the manual remix workflow. Each tick advances one step
// for ALL eligible requests until they require a manual hand-off (domain_pending → live).
const NEXT_STATUS: Record<string, string> = {
  queued: "remixing",
  remixing: "patching",
  patching: "domain_pending",
  // domain_pending requires a human to set new_project_url + mark live
};

const renderPrompt = (template: string, payload: Record<string, unknown>) =>
  template.replace(/\{(\w+)\}/g, (_, k) => String(payload?.[k] ?? `{${k}}`));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service);

  const log = (request_id: string, step: string, status: string, message: string, metadata: Record<string, unknown> = {}) =>
    admin.from("provision_job_logs").insert({ request_id, step, status, message, metadata });

  try {
    const now = new Date();
    const { data: jobs, error } = await admin
      .from("provision_requests")
      .select("*")
      .in("status", ["queued", "remixing", "patching"])
      .lte("next_run_at", now.toISOString())
      .lt("attempts", MAX_ATTEMPTS)
      .order("next_run_at", { ascending: true })
      .limit(10);
    if (error) throw error;

    const results: Array<Record<string, unknown>> = [];

    for (const job of jobs ?? []) {
      const next = NEXT_STATUS[job.status];
      const attempts = (job.attempts ?? 0) + 1;
      try {
        await log(job.id, job.status, "start", `Processing ${job.status} (attempt ${attempts})`);

        // Step-specific work
        if (job.status === "queued") {
          // Validate theme master is still active and render prompt
          const { data: theme } = await admin.from("theme_master_projects")
            .select("id, name, remix_url, client_patch_prompt, is_active, category")
            .eq("id", job.theme_master_id).maybeSingle();

          if (!theme || !theme.is_active) {
            // Try fallback: default for category, then any active
            const { data: store } = await admin.from("stores").select("category").eq("id", job.store_id).maybeSingle();
            let fallback = null as null | { id: string; client_patch_prompt: string; remix_url: string | null };
            if (store?.category) {
              const { data } = await admin.from("theme_master_projects")
                .select("id, client_patch_prompt, remix_url")
                .eq("category", store.category).eq("is_default", true).eq("is_active", true).maybeSingle();
              fallback = data;
            }
            if (!fallback) {
              const { data } = await admin.from("theme_master_projects")
                .select("id, client_patch_prompt, remix_url")
                .eq("is_active", true).limit(1).maybeSingle();
              fallback = data;
            }
            if (!fallback) throw new Error("No active theme master available");

            await admin.from("provision_requests").update({
              theme_master_id: fallback.id,
            }).eq("id", job.id);
            await log(job.id, "fallback", "warn", `Theme master inactive, switched to ${fallback.id}`);
            job.theme_master_id = fallback.id;
          }

          const { data: themeFinal } = await admin.from("theme_master_projects")
            .select("client_patch_prompt, remix_url").eq("id", job.theme_master_id).single();
          const rendered = renderPrompt(themeFinal!.client_patch_prompt, job.client_patch_payload ?? {});

          await admin.from("provision_requests").update({
            rendered_patch_prompt: rendered,
            status: next,
            attempts,
            last_attempt_at: now.toISOString(),
            next_run_at: new Date(Date.now() + 30_000).toISOString(),
            started_at: job.started_at ?? now.toISOString(),
          }).eq("id", job.id);
          await log(job.id, "remixing", "ok", "Patch prompt rendered, ready for remix", { remix_url: themeFinal!.remix_url });
        } else if (job.status === "remixing") {
          // Wait for new_project_url to be set by the human operator
          if (!job.new_project_url) {
            await admin.from("provision_requests").update({
              attempts,
              last_attempt_at: now.toISOString(),
              next_run_at: new Date(Date.now() + 60_000).toISOString(),
            }).eq("id", job.id);
            await log(job.id, "remixing", "wait", "Awaiting new_project_url from operator");
          } else {
            await admin.from("provision_requests").update({
              status: next, attempts, last_attempt_at: now.toISOString(),
              next_run_at: new Date(Date.now() + 30_000).toISOString(),
            }).eq("id", job.id);
            await log(job.id, "patching", "ok", "Remix detected, advancing to patching");
          }
        } else if (job.status === "patching") {
          // Advance to domain pending after one tick
          await admin.from("provision_requests").update({
            status: next, attempts, last_attempt_at: now.toISOString(),
            next_run_at: new Date(Date.now() + 60_000).toISOString(),
          }).eq("id", job.id);
          await log(job.id, "domain_pending", "ok", "Patch applied, awaiting domain connection");
        }

        results.push({ id: job.id, ok: true });
      } catch (stepErr) {
        const msg = stepErr instanceof Error ? stepErr.message : "Unknown";
        const failed = attempts >= MAX_ATTEMPTS;
        await admin.from("provision_requests").update({
          status: failed ? "failed" : job.status,
          attempts,
          last_attempt_at: now.toISOString(),
          next_run_at: new Date(Date.now() + Math.min(60_000 * attempts, 600_000)).toISOString(),
          error: msg,
        }).eq("id", job.id);
        await log(job.id, job.status, failed ? "failed" : "error", msg);
        results.push({ id: job.id, ok: false, error: msg });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
