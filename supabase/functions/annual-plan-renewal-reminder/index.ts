import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Find annual subscriptions expiring within 30 days that haven't been reminded in the last 24h.
    const { data: subs } = await admin
      .from("subscriptions")
      .select("id, store_id, plan, current_period_end, last_renewal_reminder_at, stores(name, user_id)")
      .eq("billing_cycle", "annual")
      .eq("status", "active")
      .not("current_period_end", "is", null)
      .lte("current_period_end", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());

    let sent = 0;
    for (const sub of subs || []) {
      const end = new Date(sub.current_period_end as string).getTime();
      const daysLeft = Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
      if (daysLeft < -7) continue; // skip very stale
      const sendable = [30, 7, 1].includes(daysLeft) || daysLeft === 0;
      if (!sendable) continue;

      const last = sub.last_renewal_reminder_at ? new Date(sub.last_renewal_reminder_at).getTime() : 0;
      if (Date.now() - last < 20 * 60 * 60 * 1000) continue;

      // Resolve owner email
      const ownerId = (sub as any).stores?.user_id;
      if (!ownerId) continue;
      const { data: userInfo } = await admin.auth.admin.getUserById(ownerId);
      const email = userInfo?.user?.email;
      if (!email) continue;

      await admin.functions.invoke("send-transactional-email", {
        body: {
          to: email,
          template: "annual-renewal",
          data: {
            storeName: (sub as any).stores?.name || "",
            planName: sub.plan,
            daysLeft,
            endDate: new Date(sub.current_period_end as string).toDateString(),
          },
        },
      }).catch((e) => console.error("send error", e));

      await admin
        .from("subscriptions")
        .update({ last_renewal_reminder_at: new Date().toISOString() })
        .eq("id", sub.id);
      sent++;
    }

    return new Response(JSON.stringify({ success: true, processed: subs?.length || 0, sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("annual-plan-renewal-reminder error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
