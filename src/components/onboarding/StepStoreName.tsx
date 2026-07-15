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
    if (!slug || slug.length < 2) { 
      setSlugStatus('idle'); 
      setData(d => ({ ...d, slugAvailable: false })); 
      return; 
    }
    setSlugStatus('checking');
    const { data: existing } = await supabase
      .from('stores')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    const available = !existing;
    
    if (available) {
      setSlugStatus('available');
      setData(d => ({ ...d, slugAvailable: true }));
    } else {
      // Try alternatives
      const alternatives = [`${slug}-x`, `${slug}-shop`, `${slug}-store`, `${slug}-${Math.floor(Math.random() * 99)}`];
      let foundAvailable = false;
      
      for (const alt of alternatives) {
        const { data: existingAlt } = await supabase
          .from('stores')
          .select('id')
          .eq('slug', alt)
          .maybeSingle();
        
        if (!existingAlt) {
          setData(d => ({ ...d, slug: alt, slugAvailable: true }));
          setSlugStatus('available');
          foundAvailable = true;
          break;
        }
      }
      
      if (!foundAvailable) {
        setSlugStatus('taken');
        setData(d => ({ ...d, slugAvailable: false }));
      }
    }
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
    <div className={`space-y-4 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
          <Store className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">What's your store name?</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Pick a name that represents your brand. You can always change it later.
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-3">
        <div className="space-y-1">
          <Label htmlFor="store-name" className="text-xs font-medium">Store Name</Label>
          <Input
            id="store-name"
            placeholder="e.g. Priya's Fashion Hub"
            value={data.storeName}
            onChange={(e) => handleChange(e.target.value)}
            className="h-10 px-3 rounded-lg"
            autoFocus
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="store-desc" className="text-xs font-medium">
            Short Description <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="store-desc"
            placeholder="e.g. Trendy fashion for modern women"
            value={data.description || ''}
            onChange={(e) => setData((d) => ({ ...d, description: e.target.value }))}
            className="h-10 px-3 rounded-lg"
          />
        </div>

        {data.slug && (
          <div className="rounded-lg border bg-secondary/50 p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Your store URL</p>
            </div>
            <p className="text-xs font-medium font-mono bg-background rounded px-2 py-1">
              <span className="text-muted-foreground">pictocart.in/store/</span>
              <span className="text-primary">{data.slug}</span>
            </p>
            <div className="flex items-center gap-1">
              {slugStatus === 'checking' && (
                <><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /><span className="text-[10px] text-muted-foreground">Checking…</span></>
              )}
              {slugStatus === 'available' && (
                <><CheckCircle2 className="h-3 w-3 text-emerald-500" /><span className="text-[10px] text-emerald-600 font-medium">Available!</span></>
              )}
              {slugStatus === 'taken' && (
                <><XCircle className="h-3 w-3 text-destructive" /><span className="text-[10px] text-destructive">Taken. Trying alternatives...</span></>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StepStoreName;
