// Sarvam Text-to-Speech proxy. Streams MP3-like audio (base64) back to the client.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body {
  text: string;
  language?: string; // e.g. "hi-IN"
  speaker?: string;  // e.g. "shubh"
  model?: string;    // e.g. "bulbul:v2"
  pitch?: number;
  pace?: number;
  loudness?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const key = Deno.env.get('SARVAM_API_KEY');
    if (!key) throw new Error('Missing SARVAM_API_KEY');

    const body = (await req.json()) as Body;
    const text = (body.text || '').toString().slice(0, 1500);
    if (!text.trim()) return json({ error: 'text is required' }, 400);

    const target_language_code = body.language || 'hi-IN';
    const speaker = (body.speaker || 'shubh').toLowerCase();
    const model = body.model || 'bulbul:v2';

    const res = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'api-subscription-key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        target_language_code,
        speaker,
        model,
        pitch: body.pitch ?? 0,
        pace: body.pace ?? 1.0,
        loudness: body.loudness ?? 1.0,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('[sarvam-tts]', res.status, txt);
      return json({ error: `Sarvam TTS: ${res.status} ${txt}` }, res.status);
    }
    const data = await res.json();
    // Sarvam returns { audios: ["base64..."] }
    const audios: string[] = data?.audios || [];
    return json({ audio_base64: audios[0] || '', mime: 'audio/wav' });
  } catch (err: any) {
    console.error('[sarvam-tts]', err);
    return json({ error: err?.message || 'Internal error' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
