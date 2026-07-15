import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Check, Palette, Loader2, Sparkles, Flame, Eye, Crown, Wand2, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
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

const CATEGORY_ALIASES: Record<string, string[]> = {
  fashion:         ['fashion', 'apparel', 'clothing', 'jewellery'],
  food:            ['food', 'restaurant', 'cafe', 'bakery'],
  grocery:         ['grocery', 'food', 'agri'],
  electronics:     ['electronics', 'gadgets', 'tech'],
  beauty:          ['beauty', 'cosmetics', 'wellness'],
  beauty_services: ['services', 'beauty'],
  healthcare:      ['health', 'services'],
  handmade:        ['handicraft', 'home', 'gifts'],
  other:           [],
};

const matchesCategory = (themeCategory: string | null, merchantCategory: string) => {
  if (!themeCategory) return false;
  const tc = themeCategory.toLowerCase();
  const aliases = CATEGORY_ALIASES[merchantCategory] || [merchantCategory];
  if (aliases.length === 0) return false;
  return aliases.some((a) => tc.includes(a));
};

// AI theme generation states
type GenState = 'idle' | 'generating' | 'done' | 'used';

const StepTheme = ({ data, setData }: Props) => {
  const [genState, setGenState] = useState<GenState>('idle');
  const [genThemeId, setGenThemeId] = useState<string | null>(null);

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

  // Preload images
  useEffect(() => {
    themes.forEach((t) => {
      if (t.preview_image) { const i = new Image(); i.src = t.preview_image; }
    });
  }, [themes]);

  // Auto-pick first theme
  useEffect(() => {
    if (data.selectedThemeId || themes.length === 0) return;
    const recommended = data.category && data.category !== 'other'
      ? themes.filter((t) => matchesCategory(t.category, data.category))
      : [];
    const trending = themes.filter((t) => t.is_default);
    const first = recommended[0] || trending[0] || themes[0];
    if (first) setData((d) => ({ ...d, selectedThemeId: first.theme_id }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themes, data.selectedThemeId, data.category]);

  // Check if user already used AI generation (stored in localStorage per user)
  useEffect(() => {
    const used = localStorage.getItem('ai_theme_gen_used');
    if (used) setGenState('used');
  }, []);

  const handleGenerateAI = async () => {
    setGenState('generating');
    try {
      const { data: fnData, error } = await supabase.functions.invoke('generate-theme-pack', {
        body: {
          storeName: data.storeName,
          category: data.category,
          description: data.description || '',
          source: 'onboarding',
        },
      });
      if (error) throw error;
      const themeId = fnData?.theme_id || fnData?.id;
      if (!themeId) throw new Error('No theme ID returned');
      setGenThemeId(themeId);
      setGenState('done');
      localStorage.setItem('ai_theme_gen_used', '1');
      setData(d => ({ ...d, selectedThemeId: themeId }));
      toast.success('Your AI theme is ready!');
    } catch (e: any) {
      toast.error(e.message || 'Theme generation failed. Try again.');
      setGenState('idle');
    }
  };

  const recommended = data.category && data.category !== 'other'
    ? themes.filter((t) => matchesCategory(t.category, data.category))
    : [];
  const recommendedIds = new Set(recommended.map((t) => t.id));
  const trending = themes.filter((t) => t.is_default && !recommendedIds.has(t.id));
  const trendingIds = new Set([...recommendedIds, ...trending.map((t) => t.id)]);
  const others = themes.filter((t) => !trendingIds.has(t.id));

  return (
    // Full height flex col — header fixed, grid scrolls
    <div className="flex flex-col h-full">

      {/* ── Fixed header ── */}
      <div className="text-center pb-4 flex-shrink-0">
        <h2 className="text-xl font-bold tracking-tight">Choose a theme</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          {recommended.length > 0
            ? <>Themes for <span className="font-semibold capitalize text-foreground">{data.category}</span> appear first. Switch anytime.</>
            : 'Pick a starting look — you can switch anytime from dashboard.'}
        </p>
      </div>

      {/* ── Scrollable grid ── */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1" style={{ scrollbarWidth: 'thin' }}>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : themes.length === 0 ? (
          <div className="text-center py-16 text-sm text-muted-foreground border border-dashed rounded-2xl">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No themes available yet.
          </div>
        ) : (
          <div className="space-y-5 pb-4">
            {recommended.length > 0 && (
              <Section title={`For ${data.category}`} icon={<Sparkles className="h-3 w-3" />}>
                {recommended.map((t) => (
                  <ThemeCard key={t.id} theme={t}
                    selected={data.selectedThemeId === t.theme_id}
                    onClick={() => setData(d => ({ ...d, selectedThemeId: t.theme_id }))} />
                ))}
              </Section>
            )}

            {trending.length > 0 && (
              <Section title="Trending" icon={<Flame className="h-3 w-3" />}>
                {trending.map((t) => (
                  <ThemeCard key={t.id} theme={t}
                    selected={data.selectedThemeId === t.theme_id}
                    onClick={() => setData(d => ({ ...d, selectedThemeId: t.theme_id }))} />
                ))}
              </Section>
            )}

            {others.length > 0 && (
              <Section title={recommended.length > 0 ? 'More themes' : 'All themes'} icon={<Palette className="h-3 w-3" />}>
                {others.map((t) => (
                  <ThemeCard key={t.id} theme={t}
                    selected={data.selectedThemeId === t.theme_id}
                    onClick={() => setData(d => ({ ...d, selectedThemeId: t.theme_id }))} />
                ))}
              </Section>
            )}

            {/* ── AI Generate Card ── always last ── */}
            <Section title="Can't find the right one?" icon={<Wand2 className="h-3 w-3" />}>
              <AIGenerateCard
                storeName={data.storeName}
                category={data.category}
                genState={genState}
                genThemeId={genThemeId}
                selected={!!genThemeId && data.selectedThemeId === genThemeId}
                onGenerate={handleGenerateAI}
                onSelect={() => genThemeId && setData(d => ({ ...d, selectedThemeId: genThemeId }))}
              />
            </Section>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="space-y-2.5">
    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
      {icon} {title}
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {children}
    </div>
  </div>
);

// ── Theme Card ───────────────────────────────────────────────────────────────
const ThemeCard = ({ theme, selected, onClick }: { theme: ThemeMaster; selected: boolean; onClick: () => void }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  return (
    <div className={cn(
      'relative rounded-xl border-2 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 group bg-card cursor-pointer',
      selected ? 'border-primary shadow-lg shadow-primary/15 ring-2 ring-primary/15'
               : 'border-border hover:border-primary/40 hover:shadow-md'
    )} onClick={onClick}>
      <div className="aspect-[4/3] bg-muted overflow-hidden relative">
        {!imgLoaded && (
          <div className="absolute inset-0 z-10 animate-pulse bg-gradient-to-r from-muted via-muted-foreground/10 to-muted">
            <div className="absolute inset-0 flex items-center justify-center">
              <Palette className="h-6 w-6 text-muted-foreground/20" />
            </div>
          </div>
        )}
        {theme.preview_image ? (
          <img
            src={theme.preview_image} alt={theme.name}
            loading="eager"
            fetchPriority="high"
            onLoad={() => setImgLoaded(true)}
            className={cn('h-full w-full object-cover group-hover:scale-[1.02] transition-all duration-500',
              imgLoaded ? 'opacity-100' : 'opacity-0')}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Palette className="h-6 w-6 text-muted-foreground/40" />
          </div>
        )}
      </div>

      <div className="p-2.5">
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs font-bold leading-tight flex-1 truncate">{theme.name}</p>
          {theme.is_premium && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[9px] gap-0.5 px-1 py-0 h-4">
              <Crown className="h-2 w-2" /> ₹{theme.price}
            </Badge>
          )}
        </div>
        {theme.description && (
          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{theme.description}</p>
        )}
      </div>

      {/* Live preview */}
      <a href={`/admin/themes/preview-live/${theme.theme_id}`} target="_blank" rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-2 right-2 inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-background/90 backdrop-blur border border-border shadow-sm hover:bg-background transition opacity-0 group-hover:opacity-100">
        <Eye className="h-2.5 w-2.5" /> Preview
      </a>

      {selected && (
        <div className="absolute top-2 left-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow-md">
          <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
        </div>
      )}
    </div>
  );
};

// ── AI Generate Card ─────────────────────────────────────────────────────────
const AIGenerateCard = ({
  storeName, category, genState, genThemeId, selected, onGenerate, onSelect,
}: {
  storeName: string; category: string;
  genState: GenState; genThemeId: string | null;
  selected: boolean;
  onGenerate: () => void; onSelect: () => void;
}) => {
  if (genState === 'done' || genState === 'used') {
    // Already generated — show as selectable card
    return (
      <div
        onClick={onSelect}
        className={cn(
          'relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5',
          selected ? 'border-primary shadow-lg ring-2 ring-primary/15'
                   : 'border-purple-300 hover:border-primary/40 hover:shadow-md'
        )}
        style={{ background: 'linear-gradient(135deg, #faf5ff, #f3e8ff)' }}
      >
        <div className="aspect-[4/3] flex flex-col items-center justify-center gap-2 p-4">
          <div className="h-10 w-10 rounded-xl bg-white/80 flex items-center justify-center shadow">
            <Wand2 className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-xs font-semibold text-purple-800 text-center">Your AI Theme</p>
          <Badge className="bg-purple-600 text-white border-0 text-[9px]">
            <Zap className="h-2.5 w-2.5 mr-0.5" /> Generated
          </Badge>
        </div>
        <div className="p-2.5">
          <p className="text-xs font-bold text-purple-900">Custom AI Theme</p>
          <p className="text-[10px] text-purple-600 mt-0.5">Made just for your store</p>
        </div>
        {selected && (
          <div className="absolute top-2 left-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow-md">
            <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
          </div>
        )}
      </div>
    );
  }

  // Idle or generating state
  return (
    <div
      className={cn(
        'relative rounded-xl border-2 border-dashed overflow-hidden transition-all duration-200',
        genState === 'generating' ? 'border-purple-400' : 'border-purple-200 hover:border-purple-400 hover:shadow-md cursor-pointer'
      )}
      style={{ background: 'linear-gradient(135deg, #faf5ff, #f5f3ff)' }}
      onClick={genState === 'idle' ? onGenerate : undefined}
    >
      <div className="aspect-[4/3] flex flex-col items-center justify-center gap-3 p-4">
        {genState === 'generating' ? (
          <>
            <div className="h-10 w-10 rounded-xl bg-white/80 flex items-center justify-center shadow animate-pulse">
              <Wand2 className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-semibold text-purple-800">Generating theme…</p>
              <p className="text-[10px] text-purple-500">AI is designing your store</p>
            </div>
            <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />
          </>
        ) : (
          <>
            <div className="h-10 w-10 rounded-xl bg-white/80 flex items-center justify-center shadow">
              <Wand2 className="h-5 w-5 text-purple-500" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-semibold text-purple-800">Generate with AI</p>
              <p className="text-[10px] text-purple-500 leading-tight">
                Get a unique theme built<br />for <span className="font-medium">{storeName || 'your store'}</span>
              </p>
            </div>
            <span className="text-[9px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium border border-purple-200">
              Free · One time only
            </span>
          </>
        )}
      </div>
      <div className="p-2.5 border-t border-purple-100">
        <p className="text-xs font-bold text-purple-900">Start with AI Theme</p>
        <p className="text-[10px] text-purple-500 mt-0.5">1 free generation per store</p>
      </div>
    </div>
  );
};

export default StepTheme;
