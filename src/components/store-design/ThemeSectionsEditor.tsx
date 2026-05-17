import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, Trash2, Upload, RotateCcw, Loader2 } from 'lucide-react';
import { useThemeManifest } from '@/hooks/useThemeManifest';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  themeId: string;
  storeId: string;
  overrides: any;
  onChange: (next: any) => void;
}

const EDITABLE_TEXT_KEYS = ['title', 'sub', 'kicker', 'cta', 'cta_secondary', 'body'];
const SECTION_LABEL: Record<string, string> = {
  hero: 'Hero',
  usp_strip: 'Trust Strip',
  category_grid: 'Categories',
  product_grid: 'Products',
  trending: 'Trending',
  story: 'Brand Story',
  testimonials: 'Testimonials',
  newsletter: 'Newsletter',
};

export default function ThemeSectionsEditor({ themeId, storeId, overrides, onChange }: Props) {
  const { data: manifest, isLoading } = useThemeManifest(themeId);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!manifest) {
    return (
      <Card><CardContent className="py-8 text-sm text-muted-foreground text-center">
        This theme has no manifest published yet.
      </CardContent></Card>
    );
  }

  const sections = (manifest as any)?.pages?.home?.sections ?? [];
  const sectionOverrides = overrides?.sections ?? {};

  const updateField = (idx: number, key: string, value: any) => {
    const current = sectionOverrides[idx] ?? sectionOverrides[String(idx)] ?? {};
    const next = {
      ...overrides,
      sections: { ...sectionOverrides, [idx]: { ...current, [key]: value } },
    };
    onChange(next);
  };

  const resetField = (idx: number, key: string) => {
    const current = { ...(sectionOverrides[idx] ?? sectionOverrides[String(idx)] ?? {}) };
    delete current[key];
    const next = {
      ...overrides,
      sections: { ...sectionOverrides, [idx]: current },
    };
    onChange(next);
  };

  const uploadImage = async (idx: number, file: File) => {
    setUploadingIdx(idx);
    try {
      const ext = file.name.split('.').pop();
      const path = `${storeId}/theme-overrides/${idx}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('store-assets').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('store-assets').getPublicUrl(path);
      updateField(idx, 'image', data.publicUrl);
      toast.success('Image updated');
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploadingIdx(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Edit any text or image from your theme. Empty values fall back to the theme's defaults. Delete an image to remove it; upload your own to replace it.
      </div>
      {sections.map((s: any, i: number) => {
        const ov = sectionOverrides[i] ?? sectionOverrides[String(i)] ?? {};
        const defaults = s.props ?? {};
        const merged = { ...defaults, ...ov };
        const editableTextKeys = EDITABLE_TEXT_KEYS.filter((k) => k in defaults);
        const hasImage = 'image' in defaults;
        const label = SECTION_LABEL[s.type] || s.type;
        return (
          <Card key={i}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">#{i + 1}</Badge> {label}
                {s.props?.style && <span className="text-[10px] text-muted-foreground font-normal">· {s.props.style}</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {hasImage && (
                <div>
                  <Label className="text-xs">Section Image</Label>
                  <div className="mt-1.5 flex items-start gap-3">
                    <div className="w-24 h-24 rounded-md border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                      {merged.image
                        ? <img src={merged.image} alt="" className="w-full h-full object-cover" />
                        : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline" disabled={uploadingIdx === i} asChild>
                        <label className="cursor-pointer">
                          <Upload className="mr-1 h-3.5 w-3.5" />
                          {uploadingIdx === i ? 'Uploading…' : 'Replace'}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const f = e.target.files?.[0]; if (f) uploadImage(i, f);
                          }} />
                        </label>
                      </Button>
                      {merged.image && (
                        <Button size="sm" variant="outline" onClick={() => updateField(i, 'image', '')}>
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                        </Button>
                      )}
                      {'image' in ov && (
                        <Button size="sm" variant="ghost" onClick={() => resetField(i, 'image')}>
                          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {editableTextKeys.map((k) => {
                const value = merged[k] ?? '';
                const isLong = k === 'sub' || k === 'body';
                return (
                  <div key={k}>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs capitalize">{k.replace('_', ' ')}</Label>
                      {k in ov && (
                        <button onClick={() => resetField(i, k)} className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5">
                          <RotateCcw className="h-3 w-3" /> reset
                        </button>
                      )}
                    </div>
                    {isLong
                      ? <Textarea rows={2} value={value} onChange={(e) => updateField(i, k, e.target.value)} className="text-sm" />
                      : <Input value={value} onChange={(e) => updateField(i, k, e.target.value)} className="h-8 text-sm" />}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
