import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
          <Store className="h-7 w-7 text-accent-foreground" />
        </div>
        <h2 className="text-xl font-bold">What's your store name?</h2>
        <p className="text-sm text-muted-foreground">
          Pick a name that represents your brand. You can change it later.
        </p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="store-name">Store Name</Label>
        <Input
          id="store-name"
          placeholder="e.g. Priya's Fashion Hub"
          value={data.storeName}
          onChange={(e) => handleChange(e.target.value)}
          className="text-base h-12"
          autoFocus
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="store-desc">Short Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input
          id="store-desc"
          placeholder="e.g. Trendy fashion for modern women"
          value={data.description || ''}
          onChange={(e) => setData((d) => ({ ...d, description: e.target.value }))}
          className="text-base h-12"
        />
      </div>

      {data.slug && (
        <div className="rounded-lg border border-border bg-secondary/50 p-3 space-y-2">
          <p className="text-xs text-muted-foreground mb-1">Your store URL</p>
          <p className="text-sm font-medium text-foreground">
            <span className="text-muted-foreground">pictocart.in/store/</span>
            {data.slug}
          </p>
          <div className="flex items-center gap-1.5">
            {slugStatus === 'checking' && (
              <><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Checking availability…</span></>
            )}
            {slugStatus === 'available' && (
              <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /><span className="text-xs text-emerald-600">This URL is available!</span></>
            )}
            {slugStatus === 'taken' && (
              <><XCircle className="h-3.5 w-3.5 text-destructive" /><span className="text-xs text-destructive">This URL is already taken. Try a different name.</span></>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StepStoreName;
