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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, store_id } = body;
    if (!action || !store_id) return json({ error: "action and store_id are required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Only the public storefront pincode check (serviceability) is allowed anonymously.
    // create-shipment and track expose / consume the seller's Shiprocket account and MUST be authenticated.
    if (action !== "serviceability" && action !== "check-serviceability") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userData } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!userData?.user) return json({ error: "Unauthorized" }, 401);

      const { data: storeOwn } = await admin
        .from("stores")
        .select("user_id")
        .eq("id", store_id)
        .maybeSingle();
      if (!storeOwn || storeOwn.user_id !== userData.user.id) return json({ error: "Forbidden" }, 403);
    }

    const t = await getToken(admin, store_id);
    if (t.error) return json({ error: t.error }, 400);
    const headers = { Authorization: `Bearer ${t.token}`, "Content-Type": "application/json" };

    if (action === "serviceability" || action === "check-serviceability") {
      let { pickup_pincode, delivery_pincode, weight = 0.5, cod = 0 } = body;
      // Storefront PincodeChecker uses { destination_pincode } and doesn't know the seller's pickup.
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
      const r = await fetch(`${BASE}/orders/create/adhoc`, {
        method: "POST",
        headers,
        body: JSON.stringify({
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
          billing_phone: s.customer_phone,
          shipping_is_billing: true,
          order_items: [{
            name: `Order ${s.order_number}`,
            sku: s.order_number,
            units: 1,
            selling_price: s.total_amount || 0,
          }],
          payment_method: s.payment_mode === "COD" ? "COD" : "Prepaid",
          sub_total: s.total_amount || 0,
          length: 10, breadth: 10, height: 10,
          weight: (s.weight || 500) / 1000,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.shipment_id) return json({ error: j.message || "Shiprocket create failed", raw: j }, 400);
      return json({ waybill: j.awb_code || String(j.shipment_id), shipment_id: j.shipment_id, raw: j });
    }

    if (action === "track") {
      const r = await fetch(`${BASE}/courier/track/awb/${body.waybill}`, { headers });
      const j = await r.json();
      const t0 = j?.tracking_data;
      return json({
        status: t0?.shipment_status || "Unknown",
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
