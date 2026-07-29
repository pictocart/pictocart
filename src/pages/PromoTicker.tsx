import { useEffect, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import PromoTickerEditor, { DEFAULT_PROMO_TICKER } from '@/components/store-design/PromoTickerEditor';
import type { PromoTickerConfig } from '@/components/storefront/PromoTicker';
import { toast } from 'sonner';
import { Save, ExternalLink, Megaphone } from 'lucide-react';
import { buildResolvedStorefrontManifest, getStorefrontConfig } from '@/lib/storefrontManifest';
import { useSubscription } from '@/hooks/useSubscription';

const PromoTickerPage = () => {
  const { store, setStore } = useStore();
  const [config, setConfig] = useState<PromoTickerConfig>(() => {
    const s = getStorefrontConfig(store) as any;
    return { ...DEFAULT_PROMO_TICKER, ...(s.promo_ticker || {}) };
  });
  const [saving, setSaving] = useState(false);
  const [hydratedId, setHydratedId] = useState<string | null>(null);
  const { plan } = useSubscription();

  useEffect(() => {
    if (!store?.id || hydratedId === store.id) return;
    const s = getStorefrontConfig(store) as any;
    setConfig({ ...DEFAULT_PROMO_TICKER, ...(s.promo_ticker || {}) });
    setHydratedId(store.id);
  }, [store, hydratedId]);

  const handleSave = async () => {
    if (!store) return;
    setSaving(true);
    try {
      // 1) Fetch current store settings to get usage_stats
      const { data: storeData, error: fetchErr } = await supabase
        .from('stores')
        .select('settings')
        .eq('id', store.id)
        .single();
      if (fetchErr) throw fetchErr;

      const settings = (storeData?.settings as any) || {};
      const stats = settings.usage_stats || {};

      // 2) Check limits based on plan
      if (plan === 'free') {
        const changesCount = stats.promo_ticker_changes || 0;
        if (changesCount >= 1) {
          toast.error("Free plan allows only 1 promo ticker change. Upgrade your plan to edit.");
          setSaving(false);
          return;
        }
      } else if (plan === 'starter') {
        const lastChanged = stats.promo_ticker_last_changed;
        if (lastChanged) {
          const lastDate = new Date(lastChanged).toDateString();
          const todayDate = new Date().toDateString();
          if (lastDate === todayDate) {
            toast.error("Starter plan allows only 1 promo ticker change per day. Upgrade your plan to edit again today.");
            setSaving(false);
            return;
          }
        }
      }

      // If checks pass, perform save
      const currentSettings = getStorefrontConfig(store) as any;
      const newConfig = { ...currentSettings, promo_ticker: config };
      const resolved_storefront_manifest = await buildResolvedStorefrontManifest(store as any, newConfig as any);
      
      const newStats = {
        ...stats,
        promo_ticker_changes: (stats.promo_ticker_changes || 0) + 1,
        promo_ticker_last_changed: new Date().toISOString(),
      };
      const updatedSettings = { ...(store.settings as any || {}), promo_ticker: config, usage_stats: newStats };

      const { error: updateErr } = await supabase
        .from('stores')
        .update({
          resolved_storefront_manifest: resolved_storefront_manifest as any,
          settings: updatedSettings,
        })
        .eq('id', store.id);

      if (updateErr) throw updateErr;

      setStore({ ...store, resolved_storefront_manifest, settings: updatedSettings });
      toast.success('Promo ticker saved!');
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
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
