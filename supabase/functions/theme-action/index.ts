// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const BASE = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;
const AUTH = { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" };

async function requireAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization");
  if (!auth) { console.warn("theme-action: no Authorization header"); return false; }
  const token = auth.replace(/^Bearer\s+/i, "");
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) { console.warn("theme-action: getUser failed", userErr?.message); return false; }
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (error) console.warn("theme-action: role lookup error", error.message);
  if (!data) console.warn("theme-action: user not admin", user.id);
  return !!data;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!(await requireAdmin(req))) return json({ ok: false, error: "admin only" }, 403);
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === "auto_research") {
      const { data: job } = await supabase.from("research_jobs").insert({ status: "queued", query: body.query ?? null }).select().single();
      const payload = { query: body.query, category: body.category ?? "general", limit: body.limit ?? 8, job_id: job!.id };
      fetch(`${BASE}/auto-research-themes`, { method: "POST", headers: AUTH, body: JSON.stringify(payload) }).catch((e) => console.error("worker", e));
      return json({ ok: true, job_id: job!.id });
    }
    if (action === "research_now") {
      const r = await fetch(`${BASE}/research-themes`, { method: "POST", headers: AUTH, body: JSON.stringify(body.payload ?? {}) });
      return json(await r.json());
    }
    if (action === "plan_now") {
      const r = await fetch(`${BASE}/plan-monthly-calendar`, { method: "POST", headers: AUTH, body: JSON.stringify(body.payload ?? {}) });
      return json(await r.json());
    }
    if (action === "update_settings") {
      const patch: any = {};
      ["auto_research", "auto_generate", "cadence_days", "themes_per_batch", "research_query"].forEach((k) => { if (body[k] !== undefined) patch[k] = body[k]; });
      patch.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from("theme_settings").update(patch).eq("id", 1).select().single();
      if (error) throw error;
      return json({ ok: true, settings: data });
    }
    if (action === "generate_adhoc") {
      const brief = body.brief ?? { name: body.name ?? "Custom Theme", category: body.category ?? "general", vibe: body.vibe ?? "modern minimalist" };
      const themeId = body.theme_id ?? `theme-${crypto.randomUUID().slice(0, 8)}`;
      const r = await fetch(`${BASE}/generate-and-ship-theme`, { method: "POST", headers: AUTH, body: JSON.stringify({ theme_id: themeId, brief }) });
      return json(await r.json());
    }
    if (action === "regenerate_theme") {
      const themeId = body.theme_id;
      if (!themeId) return json({ ok: false, error: "theme_id required" }, 400);
      const { data: latest } = await supabase.from("theme_master_versions").select("files_manifest").eq("theme_id", themeId).order("version", { ascending: false }).limit(1).maybeSingle();
      const brief = body.brief ?? (latest?.files_manifest as any)?.dna ?? {};
      const r = await fetch(`${BASE}/generate-and-ship-theme`, { method: "POST", headers: AUTH, body: JSON.stringify({ theme_id: themeId, brief: { name: brief.name, category: brief.category ?? "general", vibe: brief.vibe } }) });
      return json(await r.json());
    }
    if (action === "refine_theme") {
      const r = await fetch(`${BASE}/refine-theme`, { method: "POST", headers: AUTH, body: JSON.stringify({ theme_id: body.theme_id, feedback: body.feedback }) });
      return json(await r.json());
    }
    if (action === "generate_slot") {
      const { data: slot } = await supabase.from("theme_release_calendar").select("*").eq("id", body.calendar_id).single();
      if (!slot) return json({ ok: false, error: "slot not found" }, 404);
      const r = await fetch(`${BASE}/generate-and-ship-theme`, { method: "POST", headers: AUTH, body: JSON.stringify({ theme_id: `theme-${slot.id.slice(0, 8)}`, brief: slot.theme_brief, calendar_id: slot.id }) });
      return json(await r.json());
    }
    if (action === "skip_slot") {
      await supabase.from("theme_release_calendar").update({ status: "skipped" }).eq("id", body.calendar_id);
      return json({ ok: true });
    }
    if (action === "delete_theme") {
      const themeId = body.theme_id;
      if (!themeId) return json({ ok: false, error: "theme_id required" }, 400);

      // Delete from theme_master_projects
      const { error: pErr } = await supabase.from("theme_master_projects").delete().eq("theme_id", themeId);
      if (pErr) console.error("Error deleting from theme_master_projects:", pErr);

      // Delete from theme_master_versions
      const { error: vErr } = await supabase.from("theme_master_versions").delete().eq("theme_id", themeId);
      if (vErr) console.error("Error deleting from theme_master_versions:", vErr);

      // Delete from theme_master_metrics
      const { error: mErr } = await supabase.from("theme_master_metrics").delete().eq("theme_id", themeId);
      if (mErr) console.error("Error deleting from theme_master_metrics:", mErr);

      return json({ ok: true });
    }
    return json({ ok: false, error: "unknown action" }, 400);
  } catch (e) { return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500); }
});
