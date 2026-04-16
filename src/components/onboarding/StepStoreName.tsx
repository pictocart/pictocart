import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { OnboardingData } from '@/pages/Onboarding';

interface Props {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}

const slugify = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const StepStoreName = ({ data, setData }: Props) => {
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || slug.length < 2) { setSlugStatus('idle'); setData(d => ({ ...d, slugAvailable: false })); return; }
    setSlugStatus('checking');
    const { data: existing } = await supabase
      .from('stores')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    const available = !existing;
    setSlugStatus(available ? 'available' : 'taken');
    setData(d => ({ ...d, slugAvailable: available }));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (data.slug) checkSlug(data.slug);
    }, 500);
    return () => clearTimeout(timeout);
  }, [data.slug, checkSlug]);

  const handleChange = (name: string) => {
    setData((d) => ({ ...d, storeName: name, slug: slugify(name) }));
  };

  return (
    <div className={`space-y-8 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 shadow-lg shadow-primary/10">
          <Store className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">What's your store name?</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Pick a name that represents your brand. You can always change it later.
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-5">
        <div className="space-y-2">
          <Label htmlFor="store-name" className="text-sm font-medium">Store Name</Label>
          <Input
            id="store-name"
            placeholder="e.g. Priya's Fashion Hub"
            value={data.storeName}
            onChange={(e) => handleChange(e.target.value)}
            className="text-base h-13 px-4 rounded-xl border-muted-foreground/20 focus:border-primary shadow-sm"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="store-desc" className="text-sm font-medium">
            Short Description <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="store-desc"
            placeholder="e.g. Trendy fashion for modern women"
            value={data.description || ''}
            onChange={(e) => setData((d) => ({ ...d, description: e.target.value }))}
            className="text-base h-13 px-4 rounded-xl border-muted-foreground/20 focus:border-primary shadow-sm"
          />
        </div>

        {data.slug && (
          <div className="rounded-xl border border-border bg-gradient-to-br from-secondary/80 to-secondary/30 p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your store URL</p>
            </div>
            <p className="text-sm font-medium text-foreground font-mono bg-background/60 rounded-lg px-3 py-2">
              <span className="text-muted-foreground">pictocart.in/store/</span>
              <span className="text-primary">{data.slug}</span>
            </p>
            <div className="flex items-center gap-1.5">
              {slugStatus === 'checking' && (
                <><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Checking availability…</span></>
              )}
              {slugStatus === 'available' && (
                <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /><span className="text-xs text-emerald-600 font-medium">This URL is available!</span></>
              )}
              {slugStatus === 'taken' && (
                <><XCircle className="h-3.5 w-3.5 text-destructive" /><span className="text-xs text-destructive font-medium">This URL is already taken. Try a different name.</span></>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StepStoreName;
