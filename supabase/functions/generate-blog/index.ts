import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Require an authenticated user — prevents anonymous abuse of platform AI credits
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { topic, store_name, category } = await req.json();
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    const NVIDIA_API_KEY = Deno.env.get('NVIDIA_API_KEY');

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

Return ONLY valid JSON, no markdown fences, in this shape:
{ "body": "...", "seo_title": "...", "seo_description": "...", "tags": ["..."], "image_prompt": "..." }`;

    let responseText = '';
    let success = false;

    // 1. Try Groq (extremely fast and reliable)
    if (GROQ_API_KEY) {
      try {
        console.log('Attempting blog generation via Groq...');
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            response_format: { type: 'json_object' }
          }),
        });
        if (res.ok) {
          const data = await res.json();
          responseText = data.choices[0].message.content;
          success = true;
        } else {
          console.warn(`Groq failed with status ${res.status}: ${await res.text()}`);
        }
      } catch (e) {
        console.warn('Groq fetch error:', e);
      }
    }

    // 2. Fallback to NVIDIA integrate API with model cascading
    if (!success) {
      if (!NVIDIA_API_KEY) throw new Error('No AI API keys configured on platform');
      
      const models = [
        'meta/llama-3.3-70b-instruct',
        'nvidia/llama-3.1-nemotron-70b-instruct',
        'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'
      ];

      for (const model of models) {
        try {
          console.log(`Attempting blog generation via NVIDIA fallback with model: ${model}...`);
          const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${NVIDIA_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.5,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            responseText = data.choices[0].message.content;
            success = true;
            break;
          } else {
            console.warn(`NVIDIA model ${model} failed: ${res.status} ${await res.text()}`);
          }
        } catch (e) {
          console.warn(`NVIDIA model ${model} fetch error:`, e);
        }
      }
    }

    if (!success || !responseText) {
      throw new Error('AI generation failed on all available LLM backends');
    }

    // Clean markdown code blocks from JSON response if present
    let cleaned = responseText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }
    const content = JSON.parse(cleaned);

    return new Response(JSON.stringify(content), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-blog error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
