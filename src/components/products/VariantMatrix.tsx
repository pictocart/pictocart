import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, ImagePlus, Video, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '@/lib/imageCompression';
import {
  VariantOption,
  VariantValue,
  getValueText,
  getValueImages,
  getValueVideos,
} from '@/lib/productMedia';

export type { VariantOption, VariantValue };

interface VariantMatrixProps {
  category: string | null;
  options: VariantOption[];
  onChange: (options: VariantOption[]) => void;
}

const CATEGORY_PRESETS: Record<string, VariantOption[]> = {
  Fashion: [
    { name: 'Size', values: ['S', 'M', 'L', 'XL', 'XXL'] },
    { name: 'Color', values: [] },
  ],
  Food: [
    { name: 'Weight', values: ['250g', '500g', '1kg'] },
  ],
  Electronics: [
    { name: 'Storage', values: ['64GB', '128GB', '256GB'] },
    { name: 'Color', values: [] },
  ],
  Beauty: [
    { name: 'Size', values: ['50ml', '100ml', '200ml'] },
  ],
};

const toObject = (v: VariantValue): { value: string; images?: string[]; videos?: string[] } =>
  typeof v === 'string' ? { value: v, images: [], videos: [] } : { ...v };

const VariantMatrix = ({ category, options, onChange }: VariantMatrixProps) => {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const update = (next: VariantOption[]) => onChange(next);

  const loadPreset = () => {
    const preset = CATEGORY_PRESETS[category || ''];
    if (preset) update(preset);
  };

  const addOption = () => update([...options, { name: '', values: [] }]);
  const removeOption = (i: number) => update(options.filter((_, idx) => idx !== i));
  const updateOptionName = (i: number, name: string) => {
    const next = [...options];
    next[i] = { ...next[i], name };
    update(next);
  };

  const addValue = (oi: number) => {
    const next = [...options];
    next[oi] = { ...next[oi], values: [...next[oi].values, { value: '', images: [], videos: [] }] };
    update(next);
  };

  const removeValue = (oi: number, vi: number) => {
    const next = [...options];
    next[oi] = { ...next[oi], values: next[oi].values.filter((_, i) => i !== vi) };
    update(next);
  };

  const updateValue = (oi: number, vi: number, patch: Partial<{ value: string; images: string[]; videos: string[] }>) => {
    const next = [...options];
    const current = toObject(next[oi].values[vi]);
    const merged = { ...current, ...patch };
    const values = [...next[oi].values];
    values[vi] = merged;
    next[oi] = { ...next[oi], values };
    update(next);
  };

  const uploadImage = useCallback(async (file: File) => {
    if (file.size > 30 * 1024 * 1024) throw new Error('Image must be under 30 MB');
    const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, maxSizeMB: 1.2 });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const path = `${user.id}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from('product-images').upload(path, compressed, { contentType: compressed.type });
    if (error) throw error;
    return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  }, []);

  const uploadVideo = useCallback(async (file: File) => {
    if (file.size > 50 * 1024 * 1024) throw new Error('Video must be under 50 MB');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const ext = file.name.split('.').pop() || 'mp4';
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('product-media').upload(path, file, { contentType: file.type });
    if (error) throw error;
    return supabase.storage.from('product-media').getPublicUrl(path).data.publicUrl;
  }, []);

  const handleImageFiles = async (oi: number, vi: number, files: FileList | null) => {
    if (!files?.length) return;
    const key = `img-${oi}-${vi}`;
    setUploadingKey(key);
    try {
      const current = getValueImages(options[oi].values[vi]);
      const urls = await Promise.all(Array.from(files).slice(0, 4 - current.length).map(uploadImage));
      updateValue(oi, vi, { images: [...current, ...urls] });
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setUploadingKey(null);
    }
  };

  const handleVideoFile = async (oi: number, vi: number, files: FileList | null) => {
    if (!files?.length) return;
    const key = `vid-${oi}-${vi}`;
    setUploadingKey(key);
    try {
      const url = await uploadVideo(files[0]);
      const current = getValueVideos(options[oi].values[vi]);
      updateValue(oi, vi, { videos: [...current, url] });
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setUploadingKey(null);
    }
  };

  const removeImage = (oi: number, vi: number, idx: number) => {
    const imgs = getValueImages(options[oi].values[vi]);
    updateValue(oi, vi, { images: imgs.filter((_, i) => i !== idx) });
  };

  const removeVideo = (oi: number, vi: number, idx: number) => {
    const vids = getValueVideos(options[oi].values[vi]);
    updateValue(oi, vi, { videos: vids.filter((_, i) => i !== idx) });
  };

  const setMainImage = (oi: number, vi: number, idx: number) => {
    if (idx === 0) return;
    const imgs = [...getValueImages(options[oi].values[vi])];
    const [picked] = imgs.splice(idx, 1);
    imgs.unshift(picked);
    updateValue(oi, vi, { images: imgs });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Variants</h4>
          <p className="text-[11px] text-muted-foreground">Add options like Color or Size. Each value can have its own photos and video.</p>
        </div>
        <div className="flex gap-2">
          {category && CATEGORY_PRESETS[category] && (
            <Button type="button" variant="outline" size="sm" onClick={loadPreset}>
              Load {category} preset
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={addOption}>
            <Plus className="mr-1 h-3 w-3" /> Add option
          </Button>
        </div>
      </div>

      {options.map((option, oi) => (
        <div key={oi} className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={option.name}
              onChange={(e) => updateOptionName(oi, e.target.value)}
              placeholder="Option name (e.g. Color, Size)"
              className="flex-1"
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(oi)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>

          <div className="space-y-2">
            {option.values.map((rawVal, vi) => {
              const text = getValueText(rawVal);
              const imgs = getValueImages(rawVal);
              const vids = getValueVideos(rawVal);
              const imgUploading = uploadingKey === `img-${oi}-${vi}`;
              const vidUploading = uploadingKey === `vid-${oi}-${vi}`;
              return (
                <div key={vi} className="rounded-md border bg-muted/30 p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={text}
                      onChange={(e) => updateValue(oi, vi, { value: e.target.value })}
                      placeholder="Value (optional) — e.g. Purple"
                      className="flex-1 h-8 text-sm"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeValue(oi, vi)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {imgs.map((url, idx) => (
                      <div key={url} className="group relative aspect-square overflow-hidden rounded border bg-muted">
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        <button type="button" onClick={() => removeImage(oi, vi, idx)} className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5 opacity-0 group-hover:opacity-100">
                          <X className="h-2.5 w-2.5" />
                        </button>
                        {idx === 0 ? (
                          <span className="absolute bottom-0.5 left-0.5 rounded bg-primary px-1 py-0 text-[8px] font-medium text-primary-foreground">Main</span>
                        ) : (
                          <button type="button" onClick={() => setMainImage(oi, vi, idx)} className="absolute bottom-0.5 left-0.5 rounded bg-background/90 px-1 py-0 text-[8px] opacity-0 group-hover:opacity-100">
                            Main
                          </button>
                        )}
                      </div>
                    ))}
                    {vids.map((url, idx) => (
                      <div key={url} className="group relative aspect-square overflow-hidden rounded border bg-black">
                        <video src={url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                          <Video className="h-3.5 w-3.5 text-white" />
                        </div>
                        <button type="button" onClick={() => removeVideo(oi, vi, idx)} className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5 opacity-0 group-hover:opacity-100">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                    {imgs.length < 4 && (
                      <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary">
                        {imgUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                        <span className="text-[9px]">Photo</span>
                        <input type="file" accept="image/*" multiple className="hidden" disabled={imgUploading} onChange={(e) => handleImageFiles(oi, vi, e.target.files)} />
                      </label>
                    )}
                    {vids.length < 1 && (
                      <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary">
                        {vidUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                        <span className="text-[9px]">Video</span>
                        <input type="file" accept="video/*" className="hidden" disabled={vidUploading} onChange={(e) => handleVideoFile(oi, vi, e.target.files)} />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
            <Button type="button" variant="ghost" size="sm" onClick={() => addValue(oi)} className="w-full border border-dashed">
              <Plus className="mr-1 h-3 w-3" /> Add value
            </Button>
          </div>
        </div>
      ))}

      {options.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No variants added. Add options like Color or Size — values are optional, you can also upload only photos.
        </p>
      )}
    </div>
  );
};

export default VariantMatrix;
