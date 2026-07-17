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
    const { campaign_type, language = "hinglish", store_id, product_name = "", discount_details = "", coupon_code = "" } = body;

    if (!store_id) return json({ error: "store_id is required" }, 400);

    const key = Deno.env.get("GROQ_API_KEY");
    if (!key) throw new Error("GROQ_API_KEY is not configured");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get store info
    const { data: store } = await adminClient.from("stores").select("name").eq("id", store_id).maybeSingle();
    const storeName = store?.name || "our store";

    // Build the AI Prompt
    const sysPrompt = `You are a world-class Indian direct-response copywriter who writes highly engaging e-commerce marketing messages.
You generate marketing copy for two formats:
1. WhatsApp Message: Use bolding (*text*), clean line breaks, bullet points, emoji-rich, friendly conversational tone, and a clear CTA link at the bottom.
2. SMS Message: Short, direct, clear, highly concise (under 160 characters), and has a simple CTA.

Target Language: ${language} (Note: 'hinglish' means Hindi written in Roman script mixed with English words, e.g. "Aapke cart me product waiting h").
No Markdown tags (except * for bolding in the WhatsApp message ONLY). Do NOT return raw JSON wrapper formatting in the messages themselves.`;

    const userPrompt = `Write copy for a "${campaign_type}" campaign.
Store Name: "${storeName}"
${product_name ? `Product Name: "${product_name}"` : ""}
${discount_details ? `Offer/Discount Details: "${discount_details}"` : ""}
${coupon_code ? `Coupon Code: "${coupon_code}"` : ""}

Submit the results by calling the submit_copy tool.`;

    const copyTool = {
      type: "function",
      function: {
        name: "submit_copy",
        description: "Submit generated WhatsApp and SMS marketing copy",
        parameters: {
          type: "object",
          properties: {
            whatsapp: { type: "string", description: "WhatsApp message with emojis and bolding" },
            sms: { type: "string", description: "SMS message under 160 characters" },
          },
          required: ["whatsapp", "sms"],
        },
      },
    };

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
        tools: [copyTool],
        tool_choice: { type: "function", function: { name: "submit_copy" } },
      }),
    });

    if (!groqRes.ok) {
      throw new Error(`Groq API error: ${groqRes.status} - ${await groqRes.text()}`);
    }

    const data = await groqRes.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("AI did not trigger the submit_copy tool");
    }

    const { whatsapp, sms } = JSON.parse(toolCall.function.arguments);
    return json({ success: true, whatsapp, sms });
  } catch (error: any) {
    console.error("generate-marketing-copy error:", error);
    return json({ error: error.message || "Failed to generate marketing copy" }, 500);
  }
});
