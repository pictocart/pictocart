import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, Trash2, Music } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  /** URL of the source video to overlay voice onto. */
  videoUrl: string | null;
  /** Called when the merged video URL is ready. */
  onMerged: (mergedVideoUrl: string) => void;
}

/**
 * Records a voice clip via MediaRecorder and merges it into the given
 * video using ffmpeg.wasm (lazy-loaded). The merged video is uploaded
 * to product-media and the new URL is returned via onMerged.
 */
const VoiceVideoRecorder = ({ videoUrl, onMerged }: Props) => {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      recorderRef.current = mr;
      setRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (err: any) {
      toast.error(err?.message || 'Microphone permission denied');
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
  };

  const reset = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setElapsed(0);
  };

  const merge = async () => {
    if (!videoUrl || !audioBlob) return;
    setMerging(true);
    try {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { fetchFile } = await import('@ffmpeg/util');
      const ffmpeg = new FFmpeg();
      await ffmpeg.load();
      await ffmpeg.writeFile('in.mp4', await fetchFile(videoUrl));
      await ffmpeg.writeFile('voice.webm', await fetchFile(audioBlob));
      // Replace original audio with voice; encode audio for compatibility.
      await ffmpeg.exec([
        '-i', 'in.mp4',
        '-i', 'voice.webm',
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-shortest',
        'out.mp4',
      ]);
      const out = await ffmpeg.readFile('out.mp4');
      const mergedBlob = new Blob([out as Uint8Array], { type: 'video/mp4' });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const path = `${user.id}/${crypto.randomUUID()}.mp4`;
      const { error } = await supabase.storage
        .from('product-media')
        .upload(path, mergedBlob, { contentType: 'video/mp4', upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('product-media').getPublicUrl(path);
      onMerged(publicUrl);
      reset();
      toast.success('Voiceover merged into video');
    } catch (err: any) {
      console.error('Merge failed:', err);
      toast.error(err?.message || 'Failed to merge voiceover');
    } finally {
      setMerging(false);
    }
  };

  if (!videoUrl) {
    return (
      <p className="text-xs text-muted-foreground rounded-md border border-dashed px-3 py-2">
        Upload a product video first to add a voiceover.
      </p>
    );
  }

  const mm = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const ss = (elapsed % 60).toString().padStart(2, '0');

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Music className="h-3.5 w-3.5 text-primary" />
        Voiceover {recording && <span className="text-destructive text-xs font-mono">● {mm}:{ss}</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!recording && !audioBlob && (
          <Button size="sm" variant="outline" onClick={start}>
            <Mic className="mr-1 h-3.5 w-3.5" /> Record voice
          </Button>
        )}
        {recording && (
          <Button size="sm" variant="destructive" onClick={stop}>
            <Square className="mr-1 h-3.5 w-3.5" /> Stop
          </Button>
        )}
        {audioBlob && audioUrl && !recording && (
          <>
            <audio src={audioUrl} controls className="h-8 max-w-[220px]" />
            <Button size="sm" variant="ghost" onClick={reset}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" onClick={merge} disabled={merging}>
              {merging ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              {merging ? 'Merging…' : 'Merge into video'}
            </Button>
          </>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Records audio in your browser and replaces the original video's sound. Takes a few seconds the first time.
      </p>
    </div>
  );
};

export default VoiceVideoRecorder;
