import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { OnboardingData } from '@/pages/Onboarding';

interface Props {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  storeId: string | undefined;
}

const StepLogo = ({ data, setData, storeId }: Props) => {
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

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
    <div className={`space-y-8 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 shadow-lg shadow-primary/10">
          <Upload className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Upload your logo</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Add a logo to make your store look professional. You can skip this step and add one later.
        </p>
      </div>

      <div className="flex flex-col items-center gap-5 max-w-sm mx-auto">
        {data.logoUrl ? (
          <div className="relative group animate-in fade-in zoom-in-95 duration-300">
            <div className="h-36 w-36 rounded-2xl border-2 border-primary/20 overflow-hidden bg-muted shadow-xl shadow-primary/10">
              <img src={data.logoUrl} alt="Store logo" className="h-full w-full object-contain" />
            </div>
            <button
              type="button"
              onClick={removeLogo}
              className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg hover:bg-destructive/90 transition-all duration-200 hover:scale-110"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="cursor-pointer w-full">
            <div className="h-44 rounded-2xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-3 hover:border-primary/40 hover:bg-accent/50 transition-all duration-300 group">
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <>
                  <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
                    <ImagePlus className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium block">Click to upload</span>
                    <span className="text-xs text-muted-foreground">or drag and drop</span>
                  </div>
                </>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={uploading} />
          </label>
        )}

        {data.logoUrl && (
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" asChild className="rounded-xl">
              <span>Change Logo</span>
            </Button>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={uploading} />
          </label>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Recommended: 512×512px · PNG or JPG · Max 5 MB
        </p>
      </div>
    </div>
  );
};

export default StepLogo;
