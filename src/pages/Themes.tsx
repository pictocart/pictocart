import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Check, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ThemeMaster {
  id: string;
  theme_id: string;
  name: string;
  description: string | null;
  category: string | null;
  preview_image: string | null;
  lovable_project_url: string | null;
  is_default: boolean;
  is_active: boolean;
}

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
      // 1) Update active theme on the store immediately for UI feedback
      const newTheme = { theme_id: theme.theme_id, name: theme.theme_id };
      const { error: upErr } = await supabase
        .from('stores')
        .update({ theme: newTheme as any })
        .eq('id', store.id);
      if (upErr) throw upErr;
      setStore({ ...store, theme: newTheme as any });

      // 2) Enqueue a provisioning request via edge function
      const { data, error } = await supabase.functions.invoke('provision-storefront', {
        body: {
          store_id: store.id,
          theme_master_id: theme.id,
          client_patch_payload: {
            store_name: store.name,
            slug: store.slug,
            store_id: store.id,
            logo_url: store.logo_url || '',
            primary: (store.theme as any)?.primary_color || '#F97316',
            accent: (store.theme as any)?.colors?.accent || '#0EA5E9',
          },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success(`"${theme.name}" installed. Re-provisioning your storefront…`);
    } catch (e: any) {
      toast.error(e.message || 'Install failed');
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Themes</h1>
        <p className="text-sm text-muted-foreground">
          Browse fully-functional storefront themes. Preview opens the live theme in a new tab.
        </p>
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
            return (
              <Card key={theme.id} className="overflow-hidden flex flex-col">
                <div className="relative aspect-[4/3] bg-muted">
                  {theme.preview_image ? (
                    <img src={theme.preview_image} alt={theme.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Sparkles className="h-10 w-10" />
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
                      disabled={!theme.lovable_project_url}
                      onClick={() => theme.lovable_project_url && window.open(theme.lovable_project_url, '_blank')}
                    >
                      <ExternalLink className="mr-1 h-3.5 w-3.5" /> Live Preview
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={isActive}
                      onClick={() => installTheme(theme)}
                    >
                      {isActive ? 'Installed' : 'Install'}
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
