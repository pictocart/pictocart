// logistics-events Edge Function
// Handles real-time shipping webhooks from Shiprocket.
// Redeployed with verify_jwt = false for open access.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};







const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    let payload: any = {};
    try {
      if (req.method === "GET") {
        return json({ success: true, message: "Webhook endpoint is online (GET)" });
      }
      payload = await req.json();
    } catch (_) {
      return json({ success: true, message: "Webhook endpoint is online (Empty Body)" });
    }

    const { awb, current_status, etd, scans, courier_name } = payload;
    
    if (!awb) {
      return json({ success: true, message: "Webhook validation successful (No AWB)" });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Find the order that has this AWB
    const { data: order, error: findError } = await admin
      .from("orders")
      .select("id, status, store_id, courier_response")
      .eq("tracking_number", awb)
      .maybeSingle();

    if (findError || !order) {
      const { data: ret, error: findReturnError } = await admin
        .from("returns" as any)
        .select("id, order_id, status, request_type, timeline")
        .eq("pickup_awb", awb)
        .maybeSingle();

      if (findReturnError || !ret) {
        return json({ success: true, message: "Webhook verified, but no order or return request matches AWB: " + awb });
      }

      const mapShiprocketReturnStatus = (statusStr: string): string | null => {
        if (!statusStr) return null;
        const s = statusStr.toLowerCase().trim();
        if (s.includes("delivered") || s.includes("received") || s.includes("rto") || s.includes("returned")) return "received";
        if (s.includes("picked up") || s.includes("transit") || s.includes("out for delivery") || s.includes("picked")) return "picked_up";
        if (s.includes("pickup scheduled") || s.includes("pickup queued") || s.includes("schedule")) return "pickup_scheduled";
        if (s.includes("cancel")) return "cancelled";
        return null;
      };

      const mappedReturnStatus = mapShiprocketReturnStatus(current_status);
      if (mappedReturnStatus && mappedReturnStatus !== ret.status) {
        const updates: any = { status: mappedReturnStatus };
        if (mappedReturnStatus === "picked_up") {
          updates.picked_up_at = new Date().toISOString();
        }
        const newTimelineEntry = { at: new Date().toISOString(), status: mappedReturnStatus, note: `Status auto-synced via Shiprocket: ${current_status}` };
        const existingTimeline = Array.isArray(ret.timeline) ? ret.timeline : [];
        updates.timeline = [...existingTimeline, newTimelineEntry];

        await admin.from("returns" as any).update(updates).eq("id", ret.id);

        if (mappedReturnStatus === "received") {
          await admin.from("orders").update({ status: "returned", payment_status: "refund_requested" }).eq("id", ret.order_id);
        }
      }

      return json({ success: true, message: "Webhook processed and return status updated successfully" });
    }

    const mapShiprocketStatus = (statusStr: string): string | null => {
      if (!statusStr) return null;
      const s = statusStr.toLowerCase().trim();
      if (s.includes("delivered")) return "delivered";
      if (s.includes("cancel")) return "cancelled";
      if (s.includes("rto") || s.includes("return")) return "returned";
      if (s.includes("transit") || s.includes("shipped") || s.includes("out for delivery") || s.includes("pickup") || s.includes("awb") || s.includes("label")) {
        return "shipped";
      }
      return null;
    };

    const mappedStatus = mapShiprocketStatus(current_status);
    const existingMetadata = (order.courier_response as any) || {};

    const updatedMetadata = {
      ...existingMetadata,
      courier_name: courier_name || existingMetadata.courier_name,
      last_webhook_status: current_status,
      expected_delivery: etd || existingMetadata.expected_delivery,
      webhook_payload: payload,
      updated_at: new Date().toISOString()
    };

    const updateFields: any = {
      courier_response: updatedMetadata
    };

    if (mappedStatus && mappedStatus !== order.status) {
      updateFields.status = mappedStatus;
      if (mappedStatus === "delivered") {
        updateFields.delivered_at = new Date().toISOString();
        updateFields.payment_status = "paid";
      }
    }

    // Update order with the latest status and full webhook log
    const { error: updateError } = await admin
      .from("orders")
      .update(updateFields)
      .eq("id", order.id);

    if (updateError) {
      return json({ error: "Failed to update order database record" }, 500);
    }

    // Fire-and-forget notification triggers
    if (mappedStatus && mappedStatus !== order.status && (mappedStatus === "shipped" || mappedStatus === "delivered")) {
      try {
        const projectId = Deno.env.get("SUPABASE_URL")?.split("//")?.[1]?.split(".")?.[0];
        if (projectId) {
          const notificationType = mappedStatus === "shipped" ? "order_shipped" : "order_delivered";
          await fetch(`https://${projectId}.supabase.co/functions/v1/send-order-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ type: notificationType, order_id: order.id, store_id: order.store_id }),
          });
        }
      } catch (notifyErr) {
        console.error("Failed to send webhook status notification:", notifyErr);
      }
    }

    return json({ success: true, message: "Webhook processed and status updated successfully" });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
