import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { domain, verification_token, expected_ip } = await req.json();

    if (!domain || !verification_token) {
      return new Response(
        JSON.stringify({ error: "domain and verification_token are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let txt_verified = false;
    let a_verified = false;

    // Check TXT record via DNS-over-HTTPS (Google Public DNS)
    try {
      const txtRes = await fetch(
        `https://dns.google/resolve?name=_aca.${domain}&type=TXT`
      );
      const txtData = await txtRes.json();
      if (txtData?.Answer) {
        for (const answer of txtData.Answer) {
          // TXT records come wrapped in quotes
          const value = (answer.data || "").replace(/"/g, "").trim();
          if (value === verification_token) {
            txt_verified = true;
            break;
          }
        }
      }
    } catch (e) {
      console.error("TXT lookup error:", e);
    }

    // Check A record
    try {
      const aRes = await fetch(
        `https://dns.google/resolve?name=${domain}&type=A`
      );
      const aData = await aRes.json();
      if (aData?.Answer) {
        for (const answer of aData.Answer) {
          if (answer.data === expected_ip) {
            a_verified = true;
            break;
          }
        }
      }
    } catch (e) {
      console.error("A record lookup error:", e);
    }

    return new Response(
      JSON.stringify({
        domain,
        txt_verified,
        a_verified,
        verified: txt_verified && a_verified,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("verify-domain error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
