import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Video, X, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  videos: string[];
  onChange: (videos: string[]) => void;
  maxVideos?: number;
  /** Max file size in MB (default 50) */
  maxSizeMB?: number;
  compact?: boolean;
}

const VideoUploader = ({ videos, onChange, maxVideos = 2, maxSizeMB = 50, compact = false }: Props) => {
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`Video must be under ${maxSizeMB} MB`);
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const ext = file.name.split('.').pop() || 'mp4';
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from('product-media')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('product-media').getPublicUrl(path);
      return publicUrl;
    },
    [maxSizeMB]
  );

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const remaining = maxVideos - videos.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxVideos} video${maxVideos > 1 ? 's' : ''} allowed`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const urls = await Promise.all(toUpload.map(upload));
      onChange([...videos, ...urls]);
      toast.success('Video uploaded');
    } catch (err: any) {
      console.error('Video upload failed:', err);
      toast.error(err?.message || 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  const remove = (i: number) => onChange(videos.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className={cn('grid gap-2', compact ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4')}>
        {videos.map((url, i) => (
          <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border bg-black">
            <video src={url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Video className="h-5 w-5 text-white/90" />
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {videos.length < maxVideos && (
          <label
            className={cn(
              'flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-primary/50 hover:bg-accent/50',
              uploading && 'pointer-events-none opacity-60'
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Video</span>
              </>
            )}
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
              disabled={uploading}
            />
          </label>
        )}
      </div>
      {!compact && (
        <p className="text-[11px] text-muted-foreground">
          MP4 / MOV up to {maxSizeMB}MB. Plays automatically on hover on the storefront.
        </p>
      )}
    </div>
  );
};

export default VideoUploader;
