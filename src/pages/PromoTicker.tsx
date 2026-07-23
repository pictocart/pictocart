import { useEffect, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import PromoTickerEditor, { DEFAULT_PROMO_TICKER } from '@/components/store-design/PromoTickerEditor';
import type { PromoTickerConfig } from '@/components/storefront/PromoTicker';
import { toast } from 'sonner';
import { Save, ExternalLink, Megaphone } from 'lucide-react';
import { buildResolvedStorefrontManifest, getStorefrontConfig } from '@/lib/storefrontManifest';

const PromoTickerPage = () => {
  const { store, setStore } = useStore();
  const settings = getStorefrontConfig(store) as any;
  const [config, setConfig] = useState<PromoTickerConfig>({
    ...DEFAULT_PROMO_TICKER,
    ...(settings.promo_ticker || {}),
  });
  const [saving, setSaving] = useState(false);
  const [hydratedId, setHydratedId] = useState<string | null>(null);

  useEffect(() => {
    if (!store?.id || hydratedId === store.id) return;
    const s = getStorefrontConfig(store) as any;
    setConfig({ ...DEFAULT_PROMO_TICKER, ...(s.promo_ticker || {}) });
    setHydratedId(store.id);
  }, [store, hydratedId]);

  const handleSave = async () => {
    if (!store) return;
    setSaving(true);
    // promo_ticker is rendering config — goes only into
    // resolved_storefront_manifest.config, `stores.settings` untouched.
    const newConfig = { ...settings, promo_ticker: config };
    const resolved_storefront_manifest = await buildResolvedStorefrontManifest(store as any, newConfig as any);
    const { error } = await supabase
      .from('stores')
      .update({ resolved_storefront_manifest: resolved_storefront_manifest as any })
      .eq('id', store.id);
    if (error) {
      toast.error('Save failed');
    } else {
      setStore({ ...store, resolved_storefront_manifest });
      toast.success('Promo ticker saved');
    }
    setSaving(false);
  };

  const storefrontUrl = store?.slug ? `/store/${store.slug}` : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" /> Promo Ticker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            A scrolling announcement bar at the top of your storefront — perfect for offers, free shipping notices, and new arrivals.
          </p>
        </div>
        <div className="flex gap-2">
          {storefrontUrl && (
            <Button asChild variant="outline" size="sm">
              <a href={storefrontUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> Preview store
              </a>
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-1 h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <PromoTickerEditor config={config} onChange={setConfig} />
    </div>
  );
};

export default PromoTickerPage;
