// Sarvam Speech-to-Text proxy. Accepts base64 audio, returns transcript.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body {
  audio_base64: string;
  mime?: string; // e.g. "audio/webm"
  language?: string; // BCP-47 like "hi-IN" or "unknown" for auto detect
  model?: string; // "saarika:v2"
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const key = Deno.env.get('SARVAM_API_KEY');
    if (!key) throw new Error('Missing SARVAM_API_KEY');

    const body = (await req.json()) as Body;
    if (!body.audio_base64) return json({ error: 'audio_base64 is required' }, 400);

    const mime = body.mime || 'audio/webm';
    const ext = mime.includes('webm') ? 'webm' : mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'wav';
    const bytes = Uint8Array.from(atob(body.audio_base64), (c) => c.charCodeAt(0));
    const file = new File([bytes], `audio.${ext}`, { type: mime });

    const form = new FormData();
    form.append('file', file);
    form.append('model', body.model || 'saarika:v2');
    form.append('language_code', body.language || 'unknown');
    form.append('with_timestamps', 'false');

    const res = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: { 'api-subscription-key': key },
      body: form,
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('[sarvam-stt]', res.status, txt);
      return json({ error: `Sarvam STT: ${res.status} ${txt}` }, res.status);
    }
    const data = await res.json();
    return json({ transcript: data?.transcript || '', language_code: data?.language_code || null });
  } catch (err: any) {
    console.error('[sarvam-stt]', err);
    return json({ error: err?.message || 'Internal error' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
