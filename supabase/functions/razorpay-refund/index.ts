// Razorpay refund — store-owner initiated, full or partial
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLISHABLE = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const RZP_KEY = Deno.env.get("RAZORPAY_KEY_ID")!;
const RZP_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const jwt = authHeader.replace("Bearer ", "");
    let userId: string;
    try {
      const parts = jwt.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT format');
      userId = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))).sub;
    } catch (err) {
      return json({ error: "Unauthorized: Invalid token format" }, 401);
    }
    if (!userId) return json({ error: "Unauthorized: No user ID in token" }, 401);

    const body = await req.json().catch(() => ({}));
    const { order_id, amount, reason, speed = "normal" } = body as {
      order_id?: string; amount?: number; reason?: string; speed?: "normal" | "optimum";
    };
    if (!order_id) return json({ error: "order_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: order, error: ordErr } = await admin
      .from("orders")
      .select("id, store_id, total, amount_refunded, razorpay_payment_id, payment_status")
      .eq("id", order_id)
      .maybeSingle();
    if (ordErr || !order) return json({ error: "Order not found" }, 404);

    const { data: store, error: storeErr } = await admin
      .from("stores")
      .select("user_id")
      .eq("id", order.store_id)
      .maybeSingle();
    if (storeErr || !store) return json({ error: "Store not found" }, 404);
    // Check authorization: Owner, Admin, or Store Staff
    let isAuthorized = false;
    if (store.user_id === userId) {
      isAuthorized = true;
    } else {
      const { data: adminCheck } = await admin.rpc("has_role", {
        _user_id: userId,
        _role: "admin"
      });
      if (adminCheck) {
        isAuthorized = true;
      } else {
        const { data: staffCheck } = await admin
          .from("store_staff")
          .select("id")
          .eq("store_id", order.store_id)
          .eq("user_id", userId)
          .maybeSingle();
        if (staffCheck) {
          isAuthorized = true;
        }
      }
    }

    
    if (!isAuthorized) return json({ error: "Forbidden" }, 403);
    if (!order.razorpay_payment_id) return json({ error: "Order has no captured Razorpay payment" }, 400);
    if (
      order.payment_status !== "paid" && 
      order.payment_status !== "partially_refunded" && 
      order.payment_status !== "refund_requested" &&
      order.payment_status !== "refund_in_process"
    ) {
      return json({ error: `Cannot refund order in status ${order.payment_status}` }, 400);
    }

    const refundable = Number(order.total) - Number(order.amount_refunded ?? 0);
    const refundAmount = amount && amount > 0 ? Number(amount) : refundable;
    if (refundAmount <= 0 || refundAmount > refundable) {
      return json({ error: `Refundable amount is ₹${refundable.toFixed(2)}` }, 400);
    }

    // Call Razorpay
    const auth = btoa(`${RZP_KEY}:${RZP_SECRET}`);
    const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${order.razorpay_payment_id}/refund`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(refundAmount * 100),
        speed,
        notes: { reason: reason ?? "", initiated_by: userId, order_id: order.id },
      }),
    });
    const rzpData = await rzpRes.json();
    if (!rzpRes.ok) {
      console.error("[razorpay-refund] rzp error", rzpData);
      return json({ error: rzpData?.error?.description ?? "Refund failed" }, 400);
    }

    // Insert refund row (webhook will update to processed)
    await admin.from("refunds").insert({
      order_id: order.id,
      store_id: order.store_id,
      razorpay_payment_id: order.razorpay_payment_id,
      razorpay_refund_id: rzpData.id,
      amount: refundAmount,
      status: rzpData.status === "processed" ? "processed" : "pending",
      speed,
      reason,
      initiated_by: userId,
    });

    return json({ ok: true, refund: rzpData });
  } catch (e) {
    console.error("[razorpay-refund] error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
