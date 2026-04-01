import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, ImageIcon } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
          <ImageIcon className="h-7 w-7 text-accent-foreground" />
        </div>
        <h2 className="text-xl font-bold">Upload your first product</h2>
        <p className="text-sm text-muted-foreground">
          Our AI will analyze the image and generate product details for you.
        </p>
      </div>

      {data.productImageUrl ? (
        <div className="relative rounded-xl border border-border overflow-hidden">
          <img
            src={data.productImageUrl}
            alt="Product"
            className="w-full h-64 object-contain bg-secondary/30"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
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
            'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer',
            dragOver ? 'border-primary bg-accent' : 'border-border hover:border-primary/40',
            uploading && 'pointer-events-none opacity-60'
          )}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">
            {uploading ? 'Uploading...' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
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
  );
};

export default StepUploadImage;
