// Shiprocket courier proxy — the sole shipping provider for the platform.
// Sellers must create a dedicated Shiprocket API User (Settings → API → Configure).
//
// Actions:
//   - serviceability { pickup_pincode, delivery_pincode, weight, cod }
//   - create-shipment { shipment }
//   - track { waybill }
//
// Credentials are stored per-store in `store_secrets`:
//   shiprocket_email, shiprocket_password (live tokens are fetched + cached
//   in `shiprocket_token` / `shiprocket_token_expires_at`).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE = "https://apiv2.shiprocket.in/v1/external";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function getToken(admin: any, store_id: string) {
  const { data: secrets } = await admin
    .from("store_secrets")
    .select("shiprocket_email, shiprocket_password, shiprocket_token, shiprocket_token_expires_at")
    .eq("store_id", store_id)
    .maybeSingle();

  if (!secrets?.shiprocket_email || !secrets?.shiprocket_password) {
    return { error: "Shiprocket credentials not configured" };
  }

  const cached = secrets.shiprocket_token;
  const exp = secrets.shiprocket_token_expires_at ? new Date(secrets.shiprocket_token_expires_at).getTime() : 0;
  if (cached && exp > Date.now() + 60_000) return { token: cached };

  const r = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: secrets.shiprocket_email, password: secrets.shiprocket_password }),
  });
  const j = await r.json();
  if (!r.ok || !j.token) return { error: j.message || "Shiprocket auth failed" };

  await admin
    .from("store_secrets")
    .update({
      shiprocket_token: j.token,
      shiprocket_token_expires_at: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("store_id", store_id);

  return { token: j.token };
}

function sanitizePhone(phone: any): string {
  if (!phone) return "9999999999";
  let digits = String(phone).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (digits.length > 10) {
    digits = digits.slice(-10);
  }
  return digits.length === 10 ? digits : "9999999999";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, store_id } = body;
    if (!action) return json({ error: "action is required" }, 400);
    if (action !== "auth" && !store_id) return json({ error: "action and store_id are required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Only the public storefront pincode check (serviceability) and tracking check are allowed anonymously.
    // create-shipment exposes the seller's Shiprocket account and MUST be authenticated.
    if (action !== "serviceability" && action !== "check-serviceability" && action !== "track") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userData } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!userData?.user) return json({ error: "Unauthorized" }, 401);

      if (action !== "auth") {
        const { data: storeOwn } = await admin
          .from("stores")
          .select("user_id")
          .eq("id", store_id)
          .maybeSingle();
        if (!storeOwn) return json({ error: "Store not found" }, 404);

        let isAllowed = storeOwn.user_id === userData.user.id;
        if (!isAllowed) {
          const { data: staff } = await admin
            .from("store_staff")
            .select("id")
            .eq("store_id", store_id)
            .eq("user_id", userData.user.id)
            .maybeSingle();
          if (staff) isAllowed = true;
        }
        if (!isAllowed) return json({ error: "Forbidden" }, 403);
      }
    }

    if (action === "auth") {
      const { email, password } = body;
      if (!email || !password) return json({ error: "email and password are required" }, 400);
      const r = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (!r.ok || !j.token) return json({ error: j.message || "Shiprocket auth failed" }, 400);
      return json({ token: j.token });
    }

    const t = await getToken(admin, store_id);
    if (t.error) return json({ error: t.error }, 400);
    const headers = { Authorization: `Bearer ${t.token}`, "Content-Type": "application/json" };

    if (action === "get-wallet-balance") {
      const r = await fetch(`${BASE}/account/details/wallet-balance`, { headers });
      const j = await r.json();
      if (!r.ok) return json({ error: j.message || "Failed to fetch wallet balance", raw: j }, 400);
      const val = j.balance_amount !== undefined ? j.balance_amount : (j.data?.balance_amount !== undefined ? j.data.balance_amount : 0);
      return json({ balance: parseFloat(String(val)) || 0, raw: j });
    }

    if (action === "get-courier-rates") {
      let { pickup_pincode, delivery_pincode, weight = 0.5, cod = 0, length = 15, breadth = 15, height = 15, declared_value = 100, is_return = 0 } = body;
      if (!pickup_pincode) {
        const { data: storeRow } = await admin
          .from("stores")
          .select("settings")
          .eq("id", store_id)
          .maybeSingle();
        pickup_pincode = (storeRow?.settings as any)?.shipping?.pickup?.pincode;
      }
      if (!pickup_pincode || !delivery_pincode) {
        return json({ error: "pickup_pincode and delivery_pincode are required" }, 400);
      }
      const url = `${BASE}/courier/serviceability/?pickup_postcode=${pickup_pincode}&delivery_postcode=${delivery_pincode}&cod=${cod}&weight=${weight}&length=${length}&breadth=${breadth}&height=${height}&declared_value=${declared_value}&is_return=${is_return}`;
      const r = await fetch(url, { headers });
      const j = await r.json();
      if (!r.ok) return json({ error: j.message || "Failed to fetch courier rates", raw: j }, 400);
      return json({
        couriers: j?.data?.available_courier_companies || [],
        raw: j
      });
    }

    if (action === "serviceability" || action === "check-serviceability") {
      let { pickup_pincode, delivery_pincode, weight = 0.5, cod = 0 } = body;
      if (!delivery_pincode && body.destination_pincode) delivery_pincode = body.destination_pincode;
      if (!pickup_pincode) {
        const { data: storeRow } = await admin
          .from("stores")
          .select("settings")
          .eq("id", store_id)
          .maybeSingle();
        pickup_pincode = (storeRow?.settings as any)?.shipping?.pickup?.pincode;
      }
      if (!pickup_pincode || !delivery_pincode) {
        return json({ error: "pickup_pincode and delivery_pincode are required", serviceable: false }, 400);
      }
      const url = `${BASE}/courier/serviceability/?pickup_postcode=${pickup_pincode}&delivery_postcode=${delivery_pincode}&cod=${cod}&weight=${weight}`;
      const r = await fetch(url, { headers });
      const j = await r.json();
      const couriers = j?.data?.available_courier_companies || [];
      const cheapest = couriers[0];
      const days = cheapest?.estimated_delivery_days
        ? parseInt(String(cheapest.estimated_delivery_days), 10)
        : null;
      return json({
        ok: couriers.length > 0,
        serviceable: couriers.length > 0,
        estimated_days: Number.isFinite(days as number) ? days : null,
        courier: cheapest?.courier_name,
        rate: cheapest?.rate,
        etd: cheapest?.etd,
        raw: j,
      });
    }

    if (action === "create-shipment") {
      const s = body.shipment || {};
      const payload = {
        order_id: s.order_number,
        order_date: new Date().toISOString().slice(0, 10),
        pickup_location: s.pickup_name || "Primary",
        billing_customer_name: s.customer_name,
        billing_last_name: "",
        billing_address: s.customer_address,
        billing_city: s.customer_city,
        billing_pincode: s.customer_pincode,
        billing_state: s.customer_state,
        billing_country: "India",
        billing_email: s.customer_email || "noreply@pictocart.in",
        billing_phone: sanitizePhone(s.customer_phone),
        shipping_is_billing: true,
        order_items: [{
          name: `Order ${s.order_number}`,
          sku: s.order_number,
          units: 1,
          selling_price: s.total_amount || 0,
        }],
        payment_method: s.payment_mode === "COD" ? "COD" : "Prepaid",
        sub_total: s.total_amount || 0,
        length: s.length || 15,
        breadth: s.breadth || 15,
        height: s.height || 15,
        weight: (s.weight || 500) / 1000,
      };

      const r = await fetch(`${BASE}/orders/create/adhoc`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok || !j.shipment_id) return json({ error: j.message || "Shiprocket create failed", raw: j });

      // Assign courier & generate AWB
      const awbBody: any = { shipment_id: j.shipment_id };
      if (body.courier_id) {
        awbBody.courier_id = body.courier_id;
      }
      
      const awbR = await fetch(`${BASE}/courier/assign/awb`, {
        method: "POST",
        headers,
        body: JSON.stringify(awbBody),
      });
      const jAwb = await awbR.json();
      const awbCode = jAwb?.response?.data?.awb_code || jAwb?.awb_code || jAwb?.response?.awb_code;

      if (!awbR.ok || !awbCode) {
        return json({
          error: jAwb?.message || jAwb?.response?.data?.message || "Failed to assign AWB courier. Please check your Shiprocket wallet balance or courier serviceability.",
          shipment_id: j.shipment_id,
          order_id: j.order_id,
          raw: jAwb,
        });
      }

      return json({ 
        waybill: awbCode, 
        shipment_id: j.shipment_id, 
        order_id: j.order_id,
        courier_name: jAwb?.response?.data?.courier_name || "",
        raw: { create: j, awb: jAwb } 
      });
    }

    if (action === "create-reverse-shipment") {
      const s = body.reverse_shipment || {};
      const payload = {
        order_id: s.order_number,
        order_date: new Date().toISOString().slice(0, 10),
        pickup_customer_name: s.pickup_name,
        pickup_last_name: "",
        pickup_address: s.pickup_address,
        pickup_city: s.pickup_city,
        pickup_state: s.pickup_state,
        pickup_country: "India",
        pickup_pincode: s.pickup_pincode,
        pickup_phone: sanitizePhone(s.pickup_phone),
        shipping_customer_name: s.shipping_name,
        shipping_last_name: "",
        shipping_address: s.shipping_address,
        shipping_city: s.shipping_city,
        shipping_state: s.shipping_state,
        shipping_country: "India",
        shipping_pincode: s.shipping_pincode,
        shipping_phone: sanitizePhone(s.shipping_phone),
        order_items: (s.items || []).map((it: any) => ({
          name: it.name || "Return Item",
          sku: it.sku || "RETURN-SKU",
          units: it.units || 1,
          selling_price: it.selling_price || 0,
        })),
        payment_method: "Prepaid",
        sub_total: s.total_amount || 0,
        length: s.length || 15,
        breadth: s.breadth || 15,
        height: s.height || 15,
        weight: (s.weight || 100) / 1000,
      };

      const r = await fetch(`${BASE}/orders/create/return`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok || !j.shipment_id) return json({ error: j.message || "Shiprocket reverse order creation failed", raw: j });

      // Assign courier & generate return AWB
      const awbBody: any = { shipment_id: j.shipment_id, is_return: 1 };
      if (body.courier_id) {
        awbBody.courier_id = body.courier_id;
      }
      
      const awbR = await fetch(`${BASE}/courier/assign/awb`, {
        method: "POST",
        headers,
        body: JSON.stringify(awbBody),
      });
      const jAwb = await awbR.json();
      const awbCode = jAwb?.response?.data?.awb_code || jAwb?.awb_code || jAwb?.response?.awb_code;

      if (!awbR.ok || !awbCode) {
        return json({
          error: jAwb?.message || jAwb?.response?.data?.message || "Failed to assign return AWB courier.",
          shipment_id: j.shipment_id,
          order_id: j.order_id,
          raw: jAwb,
        });
      }

      return json({ 
        waybill: awbCode, 
        shipment_id: j.shipment_id, 
        order_id: j.order_id,
        courier_name: jAwb?.response?.data?.courier_name || "",
        raw: { create: j, awb: jAwb } 
      });
    }

    if (action === "generate-label") {
      const { shipment_id } = body;
      if (!shipment_id) return json({ error: "shipment_id is required" }, 400);
      const r = await fetch(`${BASE}/courier/generate/label`, {
        method: "POST",
        headers,
        body: JSON.stringify({ shipment_id: [Number(shipment_id)] }),
      });
      const j = await r.json();
      if (!r.ok || !j.label_url) return json({ error: j.message || "Failed to generate label", raw: j });
      return json({ label_url: j.label_url, raw: j });
    }

    if (action === "generate-invoice") {
      const { order_id } = body;
      if (!order_id) return json({ error: "order_id is required" }, 400);
      const r = await fetch(`${BASE}/orders/print/invoice`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ids: [Number(order_id)] }),
      });
      const j = await r.json();
      if (!r.ok || !j.invoice_url) return json({ error: j.message || "Failed to generate invoice", raw: j });
      return json({ invoice_url: j.invoice_url, raw: j });
    }

    if (action === "cancel-shipment") {
      const { order_id } = body;
      if (!order_id) return json({ error: "order_id is required" }, 400);
      const r = await fetch(`${BASE}/orders/cancel`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ids: [Number(order_id)] }),
      });
      const j = await r.json();
      if (!r.ok) return json({ error: j.message || "Failed to cancel shipment", raw: j });
      return json({ success: true, raw: j });
    }

    if (action === "generate-manifest") {
      const { shipment_id } = body;
      if (!shipment_id) return json({ error: "shipment_id is required" }, 400);
      const r = await fetch(`${BASE}/manifests/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ shipment_id: [Number(shipment_id)] }),
      });
      const j = await r.json();
      if (!r.ok || !j.manifest_url) {
        const printR = await fetch(`${BASE}/manifests/print`, {
          method: "POST",
          headers,
          body: JSON.stringify({ shipment_id: [Number(shipment_id)] }),
        });
        const printJ = await printR.json();
        if (!printR.ok || !printJ.manifest_url) {
          return json({ error: j.message || printJ.message || "Failed to generate/print manifest", raw: { generate: j, print: printJ } });
        }
        return json({ manifest_url: printJ.manifest_url, raw: printJ });
      }
      return json({ manifest_url: j.manifest_url, raw: j });
    }

    if (action === "request-pickup") {
      const { shipment_id } = body;
      if (!shipment_id) return json({ error: "shipment_id is required" }, 400);
      const r = await fetch(`${BASE}/courier/generate/pickup`, {
        method: "POST",
        headers,
        body: JSON.stringify({ shipment_id: [Number(shipment_id)] }),
      });
      const j = await r.json();
      if (!r.ok) return json({ error: j.message || "Failed to request pickup", raw: j });
      return json({ success: true, raw: j });
    }

    if (action === "track") {
      const r = await fetch(`${BASE}/courier/track/awb/${body.waybill}`, { headers });
      const j = await r.json();
      const t0 = j?.tracking_data;
      const srStatus = t0?.shipment_status || "Unknown";

      const mapShiprocketStatusCode = (status: string | number): string => {
        const code = Number(status);
        switch (code) {
          case 1: return "AWB Assigned";
          case 2: return "Label Generated";
          case 3: return "Pickup Scheduled";
          case 4: return "Pickup Queued";
          case 5: return "In Transit";
          case 6: return "Out for Delivery";
          case 7: return "Delivered";
          case 8: return "Cancelled";
          case 9: return "RTO Initiated";
          case 10: return "RTO Delivered";
          case 11: return "RTO In Transit";
          case 12: return "Lost";
          case 13: return "Pickup Error";
          case 14: return "RTO Reached Hub";
          case 15: return "RTO Out for Delivery";
          case 16: return "Delivered to RTO";
          case 17: return "Pickup Exception";
          case 18: return "Undelivered";
          case 19: return "Delayed";
          case 20: return "Reached Destination Hub";
          default: return String(status);
        }
      };

      const readableStatus = !isNaN(Number(srStatus)) ? mapShiprocketStatusCode(srStatus) : String(srStatus);

      // Auto-update order status in the database if there is a status progression
      try {
        const { data: orderRow } = await admin
          .from("orders")
          .select("id, status, store_id")
          .eq("tracking_number", body.waybill)
          .maybeSingle();

        if (orderRow) {
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

          const mappedStatus = mapShiprocketStatus(readableStatus);
          if (mappedStatus && mappedStatus !== orderRow.status) {
            const updateFields: any = { status: mappedStatus };
            if (mappedStatus === "delivered") {
              updateFields.delivered_at = new Date().toISOString();
              updateFields.payment_status = "paid";
            }
            await admin
              .from("orders")
              .update(updateFields)
              .eq("id", orderRow.id);
            
            // Send email notification for status updates
            const projectId = Deno.env.get("SUPABASE_URL")?.split("//")?.[1]?.split(".")?.[0];
            if (projectId && (mappedStatus === "shipped" || mappedStatus === "delivered")) {
              const notificationType = mappedStatus === "shipped" ? "order_shipped" : "order_delivered";
              await fetch(`https://${projectId}.supabase.co/functions/v1/send-order-notification`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({ type: notificationType, order_id: orderRow.id, store_id: orderRow.store_id }),
              }).catch(() => {});
            }
          }
        }
      } catch (dbErr) {
        console.error("Error auto-updating order status from track action:", dbErr);
      }

      return json({
        status: readableStatus,
        location: t0?.shipment_track?.[0]?.current_status,
        scans: t0?.shipment_track_activities || [],
        raw: j,
      });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
