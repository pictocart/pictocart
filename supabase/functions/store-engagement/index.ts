const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const NVIDIA_API_KEY = Deno.env.get('NVIDIA_API_KEY');
    if (!NVIDIA_API_KEY) throw new Error('NVIDIA_API_KEY not configured');

    const prompt = `You are an e-commerce store consultant. Analyze this store and provide an engagement report.

Store: ${body.store_name}
Category: ${body.category || 'General'}
Products: ${body.product_count}
Blog posts: ${body.blog_count}
Has hero section: ${body.has_hero}
Has custom footer: ${body.has_footer}
Has SEO configured: ${body.has_seo}
Products without images: ${body.products_without_images}
Products without descriptions: ${body.products_without_description}

Respond as JSON with:
{
  "score": <number 0-100>,
  "strengths": [<3-5 specific strengths>],
  "improvements": [<3-6 specific actionable improvements>],
  "product_tips": [<2-4 product-specific tips>]
}

Be specific and actionable. Reference actual numbers from the data.`;

    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${NVIDIA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
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
