import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { THEME_TEMPLATES, FONT_OPTIONS, type ThemeTemplate } from '@/lib/themes';
import StorePreview from '@/components/store-design/StorePreview';
import HomepageBuilder, { type HomepageSection } from '@/components/store-design/HomepageBuilder';
import ThemeMarketplace from '@/components/store-design/ThemeMarketplace';
import HeaderEditor, { DEFAULT_HEADER, type HeaderConfig } from '@/components/store-design/HeaderEditor';
import FooterEditor, { DEFAULT_FOOTER, type FooterConfig } from '@/components/store-design/FooterEditor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Check, Crown, Palette, Eye, Sparkles, LayoutDashboard, PanelTop, PanelBottom, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const StoreDesign = () => {
  const { store, setStore } = useStore();
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('packs');

  const storeSettings = (store?.settings || {}) as any;

  const currentThemeId = (store?.theme as any)?.name || 'minimal-light';
  const currentTemplate = THEME_TEMPLATES.find((t) => t.id === currentThemeId) || THEME_TEMPLATES[0];

  const [selectedThemeId, setSelectedThemeId] = useState(currentThemeId);
  const [customColors, setCustomColors] = useState((store?.theme as any)?.colors || currentTemplate.colors);
  const [customFonts, setCustomFonts] = useState((store?.theme as any)?.fonts || currentTemplate.fonts);
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>(storeSettings.homepage_sections || []);
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>({ ...DEFAULT_HEADER, ...(storeSettings.header || {}) });
  const [footerConfig, setFooterConfig] = useState<FooterConfig>({ ...DEFAULT_FOOTER, ...(storeSettings.footer || {}) });
  const [showAllProductsGrid, setShowAllProductsGrid] = useState<boolean>(storeSettings.show_all_products_grid !== false);
  const [hydratedStoreId, setHydratedStoreId] = useState<string | null>(null);

  // Only hydrate from server data ONCE per store load — preserves edits across tab switches
  useEffect(() => {
    if (!store?.id || hydratedStoreId === store.id) return;
    const nextSettings = (store?.settings || {}) as any;
    const nextTheme = (store?.theme || {}) as any;
    const nextThemeId = nextTheme.name || 'minimal-light';
    const nextTemplate = THEME_TEMPLATES.find((t) => t.id === nextThemeId) || THEME_TEMPLATES[0];

    setSelectedThemeId(nextThemeId);
    setCustomColors(nextTheme.colors || nextTemplate.colors);
    setCustomFonts(nextTheme.fonts || nextTemplate.fonts);
    setHomepageSections(nextSettings.homepage_sections || []);
    setHeaderConfig({ ...DEFAULT_HEADER, ...(nextSettings.header || {}) });
    setFooterConfig({ ...DEFAULT_FOOTER, ...(nextSettings.footer || {}) });
    setShowAllProductsGrid(nextSettings.show_all_products_grid !== false);
    setHydratedStoreId(store.id);
  }, [store, hydratedStoreId]);

  const selectedTemplate = THEME_TEMPLATES.find((t) => t.id === selectedThemeId) || THEME_TEMPLATES[0];

  const previewTheme: ThemeTemplate = useMemo(
    () => ({ ...selectedTemplate, colors: customColors, fonts: customFonts }),
    [selectedTemplate, customColors, customFonts]
  );

  const filteredThemes = useMemo(() => {
    if (categoryFilter === 'all') return THEME_TEMPLATES;
    if (categoryFilter === 'free') return THEME_TEMPLATES.filter((t) => !t.isPremium);
    if (categoryFilter === 'premium') return THEME_TEMPLATES.filter((t) => t.isPremium);
    return THEME_TEMPLATES.filter((t) => t.category === categoryFilter);
  }, [categoryFilter]);

  const handleSelectTheme = (theme: ThemeTemplate) => {
    setSelectedThemeId(theme.id);
    setCustomColors(theme.colors);
    setCustomFonts(theme.fonts);
  };

  const handleSave = async () => {
    if (!store) return;
    const purchased = (storeSettings.purchased_themes || []) as string[];
    if (selectedTemplate.isPremium && !purchased.includes(selectedTemplate.id)) {
      toast.info(`"${selectedTemplate.name}" is a premium theme (₹${selectedTemplate.price}). Payment integration coming soon!`);
      return;
    }
    setSaving(true);

    const newSettings = {
      ...storeSettings,
      homepage_sections: homepageSections,
      header: headerConfig,
      footer: footerConfig,
      show_all_products_grid: showAllProductsGrid,
    };

    const { error } = await supabase.from('stores').update({
      theme: {
        name: selectedThemeId,
        primary_color: customColors.primary,
        colors: customColors,
        fonts: customFonts,
        borderRadius: selectedTemplate.borderRadius,
        layout: selectedTemplate.layout,
        preview: selectedTemplate.preview,
      },
      settings: newSettings,
    }).eq('id', store.id);

    if (error) {
      toast.error('Failed to save');
    } else {
      setStore({
        ...store,
        theme: {
          name: selectedThemeId,
          primary_color: customColors.primary,
          colors: customColors,
          fonts: customFonts,
          borderRadius: selectedTemplate.borderRadius,
          layout: selectedTemplate.layout,
          preview: selectedTemplate.preview,
        },
        settings: newSettings,
      });
      toast.success('Store design saved!');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Store Design</h1>
          <p className="text-sm text-muted-foreground">Customize your storefront — theme, homepage, header & footer</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save All'}</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="packs"><Package className="mr-1 h-3.5 w-3.5" /> Theme Packs</TabsTrigger>
              <TabsTrigger value="themes"><Palette className="mr-1 h-3.5 w-3.5" /> Themes</TabsTrigger>
              <TabsTrigger value="customize"><Sparkles className="mr-1 h-3.5 w-3.5" /> Customize</TabsTrigger>
              <TabsTrigger value="homepage"><LayoutDashboard className="mr-1 h-3.5 w-3.5" /> Homepage</TabsTrigger>
              <TabsTrigger value="header"><PanelTop className="mr-1 h-3.5 w-3.5" /> Header</TabsTrigger>
              <TabsTrigger value="footer"><PanelBottom className="mr-1 h-3.5 w-3.5" /> Footer</TabsTrigger>
            </TabsList>

            <TabsContent value="packs" className="space-y-4">
              <ThemeMarketplace />
            </TabsContent>

            <TabsContent value="themes" className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {['all', 'free', 'premium', 'minimal', 'bold', 'elegant', 'playful'].map((f) => (
                  <Button key={f} variant={categoryFilter === f ? 'default' : 'outline'} size="sm" onClick={() => setCategoryFilter(f)} className="capitalize">
                    {f === 'premium' && <Crown className="mr-1 h-3 w-3" />}{f}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredThemes.map((theme) => {
                  const isSelected = selectedThemeId === theme.id;
                  const isActive = currentThemeId === theme.id;
                  const purchased = (storeSettings.purchased_themes || []) as string[];
                  const isLocked = theme.isPremium && !purchased.includes(theme.id);
                  return (
                    <div key={theme.id} className={cn('relative rounded-xl border-2 p-3 cursor-pointer transition-all hover:shadow-md', isSelected ? 'border-primary shadow-md' : 'border-transparent hover:border-border')} onClick={() => handleSelectTheme(theme)}>
                      <div className="flex gap-1 mb-3">
                        {Object.values(theme.colors).slice(0, 4).map((c, i) => (
                          <div key={i} className="h-6 flex-1 rounded-sm first:rounded-l-md last:rounded-r-md" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-semibold flex items-center gap-1.5">
                            {theme.name}
                            {isActive && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Active</Badge>}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{theme.description}</p>
                        </div>
                        {theme.isPremium ? (
                          isLocked ? <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shrink-0"><Crown className="mr-1 h-3 w-3" /> ₹{theme.price}</Badge>
                          : <Badge variant="outline" className="text-green-600 border-green-200 shrink-0"><Check className="mr-1 h-3 w-3" /> Owned</Badge>
                        ) : <Badge variant="outline" className="shrink-0">Free</Badge>}
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" /></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="customize" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Colors</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {Object.keys(customColors as Record<string, string>).map((colorKey) => (
                    <div key={colorKey} className="space-y-1.5">
                      <Label className="text-xs capitalize">{colorKey}</Label>
                      <div className="flex gap-2 items-center">
                        <input type="color" value={customColors[colorKey]} onChange={(e) => setCustomColors({ ...customColors, [colorKey]: e.target.value })} className="h-8 w-8 rounded border cursor-pointer" />
                        <Input value={customColors[colorKey]} onChange={(e) => setCustomColors({ ...customColors, [colorKey]: e.target.value })} className="h-8 text-xs font-mono" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Typography</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Heading Font</Label>
                    <Select value={customFonts.heading} onValueChange={(v) => setCustomFonts({ ...customFonts, heading: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Body Font</Label>
                    <Select value={customFonts.body} onValueChange={(v) => setCustomFonts({ ...customFonts, body: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
              <Button variant="outline" onClick={() => { setCustomColors(selectedTemplate.colors); setCustomFonts(selectedTemplate.fonts); toast.info('Reset to theme defaults'); }}>Reset to Defaults</Button>
            </TabsContent>

            <TabsContent value="homepage" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Homepage Sections</CardTitle></CardHeader>
                <CardContent>
                  <HomepageBuilder
                    sections={homepageSections}
                    onChange={setHomepageSections}
                    showAllProductsGrid={showAllProductsGrid}
                    onShowAllProductsGridChange={setShowAllProductsGrid}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="header">
              <HeaderEditor config={headerConfig} onChange={setHeaderConfig} />
            </TabsContent>

            <TabsContent value="footer">
              <FooterEditor config={footerConfig} onChange={setFooterConfig} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-2">
          <div className="sticky top-20 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Eye className="h-4 w-4" /> Live Preview
            </div>
            <StorePreview theme={previewTheme} storeName={store?.name || 'My Store'} logoUrl={headerConfig.logo_url || store?.logo_url || null} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreDesign;
