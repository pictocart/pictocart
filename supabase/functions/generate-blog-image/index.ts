// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a blog image (cover 16:9 or thumbnail 1:1) using Gemini Nano Banana 2 (fast, pro-quality)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

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

    const { title, body, store_name, category, kind } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const isThumb = kind === 'thumbnail';
    const excerpt = (body || '').replace(/[#*_`>\-]/g, ' ').slice(0, 600);

    // Two visually distinct compositions so cover and thumbnail never look identical.
    const compositionBrief = isThumb
      ? `SQUARE 1:1 thumbnail composition. Tight, intimate close-up framing — focus on a single hero detail (a textile pattern, a hand styling fabric, an accessory, a folded garment, or a still-life flat-lay). Subject centered, shallow depth of field, soft bokeh background. Different camera angle and focal length than a wide editorial banner: think 50–85mm portrait crop or overhead macro. Warm natural light, gallery-like negative space.`
      : `WIDE 16:9 cinematic hero banner. Full editorial environmental scene — show the model or subject in context with rich background storytelling (architecture, garden, interior, market). Wide-angle composition (24–35mm look), subject placed on the left or right third, generous breathing room on the opposite side for an overlay headline. Golden-hour daylight, lifestyle magazine cover energy.`;

    const visualPrompt = `Editorial, high-end, photorealistic image for a blog post — premium e-commerce magazine quality.

Blog title: "${title}"
Store: ${store_name || 'an online store'} (category: ${category || 'general'})
Article context: ${excerpt}

${compositionBrief}

Style: rich realistic colors, natural daylight, lifestyle composition relevant to the topic and category, brand-safe, tasteful. ${isThumb ? 'Macro / detail / still-life mood — NOT a wide environmental scene.' : 'Environmental wide scene — NOT a tight macro crop.'}

ABSOLUTE RULES: No text, no captions, no typography, no watermark, no logos, no letters, no numbers anywhere in the image. Pure photographic imagery only.`;

    let imageUrl = "";

    if (LOVABLE_API_KEY) {
      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-3.1-flash-image-preview',
          messages: [{ role: 'user', content: visualPrompt }],
          modalities: ['image', 'text'],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 429) throw new Error('Rate limited. Please try again in a moment.');
        if (res.status === 402) throw new Error('AI credits exhausted. Add credits in workspace settings.');
        throw new Error(`Image API error: ${res.status} ${errText}`);
      }

      const data = await res.json();
      imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    } else {
      // Fallback to Pollinations.ai (free, unlimited, open source)
      const cleanPrompt = encodeURIComponent(visualPrompt);
      const width = isThumb ? 1024 : 1280;
      const height = isThumb ? 1024 : 720;
      const url = `https://image.pollinations.ai/p/${cleanPrompt}?width=${width}&height=${height}&nologo=true&private=true&model=flux`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Pollinations API error: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      const bin = new Uint8Array(buffer);
      
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const path = `${userData.user.id}/blog-images/${crypto.randomUUID()}.png`;
      const { error: upErr } = await admin.storage.from("product-images").upload(path, bin, { contentType: "image/png", upsert: false });
      if (upErr) throw upErr;
      
      imageUrl = admin.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    }

    if (!imageUrl) throw new Error('No image generated or found');

    return new Response(JSON.stringify({ image: imageUrl, kind }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
