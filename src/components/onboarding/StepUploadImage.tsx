import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, ImageIcon, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { OnboardingData } from '@/pages/Onboarding';

interface Props {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  storeId?: string;
}

const StepUploadImage = ({ data, setData, storeId }: Props) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `onboarding/${storeId || 'temp'}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from('product-images').upload(path, file);
    if (error) {
      toast.error('Upload failed. Please try again.');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
    setData((d) => ({
      ...d,
      productImageUrl: urlData.publicUrl,
      productImageFile: file,
    }));
    setUploading(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [storeId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const removeImage = () => {
    setData((d) => ({ ...d, productImageUrl: '', productImageFile: null }));
  };

  return (
    <div className={`space-y-8 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 shadow-lg shadow-primary/10">
          <Camera className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Upload your first product</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Our AI will analyze the image and generate product details for you automatically.
        </p>
      </div>

      <div className="max-w-md mx-auto">
        {data.productImageUrl ? (
          <div className="relative rounded-2xl border-2 border-primary/20 overflow-hidden shadow-xl shadow-primary/10 animate-in fade-in zoom-in-95 duration-300">
            <img
              src={data.productImageUrl}
              alt="Product"
              className="w-full h-72 object-contain bg-secondary/30"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-3 right-3 h-9 w-9 rounded-xl shadow-lg hover:scale-110 transition-transform"
              onClick={removeImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all duration-300 cursor-pointer group',
              dragOver ? 'border-primary bg-accent shadow-lg' : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-accent/30',
              uploading && 'pointer-events-none opacity-60'
            )}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors duration-300">
              {uploading ? (
                <div className="h-7 w-7 rounded-full border-3 border-primary/30 border-t-primary animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
              )}
            </div>
            <p className="text-sm font-semibold mb-1">
              {uploading ? 'Uploading...' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
            <input
              id="file-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default StepUploadImage;
