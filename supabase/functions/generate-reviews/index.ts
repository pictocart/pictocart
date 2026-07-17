// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function callGroq(messages: any[], tools?: any[]) {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY is not configured");

  const body: any = {
    model: "llama-3.3-70b-versatile",
    messages,
  };

  if (tools) {
    body.tools = tools;
    body.tool_choice = { type: "function", function: { name: "submit_reviews" } };
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status} - ${await response.text()}`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: userErr } = await supabaseClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { store_id, product_id, count = 3, sentiment = "positive" } = body;

    if (!store_id || !product_id) {
      return json({ error: "store_id and product_id are required" }, 400);
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify ownership or admin privileges
    const { data: store, error: storeErr } = await adminClient
      .from("stores")
      .select("user_id")
      .eq("id", store_id)
      .maybeSingle();

    if (storeErr || !store) return json({ error: "Store not found" }, 404);

    const { data: isAdminRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isOwner = store.user_id === user.id;
    const isAdmin = !!isAdminRole;

    if (!isOwner && !isAdmin) return json({ error: "Forbidden" }, 403);

    // Load product details
    const { data: product, error: prodErr } = await adminClient
      .from("products")
      .select("name, description")
      .eq("id", product_id)
      .maybeSingle();

    if (prodErr || !product) return json({ error: "Product not found" }, 404);

    // Generate reviews using Groq
    const sysPrompt = `You generate highly realistic product reviews for an Indian e-commerce store.
The reviews should match the product name and description.
Generate review titles and comments in a mix of friendly, descriptive, or brief buyer feedback styles.
Reviews must sound authentic. Keep ratings within 1 to 5.
Never use any Markdown bolding (**), headers (#), or HTML tags in any field. Keep everything clean plain text.

Sentiment guidelines:
- Highly positive: 5 stars only.
- Positive: 4 to 5 stars.
- Mixed: 3 to 5 stars.`;

    const userPrompt = `Generate ${count} reviews for the product: "${product.name}".
Product Description: "${product.description || ""}"
Sentiment target: ${sentiment}.`;

    const reviewTool = {
      type: "function",
      function: {
        name: "submit_reviews",
        description: "Submit generated reviews for the product",
        parameters: {
          type: "object",
          properties: {
            reviews: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rating: { type: "integer", minimum: 1, maximum: 5 },
                  title: { type: "string" },
                  body: { type: "string" },
                },
                required: ["rating", "title", "body"],
              },
            },
          },
          required: ["reviews"],
        },
      },
    };

    const gRes = await callGroq(
      [
        { role: "system", content: sysPrompt },
        { role: "user", content: userPrompt },
      ],
      [reviewTool]
    );

    const toolCall = gRes.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("AI did not trigger the submit_reviews tool call");
    }

    const { reviews } = JSON.parse(toolCall.function.arguments);
    if (!Array.isArray(reviews) || reviews.length === 0) {
      throw new Error("No reviews found in tool call response");
    }

    // Insert reviews
    const inserts = reviews.map((r: any) => ({
      store_id,
      product_id,
      user_id: crypto.randomUUID(), // Random UUID as reviewer placeholder
      rating: r.rating,
      title: r.title,
      body: r.body,
      is_verified_purchase: true,
      moderation_status: "approved",
    }));

    const { error: insErr } = await adminClient.from("reviews").insert(inserts);
    if (insErr) throw insErr;

    return json({ success: true, count: inserts.length, reviews: inserts });
  } catch (error: any) {
    console.error("generate-reviews", error);
    return json({ error: error.message || "Failed to generate reviews" }, 500);
  }
});
