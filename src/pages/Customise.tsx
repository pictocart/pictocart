import { useEffect, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import HomepageBuilder, { type HomepageSection } from '@/components/store-design/HomepageBuilder';
import HeaderEditor, { DEFAULT_HEADER, type HeaderConfig } from '@/components/store-design/HeaderEditor';
import FooterEditor, { DEFAULT_FOOTER, type FooterConfig } from '@/components/store-design/FooterEditor';
import ThemeSectionsEditor from '@/components/store-design/ThemeSectionsEditor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { LayoutDashboard, PanelTop, PanelBottom, ToggleLeft, Lock, ExternalLink, Sparkles, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePremiumThemePurchase } from '@/hooks/usePremiumThemePurchase';
import { applyMasterTheme } from '@/lib/applyMasterTheme';
import { getPremiumTrialStatus } from '@/lib/premiumThemeTrial';

const Customise = () => {
  const { store, setStore, refetchStore } = useStore();
  const [saving, setSaving] = useState(false);
  const settings = (store?.settings || {}) as any;

  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>(settings.homepage_sections || []);
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>({ ...DEFAULT_HEADER, ...(settings.header || {}) });
  const [footerConfig, setFooterConfig] = useState<FooterConfig>({ ...DEFAULT_FOOTER, ...(settings.footer || {}) });
  const [showAllProductsGrid, setShowAllProductsGrid] = useState<boolean>(settings.show_all_products_grid !== false);
  const [themeOverrides, setThemeOverrides] = useState<any>(settings.theme_overrides || {});
  const [features, setFeatures] = useState({
    blog: settings.features?.blog !== false,
    newsletter: settings.features?.newsletter !== false,
    reviews: settings.features?.reviews !== false,
    wishlist: settings.features?.wishlist !== false,
  });
  const [hydratedId, setHydratedId] = useState<string | null>(null);

  useEffect(() => {
    if (!store?.id || hydratedId === store.id) return;
    const s = (store?.settings || {}) as any;
    setHomepageSections(s.homepage_sections || []);
    setHeaderConfig({ ...DEFAULT_HEADER, ...(s.header || {}) });
    setFooterConfig({ ...DEFAULT_FOOTER, ...(s.footer || {}) });
    setShowAllProductsGrid(s.show_all_products_grid !== false);
    setThemeOverrides(s.theme_overrides || {});
    setFeatures({
      blog: s.features?.blog !== false,
      newsletter: s.features?.newsletter !== false,
      reviews: s.features?.reviews !== false,
      wishlist: s.features?.wishlist !== false,
    });
    setHydratedId(store.id);
  }, [store, hydratedId]);

  const activeThemeName = (store?.theme as any)?.theme_id || (store?.theme as any)?.name || 'minimal-light';
  const isMasterTheme = activeThemeName.startsWith('theme-');

  // === PREMIUM PAYWALL CHECK ===
  const { data: themeMeta } = useQuery({
    queryKey: ['customise-theme-meta', activeThemeName],
    enabled: isMasterTheme,
    queryFn: async () => {
      const { data } = await supabase.from('theme_master_projects')
        .select('name, price, is_premium, preview_image')
        .eq('theme_id', activeThemeName).maybeSingle();
      return data;
    },
  });
  const purchasedThemes: string[] = settings.purchased_themes || [];
  // Free-trial check: merchants get 14 days of Customiser access on a premium theme.
  const pendingPremium = (settings as any)?.pending_premium_theme;
  const trial = getPremiumTrialStatus(pendingPremium);
  const inTrial = !!pendingPremium && pendingPremium.theme_id === activeThemeName && trial.active;
  const isLocked = isMasterTheme && !!themeMeta?.is_premium && !purchasedThemes.includes(activeThemeName) && !inTrial;
  const { purchase, loading: paying } = usePremiumThemePurchase();

  const handleUnlock = async () => {
    const ok = await purchase('master', activeThemeName);
    if (ok && store) {
      const { data: fresh } = await supabase.from('stores').select('settings').eq('id', store.id).maybeSingle();
      await applyMasterTheme(store.id, activeThemeName, (fresh?.settings as any) || {});
      await refetchStore();
    }
  };

  const handleSave = async () => {
    if (!store) return;
    if (isLocked) {
      toast.error('Unlock this premium theme to save customisations.');
      return;
    }
    setSaving(true);
    const newSettings = {
      ...settings,
      homepage_sections: homepageSections,
      header: headerConfig,
      footer: footerConfig,
      show_all_products_grid: showAllProductsGrid,
      theme_overrides: themeOverrides,
      features,
    };
    const { error } = await supabase.from('stores').update({ settings: newSettings }).eq('id', store.id);
    if (error) {
      toast.error('Save failed');
    } else {
      setStore({ ...store, settings: newSettings });
      toast.success('Customisations saved');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customise</h1>
          <p className="text-sm text-muted-foreground">
            Edit your store content. Active theme: <span className="font-medium text-foreground">{activeThemeName}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/themes"><ExternalLink className="mr-1 h-3.5 w-3.5" /> Change Theme</Link>
          </Button>
          <Button onClick={handleSave} disabled={saving || isLocked}>{saving ? 'Saving…' : 'Save All'}</Button>
        </div>
      </div>

      {isLocked && themeMeta && (
        <Card className="border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-rose-500/10 overflow-hidden">
          <CardContent className="flex flex-col md:flex-row items-start md:items-center gap-5 py-5">
            {themeMeta.preview_image && (
              <img src={themeMeta.preview_image} alt={themeMeta.name}
                   className="h-20 w-32 rounded-lg object-cover border border-border shadow-md" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                <Crown className="h-3.5 w-3.5" /> {trial.expired ? 'Free trial ended' : 'Premium theme — preview mode'}
              </div>
              <h3 className="text-lg font-bold mt-1">{themeMeta.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {trial.expired
                  ? <>Your 14-day free trial has ended. Pay <span className="font-bold text-foreground">₹{themeMeta.price}</span> to restore editing &amp; keep this design live — or switch to a free theme.</>
                  : <>Your store is <span className="font-medium text-foreground">already live</span> on this design. Pay <span className="font-bold text-foreground">₹{themeMeta.price}</span> to unlock editing, save customisations, and get a 7-day refund window.</>}
              </p>
            </div>
            <Button size="lg" onClick={handleUnlock} disabled={paying} className="gap-2 shadow-lg shadow-amber-500/20">
              <Crown className="h-4 w-4" />
              {paying ? 'Opening…' : `Unlock for ₹${themeMeta.price}`}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className={isLocked ? 'pointer-events-none opacity-50 select-none' : ''}>
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-3 flex items-start gap-3">
            <Lock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Colors, fonts, spacing and layout are part of your theme's design. To change them, install a different theme from the marketplace.
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue={isMasterTheme ? 'theme' : 'homepage'} className="mt-6">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {isMasterTheme && <TabsTrigger value="theme"><Sparkles className="mr-1 h-3.5 w-3.5" /> Theme Sections</TabsTrigger>}
            <TabsTrigger value="homepage"><LayoutDashboard className="mr-1 h-3.5 w-3.5" /> Homepage</TabsTrigger>
            <TabsTrigger value="header"><PanelTop className="mr-1 h-3.5 w-3.5" /> Header</TabsTrigger>
            <TabsTrigger value="footer"><PanelBottom className="mr-1 h-3.5 w-3.5" /> Footer</TabsTrigger>
            <TabsTrigger value="features"><ToggleLeft className="mr-1 h-3.5 w-3.5" /> Features</TabsTrigger>
          </TabsList>

          {isMasterTheme && store && (
            <TabsContent value="theme" className="space-y-4">
              <ThemeSectionsEditor
                themeId={activeThemeName}
                storeId={store.id}
                overrides={themeOverrides}
                onChange={setThemeOverrides}
              />
            </TabsContent>
          )}

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

          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Storefront Features</CardTitle>
                <p className="text-xs text-muted-foreground">Toggle theme features on/off — like Shopify app blocks.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'blog', label: 'Blog', desc: 'Show /blog and AI-written posts on storefront' },
                  { key: 'newsletter', label: 'Newsletter', desc: 'Email capture form in footer / sections' },
                  { key: 'reviews', label: 'Product Reviews', desc: 'Allow customers to rate & review products' },
                  { key: 'wishlist', label: 'Wishlist', desc: 'Heart icon for customers to save products' },
                ].map((f) => (
                  <div key={f.key} className="flex items-start justify-between gap-4 p-3 rounded-lg border">
                    <div>
                      <Label className="text-sm font-medium">{f.label}</Label>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                    <Switch
                      checked={(features as any)[f.key]}
                      onCheckedChange={(v) => setFeatures({ ...features, [f.key]: v })}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Customise;
