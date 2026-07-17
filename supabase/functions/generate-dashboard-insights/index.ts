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
    const {
      store_id,
      revenue,
      revenuePrev,
      orders,
      ordersPrev,
      views,
      carts,
      cvr,
      topProductName,
      topProductQty,
    } = body;

    if (!store_id) return json({ error: "store_id is required" }, 400);

    const key = Deno.env.get("GROQ_API_KEY");
    if (!key) throw new Error("GROQ_API_KEY is not configured");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get store merchant's name (either first name or store name)
    const { data: store } = await adminClient.from("stores").select("name").eq("id", store_id).maybeSingle();
    const merchantName = user.user_metadata?.first_name || store?.name || "merchant";

    // Build prompting context
    const sysPrompt = `You are a helpful AI Business Coach for Indian e-commerce merchants.
You analyze their weekly sales metrics and give them a bulleted list of 2 to 3 highly actionable and specific suggestions in Hinglish.
Address the merchant by name: "${merchantName}".
Suggestions must be tailored to their stats (e.g. if conversion is low suggest cart recovery, if views are low suggest sharing product links on WhatsApp, if there is a top seller suggest highlighting it).
Return the output as plain text with bullet points using '•' characters. No markdown headings, bolding (**), or HTML tags. Keep each bullet brief (1-2 sentences).`;

    const userPrompt = `Weekly stats:
- Current Revenue: ₹${revenue} (Previous Week: ₹${revenuePrev})
- Total Orders: ${orders} (Previous Week: ${ordersPrev})
- Product Views: ${views}
- Cart Additions: ${carts}
- Conversion Rate: ${cvr.toFixed(1)}%
${topProductName ? `- Top Selling Product: "${topProductName}" (${topProductQty} units sold)` : ""}

Provide a list of 2 to 3 bullet points of Hinglish business coaching tips using '•'.`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!groqRes.ok) {
      throw new Error(`Groq API error: ${groqRes.status} - ${await groqRes.text()}`);
    }

    const data = await groqRes.json();
    const insight = data.choices?.[0]?.message?.content?.trim() || "Great progress this week! Keep sharing your store links on WhatsApp to get more orders.";

    return json({ success: true, insight });
  } catch (error: any) {
    console.error("generate-dashboard-insights error:", error);
    return json({ error: error.message || "Failed to generate dashboard insights" }, 500);
  }
});
