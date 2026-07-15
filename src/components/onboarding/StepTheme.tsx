import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Check, Palette, Loader2, Sparkles, Flame, Eye, Crown, Wand2, Zap, AlertTriangle, Paintbrush, Type, LayoutGrid } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

const CATEGORY_VIBE_MAP: Record<string, { vibe: string; subcategory?: string }> = {
  fashion:         { vibe: 'modern fashion retail', subcategory: 'apparel' },
  food:            { vibe: 'vibrant food & beverage', subcategory: 'restaurant' },
  beauty_services: { vibe: 'elegant salon & beauty', subcategory: 'salon' },
  electronics:     { vibe: 'sleek tech retail', subcategory: 'gadgets' },
  handmade:        { vibe: 'artisan handcrafted', subcategory: 'handicraft' },
  beauty:          { vibe: 'soft beauty & wellness', subcategory: 'cosmetics' },
  other:           { vibe: 'clean modern retail' },
};


// Progress steps shown in the generation dialog
const GEN_STEPS = [
  { label: 'Analysing your store category',  pct: 10 },
  { label: 'Designing brand identity',        pct: 25 },
  { label: 'Generating color palette & fonts',pct: 40 },
  { label: 'Building page sections',          pct: 60 },
  { label: 'Creating hero & category images', pct: 78 },
  { label: 'Assembling full theme manifest',  pct: 90 },
  { label: 'Publishing to theme library',     pct: 98 },
];

const matchesCategory = (themeCategory: string | null, merchantCategory: string) => {
  if (!themeCategory) return false;
  const tc = themeCategory.toLowerCase();
  const aliases = CATEGORY_ALIASES[merchantCategory] || [merchantCategory];
  if (aliases.length === 0) return false;
  return aliases.some((a) => tc.includes(a));
};

type GenState = 'idle' | 'confirm' | 'generating' | 'done' | 'used';

const StepTheme = ({ data, setData }: Props) => {
  const queryClient = useQueryClient();
  const [genState, setGenState]   = useState<GenState>('idle');
  const [genTheme, setGenTheme]   = useState<ThemeMaster | null>(null);
  const [stepIdx,  setStepIdx]    = useState(0);
  const [pct,      setPct]        = useState(0);
  const [userHints, setUserHints] = useState({ color: '', feel: '', extra: '' });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Check localStorage for prior generation
  useEffect(() => {
    const stored = localStorage.getItem('ai_theme_gen_id');
    if (stored) {
      // Try to find previously generated theme in list
      setGenState('used');
    }
  }, []);


  // Animate progress steps during generation
  const startProgressAnimation = () => {
    setStepIdx(0);
    setPct(0);
    let i = 0;
    timerRef.current = setInterval(() => {
      if (i < GEN_STEPS.length - 1) {
        i++;
        setStepIdx(i);
        setPct(GEN_STEPS[i].pct);
      }
    }, 4500); // advance every ~4.5s (total ~31s for 7 steps)
  };

  const stopProgressAnimation = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const handleConfirmGenerate = async () => {
    setGenState('generating');
    startProgressAnimation();

    try {
      const vibeInfo = CATEGORY_VIBE_MAP[data.category] || { vibe: 'clean modern retail' };
      const uniqueThemeId = `theme-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      // Build styleHints from user inputs
      const hintParts: string[] = [];
      if (userHints.color.trim())  hintParts.push(`Color preference: ${userHints.color.trim()}`);
      if (userHints.feel.trim())   hintParts.push(`Mood/Feel: ${userHints.feel.trim()}`);
      if (userHints.extra.trim())  hintParts.push(`Additional instructions: ${userHints.extra.trim()}`);
      const styleHints = hintParts.length > 0 ? hintParts.join('. ') : undefined;

      const { data: fnData, error } = await supabase.functions.invoke('generate-and-ship-theme', {
        body: {
          theme_id: uniqueThemeId,
          brief: {
            category: data.category,
            subcategory: vibeInfo.subcategory ?? null,
            name: data.storeName || `${data.category} store`,
            vibe: userHints.feel.trim() || vibeInfo.vibe,
            ...(styleHints ? { styleHints } : {}),
          },
        },
      });

      stopProgressAnimation();

      if (error) throw error;
      if (!fnData?.ok) throw new Error(fnData?.error || 'Generation failed');

      setPct(100);
      setStepIdx(GEN_STEPS.length - 1);

      const themeId = fnData.theme_id;
      localStorage.setItem('ai_theme_gen_id', themeId);

      // Fetch the newly created theme_master_projects row so we can show it as a real card
      const { data: newThemeRow } = await supabase
        .from('theme_master_projects')
        .select('id, theme_id, name, description, category, preview_image, is_default, created_at, is_premium, price')
        .eq('theme_id', themeId)
        .maybeSingle();

      const newTheme: ThemeMaster = newThemeRow ?? {
        id: themeId, theme_id: themeId,
        name: fnData.manifest?.dna?.name || 'My AI Theme',
        description: fnData.manifest?.dna?.tagline || 'Custom theme built just for your store',
        category: data.category,
        preview_image: fnData.manifest?.hero_image || null,
        is_default: false, created_at: new Date().toISOString(),
      };

      setGenTheme(newTheme);
      setGenState('done');

      // Invalidate theme list so it will include the new theme on next query
      queryClient.invalidateQueries({ queryKey: ['onboarding-theme-masters'] });

      setData(d => ({ ...d, selectedThemeId: themeId }));

      // Small delay then close dialog
      setTimeout(() => {}, 1200);

      toast.success('Your AI theme is ready!');
    } catch (e: any) {
      stopProgressAnimation();
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

  // Merge generated theme into recommended section if done
  const aiInRecommended = genTheme && genState === 'done'
    ? [genTheme, ...recommended.filter((t) => t.theme_id !== genTheme.theme_id)]
    : recommended;

  return (
    <div className="flex flex-col h-full">

      {/* Confirmation Dialog — rendered in body to escape overflow:hidden */}
      {genState === 'confirm' && createPortal(
        <ConfirmDialog
          storeName={data.storeName}
          category={data.category}
          userHints={userHints}
          setUserHints={setUserHints}
          onConfirm={handleConfirmGenerate}
          onCancel={() => setGenState('idle')}
        />,
        document.body
      )}

      {/* Progress Dialog — rendered in body to escape overflow:hidden */}
      {genState === 'generating' && createPortal(
        <ProgressDialog stepIdx={stepIdx} pct={pct} category={data.category} />,
        document.body
      )}

      {/* Fixed header */}
      <div className="text-center pb-4 flex-shrink-0">
        <h2 className="text-xl font-bold tracking-tight">Choose a theme</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          {recommended.length > 0
            ? <>Themes for <span className="font-semibold capitalize text-foreground">{data.category}</span> appear first. Switch anytime.</>
            : 'Pick a starting look — you can switch anytime from dashboard.'}
        </p>
      </div>

      {/* Scrollable grid */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1" style={{ scrollbarWidth: 'thin' }}>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5 pb-4">
            {aiInRecommended.length > 0 && (
              <Section title={genTheme ? `Your AI Theme + ${data.category} picks` : `For ${data.category}`} icon={<Sparkles className="h-3 w-3" />}>
                {aiInRecommended.map((t) => (
                  <ThemeCard key={t.id} theme={t}
                    isAiGenerated={genTheme?.theme_id === t.theme_id}
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

            {/* AI Generate CTA card — hide if already done */}
            {genState !== 'done' && (
              <Section title='Did not find any of the themes to your liking! Generate a theme with AI, absolutely free.' icon={<Wand2 className="h-3 w-3" />}>
                <AIGenerateCTA
                  storeName={data.storeName}
                  category={data.category}
                  used={genState === 'used'}
                  onClick={() => genState === 'idle' && setGenState('confirm')}
                />
              </Section>
            )}
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
const ThemeCard = ({
  theme, selected, onClick, isAiGenerated = false,
}: { theme: ThemeMaster; selected: boolean; onClick: () => void; isAiGenerated?: boolean }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  return (
    <div className={cn(
      'relative rounded-xl border-2 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 group bg-card cursor-pointer',
      selected
        ? 'border-primary shadow-lg shadow-primary/15 ring-2 ring-primary/15'
        : isAiGenerated
          ? 'border-purple-300 hover:border-purple-500 hover:shadow-md'
          : 'border-border hover:border-primary/40 hover:shadow-md'
    )} onClick={onClick}>
      <div className="aspect-[4/3] bg-muted overflow-hidden relative">
        {!imgLoaded && (
          <div className="absolute inset-0 z-10 animate-pulse bg-gradient-to-r from-muted via-muted-foreground/10 to-muted">
            <div className="absolute inset-0 flex items-center justify-center">
              {isAiGenerated
                ? <Wand2 className="h-6 w-6 text-purple-300" />
                : <Palette className="h-6 w-6 text-muted-foreground/20" />}
            </div>
          </div>
        )}
        {theme.preview_image ? (
          <img src={theme.preview_image} alt={theme.name}
            loading="eager" fetchPriority="high"
            onLoad={() => setImgLoaded(true)}
            className={cn('h-full w-full object-cover group-hover:scale-[1.02] transition-all duration-500',
              imgLoaded ? 'opacity-100' : 'opacity-0')} />
        ) : (
          <div className="h-full w-full flex items-center justify-center"
            style={isAiGenerated ? { background: 'linear-gradient(135deg,#faf5ff,#ede9fe)' } : {}}>
            {isAiGenerated
              ? <Wand2 className="h-8 w-8 text-purple-400" />
              : <Palette className="h-6 w-6 text-muted-foreground/40" />}
          </div>
        )}
      </div>

      <div className="p-2.5">
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs font-bold leading-tight flex-1 truncate">{theme.name}</p>
          {isAiGenerated && (
            <Badge className="bg-purple-600 text-white border-0 text-[9px] gap-0.5 px-1 py-0 h-4">
              <Zap className="h-2 w-2" /> AI
            </Badge>
          )}
          {!isAiGenerated && theme.is_premium && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[9px] gap-0.5 px-1 py-0 h-4">
              <Crown className="h-2 w-2" /> ₹{theme.price}
            </Badge>
          )}
        </div>
        {theme.description && (
          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{theme.description}</p>
        )}
      </div>

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


// ── AI Generate CTA (idle/used) ───────────────────────────────────────────────
const AIGenerateCTA = ({ storeName, category, used, onClick }: {
  storeName: string; category: string; used: boolean; onClick: () => void;
}) => (
  <div
    onClick={!used ? onClick : undefined}
    className={cn(
      'relative rounded-xl border-2 border-dashed overflow-hidden transition-all duration-200',
      used
        ? 'border-muted opacity-60 cursor-not-allowed'
        : 'border-purple-200 hover:border-purple-400 hover:shadow-md cursor-pointer group'
    )}
    style={{ background: 'linear-gradient(135deg,#faf5ff,#f5f3ff)' }}
  >
    <div className="aspect-[4/3] flex flex-col items-center justify-center gap-2.5 p-4">
      <div className={cn('h-10 w-10 rounded-xl bg-white/80 flex items-center justify-center shadow transition-transform',
        !used && 'group-hover:scale-110')}>
        <Wand2 className="h-5 w-5 text-purple-500" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-xs font-semibold text-purple-800">
          {used ? 'Already generated' : 'Generate with AI'}
        </p>
        <p className="text-[10px] text-purple-500 leading-tight">
          {used
            ? 'One generation per store'
            : <>Unique theme for<br /><span className="font-medium">{storeName || category || 'your store'}</span></>}
        </p>
      </div>
      <span className="text-[9px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium border border-purple-200">
        {used ? 'Used' : 'Free · One time only'}
      </span>
    </div>
    <div className="p-2.5 border-t border-purple-100">
      <p className="text-xs font-bold text-purple-900">Start with AI Theme</p>
      <p className="text-[10px] text-purple-500 mt-0.5">1 free generation per store</p>
    </div>
  </div>
);

// ── Confirmation Dialog ──────────────────────────────────────────────────────
const ConfirmDialog = ({ storeName, category, userHints, setUserHints, onConfirm, onCancel }: {
  storeName: string; category: string;
  userHints: { color: string; feel: string; extra: string };
  setUserHints: React.Dispatch<React.SetStateAction<{ color: string; feel: string; extra: string }>>;
  onConfirm: () => void; onCancel: () => void;
}) => {
  const FEEL_OPTIONS = ['Minimal & clean', 'Bold & vibrant', 'Elegant & luxury', 'Playful & fun', 'Dark & premium', 'Earthy & natural'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-2xl bg-purple-100 flex items-center justify-center">
            <Wand2 className="h-7 w-7 text-purple-600" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <h3 className="text-base font-bold">Generate AI Theme</h3>
          <p className="text-xs text-muted-foreground">
            AI will design a <span className="font-medium text-foreground capitalize">{category}</span> theme
            {storeName ? <> for <span className="font-medium text-foreground">"{storeName}"</span></> : ''}.
          </p>
        </div>

        {/* ── User Inputs ── */}
        <div className="space-y-3">
          {/* Color preference */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Paintbrush className="h-3.5 w-3.5 text-purple-500" />
              Preferred colors
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              placeholder="e.g. deep blue and gold, pastel pink, black and white"
              value={userHints.color}
              onChange={(e) => setUserHints(h => ({ ...h, color: e.target.value }))}
              className="h-9 text-sm"
            />
          </div>

          {/* Mood/Feel */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Type className="h-3.5 w-3.5 text-purple-500" />
              Theme mood
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {FEEL_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setUserHints(h => ({ ...h, feel: h.feel === opt ? '' : opt }))}
                  className={cn(
                    'text-[11px] px-2.5 py-1 rounded-full border transition-all duration-150',
                    userHints.feel === opt
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'border-border text-muted-foreground hover:border-purple-300 hover:text-purple-700'
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
            <Input
              placeholder="Or type your own: e.g. warm and cozy, futuristic"
              value={FEEL_OPTIONS.includes(userHints.feel) ? '' : userHints.feel}
              onChange={(e) => setUserHints(h => ({ ...h, feel: e.target.value }))}
              className="h-9 text-sm mt-1"
            />
          </div>

          {/* Extra instructions */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <LayoutGrid className="h-3.5 w-3.5 text-purple-500" />
              Anything else for AI?
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              placeholder="e.g. include a WhatsApp button, Hindi font, no dark backgrounds, show testimonials section"
              value={userHints.extra}
              onChange={(e) => setUserHints(h => ({ ...h, extra: e.target.value }))}
              className="text-sm resize-none"
              rows={2}
            />
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 border border-amber-200 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-amber-700 leading-relaxed">
            <span className="font-semibold">One-time only.</span> You can only generate 1 free AI theme per store.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white gap-2"
            onClick={onConfirm}
          >
            <Wand2 className="h-4 w-4" />
            Generate Theme
          </Button>
        </div>
      </div>
    </div>
  );
};


// ── Progress Dialog ──────────────────────────────────────────────────────────
const ProgressDialog = ({ stepIdx, pct, category }: {
  stepIdx: number; pct: number; category: string;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-sm p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">

      {/* Animated icon */}
      <div className="flex justify-center">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full bg-purple-100 animate-ping opacity-30" />
          <div className="relative h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center">
            <Wand2 className="h-8 w-8 text-purple-600 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-1">
        <h3 className="text-base font-bold">Creating your AI theme</h3>
        <p className="text-xs text-muted-foreground capitalize">
          Building a <span className="font-medium text-foreground">{category}</span> theme from scratch…
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{GEN_STEPS[stepIdx]?.label ?? 'Finishing up…'}</span>
          <span className="font-semibold text-purple-600">{pct}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-purple-700 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="space-y-2">
        {GEN_STEPS.map((step, i) => (
          <div key={i} className={cn(
            'flex items-center gap-2.5 text-[11px] transition-all duration-300',
            i < stepIdx  ? 'text-emerald-600' :
            i === stepIdx ? 'text-foreground font-medium' :
            'text-muted-foreground/40'
          )}>
            {i < stepIdx ? (
              <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" strokeWidth={3} />
            ) : i === stepIdx ? (
              <Loader2 className="h-3.5 w-3.5 text-purple-500 animate-spin flex-shrink-0" />
            ) : (
              <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/20 flex-shrink-0" />
            )}
            {step.label}
          </div>
        ))}
      </div>

      <p className="text-center text-[10px] text-muted-foreground">
        Please don't close this window. This may take 30–60 seconds.
      </p>
    </div>
  </div>
);

export default StepTheme;
