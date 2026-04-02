import { corsHeaders } from '@supabase/supabase-js/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { topic, store_name, category } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('Missing API key');

    const prompt = `Write a blog post for an online store called "${store_name || 'My Store'}" in the ${category || 'general'} category.

Topic: ${topic}

Write an engaging, SEO-friendly blog post of about 500-800 words. Include:
- An engaging introduction
- 3-4 main points with subheadings (use markdown ## for headings)
- A conclusion with a call to action
- Write in a friendly, conversational tone

Also provide a meta description (1-2 sentences, under 155 characters) for SEO.

Format your response as JSON: { "body": "...", "seo_description": "..." }`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

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
