import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Check, Sparkles, Loader2, Crown, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { THEME_TEMPLATES } from '@/lib/themes';
import { ThemeUpdateBanner } from '@/components/ThemeUpdateBanner';

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
  const activeThemeId = (store?.theme as any)?.theme_id || (store?.theme as any)?.name;

  const { data: themes = [], isLoading } = useQuery({
    queryKey: ['theme-masters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_master_projects')
        .select('id, theme_id, name, description, category, preview_image, is_default, is_active, is_premium, price')
        .eq('is_active', true)
        .order('is_default', { ascending: false });
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

  const installTheme = async (theme: ThemeMaster) => {
    if (!store) return;
    try {
      if (theme.theme_id.startsWith('theme-')) {
        const { applyMasterTheme } = await import('@/lib/applyMasterTheme');
        const { theme: newTheme, settings: newSettings } = await applyMasterTheme(
          store.id,
          theme.theme_id,
          store.settings || {}
        );
        setStore({ ...store, theme: newTheme as any, settings: newSettings as any });
      } else {
        const newTheme = { theme_id: theme.theme_id, name: theme.theme_id };
        const { error } = await supabase
          .from('stores')
          .update({ theme: newTheme as any })
          .eq('id', store.id);
        if (error) throw error;
        setStore({ ...store, theme: newTheme as any });
      }
      toast.success(`"${theme.name}" is now your active theme.`);
    } catch (e: any) {
      toast.error(e.message || 'Could not switch theme');
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
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            All Themes
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>

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
                          onClick={() => installTheme(theme)}
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
    </div>
  );
};

export default Themes;
