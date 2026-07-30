import { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, Globe, Share2 } from 'lucide-react';
import { buildResolvedStorefrontManifest, getStorefrontConfig } from '@/lib/storefrontManifest';
import PremiumGate from '@/components/PremiumGate';

const SEOSettings = () => {
  const { store, setStore } = useStore();
  const settings = getStorefrontConfig(store) as any;
  const seo = settings.seo || {};

  const [form, setForm] = useState({
    meta_title: '',
    meta_description: '',
    og_image: '',
    google_analytics_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Sync form with store data when store loads or updates
  useEffect(() => {
    if (!store) return;
    const s = (getStorefrontConfig(store).seo as any) || {};
    setForm({
      meta_title: s.meta_title || store.name || '',
      meta_description: s.meta_description || store.description || '',
      og_image: s.og_image || store.banner_url || '',
      google_analytics_id: s.google_analytics_id || '',
    });
    setInitialized(true);
  }, [store?.id]);

  const handleSave = async () => {
    if (!store) return;
    setSaving(true);
    // seo is rendering config — goes only into resolved_storefront_manifest.config,
    // `stores.settings` untouched.
    const newConfig = { ...settings, seo: form };
    const resolved_storefront_manifest = await buildResolvedStorefrontManifest(store as any, newConfig as any);
    const { error } = await supabase
      .from('stores')
      .update({ resolved_storefront_manifest: resolved_storefront_manifest as any })
      .eq('id', store.id);

    if (error) {
      toast.error('Failed to save SEO settings');
    } else {
      toast.success('SEO settings saved');
      setStore({ ...store, resolved_storefront_manifest });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SEO & Marketing</h1>
        <p className="text-sm text-muted-foreground">Optimize your store for search engines and social sharing</p>
      </div>

      <PremiumGate feature="seo" fallbackMessage="Upgrade your plan to unlock advanced search engine optimization and marketing metadata controls.">
        <div className="grid gap-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" /> Search Engine Optimization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Meta Title</Label>
                <Input
                  value={form.meta_title}
                  onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
                  placeholder="e.g. Delicious Organic Cakes | Sweet Delights"
                />
                <p className="text-[11px] text-muted-foreground">
                  The title shown in search engine results and browser tabs
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Meta Description</Label>
                <Textarea
                  value={form.meta_description}
                  onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                  placeholder="e.g. Order fresh, organic, homemade cakes online. Same-day delivery across town."
                  rows={3}
                />
                <p className="text-[11px] text-muted-foreground">
                  A brief summary of your store shown in search engine results
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Share2 className="h-4 w-4" /> Social Sharing (Open Graph)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Social Share Image (URL)</Label>
                <Input
                  value={form.og_image}
                  onChange={(e) => setForm({ ...form, og_image: e.target.value })}
                  placeholder="https://example.com/social-preview.jpg"
                />
                <p className="text-[11px] text-muted-foreground">
                  The image displayed when you share your store link on WhatsApp, Facebook, or Twitter
                </p>
              </div>
              {form.og_image && (
                <div className="aspect-video rounded-lg overflow-hidden border border-muted bg-muted/20 relative">
                  <img
                    src={form.og_image}
                    alt="Social Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" /> Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Google Analytics ID</Label>
                <Input
                  value={form.google_analytics_id}
                  onChange={(e) => setForm({ ...form, google_analytics_id: e.target.value })}
                  placeholder="G-XXXXXXXXXX"
                />
                <p className="text-[11px] text-muted-foreground">
                  Enter your GA4 measurement ID to track visitor analytics
                </p>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-fit">
            {saving ? 'Saving...' : 'Save SEO Settings'}
          </Button>
        </div>
      </PremiumGate>
    </div>
  );
};

export default SEOSettings;
