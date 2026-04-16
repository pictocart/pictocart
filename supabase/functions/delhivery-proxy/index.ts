import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STAGING_BASE = "https://staging-express.delhivery.com";
const PROD_BASE = "https://track.delhivery.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, store_id } = body;

    if (!action || !store_id) {
      return new Response(
        JSON.stringify({ error: "action and store_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Look up the API token server-side. Never accept it from the client.
    const { data: secrets } = await admin
      .from("store_secrets")
      .select("delhivery_api_token, delhivery_test_mode")
      .eq("store_id", store_id)
      .maybeSingle();

    const api_token = secrets?.delhivery_api_token;
    const test_mode = secrets?.delhivery_test_mode ?? true;

    // For mutating/sensitive actions, require an authenticated store owner
    const sensitiveActions = new Set(["create-shipment"]);
    if (sensitiveActions.has(action)) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: store } = await admin
        .from("stores")
        .select("user_id")
        .eq("id", store_id)
        .maybeSingle();
      if (!store || store.user_id !== claimsData.claims.sub) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!api_token) {
      return new Response(
        JSON.stringify({ error: "Shipping not configured for this store" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const base = test_mode ? STAGING_BASE : PROD_BASE;
    const headers = {
      Authorization: `Token ${api_token}`,
      "Content-Type": "application/json",
    };

    let result;

    switch (action) {
      case "check-serviceability": {
        const { destination_pincode } = body;
        if (!destination_pincode) {
          return new Response(
            JSON.stringify({ error: "destination_pincode required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const url = `${base}/c/api/pin-codes/json/?filter_codes=${destination_pincode}`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Delhivery API error [${res.status}]: ${text}`);
        }
        const data = await res.json();
        const deliveryInfo = data?.delivery_codes || [];
        const serviceable = deliveryInfo.length > 0;
        result = {
          serviceable,
          details: serviceable ? deliveryInfo[0]?.postal_code : null,
          estimated_days: serviceable ? (deliveryInfo[0]?.postal_code?.max_days || 5) : null,
        };
        break;
      }

      case "estimate-rate": {
        const { origin_pincode, destination_pincode, weight = 0.5 } = body;
        if (!origin_pincode || !destination_pincode) {
          return new Response(
            JSON.stringify({ error: "origin_pincode and destination_pincode required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const url = `${base}/api/kinko/v1/invoice/charges/.json?md=S&ss=Delivered&d_pin=${destination_pincode}&o_pin=${origin_pincode}&cgm=${Math.ceil(weight * 1000)}&pt=Pre-paid&cod=0`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Delhivery rate API error [${res.status}]: ${text}`);
        }
        const data = await res.json();
        result = {
          total_charge: data?.[0]?.total_amount || 0,
          charge_breakdown: data?.[0] || {},
        };
        break;
      }

      case "create-shipment": {
        const { shipment } = body;
        if (!shipment) {
          return new Response(
            JSON.stringify({ error: "shipment data required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const packageData = {
          shipments: [
            {
              name: shipment.customer_name,
              add: shipment.customer_address,
              pin: shipment.customer_pincode,
              city: shipment.customer_city,
              state: shipment.customer_state,
              country: "India",
              phone: shipment.customer_phone,
              order: shipment.order_number,
              payment_mode: shipment.payment_mode || "Pre-paid",
              return_pin: shipment.pickup_pincode,
              return_city: shipment.pickup_city,
              return_phone: shipment.pickup_phone,
              return_add: shipment.pickup_address,
              return_state: shipment.pickup_state,
              return_name: shipment.pickup_name,
              weight: shipment.weight || 500,
              quantity: 1,
              cod_amount: shipment.cod_amount || 0,
              order_date: new Date().toISOString(),
              total_amount: shipment.total_amount || 0,
              seller_name: shipment.seller_name,
            },
          ],
          pickup_location: {
            name: shipment.pickup_name,
            add: shipment.pickup_address,
            city: shipment.pickup_city,
            pin_code: shipment.pickup_pincode,
            country: "India",
            phone: shipment.pickup_phone,
          },
        };

        const formData = `format=json&data=${encodeURIComponent(JSON.stringify(packageData))}`;
        const url = `${base}/api/cmu/create.json`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Token ${api_token}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Delhivery create shipment error [${res.status}]: ${text}`);
        }
        const data = await res.json();
        const waybill = data?.packages?.[0]?.waybill || data?.upload_wbn || null;
        result = {
          success: data?.success || false,
          waybill,
          response: data,
        };
        break;
      }

      case "track": {
        const { waybill } = body;
        if (!waybill) {
          return new Response(
            JSON.stringify({ error: "waybill number required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const url = `${base}/api/v1/packages/json/?waybill=${waybill}`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Delhivery tracking error [${res.status}]: ${text}`);
        }
        const data = await res.json();
        const shipmentData = data?.ShipmentData?.[0]?.Shipment || null;
        result = {
          status: shipmentData?.Status?.Status || "Unknown",
          status_datetime: shipmentData?.Status?.StatusDateTime || null,
          location: shipmentData?.Status?.StatusLocation || null,
          scans: shipmentData?.Scans || [],
          expected_delivery: shipmentData?.ExpectedDeliveryDate || null,
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("delhivery-proxy error:", error);
    const message = "Shipping provider error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
