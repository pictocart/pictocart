const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { topic, store_name, category } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('Missing API key');

    const prompt = `You are a senior SEO content writer for an online store called "${store_name || 'My Store'}" (category: ${category || 'general'}).

Write a high-quality, SEO-optimized blog post on the topic: "${topic}".

Requirements:
- 700–1000 words, original, useful, written in a friendly conversational tone
- Start with a strong hook in the first 2 sentences (no "In today's world…" filler)
- Use markdown: one H1 (#) at the top, then H2 (##) and H3 (###) subheadings
- Naturally include the primary keyword from the topic in: H1, first paragraph, at least one H2, and the conclusion (no keyword stuffing)
- Include 4–6 H2 sections covering: intro, 2–3 substantive points, practical tips, and a conclusion with a soft call-to-action to shop the store
- Use short paragraphs (2–4 sentences), bullet lists where helpful
- Add an FAQ section at the end with 3 short Q&A pairs (### question style)

Also produce SEO metadata:
- "seo_title": <= 60 chars, includes primary keyword, compelling
- "seo_description": <= 155 chars, includes primary keyword, action-oriented
- "tags": array of 4–6 lowercase keyword tags
- "image_prompt": one vivid sentence describing the ideal hero image for this post (no text in image, photorealistic editorial style)

Return ONLY valid JSON in this shape:
{ "body": "...", "seo_title": "...", "seo_description": "...", "tags": ["..."], "image_prompt": "..." }`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI API error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const content = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(content), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
