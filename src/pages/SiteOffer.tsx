import { useEffect, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import SiteOfferBanner from '@/components/storefront/SiteOfferBanner';




interface OfferRow {
  enabled: boolean;
  percent_off: number;
  starts_at: string | null;
  ends_at: string | null;
  label: string | null;
  banner_text: string | null;
  banner_bg_color: string | null;
  banner_text_color: string | null;
  show_banner: boolean;
  
}

const DEFAULTS: OfferRow = {
  enabled: false,
  percent_off: 10,
  starts_at: null,
  ends_at: null,
  label: 'Festive Sale',
  banner_text: '',
  banner_bg_color: '#F97316',
  banner_text_color: '#FFFFFF',
  show_banner: true,
};

const toLocalInput = (iso: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 16) : '';
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

const SiteOffer = () => {
  const { store } = useStore();
  const [form, setForm] = useState<OfferRow>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!store?.id) return;
    (async () => {
      const { data } = await supabase
        .from('store_site_offers' as any)
        .select('*')
        .eq('store_id', store.id)
        .maybeSingle();
      if (data) setForm({ ...DEFAULTS, ...(data as any) });
      setLoading(false);
    })();
  }, [store?.id]);

  const set = <K extends keyof OfferRow>(k: K, v: OfferRow[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!store?.id) return;
    setSaving(true);
    const payload = {
      store_id: store.id,
      enabled: form.enabled,
      percent_off: Math.min(90, Math.max(0, Number(form.percent_off) || 0)),
      starts_at: form.starts_at,
      ends_at: form.ends_at,
      label: form.label,
      banner_text: form.banner_text,
      banner_bg_color: form.banner_bg_color,
      banner_text_color: form.banner_text_color,
      show_banner: form.show_banner,
    };
    const { error } = await supabase
      .from('store_site_offers' as any)
      .upsert(payload, { onConflict: 'store_id' });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Site-wide offer saved');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> Site-wide Offer
        </h1>
        <p className="text-sm text-muted-foreground">
          Run a festive sale across your whole store. Every product is discounted by the
          chosen percentage. If a product already has a bigger discount, the bigger one
          stays.
        </p>
      </div>

      {form.enabled && (
        <Card className="overflow-hidden border-dashed">
          <p className="text-xs text-muted-foreground px-4 pt-3">Live banner preview</p>
          <div className="mt-2">
            <div
              className="w-full text-center text-sm font-semibold py-2 px-3"
              style={{
                backgroundColor: form.banner_bg_color || '#F97316',
                color: form.banner_text_color || '#FFFFFF',
              }}
            >
              ✨{' '}
              {form.banner_text ||
                `${form.label || 'Festive Sale'} — Flat ${form.percent_off}% off everything!`}
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Offer details
            <Switch checked={form.enabled} onCheckedChange={(v) => set('enabled', v)} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Discount %</Label>
              <Input
                type="number"
                min={0}
                max={90}
                value={form.percent_off}
                onChange={(e) => set('percent_off', Number(e.target.value || 0))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Label (internal)</Label>
              <Input
                placeholder="Diwali Dhamaka"
                value={form.label || ''}
                onChange={(e) => set('label', e.target.value)}
              />
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label className="text-xs">Show banner</Label>
              <div className="flex items-center h-10">
                <Switch
                  checked={form.show_banner}
                  onCheckedChange={(v) => set('show_banner', v)}
                />
                <span className="ml-2 text-sm text-muted-foreground">
                  {form.show_banner ? 'Visible' : 'Hidden'}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Starts at</Label>
              <Input
                type="datetime-local"
                value={toLocalInput(form.starts_at)}
                onChange={(e) => set('starts_at', fromLocalInput(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ends at</Label>
              <Input
                type="datetime-local"
                value={toLocalInput(form.ends_at)}
                onChange={(e) => set('ends_at', fromLocalInput(e.target.value))}
              />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label className="text-xs">Banner text (optional)</Label>
              <Input
                placeholder="e.g. 🎉 Diwali Sale — Flat 20% off everything!"
                value={form.banner_text || ''}
                onChange={(e) => set('banner_text', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Banner background</Label>
              <Input
                type="color"
                value={form.banner_bg_color || '#F97316'}
                onChange={(e) => set('banner_bg_color', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Banner text color</Label>
              <Input
                type="color"
                value={form.banner_text_color || '#FFFFFF'}
                onChange={(e) => set('banner_text_color', e.target.value)}
              />
            </div>
          </div>

          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save offer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteOffer;
