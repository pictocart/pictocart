// Generate all six store policy pages (Privacy, Terms, Refund, Shipping, About, Contact)
// in one AI call. Uses Lovable AI Gateway (Gemini Flash) with JSON output.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BusinessInfo {
  company_legal_name: string;
  store_name: string;
  state: string;
  country?: string;
  email: string;
  phone?: string;
  address?: string;
  gst?: string;
  category?: string;
  website?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = (await req.json()) as { business: BusinessInfo };
    const b = body.business;
    if (!b?.company_legal_name || !b?.store_name || !b?.state || !b?.email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: company_legal_name, store_name, state, email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const prompt = `You are a senior e-commerce legal copywriter for Indian online stores.
Write six compliant, customer-friendly, Markdown-formatted policy/info pages for the following store.

Business details:
- Legal company name: ${b.company_legal_name}
- Public store name: ${b.store_name}
- Category: ${b.category || "general retail"}
- State: ${b.state}
- Country: ${b.country || "India"}
- Support email: ${b.email}
- Support phone: ${b.phone || "(not provided)"}
- Registered address: ${b.address || "(not provided)"}
- GST: ${b.gst || "(not registered)"}
- Website: ${b.website || "(not provided)"}

Each page must:
- Use clean Markdown (## headings, short paragraphs, bullet lists where helpful)
- Be 250–500 words
- Reference the store name, support email, and (where relevant) the state/jurisdiction
- Be practical and reassuring — written in plain English a non-legal customer can read
- Comply with Indian Consumer Protection (E-Commerce) Rules 2020, GST invoicing norms, and Google Merchant Centre policy requirements

Return ONLY a valid JSON object with EXACTLY these six string keys, each containing the full Markdown for that page:

{
  "privacy": "...",
  "terms": "...",
  "refund": "...",
  "shipping": "...",
  "about": "...",
  "contact": "..."
}

Page guidance:
- privacy: data collected, how used, third parties (payment/shipping), cookies, user rights, contact for privacy concerns
- terms: acceptance, account use, product info accuracy, pricing/payments, shipping reference, returns reference, IP, governing law (${b.state}, India), contact
- refund: return window (commonly 7 days), eligibility, non-returnable items, refund timeline, exchange policy, damaged/defective items
- shipping: processing time, delivery timeframes (3–7 working days typical India), charges, tracking, undelivered/RTO policy
- about: warm 2–3 paragraph brand story for "${b.store_name}", values, what makes them different, invite to shop
- contact: how to reach us, response time, support email ${b.email}${b.phone ? `, phone ${b.phone}` : ""}${b.address ? `, address ${b.address}` : ""}, social media note`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached, please retry shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Top up Lovable AI to continue." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI gateway error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    if (!raw) {
      console.error("Empty AI response", JSON.stringify(data));
      throw new Error("AI returned an empty response. Please retry.");
    }

    // Strip markdown code fences (```json ... ```) if present
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    }
    // Extract first {...} block as a fallback
    if (!cleaned.startsWith("{")) {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) cleaned = m[0];
    }

    let policies: Record<string, string>;
    try {
      policies = JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON parse failed. Raw content:", raw.slice(0, 500));
      throw new Error("AI returned malformed JSON. Please try again.");
    }

    return new Response(JSON.stringify({ policies, generated_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-store-policies error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
