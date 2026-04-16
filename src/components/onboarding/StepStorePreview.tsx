import { useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OnboardingData } from '@/pages/Onboarding';

interface Props {
  data: OnboardingData;
  storeSlug: string | undefined;
}

const StepStorePreview = ({ data, storeSlug }: Props) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const slug = storeSlug || data.slug;
  const storeUrl = `/store/${slug}`;

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">Preview your store</h2>
        <p className="text-sm text-muted-foreground">
          This is how customers will see your store. Looking good!
        </p>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-background shadow-sm">
        {/* Browser chrome */}
        <div className="bg-muted/50 border-b border-border px-3 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-background rounded-md px-3 py-1 text-xs text-muted-foreground font-mono truncate">
            https://pictocart.in/store/{slug}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>

        {/* Live iframe */}
        <iframe
          key={refreshKey}
          src={storeUrl}
          title="Store preview"
          className="w-full h-[400px] sm:h-[500px] border-0"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>

      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
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
