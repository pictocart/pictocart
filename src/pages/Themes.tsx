import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Check, Sparkles, Loader2 } from 'lucide-react';
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
}

const swatchFor = (theme_id: string) => {
  const t = THEME_TEMPLATES.find((x) => x.id === theme_id);
  if (t) return [t.colors.primary, t.colors.secondary, t.colors.accent, t.colors.background];
  // Bazaar / Marketplace fallback swatches
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
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false });
      if (error) throw error;
      return (data || []) as ThemeMaster[];
    },
  });

  const installTheme = async (theme: ThemeMaster) => {
    if (!store) return;
    try {
      const newTheme = { theme_id: theme.theme_id, name: theme.theme_id };
      const { error } = await supabase
        .from('stores')
        .update({ theme: newTheme as any })
        .eq('id', store.id);
      if (error) throw error;
      setStore({ ...store, theme: newTheme as any });
      toast.success(`"${theme.name}" is now your active theme.`);
    } catch (e: any) {
      toast.error(e.message || 'Could not switch theme');
    }
  };

  const previewUrl = (theme: ThemeMaster) =>
    store ? `/store/${store.slug}?preview_theme=${theme.theme_id}` : '#';

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Themes</h1>
        <p className="text-sm text-muted-foreground">
          All themes are free for every Pic to Cart store. Switch any time — your products and content stay intact.
        </p>
      </div>

      <ThemeUpdateBanner />

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
            return (
              <Card key={theme.id} className="overflow-hidden flex flex-col">
                <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                  {theme.preview_image ? (
                    <img src={theme.preview_image} alt={theme.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center gap-3" style={{ background: `linear-gradient(135deg, ${swatches[0]}22, ${swatches[2]}22)` }}>
                      <div className="flex gap-1.5">
                        {swatches.map((c, i) => (
                          <div key={i} className="h-7 w-7 rounded-lg border border-white shadow-sm" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{theme.name}</span>
                    </div>
                  )}
                  {isActive && (
                    <Badge className="absolute top-2 right-2 bg-green-500 text-white border-0">
                      <Check className="mr-1 h-3 w-3" /> Active
                    </Badge>
                  )}
                  {theme.is_default && !isActive && (
                    <Badge className="absolute top-2 left-2" variant="secondary">Recommended</Badge>
                  )}
                </div>
                <CardContent className="p-4 flex-1 flex flex-col gap-3">
                  <div>
                    <h3 className="font-semibold">{theme.name}</h3>
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
                      <ExternalLink className="mr-1 h-3.5 w-3.5" /> Live Preview
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={isActive}
                      onClick={() => installTheme(theme)}
                    >
                      {isActive ? 'Active' : 'Install'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Themes;
