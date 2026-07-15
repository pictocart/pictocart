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

// Map merchant onboarding category slugs → theme master category verticals.
// Keeps the two taxonomies in sync without a DB join. Anything not listed
// falls through unfiltered (e.g. "other").
const CATEGORY_ALIASES: Record<string, string[]> = {
  fashion: ['fashion', 'apparel', 'clothing', 'jewellery'],
  food: ['food', 'restaurant', 'cafe', 'bakery'],
  grocery: ['grocery', 'food', 'agri'],
  electronics: ['electronics', 'gadgets', 'tech'],
  beauty: ['beauty', 'cosmetics', 'wellness'],
  beauty_services: ['services', 'beauty'],
  healthcare: ['health', 'services'],
  handmade: ['handicraft', 'home', 'gifts'],
  other: [],
};

const matchesCategory = (themeCategory: string | null, merchantCategory: string) => {
  if (!themeCategory) return false;
  const tc = themeCategory.toLowerCase();
  const aliases = CATEGORY_ALIASES[merchantCategory] || [merchantCategory];
  if (aliases.length === 0) return false;
  return aliases.some((a) => tc.includes(a));
};

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

  // Split into recommended/trending/other based on chosen onboarding category.
  const recommended = data.category && data.category !== 'other'
    ? themes.filter((t) => matchesCategory(t.category, data.category))
    : [];
  const recommendedIds = new Set(recommended.map((t) => t.id));
  const trending = themes.filter((t) => t.is_default && !recommendedIds.has(t.id));
  const trendingIds = new Set([...recommendedIds, ...trending.map((t) => t.id)]);
  const others = themes.filter((t) => !trendingIds.has(t.id));

  // Preload all preview images as soon as themes data arrives
  useEffect(() => {
    if (!themes.length) return;
    themes.forEach((t) => {
      if (t.preview_image) {
        const img = new Image();
        img.src = t.preview_image;
      }
    });
  }, [themes]);
  // so Continue isn't blocked and the default matches the chosen vertical.
  useEffect(() => {
    if (data.selectedThemeId || themes.length === 0) return;
    const first = recommended[0] || trending[0] || themes[0];
    if (first) setData((d) => ({ ...d, selectedThemeId: first.theme_id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themes, data.selectedThemeId, data.category]);

  return (
    <div className={`space-y-8 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 shadow-lg shadow-primary/10">
          <Palette className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Choose a theme</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {recommended.length > 0
            ? <>Themes picked for <span className="font-semibold capitalize text-foreground">{data.category}</span> appear first. Switch anytime later.</>
            : 'Pick a starting look. New themes are added to the marketplace regularly — you can switch anytime.'}
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
          {recommended.length > 0 && (
            <Section title={`Recommended for ${data.category}`} icon={<Sparkles className="h-3.5 w-3.5" />}>
              {recommended.map((t) => (
                <ThemeCard key={t.id} theme={t} selected={data.selectedThemeId === t.theme_id} onClick={() => setData((d) => ({ ...d, selectedThemeId: t.theme_id }))} />
              ))}
            </Section>
          )}
          {trending.length > 0 && (
            <Section title="Trending" icon={<Flame className="h-3.5 w-3.5" />}>
              {trending.map((t) => (
                <ThemeCard key={t.id} theme={t} selected={data.selectedThemeId === t.theme_id} onClick={() => setData((d) => ({ ...d, selectedThemeId: t.theme_id }))} />
              ))}
            </Section>
          )}
          {others.length > 0 && (
            <Section title={recommended.length > 0 ? 'More themes' : 'Latest'} icon={<Sparkles className="h-3.5 w-3.5" />}>
              {others.map((t) => (
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

const ThemeCard = ({ theme, selected, onClick }: { theme: ThemeMaster; selected: boolean; onClick: () => void }) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
  <div
    className={cn(
      'relative rounded-2xl border-2 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 group bg-card',
      selected
        ? 'border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/15'
        : 'border-border hover:border-primary/40 hover:shadow-md'
    )}
  >
    <button type="button" onClick={onClick} className="block w-full text-left">
      <div className="aspect-[4/3] bg-muted overflow-hidden relative">
        {/* Skeleton shimmer — shows until image loads */}
        {!imgLoaded && (
          <div className="absolute inset-0 z-10">
            <div className="h-full w-full bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Palette className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </div>
        )}
        {theme.preview_image ? (
          <img
            src={theme.preview_image}
            alt={theme.name}
            loading="eager"
            fetchPriority="high"
            onLoad={() => setImgLoaded(true)}
            className={cn(
              'h-full w-full object-cover group-hover:scale-[1.02] transition-all duration-500',
              imgLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'
            )}
          />
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
};

export default StepTheme;
