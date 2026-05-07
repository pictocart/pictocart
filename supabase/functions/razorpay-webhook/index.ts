// Razorpay webhook handler — verifies HMAC, idempotent, marks orders paid/refunded
// verify_jwt = false (Razorpay does not send a Supabase JWT)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature, x-razorpay-event-id",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const signature = req.headers.get("x-razorpay-signature");
    const eventIdHeader = req.headers.get("x-razorpay-event-id") ?? crypto.randomUUID();
    if (!signature) return json({ error: "Missing signature" }, 400);
    if (!WEBHOOK_SECRET) return json({ error: "Webhook secret not configured" }, 500);

    const raw = await req.text();
    const expected = createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex");
    if (expected !== signature) {
      console.warn("[razorpay-webhook] signature mismatch");
      return json({ error: "Invalid signature" }, 401);
    }

    const event = JSON.parse(raw);
    const eventType: string = event.event;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const payment = event.payload?.payment?.entity;
    const refund = event.payload?.refund?.entity;
    const rzpOrderId: string | undefined = payment?.order_id ?? refund?.notes?.razorpay_order_id;
    const rzpPaymentId: string | undefined = payment?.id ?? refund?.payment_id;

    // Find matching order
    let orderRow: any = null;
    if (rzpOrderId) {
      const { data } = await supabase.from("orders").select("id, store_id, total, amount_refunded, payment_status, status").eq("razorpay_order_id", rzpOrderId).maybeSingle();
      orderRow = data;
    }
    if (!orderRow && rzpPaymentId) {
      const { data } = await supabase.from("orders").select("id, store_id, total, amount_refunded, payment_status, status").eq("razorpay_payment_id", rzpPaymentId).maybeSingle();
      orderRow = data;
    }

    // Idempotency: insert event row; on conflict, exit early
    const { error: dupErr } = await supabase.from("payment_events").insert({
      provider: "razorpay",
      event_id: eventIdHeader,
      event_type: eventType,
      order_id: orderRow?.id ?? null,
      store_id: orderRow?.store_id ?? null,
      razorpay_order_id: rzpOrderId ?? null,
      razorpay_payment_id: rzpPaymentId ?? null,
      payload: event,
    });
    if (dupErr) {
      if (dupErr.code === "23505") {
        return json({ ok: true, duplicate: true });
      }
      console.error("[razorpay-webhook] log error", dupErr);
    }

    if (!orderRow) {
      return json({ ok: true, note: "order not found, event logged" });
    }

    // State transitions
    switch (eventType) {
      case "payment.captured":
      case "order.paid": {
        await supabase.from("orders").update({
          payment_status: "paid",
          razorpay_payment_id: rzpPaymentId ?? orderRow.razorpay_payment_id,
          status: orderRow.status === "pending" ? "confirmed" : orderRow.status,
        }).eq("id", orderRow.id);
        break;
      }
      case "payment.failed": {
        await supabase.from("orders").update({ payment_status: "failed" }).eq("id", orderRow.id);
        break;
      }
      case "refund.created":
      case "refund.processed": {
        if (refund) {
          const amountRupees = Number(refund.amount) / 100;
          // Upsert refund row by razorpay_refund_id
          await supabase.from("refunds").upsert({
            order_id: orderRow.id,
            store_id: orderRow.store_id,
            razorpay_payment_id: rzpPaymentId!,
            razorpay_refund_id: refund.id,
            amount: amountRupees,
            status: eventType === "refund.processed" ? "processed" : "pending",
            speed: refund.speed_processed ?? refund.speed_requested ?? "normal",
          }, { onConflict: "razorpay_refund_id" });

          // Recompute total refunded from refund rows (status processed)
          const { data: sumRow } = await supabase
            .from("refunds").select("amount").eq("order_id", orderRow.id).eq("status", "processed");
          const totalRefunded = (sumRow ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0);
          const newPaymentStatus = totalRefunded >= Number(orderRow.total) ? "refunded" : (totalRefunded > 0 ? "partially_refunded" : orderRow.payment_status);
          await supabase.from("orders").update({
            amount_refunded: totalRefunded,
            payment_status: newPaymentStatus,
          }).eq("id", orderRow.id);
        }
        break;
      }
      case "refund.failed": {
        if (refund) {
          await supabase.from("refunds").upsert({
            order_id: orderRow.id,
            store_id: orderRow.store_id,
            razorpay_payment_id: rzpPaymentId!,
            razorpay_refund_id: refund.id,
            amount: Number(refund.amount) / 100,
            status: "failed",
            error_message: refund.error_description ?? null,
          }, { onConflict: "razorpay_refund_id" });
        }
        break;
      }
      default:
        // Logged but no action
        break;
    }

    return json({ ok: true });
  } catch (e) {
    console.error("[razorpay-webhook] error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
