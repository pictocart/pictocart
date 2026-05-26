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

const SEOSettings = () => {
  const { store, setStore } = useStore();
  const settings = (store?.settings || {}) as any;
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
    const s = ((store.settings || {}) as any).seo || {};
    setForm({
      meta_title: s.meta_title || store.name || '',
      meta_description: s.meta_description || store.description || '',
      og_image: s.og_image || store.banner_url || '',
      google_analytics_id: s.google_analytics_id || '',
    });
    setInitialized(true);
  }, [store?.id, store?.settings]);

  const handleSave = async () => {
    if (!store) return;
    setSaving(true);
    const newSettings = { ...settings, seo: form };
    const { error } = await supabase
      .from('stores')
      .update({ settings: newSettings })
      .eq('id', store.id);

    if (error) {
      toast.error('Failed to save SEO settings');
    } else {
      toast.success('SEO settings saved');
      setStore({ ...store, settings: newSettings });
    }
    setSaving(false);
  };

  const storeUrl = `${window.location.origin}/store/${store?.slug}`;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SEO & Marketing</h1>
        <p className="text-sm text-muted-foreground">Optimize your store for search engines and social sharing</p>
      </div>

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
                data-tour="seo-title"
                value={form.meta_title}
                onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
                placeholder="Your store name"
                maxLength={60}
              />
              <p className="text-[11px] text-muted-foreground">{form.meta_title.length}/60 characters</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Meta Description</Label>
              <Textarea
                data-tour="seo-desc"
                value={form.meta_description}
                onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                placeholder="Describe your store in 160 characters"
                maxLength={160}
                rows={3}
              />
              <p className="text-[11px] text-muted-foreground">{form.meta_description.length}/160 characters</p>
            </div>

            {/* Google Preview */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-1">
              <p className="text-xs text-muted-foreground mb-2">Google Preview</p>
              <p className="text-sm text-blue-600 truncate">{form.meta_title || 'Your Store'}</p>
              <p className="text-xs text-green-700 truncate">{storeUrl}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {form.meta_description || 'No description set'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Share2 className="h-4 w-4" /> Social Sharing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">OG Image URL</Label>
              <Input
                value={form.og_image}
                onChange={(e) => setForm({ ...form, og_image: e.target.value })}
                placeholder="https://..."
              />
              <p className="text-[11px] text-muted-foreground">
                Recommended: 1200×630px. Used when your store is shared on social media.
              </p>
            </div>
            {form.og_image && (
              <div className="overflow-hidden rounded-lg border">
                <img src={form.og_image} alt="OG Preview" className="w-full h-40 object-cover" />
                <div className="p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground truncate">{storeUrl}</p>
                  <p className="text-sm font-medium truncate">{form.meta_title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{form.meta_description}</p>
                </div>
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
    </div>
  );
};

export default SEOSettings;
