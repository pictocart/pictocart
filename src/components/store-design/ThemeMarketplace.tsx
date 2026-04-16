import { useState } from 'react';
import { useThemePacks, useThemePurchases, usePurchaseTheme, type ThemePack } from '@/hooks/useThemePacks';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Crown, Eye, Check, ShoppingCart, Loader2, Palette } from 'lucide-react';
import { toast } from 'sonner';

const ThemePreview = ({ pack }: { pack: ThemePack }) => {
  const config = pack.theme_config || {};
  const colors = config.colors || {};
  const fonts = config.fonts || {};
  const homeSections = pack.pages?.home || [];

  return (
    <div className="rounded-lg overflow-hidden border max-h-[70vh] overflow-y-auto" style={{ backgroundColor: colors.background, color: colors.text }}>
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ backgroundColor: colors.card }}>
        <span className="text-sm font-bold" style={{ fontFamily: fonts.heading }}>Preview Store</span>
        <div className="flex gap-4 text-xs" style={{ fontFamily: fonts.body }}>
          <span>Home</span><span>Shop</span><span>About</span><span>Blog</span>
        </div>
      </div>
      {homeSections.map((section: any, i: number) => (
        <div key={i}>
          {section.type === 'hero' && (
            <div className="relative h-48 flex items-center justify-center" style={{ backgroundColor: colors.primary }}>
              {section.image && <img src={section.image} alt="" className="absolute inset-0 w-full h-full object-cover" />}
              <div className="relative z-10 text-center px-4">
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: fonts.heading }}>{section.title}</h2>
                {section.subtitle && <p className="text-sm text-white/80 mt-1">{section.subtitle}</p>}
                <div className="mt-3 inline-block px-4 py-1.5 text-xs font-semibold text-white rounded" style={{ backgroundColor: colors.accent || colors.primary }}>Shop Now</div>
              </div>
              <div className="absolute inset-0 bg-black/25" />
            </div>
          )}
          {section.type === 'featured_products' && (
            <div className="p-4">
              <h3 className="text-sm font-bold mb-3" style={{ fontFamily: fonts.heading }}>{section.title || 'Featured Products'}</h3>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="rounded overflow-hidden" style={{ backgroundColor: colors.card, border: `1px solid ${colors.secondary}` }}>
                    <div className="h-20" style={{ backgroundColor: colors.secondary }} />
                    <div className="p-2 space-y-1">
                      <div className="h-2 rounded" style={{ backgroundColor: colors.secondary, width: '70%' }} />
                      <div className="h-2 rounded" style={{ backgroundColor: colors.primary, width: '40%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {section.type === 'category_grid' && (
            <div className="p-4">
              <h3 className="text-sm font-bold mb-3" style={{ fontFamily: fonts.heading }}>{section.title || 'Categories'}</h3>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-14 rounded flex items-center justify-center text-xs font-medium" style={{ backgroundColor: colors.secondary }}> Category {n}</div>
                ))}
              </div>
            </div>
          )}
          {section.type === 'newsletter' && (
            <div className="p-4 text-center" style={{ backgroundColor: colors.secondary }}>
              <h3 className="text-sm font-bold" style={{ fontFamily: fonts.heading }}>{section.title || 'Newsletter'}</h3>
              <div className="flex gap-2 max-w-xs mx-auto mt-2">
                <div className="flex-1 h-8 rounded border" style={{ borderColor: colors.text + '20' }} />
                <div className="h-8 px-4 rounded text-xs flex items-center text-white" style={{ backgroundColor: colors.primary }}>Subscribe</div>
              </div>
            </div>
          )}
          {section.type === 'text_block' && (
            <div className="p-4 text-center">
              <h3 className="text-sm font-bold" style={{ fontFamily: fonts.heading }}>{section.title}</h3>
              {section.subtitle && <p className="text-xs opacity-60 mt-1">{section.subtitle}</p>}
            </div>
          )}
        </div>
      ))}
      <div className="px-4 py-3 text-center text-xs opacity-40 border-t" style={{ backgroundColor: colors.card }}>
        © Theme Preview
      </div>
    </div>
  );
};

interface Props {
  onApply?: () => void;
}

const ThemeMarketplace = ({ onApply }: Props) => {
  const { data: packs = [], isLoading } = useThemePacks(true);
  const { data: purchases = [] } = useThemePurchases();
  const purchaseMutation = usePurchaseTheme();
  const { store, setStore } = useStore();
  const [previewPack, setPreviewPack] = useState<ThemePack | null>(null);
  const [applying, setApplying] = useState<string | null>(null);

  const purchasedIds = new Set(purchases.map(p => p.theme_pack_id));

  const handleApply = async (pack: ThemePack) => {
    if (!store) return;
    setApplying(pack.id);

    try {
      // If not purchased yet, purchase first (free or placeholder)
      if (!purchasedIds.has(pack.id)) {
        await purchaseMutation.mutateAsync(pack.id);
      }

      // Apply theme config + homepage sections to store
      const currentSettings = (store.settings || {}) as any;
      const homeSections = (pack.pages?.home || []).map((section: any) => ({
        id: crypto.randomUUID(),
        type: section.type || 'text_block',
        title: section.title || '',
        subtitle: section.subtitle || '',
        image: section.image || '',
        images: section.images || [],
        isSlider: section.isSlider || false,
        layout: section.layout || 'default',
        height: section.height || 'medium',
        topMargin: section.margins?.top || 0,
        animation: section.animation || 'none',
      }));

      const themeConfig = pack.theme_config || {};
      const newTheme = {
        name: `theme-pack-${pack.id}`,
        primary_color: themeConfig.colors?.primary || '#F97316',
        colors: themeConfig.colors || {},
        fonts: themeConfig.fonts || { heading: 'Inter', body: 'Inter' },
        borderRadius: themeConfig.borderRadius || 8,
      };

      const newSettings = {
        ...currentSettings,
        homepage_sections: homeSections,
        applied_theme_pack: pack.id,
      };

      const { error } = await supabase.from('stores').update({
        theme: newTheme,
        settings: newSettings,
      }).eq('id', store.id);

      if (error) throw error;

      setStore({ ...store, theme: newTheme, settings: newSettings });
      toast.success(`"${pack.name}" theme applied!`);
      onApply?.();
    } catch (e: any) {
      toast.error(e.message || 'Failed to apply theme');
    } finally {
      setApplying(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (packs.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed rounded-lg">
        <Palette className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium mb-1">No theme packs available yet</p>
        <p className="text-xs text-muted-foreground">Premium theme packs will appear here when published by admin.</p>
      </div>
    );
  }

  const freePacks = packs.filter(p => p.price === 0);
  const paidPacks = packs.filter(p => p.price > 0);

  const renderPackCard = (pack: ThemePack) => {
    const owned = purchasedIds.has(pack.id) || pack.price === 0;
    const isApplied = ((store?.settings as any)?.applied_theme_pack) === pack.id;
    const discountPct = pack.compare_at_price && pack.compare_at_price > pack.price && pack.price > 0
      ? Math.round(((pack.compare_at_price - pack.price) / pack.compare_at_price) * 100) : 0;

    return (
      <Card key={pack.id} className="overflow-hidden">
        {pack.thumbnail ? (
          <div className="relative">
            <img src={pack.thumbnail} alt={pack.name} className="h-36 w-full object-cover" />
            {pack.price === 0 && (
              <Badge className="absolute top-2 left-2 bg-green-500 text-white border-0 shadow-lg">FREE</Badge>
            )}
            {discountPct > 0 && (
              <Badge className="absolute top-2 left-2 bg-red-500 text-white border-0 shadow-lg">{discountPct}% OFF</Badge>
            )}
          </div>
        ) : (
          <div className="h-36 flex gap-0 relative">
            {Object.values(pack.theme_config?.colors || {}).slice(0, 6).map((c: any, i) => (
              <div key={i} className="flex-1" style={{ backgroundColor: c }} />
            ))}
            {pack.price === 0 && (
              <Badge className="absolute top-2 left-2 bg-green-500 text-white border-0 shadow-lg">FREE</Badge>
            )}
            {discountPct > 0 && (
              <Badge className="absolute top-2 left-2 bg-red-500 text-white border-0 shadow-lg">{discountPct}% OFF</Badge>
            )}
          </div>
        )}
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                {pack.price > 0 && <Crown className="h-3 w-3 text-amber-500" />}
                {pack.name}
              </h3>
              <p className="text-xs text-muted-foreground capitalize">{pack.category}</p>
            </div>
            {owned ? (
              <Badge variant="outline" className="text-green-600 border-green-200 shrink-0">
                <Check className="mr-1 h-3 w-3" /> {isApplied ? 'Active' : 'Owned'}
              </Badge>
            ) : pack.price === 0 ? (
              <Badge className="bg-green-500 text-white border-0 shrink-0">Free</Badge>
            ) : (
              <div className="text-right shrink-0">
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                  ₹{pack.price}
                </Badge>
                {pack.compare_at_price && pack.compare_at_price > pack.price && (
                  <p className="text-[10px] line-through opacity-40 mt-0.5">₹{pack.compare_at_price}</p>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{pack.description}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setPreviewPack(pack)}>
              <Eye className="mr-1 h-3.5 w-3.5" /> Preview
            </Button>
            <Button
              size="sm"
              className="flex-1"
              disabled={isApplied || applying === pack.id}
              onClick={() => handleApply(pack)}
            >
              {applying === pack.id ? (
                <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Applying...</>
              ) : isApplied ? (
                <><Check className="mr-1 h-3.5 w-3.5" /> Applied</>
              ) : owned || pack.price === 0 ? (
                'Apply Theme'
              ) : (
                <><ShoppingCart className="mr-1 h-3.5 w-3.5" /> Purchase & Apply</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Browse professionally designed theme packs. Apply to transform your store instantly.</p>

      {freePacks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            🎁 Free Themes
            <Badge variant="outline" className="text-green-600 border-green-200">{freePacks.length} available</Badge>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {freePacks.map(renderPackCard)}
          </div>
        </div>
      )}

      {paidPacks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" /> Premium Themes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paidPacks.map(renderPackCard)}
          </div>
        </div>
      )}

      <Dialog open={!!previewPack} onOpenChange={(o) => !o && setPreviewPack(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{previewPack?.name} — Preview</DialogTitle></DialogHeader>
          {previewPack && <ThemePreview pack={previewPack} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ThemeMarketplace;
