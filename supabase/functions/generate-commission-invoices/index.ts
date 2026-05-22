// Monthly cron — rolls last month's accrued commissions into one invoice per store
// and attempts auto-debit from the AI credit wallet when opted-in.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MIN_INVOICE_INR = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE);

    // Optional override for backfill / manual runs: { period_start, period_end }
    let periodStart: string;
    let periodEnd: string;
    try {
      const body = await req.json();
      if (body?.period_start && body?.period_end) {
        periodStart = body.period_start;
        periodEnd = body.period_end;
      } else throw 0;
    } catch {
      // Default: previous calendar month (IST)
      const now = new Date();
      const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const lastMonthEnd = new Date(first.getTime() - 1);
      const lastMonthStart = new Date(Date.UTC(lastMonthEnd.getUTCFullYear(), lastMonthEnd.getUTCMonth(), 1));
      periodStart = lastMonthStart.toISOString().slice(0, 10);
      periodEnd = lastMonthEnd.toISOString().slice(0, 10);
    }

    // Aggregate accrued rows per store within period
    const { data: rows, error: rErr } = await admin
      .from("order_commissions")
      .select("id, store_id, gmv_amount, commission_amount, created_at")
      .eq("status", "accrued")
      .gte("created_at", `${periodStart}T00:00:00Z`)
      .lte("created_at", `${periodEnd}T23:59:59Z`);
    if (rErr) return json({ error: rErr.message }, 500);

    const byStore = new Map<string, { ids: string[]; gmv: number; commission: number }>();
    for (const r of rows ?? []) {
      const m = byStore.get(r.store_id) ?? { ids: [], gmv: 0, commission: 0 };
      m.ids.push(r.id);
      m.gmv += Number(r.gmv_amount || 0);
      m.commission += Number(r.commission_amount || 0);
      byStore.set(r.store_id, m);
    }

    const results: any[] = [];
    const dueDate = (() => {
      const d = new Date(`${periodEnd}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 7);
      return d.toISOString().slice(0, 10);
    })();

    for (const [storeId, agg] of byStore) {
      if (agg.commission < MIN_INVOICE_INR) {
        results.push({ store_id: storeId, skipped: "below_minimum" });
        continue;
      }

      // Generate invoice number using existing helper
      const { data: invNumRow } = await admin.rpc("next_invoice_number", {
        _store_id: storeId,
        _prefix: "COM",
      });
      const invoiceNumber = invNumRow as unknown as string;

      const { data: inv, error: iErr } = await admin
        .from("commission_invoices")
        .insert({
          store_id: storeId,
          period_start: periodStart,
          period_end: periodEnd,
          total_gmv: Math.round(agg.gmv * 100) / 100,
          total_commission: Math.round(agg.commission * 100) / 100,
          invoice_number: invoiceNumber,
          due_date: dueDate,
          status: "pending",
        })
        .select("id, total_commission, invoice_number")
        .single();
      if (iErr) {
        results.push({ store_id: storeId, error: iErr.message });
        continue;
      }

      // Mark the accrual rows as invoiced
      await admin
        .from("order_commissions")
        .update({ status: "invoiced", invoice_id: inv.id })
        .in("id", agg.ids);

      // Optional auto-debit from credit wallet
      const { data: storeRow } = await admin
        .from("stores")
        .select("settings, user_id, name")
        .eq("id", storeId)
        .maybeSingle();
      const settings: any = storeRow?.settings || {};
      const autoPay = settings.auto_pay_commission_from_credits !== false; // default true

      let paid = false;
      if (autoPay) {
        const { data: settingsRow } = await admin
          .from("platform_credit_settings").select("base_cost_per_credit_inr, margin_multiplier").eq("id", 1).maybeSingle();
        const inrPerCredit = Number(settingsRow?.base_cost_per_credit_inr ?? 1) * Number(settingsRow?.margin_multiplier ?? 1);
        const creditsNeeded = Math.ceil(Number(inv.total_commission) / Math.max(inrPerCredit, 0.0001));

        const { data: wallet } = await admin
          .from("ai_credit_wallets").select("balance").eq("store_id", storeId).maybeSingle();
        if ((wallet?.balance ?? 0) >= creditsNeeded) {
          // Debit
          const newBal = await admin.rpc("credit_wallet", {
            _store_id: storeId,
            _credits: -creditsNeeded,
            _type: "debit",
            _inr_value: Number(inv.total_commission),
            _razorpay_order_id: null,
            _razorpay_payment_id: null,
            _promo_code: null,
            _granted_by_admin: null,
            _reason: `commission_settlement ${inv.invoice_number}`,
            _metadata: { invoice_id: inv.id, source: "commission_settlement" },
          });
          if (!newBal.error) {
            await admin.from("commission_invoices").update({
              status: "paid",
              paid_at: new Date().toISOString(),
              paid_via: "credits",
            }).eq("id", inv.id);
            paid = true;
          }
        }
      }

      // Notify via transactional email queue (best effort)
      try {
        await admin.functions.invoke("send-transactional-email", {
          body: {
            store_id: storeId,
            template: paid ? "commission_invoice_paid" : "commission_invoice_generated",
            data: {
              invoice_number: inv.invoice_number,
              amount: inv.total_commission,
              period: `${periodStart} → ${periodEnd}`,
              due_date: dueDate,
            },
          },
        });
      } catch (_) { /* swallow */ }

      results.push({ store_id: storeId, invoice_id: inv.id, amount: inv.total_commission, paid });
    }

    return json({ ok: true, period: { periodStart, periodEnd }, results });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
