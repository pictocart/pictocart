import { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OnboardingData } from '@/pages/Onboarding';

interface Props {
  data: OnboardingData;
  storeSlug: string | undefined;
}

const StepStorePreview = ({ data, storeSlug }: Props) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const slug = storeSlug || data.slug;
  const storeUrl = `/store/${slug}`;

  return (
    <div className={`space-y-6 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 shadow-lg shadow-primary/10">
          <Monitor className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Preview your store</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          This is how customers will see your store. Looking great!
        </p>
      </div>

      <div className="rounded-2xl border-2 border-border overflow-hidden bg-background shadow-xl">
        {/* Browser chrome */}
        <div className="bg-muted/60 border-b border-border px-4 py-2.5 flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400/80" />
            <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
            <div className="h-3 w-3 rounded-full bg-green-400/80" />
          </div>
          <div className="flex-1 bg-background rounded-lg px-4 py-1.5 text-xs text-muted-foreground font-mono truncate shadow-inner">
            https://pictocart.in/store/{slug}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Live iframe */}
        <iframe
          key={refreshKey}
          src={storeUrl}
          title="Store preview"
          className="w-full h-[420px] sm:h-[500px] border-0"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>

      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl"
          onClick={() => window.open(storeUrl, '_blank')}
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        You can customize your store theme, layout, and more from the dashboard.
      </p>
    </div>
  );
};

export default StepStorePreview;
