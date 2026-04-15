import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { OnboardingData } from '@/pages/Onboarding';

interface Props {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  storeId: string | undefined;
}

const StepLogo = ({ data, setData, storeId }: Props) => {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }

    setUploading(true);
    try {
      const path = `logos/${crypto.randomUUID()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage
        .from('store-assets')
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('store-assets').getPublicUrl(path);
      setData((d) => ({ ...d, logoUrl: urlData.publicUrl }));
      toast.success('Logo uploaded!');
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => {
    setData((d) => ({ ...d, logoUrl: '' }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">Upload your logo</h2>
        <p className="text-sm text-muted-foreground">
          Add a logo to make your store look professional. You can skip this and add one later.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        {data.logoUrl ? (
          <div className="relative group">
            <div className="h-32 w-32 rounded-2xl border-2 border-border overflow-hidden bg-muted">
              <img src={data.logoUrl} alt="Store logo" className="h-full w-full object-contain" />
            </div>
            <button
              type="button"
              onClick={removeLogo}
              className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <label className="cursor-pointer">
            <div className="h-32 w-32 rounded-2xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors">
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
                  <span className="text-xs text-muted-foreground">Click to upload</span>
                </>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={uploading} />
          </label>
        )}

        {data.logoUrl && (
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" asChild>
              <span>Change Logo</span>
            </Button>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={uploading} />
          </label>
        )}

        <p className="text-xs text-muted-foreground">Recommended: 512×512px, PNG or JPG, max 5 MB</p>
      </div>
    </div>
  );
};

export default StepLogo;
