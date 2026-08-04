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
    const payload = await req.json();
    const { awb, current_status, etd, scans, courier_name } = payload;
    
    if (!awb) {
      return json({ error: "awb is required in payload" }, 400);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Find the order that has this AWB
    const { data: order, error: findError } = await admin
      .from("orders")
      .select("id, status, store_id, courier_response")
      .eq("tracking_number", awb)
      .maybeSingle();

    if (findError || !order) {
      return json({ error: "Order not found with AWB: " + awb }, 404);
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
