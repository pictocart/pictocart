import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Check, Sparkles, Loader2, Crown, Lock, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { THEME_TEMPLATES } from '@/lib/themes';
import { ThemeUpdateBanner } from '@/components/ThemeUpdateBanner';
import { getStoreThemeId } from '@/lib/storefrontManifest';
import { useSubscription } from '@/hooks/useSubscription';

interface ThemeMaster {
  id: string;
  theme_id: string;
  name: string;
  description: string | null;
  category: string | null;
  preview_image: string | null;
  is_default: boolean;
  is_active: boolean;
  is_premium?: boolean;
  price?: number;
  created_by?: string | null;
}

const swatchFor = (theme_id: string) => {
  const t = THEME_TEMPLATES.find((x) => x.id === theme_id);
  if (t) return [t.colors.primary, t.colors.secondary, t.colors.accent, t.colors.background];
  if (theme_id === 'bazaar') return ['#8B3A1F', '#F5E9D7', '#D4A853', '#FFFBF5'];
  if (theme_id === 'marketplace') return ['#0F172A', '#F1F5F9', '#F97316', '#FFFFFF'];
  return ['#F97316', '#F3F4F6', '#FED7AA', '#FFFFFF'];
};

const Themes = () => {
  const { store, setStore } = useStore();
  const activeThemeId = getStoreThemeId(store);

  // Search states for custom themes
  const [searchKey, setSearchKey] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const handleSearchTheme = async () => {
    if (!searchKey.trim()) {
      toast.error("Please enter a theme key to search");
      return;
    }
    setSearching(true);
    setSearchResult(null);
    try {
      const cleanKey = searchKey.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
      const themeId = `custom-theme-${cleanKey}`;

      const { data: themeProj, error: projErr } = await supabase
        .from('theme_master_projects')
        .select('*')
        .eq('theme_id', themeId)
        .maybeSingle();

      if (projErr) throw projErr;
      if (!themeProj) {
        toast.error("Custom theme key not found. Check key and try again.");
        setSearching(false);
        return;
      }

      // Fetch creator partner name
      let partnerName = 'Partner';
      if (themeProj.created_by) {
        const { data: partData } = await supabase
          .from('partners')
          .select('name')
          .eq('user_id', themeProj.created_by)
          .maybeSingle();
        if (partData) {
          partnerName = partData.name;
        }
      }

      setSearchResult({
        ...themeProj,
        partnerName
      });
      toast.success("Theme found!");
    } catch (e: any) {
      toast.error(e.message || "Failed to search theme");
    } finally {
      setSearching(false);
    }
  };

  const [confirmSwitch, setConfirmSwitch] = useState<{
    targetTheme: ThemeMaster;
    currentThemeId: string;
    currentThemeName: string;
  } | null>(null);

  const [confirmRestore, setConfirmRestore] = useState<{
    targetTheme: ThemeMaster;
    snapshot: any;
  } | null>(null);

  const { data: themes = [], isLoading } = useQuery({
    queryKey: ['theme-masters'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      let query = supabase
        .from('theme_master_projects')
        .select('id, theme_id, name, description, category, preview_image, is_default, is_active, is_premium, price')
        .eq('is_active', true);

      if (user?.id) {
        query = query.or(`created_by.is.null,created_by.eq.${user.id}`);
      } else {
        query = query.is('created_by', null);
      }

      const { data, error } = await query.order('is_default', { ascending: false });
      if (error) throw error;
      return (data || []) as ThemeMaster[];
    },
  });

  // Fetch purchased premium themes for this store
  const { data: purchases = [] } = useQuery({
    queryKey: ['theme-purchases-ids', store?.id],
    enabled: !!store?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_purchases' as any)
        .select('theme_pack_id')
        .eq('store_id', store!.id);
      if (error) return [];
      return (data || []).map((p: any) => p.theme_pack_id as string);
    },
  });

  const purchasedIds = new Set(purchases);

  const { plan } = useSubscription();

  const executeInstallTheme = async (theme: ThemeMaster) => {
    if (!store) return;
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

      // Only check and count switches if they are switching to a new theme
      if (activeThemeId && activeThemeId !== theme.theme_id) {
        // 2) Check limits based on plan
        if (plan === 'free') {
          const switches = stats.theme_switches || 0;
          if (switches >= 2) {
            toast.error("Free plan allows only 2 theme switches. Upgrade your plan to switch again.");
            return;
          }
        } else if (plan === 'starter') {
          const lastChanged = stats.theme_switches_last_changed;
          const todayDate = new Date().toDateString();
          const lastDate = lastChanged ? new Date(lastChanged).toDateString() : null;
          
          let dailyCount = stats.theme_switches_today || 0;
          if (lastDate !== todayDate) {
            dailyCount = 0;
          }

          if (dailyCount >= 5) {
            toast.error("Starter plan allows only 5 theme switches per day. Upgrade your plan to switch again.");
            return;
          }
        }
      }

      // If checks pass, perform save
      const todayDateStr = new Date().toDateString();
      const lastDateStr = stats.theme_switches_last_changed ? new Date(stats.theme_switches_last_changed).toDateString() : null;
      const newStats = activeThemeId && activeThemeId !== theme.theme_id ? {
        ...stats,
        theme_switches: (stats.theme_switches || 0) + 1,
        theme_switches_today: lastDateStr === todayDateStr ? (stats.theme_switches_today || 0) + 1 : 1,
        theme_switches_last_changed: new Date().toISOString(),
      } : stats;

      const baseSettings = { ...settings, usage_stats: newStats };

      if (theme.theme_id.startsWith('theme-') || theme.theme_id.startsWith('layout1-')) {
        const { applyMasterTheme } = await import('@/lib/applyMasterTheme');
        const { theme: newTheme, settings: newSettings } = await applyMasterTheme(
          store.id,
          theme.theme_id,
          baseSettings
        );
        setStore({ ...store, theme: newTheme as any, theme_id: theme.theme_id, theme_tokens: newTheme as any, settings: newSettings as any });
      } else {
        const newTheme = { theme_id: theme.theme_id, name: theme.theme_id };
        const { buildResolvedStorefrontManifest } = await import('@/lib/storefrontManifest');
        const resolved_storefront_manifest = await buildResolvedStorefrontManifest({
          ...store,
          theme: newTheme,
          theme_id: theme.theme_id,
          theme_tokens: newTheme,
        } as any);
        const { error } = await supabase
          .from('stores')
          .update({ 
            theme: newTheme as any, 
            theme_id: theme.theme_id, 
            theme_tokens: newTheme as any, 
            resolved_storefront_manifest: resolved_storefront_manifest as any,
            settings: baseSettings
          })
          .eq('id', store.id);
        if (error) throw error;
        setStore({ ...store, theme: newTheme as any, theme_id: theme.theme_id, theme_tokens: newTheme as any, resolved_storefront_manifest, settings: baseSettings });
      }

      // Check if this is a custom partner theme and trigger reward RPC
      if (theme.theme_id.startsWith('custom-theme-')) {
        try {
          await supabase.rpc('reward_partner_theme_usage', {
            _theme_id: theme.theme_id,
            _store_id: store.id
          });
        } catch (rewardErr) {
          console.warn("Could not credit partner rewards:", rewardErr);
        }
      }

      toast.success(`"${theme.name}" is now your active theme.`);
    } catch (e: any) {
      toast.error(e.message || 'Could not switch theme');
    }
  };

  const handleThemeSelection = async (theme: ThemeMaster) => {
    if (!store) return;
    if (activeThemeId && activeThemeId !== theme.theme_id) {
      const activeThemeName = activeTheme?.name || activeThemeId;
      setConfirmSwitch({
        targetTheme: theme,
        currentThemeId: activeThemeId,
        currentThemeName: activeThemeName
      });
    } else {
      await checkAndRestoreTheme(theme);
    }
  };

  const checkAndRestoreTheme = async (theme: ThemeMaster) => {
    if (!store) return;
    try {
      const { data: snapshot, error } = await supabase
        .from('store_theme_snapshots' as any)
        .select('*')
        .eq('store_id', store.id)
        .eq('theme_id', theme.theme_id)
        .maybeSingle();
      
      if (snapshot) {
        setConfirmRestore({
          targetTheme: theme,
          snapshot
        });
      } else {
        await executeInstallTheme(theme);
      }
    } catch (e) {
      console.error(e);
      await executeInstallTheme(theme);
    }
  };

  const saveSnapshotAndSwitch = async (save: boolean) => {
    if (!confirmSwitch || !store) return;
    const { targetTheme, currentThemeId } = confirmSwitch;
    setConfirmSwitch(null);
    
    if (save) {
      try {
        const { error } = await supabase
          .from('store_theme_snapshots' as any)
          .upsert({
            store_id: store.id,
            theme_id: currentThemeId,
            theme: store.theme,
            theme_tokens: store.theme_tokens,
            resolved_storefront_manifest: store.resolved_storefront_manifest,
            settings: store.settings
          }, { onConflict: 'store_id,theme_id' });
        if (error) throw error;
        toast.success(`Current changes for "${confirmSwitch.currentThemeName}" saved.`);
      } catch (e: any) {
        toast.error(`Failed to save changes: ${e.message}`);
      }
    }
    
    await checkAndRestoreTheme(targetTheme);
  };

  const restoreSnapshot = async (theme: ThemeMaster, snapshot: any) => {
    if (!store) return;
    try {
      const { error } = await supabase
        .from('stores')
        .update({
          theme: snapshot.theme,
          theme_id: theme.theme_id,
          theme_tokens: snapshot.theme_tokens,
          resolved_storefront_manifest: snapshot.resolved_storefront_manifest,
          settings: snapshot.settings
        })
        .eq('id', store.id);
      if (error) throw error;
      setStore({
        ...store,
        theme: snapshot.theme,
        theme_id: theme.theme_id,
        theme_tokens: snapshot.theme_tokens,
        resolved_storefront_manifest: snapshot.resolved_storefront_manifest,
        settings: snapshot.settings
      });
      toast.success(`Restored your previous changes for "${theme.name}"`);
      setConfirmRestore(null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to restore snapshot');
    }
  };

  const previewUrl = (theme: ThemeMaster) =>
    store ? `/store/${store.slug}?preview_theme=${theme.theme_id}` : '#';

  const activeTheme = themes.find((t) => t.theme_id === activeThemeId);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Themes</h1>
        <p className="text-sm text-muted-foreground">
          Browse free and premium themes. Switch any time — your products and content stay intact.
        </p>
      </div>

      <ThemeUpdateBanner />

      {/* ── Current Store Theme ── */}
      {!isLoading && activeTheme && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Current Store Theme
            </h2>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Card className="overflow-hidden border-2 border-green-500/50 shadow-sm">
            <div className="flex flex-col sm:flex-row">
              {/* Thumbnail */}
              <div className="relative sm:w-60 aspect-[4/3] sm:aspect-auto bg-muted shrink-0 overflow-hidden">
                {activeTheme.preview_image ? (
                  <img
                    src={activeTheme.preview_image}
                    alt={activeTheme.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="h-full min-h-[140px] w-full flex flex-col items-center justify-center gap-3"
                    style={{ background: `linear-gradient(135deg, ${swatchFor(activeTheme.theme_id)[0]}22, ${swatchFor(activeTheme.theme_id)[2]}22)` }}
                  >
                    <div className="flex gap-1.5">
                      {swatchFor(activeTheme.theme_id).map((c, i) => (
                        <div key={i} className="h-7 w-7 rounded-lg border border-white shadow-sm" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                )}
                <Badge className="absolute top-2 left-2 bg-green-500 text-white border-0 shadow-sm">
                  <Check className="mr-1 h-3 w-3" /> Active
                </Badge>
              </div>

              {/* Details */}
              <CardContent className="flex flex-col justify-between gap-4 p-5 flex-1">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold">{activeTheme.name}</h3>
                    {activeTheme.is_default && (
                      <Badge variant="secondary" className="text-xs">Recommended</Badge>
                    )}
                    <Badge variant="outline" className="text-xs capitalize">
                      {activeTheme.category || 'General'}
                    </Badge>
                  </div>
                  {activeTheme.description && (
                    <p className="text-sm text-muted-foreground">{activeTheme.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(previewUrl(activeTheme), '_blank')}
                  >
                    <ExternalLink className="mr-1 h-3.5 w-3.5" /> Live Preview
                  </Button>
                  <Button size="sm" disabled className="bg-green-500/10 text-green-700 border border-green-300 hover:bg-green-500/10">
                    <Check className="mr-1 h-3.5 w-3.5" /> Currently Active
                  </Button>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      )}

      {/* ── All Themes ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            All Themes
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Theme Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2 max-w-md bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border">
          <Input 
            placeholder="Search custom partner theme key..." 
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            className="bg-white dark:bg-slate-950"
            onKeyDown={(e) => e.key === 'Enter' && handleSearchTheme()}
          />
          <Button onClick={handleSearchTheme} disabled={searching} className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5 shrink-0">
            {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Search Key
          </Button>
        </div>

        {/* Search Result display */}
        {searchResult && (
          <div className="p-4 border border-orange-200 bg-orange-50/20 dark:bg-orange-950/10 rounded-xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-start justify-between">
              <div>
                <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 mb-2">
                  Partner Theme: {searchResult.partnerName}
                </Badge>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{searchResult.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">Key: {searchResult.theme_id.replace("custom-theme-", "")}</p>
                {searchResult.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{searchResult.description}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSearchResult(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleThemeSelection(searchResult)} className="bg-orange-600 hover:bg-orange-700 text-white">
                Apply Theme
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : themes.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-50" />
              No themes published yet. Check back soon.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {themes.map((theme) => {
              const isActive = activeThemeId === theme.theme_id;
              const swatches = swatchFor(theme.theme_id);
              const isPremium = theme.is_premium === true;
              const isOwned = !isPremium || purchasedIds.has(theme.id);
              const isLocked = isPremium && !isOwned;
              return (
                <Card
                  key={theme.id}
                  className={`overflow-hidden flex flex-col transition-all duration-200 ${
                    isActive
                      ? 'ring-2 ring-green-500/40 opacity-50 pointer-events-none'
                      : 'hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                    {theme.preview_image ? (
                      <img src={theme.preview_image} alt={theme.name} className="h-full w-full object-cover" />
                    ) : (
                      <div
                        className="h-full w-full flex flex-col items-center justify-center gap-3"
                        style={{ background: `linear-gradient(135deg, ${swatches[0]}22, ${swatches[2]}22)` }}
                      >
                        <div className="flex gap-1.5">
                          {swatches.map((c, i) => (
                            <div key={i} className="h-7 w-7 rounded-lg border border-white shadow-sm" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">{theme.name}</span>
                      </div>
                    )}
                    {/* Active badge */}
                    {isActive && (
                      <Badge className="absolute top-2 right-2 bg-green-500 text-white border-0">
                        <Check className="mr-1 h-3 w-3" /> Active
                      </Badge>
                    )}
                    {/* Recommended badge */}
                    {theme.is_default && !isActive && (
                      <Badge className="absolute top-2 left-2" variant="secondary">Recommended</Badge>
                    )}
                    {/* Premium badge */}
                    {isPremium && (
                      <Badge className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                     
                        {isOwned ? 'Owned' : `₹${theme.price ?? ''}`}
                      </Badge>
                    )}
                    {/* Lock overlay for unowned premium */}
                    {isLocked && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Lock className="h-8 w-8 text-white drop-shadow-md" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4 flex-1 flex flex-col gap-3">
                    <div>
                      <h3 className="font-semibold flex items-center gap-1.5">
                        {isPremium }
                        {theme.name}
                      </h3>
                      <p className="text-xs text-muted-foreground capitalize">{theme.category || 'general'}</p>
                    </div>
                    {theme.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{theme.description}</p>
                    )}
                    <div className="mt-auto flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(previewUrl(theme), '_blank')}
                      >
                        <ExternalLink className="mr-1 h-3.5 w-3.5" /> Preview
                      </Button>
                      {isLocked ? (
                        <Button
                          size="sm"
                          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0"
                          onClick={() => toast.info(`Purchase "${theme.name}" for ₹${theme.price} to unlock it.`)}
                        >
                          <Crown className="mr-1 h-3.5 w-3.5" /> Purchase
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={isActive}
                          onClick={() => handleThemeSelection(theme)}
                        >
                          {isActive ? 'Active' : 'Install'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Save snapshot switch confirmation dialog */}
      {confirmSwitch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Sparkles className="h-6 w-6 animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-base font-bold">Save your customizations?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Do you want to save your current layout, sections, and color changes for <span className="font-semibold text-foreground">"{confirmSwitch.currentThemeName}"</span> before switching to <span className="font-semibold text-foreground">"{confirmSwitch.targetTheme.name}"</span>?
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 text-xs" onClick={() => saveSnapshotAndSwitch(false)}>
                No, Discard Changes
              </Button>
              <Button className="flex-1 text-xs" onClick={() => saveSnapshotAndSwitch(true)}>
                Yes, Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Restore snapshot confirmation dialog */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Check className="h-6 w-6" strokeWidth={3} />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-base font-bold">Previous changes found</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We found previously saved customizations for <span className="font-semibold text-foreground">"{confirmRestore.targetTheme.name}"</span>. How would you like to apply this theme?
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => restoreSnapshot(confirmRestore.targetTheme, confirmRestore.snapshot)}>
                Restore My Saved Changes
              </Button>
              <Button variant="outline" className="w-full text-xs border-primary/30 text-primary hover:bg-primary/5 hover:text-primary" onClick={() => { setConfirmRestore(null); executeInstallTheme(confirmRestore.targetTheme); }}>
                Apply Fresh Default Layout
              </Button>
              <Button variant="ghost" className="w-full text-xs text-muted-foreground mt-1" onClick={() => setConfirmRestore(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Themes;
