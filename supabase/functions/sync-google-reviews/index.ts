import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fetch Google Place details + reviews. Supports two modes:
//  - { place_id } -> returns preview (no DB write) for setup wizard
//  - { store_id } -> runs full sync for a paid connection (caller must own store OR be service)
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    let place_id: string | undefined = body.place_id;
    const store_id: string | undefined = body.store_id;
    let connection: any = null;

    if (store_id) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      const { data: store } = await admin.from("stores").select("user_id").eq("id", store_id).maybeSingle();
      if (!store || store.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
      }
      const { data: conn } = await admin.from("store_google_reviews_connections").select("*").eq("store_id", store_id).maybeSingle();
      if (!conn || !conn.is_paid) {
        return new Response(JSON.stringify({ error: "Connection not paid" }), { status: 402, headers: corsHeaders });
      }
      connection = conn;
      place_id = conn.place_id;
    }

    if (!place_id) {
      return new Response(JSON.stringify({ error: "place_id or store_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Places API (New) - GET /v1/places/{placeId}
    const fieldMask = "id,displayName,formattedAddress,googleMapsUri,rating,userRatingCount,reviews";
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(place_id)}`;
    const r = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
    });
    const data = await r.json();
    if (!r.ok) {
      const msg = data?.error?.message || JSON.stringify(data);
      throw new Error(`Google Places error: ${r.status} ${msg}`);
    }
    const res = {
      name: data.displayName?.text ?? data.displayName ?? "",
      formatted_address: data.formattedAddress ?? "",
      url: data.googleMapsUri ?? "",
      rating: data.rating ?? null,
      user_ratings_total: data.userRatingCount ?? 0,
      reviews: data.reviews ?? [],
    };
    const reviews = (res.reviews || []).map((rv: any, idx: number) => {
      const timeUnix = rv.publishTime ? Math.floor(new Date(rv.publishTime).getTime() / 1000) : idx;
      return {
        google_review_id: `${place_id}-${timeUnix}-${idx}`,
        author_name: rv.authorAttribution?.displayName ?? "Anonymous",
        author_photo_url: rv.authorAttribution?.photoUri ?? null,
        rating: rv.rating,
        text: rv.text?.text ?? rv.originalText?.text ?? "",
        relative_time: rv.relativePublishTimeDescription ?? "",
        time_unix: timeUnix,
        language: rv.text?.languageCode ?? rv.originalText?.languageCode ?? null,
      };
    });

    if (connection) {
      // Clear cache and reinsert (Google only returns 5 latest anyway)
      await admin.from("store_google_reviews_cache").delete().eq("connection_id", connection.id);
      if (reviews.length > 0) {
        await admin.from("store_google_reviews_cache").insert(
          reviews.map((rv: any) => ({ ...rv, connection_id: connection.id, store_id: connection.store_id }))
        );
      }
      await admin.from("store_google_reviews_connections").update({
        business_name: res.name,
        business_address: res.formatted_address,
        business_url: res.url,
        average_rating: res.rating,
        total_reviews: res.user_ratings_total,
        last_synced_at: new Date().toISOString(),
        sync_error: null,
      }).eq("id", connection.id);
    }

    return new Response(JSON.stringify({
      success: true,
      business: {
        name: res.name,
        address: res.formatted_address,
        url: res.url,
        average_rating: res.rating,
        total_reviews: res.user_ratings_total,
      },
      reviews,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("sync-google-reviews error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
