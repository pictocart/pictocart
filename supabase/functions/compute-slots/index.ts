// Compute available appointment slots for a provider + service on a given date.
// Honors weekly schedule, per-date overrides/leaves, slot buffer, service
// duration and existing appointments. Public — no auth required (storefront).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  store_id: string;
  provider_id: string;
  service_id: string;
  date: string; // YYYY-MM-DD
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body.store_id || !body.provider_id || !body.service_id || !body.date) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [{ data: svc }, { data: schedules }, { data: existing }] = await Promise.all([
      supabase.from("services").select("duration_min, max_parallel, is_active").eq("id", body.service_id).maybeSingle(),
      supabase.from("provider_schedules").select("*").eq("provider_id", body.provider_id),
      supabase.from("appointments").select("slot_start, slot_end, status")
        .eq("provider_id", body.provider_id)
        .gte("slot_start", `${body.date}T00:00:00Z`)
        .lt("slot_start", `${body.date}T23:59:59Z`)
        .not("status", "in", "(cancelled,no_show)"),
    ]);

    if (!svc || !svc.is_active) {
      return new Response(JSON.stringify({ slots: [], reason: "service_unavailable" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const duration = svc.duration_min ?? 30;
    const maxParallel = svc.max_parallel ?? 1;

    const day = new Date(`${body.date}T00:00:00Z`);
    const weekday = day.getUTCDay();

    const override = (schedules ?? []).find((s: any) => s.override_date === body.date);
    if (override?.is_off) {
      return new Response(JSON.stringify({ slots: [], reason: "day_off" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseRule =
      override ?? (schedules ?? []).find((s: any) => s.override_date === null && s.weekday === weekday);
    if (!baseRule || !baseRule.start_time || !baseRule.end_time) {
      return new Response(JSON.stringify({ slots: [], reason: "no_schedule" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buffer = baseRule.slot_buffer_min ?? 0;
    const [sh, sm] = String(baseRule.start_time).split(":").map(Number);
    const [eh, em] = String(baseRule.end_time).split(":").map(Number);
    const startMs = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), sh, sm);
    const endMs = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), eh, em);

    const slots: { start: string; end: string }[] = [];
    const step = (duration + buffer) * 60 * 1000;
    for (let t = startMs; t + duration * 60 * 1000 <= endMs; t += step) {
      const s = new Date(t).toISOString();
      const e = new Date(t + duration * 60 * 1000).toISOString();
      const overlap = (existing ?? []).filter((a: any) => {
        const aS = new Date(a.slot_start).getTime();
        const aE = new Date(a.slot_end).getTime();
        return aS < t + duration * 60 * 1000 && aE > t;
      }).length;
      if (overlap < maxParallel) slots.push({ start: s, end: e });
    }

    return new Response(JSON.stringify({ slots }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
