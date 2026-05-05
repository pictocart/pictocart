import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { costInr } from "../_shared/theme-pricing.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function nextMonthFirst(monthStr?: string): Date {
  if (monthStr) { const [y, m] = monthStr.split("-").map(Number); return new Date(Date.UTC(y, m - 1, 1)); }
  const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

const DEFAULT_BRIEFS = [
  { name: "Aurora", category: "general", vibe: "Soft pastel dream, airy and luminous", palette_hint: "blush + cream + sage" },
  { name: "Obsidian", category: "luxury", vibe: "Dark luxe, gold accents, editorial", palette_hint: "near-black + gold + ivory" },
  { name: "Bloom", category: "beauty", vibe: "Botanical, fresh, feminine", palette_hint: "rose + olive + cream" },
  { name: "Voltage", category: "creative/tech", vibe: "Neon pop, energetic, modern", palette_hint: "magenta + cyan + black" },
  { name: "Kinfolk", category: "lifestyle", vibe: "Editorial minimal, warm neutrals", palette_hint: "stone + terracotta + ink" },
  { name: "Saffron", category: "indian/heritage", vibe: "Festive Indian, rich and ornate", palette_hint: "saffron + maroon + gold" },
  { name: "Mono", category: "general", vibe: "Brutalist mono, high-contrast", palette_hint: "black + white + lime accent" },
  { name: "Tide", category: "wellness", vibe: "Coastal calm, organic, serene", palette_hint: "sand + sea + cream" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const month = nextMonthFirst(body.month);
    const monthStr = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}`;
    const count: number = Math.max(1, Math.min(12, Number(body.count ?? 4)));
    const cadenceDays: number = Math.max(1, Math.min(30, Number(body.cadence_days ?? 7)));

    const { data: corpus } = await supabase.from("theme_research_corpus").select("category, hero_style, palette, copy_motifs, insights").order("scraped_at", { ascending: false }).limit(40);

    let themes: any[] = [];
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (key) {
      const prompt = `Plan exactly ${count} distinctive e-commerce themes (no duplicates of: ${(corpus ?? []).map((c: any) => c?.insights?.summary).filter(Boolean).slice(0, 6).join(" | ") || "none yet"}). Mix categories. Return ONLY JSON: { "themes": [{ "name": string, "category": string, "palette_hint": string, "vibe": string }] }.`;
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: prompt }] }),
        });
        if (r.ok) {
          const data = await r.json();
          const content = data.choices?.[0]?.message?.content ?? "";
          await supabase.from("ai_call_log").insert({ function_name: "plan-monthly-calendar", model: "google/gemini-2.5-flash", prompt_tokens: data.usage?.prompt_tokens ?? 0, completion_tokens: data.usage?.completion_tokens ?? 0, cost_inr: costInr("google/gemini-2.5-flash", data.usage?.prompt_tokens ?? 0, data.usage?.completion_tokens ?? 0) });
          const m = content.match(/\{[\s\S]*\}/);
          if (m) themes = (JSON.parse(m[0]).themes ?? []).slice(0, count);
        }
      } catch (e) { console.error("AI plan failed", e); }
    }
    if (themes.length < count) {
      const used = new Set(themes.map((t) => (t.name || "").toLowerCase()));
      for (const d of DEFAULT_BRIEFS) {
        if (themes.length >= count) break;
        if (used.has(d.name.toLowerCase())) continue;
        themes.push(d);
      }
    }

    const inserted: any[] = [];
    const skipped: string[] = [];
    for (let i = 0; i < themes.length; i++) {
      const day = 1 + i * cadenceDays;
      const slotDate = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day));
      const slotStr = slotDate.toISOString().slice(0, 10);
      const { data: existing } = await supabase.from("theme_release_calendar").select("id").eq("slot_date", slotStr).maybeSingle();
      if (existing) { skipped.push(slotStr); continue; }
      const { data: ins } = await supabase.from("theme_release_calendar").insert({ slot_date: slotStr, category: themes[i].category, status: "planned", theme_brief: themes[i] }).select().single();
      if (ins) inserted.push(ins);
    }
    return json({ ok: true, month: monthStr, planned: inserted.length, skipped_dates: skipped, themes: inserted });
  } catch (e) { return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500); }
});
