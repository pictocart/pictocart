import { useCallback, useEffect, useMemo, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  logoUrl: string | null | undefined;
  logoName?: string | null;
  onSave: (url: string | null, name?: string | null) => void;
}

const getFileNameFromUrl = (url: string | null | undefined) => {
  if (!url) return null;
  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.split('/').pop() || '');
  } catch {
    return null;
  }
};

async function getCroppedImg(imageSrc: string, crop: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas is empty'));
    }, 'image/png');
  });
}

const ASPECT_OPTIONS: Array<{ label: string; value: number | undefined }> = [
  { label: 'Free', value: undefined },
  { label: 'Square 1:1', value: 1 },
  { label: 'Wide 3:1', value: 3 },
  { label: 'Banner 4:1', value: 4 },
  { label: 'Landscape 16:9', value: 16 / 9 },
];

const LogoUploader = ({ logoUrl, logoName, onSave }: Props) => {
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | undefined>(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const persistedFileName = useMemo(() => logoName || getFileNameFromUrl(logoUrl), [logoName, logoUrl]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(persistedFileName);

  useEffect(() => {
    setSelectedFileName(persistedFileName);
  }, [persistedFileName]);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }
    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setRawImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!rawImage || !croppedArea) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      const blob = await getCroppedImg(rawImage, croppedArea);
      const path = `${user.id}/logos/${crypto.randomUUID()}.png`;
      const { error } = await supabase.storage
        .from('product-images')
        .upload(path, blob, { contentType: 'image/png' });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(path);
      onSave(publicUrl, selectedFileName || 'logo.png');
      setRawImage(null);
      toast.success('Logo uploaded!');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleCloseCropper = () => {
    setRawImage(null);
    setSelectedFileName(persistedFileName);
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs">Store Logo</Label>
      <div className="flex items-center gap-4">
        {logoUrl ? (
          <div className="relative h-16 w-16 rounded-lg border bg-muted overflow-hidden group">
            <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
            <button
              type="button"
              onClick={() => {
                setSelectedFileName(null);
                onSave(null, null);
              }}
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-4 w-4 text-white" />
            </button>
          </div>
        ) : (
          <div className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div>
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" asChild>
              <span>{logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
            </Button>
            <input type="file" accept="image/*" className="hidden" onChange={onFileSelect} />
          </label>
          <p className="text-[10px] text-muted-foreground mt-1">Recommended: 512×512px, PNG or JPG</p>
          {selectedFileName && <p className="text-[10px] font-medium text-foreground/80 mt-1 truncate max-w-[180px]">Selected: {selectedFileName}</p>}
        </div>
      </div>

      <Dialog open={!!rawImage} onOpenChange={(o) => !o && handleCloseCropper()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crop Logo</DialogTitle>
          </DialogHeader>
          <div className="relative h-64 w-full bg-muted rounded-lg overflow-hidden">
            {rawImage && (
              <Cropper
                image={rawImage}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape="rect"
                showGrid={false}
                restrictPosition={false}
                objectFit="contain"
              />
            )}
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Aspect ratio</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {ASPECT_OPTIONS.map((o) => (
                  <Button
                    key={o.label}
                    type="button"
                    size="sm"
                    variant={aspect === o.value ? 'default' : 'outline'}
                    className="h-7 text-[11px]"
                    onClick={() => setAspect(o.value)}
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Zoom</Label>
              <Slider
                min={0.5}
                max={3}
                step={0.05}
                value={[zoom]}
                onValueChange={([v]) => setZoom(v)}
                className="mt-2"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Use "Free" to keep the logo's original shape. Resize it in the header inspector after upload.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseCropper}>Cancel</Button>
            <Button onClick={handleSave} disabled={uploading}>
              {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Logo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LogoUploader;
