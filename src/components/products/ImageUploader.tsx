import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ImagePlus, X, Loader2, Camera, Star, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/imageCompression';
import { useAICredits } from '@/hooks/useAICredits';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  /** When true, shows a "Generate with AI" tile that creates a product photo (costs credits). */
  enableAI?: boolean;
  aiContext?: { productName?: string; category?: string; storeName?: string };
  onInsufficientCredits?: () => void;
}

const ImageUploader = ({ images, onChange, maxImages = 6, enableAI = false, aiContext, onInsufficientCredits }: ImageUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiCredits = useAICredits({ onInsufficient: onInsufficientCredits });

  // Client-side Cropper states
  const [cropOpen, setCropOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX, y: clientY });
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;
    setOffsetX((prev) => prev + dx);
    setOffsetY((prev) => prev + dy);
    setDragStart({ x: clientX, y: clientY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleCropSave = () => {
    if (!cropFile) return;
    const img = new Image();
    img.src = cropImageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const targetSize = 800;
      canvas.width = targetSize;
      canvas.height = targetSize;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetSize, targetSize);

      const containerSize = 320;
      let renderWidth = 0;
      let renderHeight = 0;

      const imgRatio = img.width / img.height;
      if (imgRatio > 1) {
        renderWidth = containerSize;
        renderHeight = containerSize / imgRatio;
      } else {
        renderHeight = containerSize;
        renderWidth = containerSize * imgRatio;
      }

      const outputScale = targetSize / containerSize;

      ctx.save();
      ctx.translate(targetSize / 2, targetSize / 2);
      ctx.translate(offsetX * outputScale, offsetY * outputScale);
      ctx.scale(zoom, zoom);
      ctx.drawImage(
        img,
        -(renderWidth * outputScale) / 2,
        -(renderHeight * outputScale) / 2,
        renderWidth * outputScale,
        renderHeight * outputScale
      );
      ctx.restore();

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error('Failed to crop image');
          return;
        }

        const croppedFile = new File([blob], cropFile.name, { type: 'image/jpeg' });
        setCropOpen(false);
        setUploading(true);
        try {
          const url = await uploadImage(croppedFile);
          onChange([...images, url]);
          toast.success('Image cropped and uploaded successfully!');
        } catch (err: any) {
          console.error('Upload error after crop:', err);
          toast.error(err.message || 'Failed to upload cropped image');
        } finally {
          setUploading(false);
        }
      }, 'image/jpeg', 0.92);
    };
  };

  const generateAI = async () => {
    if (!aiPrompt.trim()) { toast.error('Describe what to generate'); return; }
    setAiLoading(true);
    try {
      const { data, insufficient } = await aiCredits.invoke<{ imageUrl: string }>('generate-product-image', {
        prompt: aiPrompt.trim(),
        productName: aiContext?.productName,
        category: aiContext?.category,
        storeName: aiContext?.storeName,
      });
      if (insufficient) return;
      if (!data?.imageUrl) { toast.error('No image returned'); return; }
      onChange([...images, data.imageUrl]);
      toast.success('AI photo added!');
      setAiOpen(false);
      setAiPrompt('');
    } catch (e: any) {
      toast.error(e?.message || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const uploadImage = useCallback(async (original: File) => {
    if (original.size > 30 * 1024 * 1024) {
      throw new Error('Image must be under 30 MB');
    }
    const file = await compressImage(original, { maxWidth: 1600, maxHeight: 1600, maxSizeMB: 1.2 });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const path = `${user.id}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(path);
    return publicUrl;
  }, []);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }
    if (files.length > 1) {
      toast.info('Please upload photos one by one to crop each of them. First photo loaded.');
    }
    const file = files[0];
    setCropFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCropImageSrc(event.target?.result as string);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const setAsMain = (index: number) => {
    if (index === 0) return;
    const next = [...images];
    const [picked] = next.splice(index, 1);
    next.unshift(picked);
    onChange(next);
    toast.success('Main image updated');
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {images.map((url, i) => (
          <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
            {i === 0 ? (
              <span className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                <Star className="h-2.5 w-2.5 fill-current" /> Main
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setAsMain(i)}
                className="absolute bottom-1 left-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium opacity-0 transition-opacity hover:bg-primary hover:text-primary-foreground group-hover:opacity-100"
              >
                Set main
              </button>
            )}
          </div>
        ))}
        {images.length < maxImages && (
          <div className="flex aspect-square flex-col gap-1.5">
            <label
              className={cn(
                'flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-primary/50 hover:bg-accent/50',
                uploading && 'pointer-events-none opacity-60'
              )}
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Gallery</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
                disabled={uploading}
              />
            </label>
            <label
              className={cn(
                'flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-primary/30 bg-primary/5 py-1.5 transition-colors hover:bg-primary/10',
                uploading && 'pointer-events-none opacity-60'
              )}
            >
              <Camera className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-medium text-primary">Camera</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
                disabled={uploading}
              />
            </label>
          </div>
        )}
        {enableAI && images.length < maxImages && (
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            className="group flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-violet-400/50 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 transition-all hover:border-violet-500 hover:shadow-sm"
            aria-label="Generate product photo with AI"
          >
            <Sparkles className="h-5 w-5 text-violet-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-semibold text-violet-700 dark:text-violet-300">AI Photo</span>
            <span className="text-[9px] text-violet-600/70">10 credits</span>
          </button>
        )}
      </div>
      {enableAI && (
        <p className="text-[11px] text-violet-700/80 dark:text-violet-300/80">
          ✨ Food &amp; beverage merchants: generate appetizing product photos with AI when your shots all look similar.
        </p>
      )}
      {images.length > 1 && (
        <p className="text-[11px] text-muted-foreground">
          Hover any image and tap <strong>Set main</strong> to choose the cover photo.
        </p>
      )}

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-600" /> Generate product photo</DialogTitle>
            <DialogDescription>
              Describe the dish or item in 1–2 sentences. We'll generate a studio-quality photo. Costs 10 credits per image.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              autoFocus
              placeholder={aiContext?.productName ? `e.g. ${aiContext.productName} with garnish, served hot…` : 'e.g. Chocolate truffle cake with cherries on a wooden board'}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={aiLoading}
            />
            <p className="text-[11px] text-muted-foreground">Tip: mention ingredients, plating, mood (warm/rustic/luxurious).</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAiOpen(false)} disabled={aiLoading}>Cancel</Button>
            <Button onClick={generateAI} disabled={aiLoading || !aiPrompt.trim()} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90">
              {aiLoading ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Generating…</> : <><Sparkles className="h-3.5 w-3.5 mr-1" /> Generate (10 cr)</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Crop & Resize Dialog */}
      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crop & Resize Photo</DialogTitle>
            <DialogDescription>
              Drag to position the image inside the box, and use the slider to zoom.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div 
              className="relative w-full max-w-[320px] aspect-square bg-slate-950/90 overflow-hidden border border-slate-800 rounded-lg mx-auto cursor-move select-none touch-none flex items-center justify-center"
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
            >
              {/* Crop Grid Overlay */}
              <div className="absolute inset-0 border-2 border-primary/50 pointer-events-none z-10 grid grid-cols-3 grid-rows-3 opacity-40">
                <div className="border-r border-b border-primary/30"></div>
                <div className="border-r border-b border-primary/30"></div>
                <div className="border-b border-primary/30"></div>
                <div className="border-r border-b border-primary/30"></div>
                <div className="border-r border-b border-primary/30"></div>
                <div className="border-b border-primary/30"></div>
                <div className="border-r border-primary/30"></div>
                <div className="border-r border-primary/30"></div>
                <div></div>
              </div>
              
              <img 
                src={cropImageSrc} 
                alt="Crop Preview" 
                draggable={false}
                style={{
                  transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
                  maxHeight: '100%',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
              />
            </div>

            <div className="space-y-2 max-w-[320px] mx-auto">
              <div className="flex justify-between text-xs text-muted-foreground font-semibold">
                <span>Zoom</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input 
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
            
            <div className="flex justify-center gap-2">
              <Button 
                size="sm" 
                type="button"
                variant="outline" 
                onClick={() => {
                  setZoom(1);
                  setOffsetX(0);
                  setOffsetY(0);
                }}
                className="text-xs font-semibold"
              >
                Reset Position
              </Button>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setCropOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleCropSave} className="bg-primary text-primary-foreground font-semibold">
              Crop & Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageUploader;
