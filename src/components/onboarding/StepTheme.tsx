import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Check, Palette, Loader2, Sparkles, Flame, Eye, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { OnboardingData } from '@/pages/Onboarding';

interface Props {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}

interface ThemeMaster {
  id: string;
  theme_id: string;
  name: string;
  description: string | null;
  category: string | null;
  preview_image: string | null;
  is_default: boolean;
  created_at: string;
  is_premium?: boolean;
  price?: number;
}

const StepTheme = ({ data, setData }: Props) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const { data: themes = [], isLoading } = useQuery({
    queryKey: ['onboarding-theme-masters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_master_projects')
        .select('id, theme_id, name, description, category, preview_image, is_default, created_at, is_premium, price')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ThemeMaster[];
    },
  });

  // Auto-pick the first (trending/default) theme so Continue isn't blocked.
  useEffect(() => {
    if (!data.selectedThemeId && themes.length > 0) {
      setData((d) => ({ ...d, selectedThemeId: themes[0].theme_id }));
    }
  }, [themes, data.selectedThemeId, setData]);

  const trending = themes.filter((t) => t.is_default);
  const latest = themes.filter((t) => !t.is_default);

  return (
    <div className={`space-y-8 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 shadow-lg shadow-primary/10">
          <Palette className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Choose a theme</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Pick a starting look. New themes are added to the marketplace regularly — you can switch anytime.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : themes.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground border border-dashed rounded-2xl">
          <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
          No themes available yet. Please check back shortly.
        </div>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6 -mr-2">
          {trending.length > 0 && (
            <Section title="Trending" icon={<Flame className="h-3.5 w-3.5" />}>
              {trending.map((t) => (
                <ThemeCard key={t.id} theme={t} selected={data.selectedThemeId === t.theme_id} onClick={() => setData((d) => ({ ...d, selectedThemeId: t.theme_id }))} />
              ))}
            </Section>
          )}
          {latest.length > 0 && (
            <Section title="Latest" icon={<Sparkles className="h-3.5 w-3.5" />}>
              {latest.map((t) => (
                <ThemeCard key={t.id} theme={t} selected={data.selectedThemeId === t.theme_id} onClick={() => setData((d) => ({ ...d, selectedThemeId: t.theme_id }))} />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
};

const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {icon} {title}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{children}</div>
  </div>
);

const ThemeCard = ({ theme, selected, onClick }: { theme: ThemeMaster; selected: boolean; onClick: () => void }) => (
  <div
    className={cn(
      'relative rounded-2xl border-2 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 group bg-card',
      selected
        ? 'border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/15'
        : 'border-border hover:border-primary/40 hover:shadow-md'
    )}
  >
    <button type="button" onClick={onClick} className="block w-full text-left">
      <div className="aspect-[4/3] bg-muted overflow-hidden">
        {theme.preview_image ? (
          <img src={theme.preview_image} alt={theme.name} className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <Palette className="h-8 w-8 opacity-40" />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold leading-tight flex-1 truncate">{theme.name}</p>
          {theme.is_premium && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px] gap-1 px-1.5 py-0">
              <Crown className="h-2.5 w-2.5" /> ₹{theme.price}
            </Badge>
          )}
        </div>
        {theme.category && (
          <Badge variant="secondary" className="mt-1 text-[10px] capitalize">{theme.category}</Badge>
        )}
        {theme.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">{theme.description}</p>
        )}
      </div>
    </button>
    <a
      href={`/admin/themes/preview-live/${theme.theme_id}`}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-background/90 backdrop-blur border border-border shadow-sm hover:bg-background hover:border-primary/40 transition"
    >
      <Eye className="h-3 w-3" /> Live preview
    </a>
    {selected && (
      <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
        <Check className="h-4 w-4 text-primary-foreground" strokeWidth={3} />
      </div>
    )}
  </div>
);

export default StepTheme;
