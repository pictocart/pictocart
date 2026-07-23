import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Check, Palette, Loader2, Sparkles, Flame, Eye, Crown, Wand2, Zap, AlertTriangle, Paintbrush, Type, LayoutGrid, X, GripVertical, LayoutDashboard, Store, Package, ShoppingCart, CreditCard, BookOpen, Info, Mail, User, Lock, Grid, Folder, FileText, Search, Heart, RotateCcw, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { OnboardingData } from '@/pages/Onboarding';
import { DEFAULT_PAGE_SECTIONS, PAGE_META } from '@/lib/defaultPageSections';

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


// Page tabs for the multi-page custom theme builder.
// Each tab maps to a manifest page and is rendered in the left panel of the modal.
const PAGE_TABS = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'shop', label: 'Shop', icon: Store },
  { id: 'product', label: 'Product', icon: Package },
  { id: 'cart', label: 'Cart', icon: ShoppingCart },
  { id: 'checkout', label: 'Checkout', icon: CreditCard },
  { id: 'collections', label: 'Collections', icon: Grid },
  { id: 'collection_detail', label: 'Collection', icon: Folder },
  { id: 'blog', label: 'Blog', icon: BookOpen },
  { id: 'blog_post', label: 'Blog Post', icon: FileText },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'about', label: 'About', icon: Info },
  { id: 'contact', label: 'Contact', icon: Mail },
  { id: 'account', label: 'Account', icon: User },
  { id: 'order_detail', label: 'Order Detail', icon: FileText },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'returns', label: 'Returns', icon: RotateCcw },
  { id: 'policy', label: 'Policy', icon: Shield },
  { id: 'menu', label: 'Menu', icon: LayoutGrid },
  { id: 'booking', label: 'Booking', icon: LayoutGrid },
] as const;

// Default section definitions per page, used to seed the per-page section list in the builder.
// Each section tracks: id (matches manifest section type), label, enabled, and style variant.
const PAGE_SECTION_DEFAULTS: Record<string, Array<{ id: string; label: string; enabled: boolean; style: string; compulsive?: boolean }>> = {
  home: [
    { id: 'hero', label: 'Hero Banner', enabled: true, style: 'centered', compulsive: true },
    { id: 'usp_strip', label: 'Features / USP', enabled: true, style: 'classic' },
    { id: 'category_grid', label: 'Shop by Category', enabled: true, style: 'grid_4' },
    { id: 'product_grid', label: 'Featured Products', enabled: true, style: 'grid_clean' },
    { id: 'new_arrivals', label: 'New Arrivals', enabled: true, style: 'carousel_slider' },
    { id: 'promo_banner', label: 'Promotional Banner', enabled: true, style: 'classic_split' },
    { id: 'story', label: 'Brand Story', enabled: false, style: 'classic' },
    { id: 'testimonials', label: 'Testimonials', enabled: false, style: 'classic' },
    { id: 'newsletter', label: 'Newsletter', enabled: true, style: 'classic' },
  ],
  shop: [
    { id: 'page_title', label: 'Page Title', enabled: true, style: 'classic', compulsive: true },
    { id: 'category_grid', label: 'Category Filter', enabled: true, style: 'modern_tabs' },
    { id: 'product_grid', label: 'Product Grid', enabled: true, style: 'grid_clean', compulsive: true },
  ],
  product: [
    { id: 'product_detail', label: 'Product Detail', enabled: true, style: 'classic', compulsive: true },
    { id: 'related_products', label: 'Related Products', enabled: true, style: 'carousel_slider' },
  ],
  cart: [
    { id: 'page_title', label: 'Page Title', enabled: true, style: 'classic', compulsive: true },
    { id: 'line_items', label: 'Line Items', enabled: true, style: 'classic', compulsive: true },
    { id: 'cart_summary', label: 'Cart Summary', enabled: true, style: 'classic', compulsive: true },
  ],
  checkout: [
    { id: 'page_title', label: 'Page Title', enabled: true, style: 'classic', compulsive: true },
    { id: 'checkout_stepper', label: 'Checkout Stepper', enabled: true, style: 'classic', compulsive: true },
    { id: 'cart_summary', label: 'Order Summary', enabled: true, style: 'classic' },
  ],
  collections: [
    { id: 'page_title', label: 'Page Title', enabled: true, style: 'classic', compulsive: true },
    { id: 'collections_grid', label: 'Collections Grid', enabled: true, style: 'grid_4', compulsive: true },
  ],
  collection_detail: [
    { id: 'page_title', label: 'Page Title', enabled: true, style: 'classic', compulsive: true },
    { id: 'product_grid', label: 'Products', enabled: true, style: 'grid_clean', compulsive: true },
  ],
  blog: [
    { id: 'page_title', label: 'Page Title', enabled: true, style: 'classic', compulsive: true },
    { id: 'journal_list', label: 'Journal List', enabled: true, style: 'classic', compulsive: true },
  ],
  blog_post: [
    { id: 'journal_strip', label: 'Journal Content', enabled: true, style: 'classic', compulsive: true },
    { id: 'newsletter', label: 'Newsletter', enabled: true, style: 'classic' },
  ],
  search: [
    { id: 'page_title', label: 'Page Title', enabled: true, style: 'classic', compulsive: true },
    { id: 'product_grid', label: 'Search Results', enabled: true, style: 'grid_clean', compulsive: true },
  ],
  about: [
    { id: 'page_title', label: 'Page Title', enabled: true, style: 'classic', compulsive: true },
    { id: 'story', label: 'Our Story', enabled: true, style: 'classic' },
    { id: 'values', label: 'Values', enabled: true, style: 'classic' },
    { id: 'provider_team', label: 'Team', enabled: false, style: 'classic' },
  ],
  contact: [
    { id: 'page_title', label: 'Page Title', enabled: true, style: 'classic', compulsive: true },
    { id: 'map_and_contact', label: 'Map & Contact Info', enabled: true, style: 'classic' },
    { id: 'contact_form', label: 'Contact Form', enabled: true, style: 'classic', compulsive: true },
  ],
  account: [
    { id: 'page_title', label: 'Page Title', enabled: true, style: 'classic', compulsive: true },
    { id: 'account_panel', label: 'Account Panel', enabled: true, style: 'classic', compulsive: true },
  ],
  order_detail: [
    { id: 'page_title', label: 'Page Title', enabled: true, style: 'classic', compulsive: true },
    { id: 'line_items', label: 'Order Items', enabled: true, style: 'classic', compulsive: true },
    { id: 'cart_summary', label: 'Order Summary', enabled: true, style: 'classic', compulsive: true },
  ],
  wishlist: [
    { id: 'page_title', label: 'Page Title', enabled: true, style: 'classic', compulsive: true },
    { id: 'product_grid', label: 'Saved Products', enabled: true, style: 'grid_clean', compulsive: true },
  ],
  returns: [
    { id: 'page_title', label: 'Page Title', enabled: true, style: 'classic', compulsive: true },
    { id: 'contact_form', label: 'Return Form', enabled: true, style: 'classic', compulsive: true },
  ],
  policy: [
    { id: 'page_title', label: 'Page Title', enabled: true, style: 'classic', compulsive: true },
    { id: 'text_block', label: 'Policy Content', enabled: true, style: 'classic', compulsive: true },
  ],
  menu: [
    { id: 'page_title', label: 'Page Title', enabled: true, style: 'classic', compulsive: true },
    { id: 'service_menu', label: 'Service Menu', enabled: true, style: 'classic', compulsive: true },
    { id: 'service_packages', label: 'Packages', enabled: true, style: 'classic' },
  ],
  booking: [
    { id: 'page_title', label: 'Page Title', enabled: true, style: 'classic', compulsive: true },
    { id: 'booking_widget', label: 'Booking Widget', enabled: true, style: 'classic', compulsive: true },
    { id: 'provider_team', label: 'Specialists', enabled: true, style: 'classic' },
  ],
};

// Pages shown by default in the custom builder tab strip. Hidden tabs (policy, menu, booking)
// are still configurable but collapsed under "More pages" to keep the UI manageable.
const VISIBLE_PAGE_TAB_IDS = ['home', 'shop', 'product', 'cart', 'checkout', 'collections', 'collection_detail', 'blog', 'blog_post', 'search', 'about', 'contact', 'account', 'order_detail', 'wishlist', 'returns'];

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
  const [builderOpen, setBuilderOpen] = useState(false);
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

  // Sync selected theme ID to localStorage for real-time storefront preview tabs
  useEffect(() => {
    if (data.selectedThemeId) {
      localStorage.setItem('storefront_preview_theme', data.selectedThemeId);
    }
  }, [data.selectedThemeId]);

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
    ? themes.filter((t) => matchesCategory(t.category, data.category) && !t.theme_id.startsWith('layout1-'))
    : [];
  const recommendedIds = new Set(recommended.map((t) => t.id));
  const trending = themes.filter((t) => t.is_default && !recommendedIds.has(t.id) && !t.theme_id.startsWith('layout1-'));
  const trendingIds = new Set([...recommendedIds, ...trending.map((t) => t.id)]);
  const others = themes.filter((t) => !trendingIds.has(t.id) && !t.theme_id.startsWith('layout1-'));



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

      {/* Custom Theme Builder Dialog — rendered in body to escape overflow:hidden */}
      {builderOpen && createPortal(
        <CustomThemeBuilderModal 
          onClose={() => setBuilderOpen(false)}
          data={data}
          setData={setData}
          themes={themes}
        />,
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
            {/* Custom Theme Builder Card Box */}
            <div className={cn(
              "rounded-xl border-2 border-dashed p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm transition duration-300",
              data.selectedThemeId.startsWith('custom-theme-')
                ? "border-primary ring-2 ring-primary/20 bg-primary/[0.01]"
                : "border-primary/40 hover:border-primary/80 hover:shadow-md"
            )}>
              <div className="flex items-center gap-3.5 text-left">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <LayoutGrid className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-foreground">Make your own custom theme layout</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-md">Mix and match any of the 19 headers, hero banners, product grids, and footers to create your own unique storefront brand identity.</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button 
                  type="button"
                  onClick={() => setBuilderOpen(true)}
                  className="font-bold text-xs px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm rounded-lg"
                >
                  {data.selectedThemeId.startsWith('custom-theme-') ? 'Edit Custom Layout' : 'Build Custom Theme'}
                </Button>
                {data.selectedThemeId.startsWith('custom-theme-') && (
                  <div className="h-9 w-9 flex items-center justify-center bg-primary text-primary-foreground rounded-lg shadow-sm">
                    <Check className="h-5 w-5" strokeWidth={3} />
                  </div>
                )}
              </div>
            </div>

            {aiInRecommended.length > 0 && (
              <Section title={genTheme ? `Your AI Theme + ${data.category} picks` : `For ${data.category}`} icon={<Sparkles className="h-3 w-3" />}>
                {aiInRecommended.map((t) => (
                  <ThemeCard key={t.id} theme={t}
                    category={data.category}
                    slug={data.slug}
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
                    category={data.category}
                    slug={data.slug}
                    selected={data.selectedThemeId === t.theme_id}
                    onClick={() => setData(d => ({ ...d, selectedThemeId: t.theme_id }))} />
                ))}
              </Section>
            )}

            {others.length > 0 && (
              <Section title={recommended.length > 0 ? 'More themes' : 'All themes'} icon={<Palette className="h-3 w-3" />}>
                {others.map((t) => (
                  <ThemeCard key={t.id} theme={t}
                    category={data.category}
                    slug={data.slug}
                    selected={data.selectedThemeId === t.theme_id}
                    onClick={() => setData(d => ({ ...d, selectedThemeId: t.theme_id }))} />
                ))}
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
  theme, selected, onClick, isAiGenerated = false, category, slug,
}: { theme: ThemeMaster; selected: boolean; onClick: () => void; isAiGenerated?: boolean; category?: string; slug?: string }) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  const PREVIEW_IMAGES: Record<string, string> = {
    fashion: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=60",
    food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=60",
    beauty_services: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&auto=format&fit=crop&q=60",
    electronics: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=600&auto=format&fit=crop&q=60",
    handmade: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=60",
    beauty: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&auto=format&fit=crop&q=60",
    other: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=60",
  };

  const isDefaultImage = theme.preview_image && (theme.preview_image.includes("1483985988355") || theme.preview_image.includes("photo-1483985988355"));
  const resolvedPreviewImage = (isDefaultImage && category && PREVIEW_IMAGES[category])
    ? PREVIEW_IMAGES[category]
    : theme.preview_image;

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
        {resolvedPreviewImage ? (
          <img src={resolvedPreviewImage} alt={theme.name}
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

      <a href={`/admin/themes/preview-live/${theme.theme_id}${slug ? `?storeSlug=${slug}` : ''}`} target="_blank" rel="noreferrer"
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

// ── Custom Theme Component Preview ──────────────────────────────────────────
const CustomThemeComponentPreview = ({ type, variant, imageUrl, colors }: { type: string; variant: string; imageUrl: string; colors: any }) => {
  const primaryColor = colors.primary;
  const secondaryColor = colors.secondary;
  const textColor = colors.text;
  const bgColor = colors.bg;
  const cardBg = colors.cardBg;

  if (type === 'navbar') {
    const isSidebar = variant.includes("sidebar");
    const isDrawer = variant === "sidebar_drawer";

    // Sidebars preview rendering
    if (isSidebar) {
      const isDark = variant.includes("dark") || variant.includes("accent");
      const isGlass = variant.includes("glass");
      return (
        <div className="w-full h-[50px] border rounded-md shadow-xs bg-slate-50 flex overflow-hidden text-left" style={{ borderColor: `${primaryColor}20` }}>
          <div className={cn(
            "w-[35px] h-full border-r flex flex-col justify-between p-1 shrink-0",
            isDark ? "bg-slate-900 text-white border-slate-800" :
            isGlass ? "bg-white/70 backdrop-blur-md border-white/20" : "bg-white border-slate-100"
          )}>
            <div className="space-y-1">
              <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white font-extrabold text-[5px]" style={{ backgroundColor: isDark ? '#fff' : primaryColor, color: isDark ? primaryColor : '#fff' }}>P</div>
              <div className="flex flex-col gap-0.5 text-[4px] font-semibold text-slate-400">
                <span className={cn(isDark ? "text-white" : "text-slate-800")}>• Home</span>
                <span>• Shop</span>
                <span>• Info</span>
              </div>
            </div>
            <div className="w-full h-1 bg-slate-200 rounded-full" />
          </div>
          <div className="flex-1 h-full flex items-center justify-between px-3 bg-white">
            <span className="text-[6.5px] font-semibold text-slate-400">Main Content</span>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-100" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
      );
    }

    if (isDrawer) {
      return (
        <div className="w-full h-[50px] flex items-center justify-between px-4 border rounded-md shadow-xs bg-white text-left overflow-hidden" style={{ borderColor: `${primaryColor}20` }}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border flex flex-col gap-0.5 justify-center items-center" style={{ borderColor: `${primaryColor}25` }}>
              <div className="w-2.5 h-0.5 bg-slate-500 rounded-xs" />
              <div className="w-2.5 h-0.5 bg-slate-500 rounded-xs" />
              <div className="w-2.5 h-0.5 bg-slate-500 rounded-xs" />
            </div>
            <span className="font-extrabold text-[8px] tracking-tight text-slate-800">Brand Store</span>
          </div>
          <div className="w-3 h-3 rounded-full bg-slate-100" />
        </div>
      );
    }

    // Centered Logo
    if (variant === "centered_logo") {
      return (
        <div className="w-full h-[50px] grid grid-cols-3 items-center px-4 border rounded-md shadow-xs bg-white text-left overflow-hidden" style={{ borderColor: `${primaryColor}20` }}>
          <div className="flex gap-2 text-slate-400 font-semibold text-[6px]">
            <span>Shop</span>
            <span>Catalog</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white font-bold text-[6px]" style={{ backgroundColor: primaryColor }}>P</div>
            <span className="font-extrabold text-[8px] tracking-tight text-slate-800">Brand</span>
          </div>
          <div className="flex justify-end gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-100" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-100" />
          </div>
        </div>
      );
    }

    // Minimal Thin
    if (variant === "minimal_thin") {
      return (
        <div className="w-full h-[38px] flex items-center justify-between px-5 border rounded-md shadow-xs bg-white text-left overflow-hidden" style={{ borderColor: `${primaryColor}20` }}>
          <span className="font-extrabold text-[7px] text-slate-800 tracking-wider">BRAND</span>
          <div className="flex gap-3 text-slate-400 font-bold text-[5.5px] uppercase">
            <span style={{ color: primaryColor }}>Home</span>
            <span>Shop</span>
            <span>Info</span>
          </div>
        </div>
      );
    }

    // Bold Serif
    if (variant === "bold_serif") {
      return (
        <div className="w-full h-[50px] flex items-center justify-between px-6 border-b-2 rounded-md shadow-xs bg-white text-left overflow-hidden" style={{ borderBottomColor: primaryColor, borderColor: `${primaryColor}20` }}>
          <span className="font-serif font-black text-[10px] text-slate-900">BrandSerif</span>
          <div className="flex gap-3 font-serif font-bold text-[7px] text-slate-800">
            <span>Home</span>
            <span style={{ color: primaryColor }}>Shop</span>
            <span>About</span>
          </div>
        </div>
      );
    }

    // Glassmorphic Sticky
    if (variant === "glassmorphic_sticky") {
      return (
        <div className="w-full h-[50px] flex items-center justify-between px-6 border rounded-md shadow-xs bg-slate-100/50 backdrop-blur-md text-left overflow-hidden relative" style={{ borderColor: `${primaryColor}25` }}>
          <div className="absolute inset-0 bg-white/40 backdrop-blur-xs -z-10" />
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full flex items-center justify-center text-white font-bold text-[6.5px]" style={{ backgroundColor: primaryColor }}>P</div>
            <span className="font-semibold text-[8px] text-slate-800">GlassBrand</span>
          </div>
          <div className="flex gap-2.5 text-slate-600 font-medium text-[7px] bg-white/80 px-2 py-1 rounded-full shadow-xs">
            <span style={{ color: primaryColor }}>Shop</span>
            <span>Catalog</span>
          </div>
        </div>
      );
    }

    // Split Menu
    if (variant === "split_menu") {
      return (
        <div className="w-full h-[50px] flex items-center justify-between px-6 border rounded-md shadow-xs bg-white text-left overflow-hidden" style={{ borderColor: `${primaryColor}20` }}>
          <span className="text-[6.5px] font-bold text-slate-400">Home</span>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white font-bold text-[6px]" style={{ backgroundColor: primaryColor }}>P</div>
            <span className="font-extrabold text-[8px] text-slate-800">Split</span>
          </div>
          <span className="text-[6.5px] font-bold text-slate-400">Catalog</span>
        </div>
      );
    }

    // Left Align All
    if (variant === "left_align_all") {
      return (
        <div className="w-full h-[50px] flex items-center gap-6 px-6 border rounded-md shadow-xs bg-white text-left overflow-hidden" style={{ borderColor: `${primaryColor}20` }}>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white font-bold text-[6px]" style={{ backgroundColor: primaryColor }}>P</div>
            <span className="font-extrabold text-[8px] text-slate-800">LeftBrand</span>
          </div>
          <div className="flex gap-3 text-slate-400 font-bold text-[6.5px]">
            <span style={{ color: primaryColor }}>Products</span>
            <span>About</span>
            <span>Contact</span>
          </div>
        </div>
      );
    }

    // Double Deck
    if (variant === "double_deck") {
      return (
        <div className="w-full border rounded-md shadow-xs overflow-hidden" style={{ borderColor: `${primaryColor}20` }}>
          <div className="w-full h-[16px] text-white flex items-center justify-center text-[5.5px] font-bold tracking-wider" style={{ backgroundColor: primaryColor }}>
            FREE SHIPPING ON ALL ORDERS
          </div>
          <div className="w-full h-[34px] flex items-center justify-between px-5 bg-white">
            <span className="font-extrabold text-[8px] text-slate-800">DoubleDeck</span>
            <div className="flex gap-2 text-slate-400 font-semibold text-[6.5px]">
              <span>Shop</span>
              <span>Catalog</span>
            </div>
          </div>
        </div>
      );
    }

    // Dark Mode Inverted
    if (variant === "dark_mode_inverted") {
      return (
        <div className="w-full h-[50px] flex items-center justify-between px-6 border rounded-md shadow-xs bg-slate-900 text-left overflow-hidden border-slate-800">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full flex items-center justify-center text-slate-900 font-bold text-[6.5px] bg-white">P</div>
            <span className="font-extrabold text-[8px] tracking-tight text-white">DarkStore</span>
          </div>
          <div className="flex gap-2.5 text-slate-300 font-semibold text-[7px]">
            <span style={{ color: primaryColor }}>Home</span>
            <span>Shop</span>
            <span>Catalog</span>
          </div>
        </div>
      );
    }

    // Minimal Icons Only
    if (variant === "minimal_icons_only") {
      return (
        <div className="w-full h-[50px] flex items-center justify-between px-6 border rounded-md shadow-xs bg-white text-left overflow-hidden" style={{ borderColor: `${primaryColor}20` }}>
          <span className="font-extrabold text-[8.5px] text-slate-800">IconsBrand</span>
          <div className="flex gap-3">
            <div className="w-3.5 h-3.5 rounded border border-slate-200 flex items-center justify-center text-[6px]">🔍</div>
            <div className="w-3.5 h-3.5 rounded border border-slate-200 flex items-center justify-center text-[6px] relative">
              🛒
              <div className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
            </div>
          </div>
        </div>
      );
    }

    // Bordered Links
    if (variant === "bordered_links") {
      return (
        <div className="w-full h-[50px] flex items-center justify-between px-6 border rounded-md shadow-xs bg-white text-left overflow-hidden" style={{ borderColor: `${primaryColor}20` }}>
          <span className="font-extrabold text-[8px] text-slate-800">Bordered</span>
          <div className="flex border rounded overflow-hidden" style={{ borderColor: `${primaryColor}20` }}>
            <span className="px-2.5 py-1 text-[6.5px] font-bold border-r bg-slate-50" style={{ borderRightColor: `${primaryColor}15`, color: primaryColor }}>Home</span>
            <span className="px-2.5 py-1 text-[6.5px] font-bold border-r bg-white" style={{ borderRightColor: `${primaryColor}15` }}>Shop</span>
            <span className="px-2.5 py-1 text-[6.5px] font-bold bg-white">Info</span>
          </div>
        </div>
      );
    }

    // Gradient Glow
    if (variant === "gradient_glow") {
      return (
        <div className="w-full h-[50px] flex items-center justify-between px-6 border rounded-md shadow-xs bg-white text-left overflow-hidden relative" style={{ borderColor: `${primaryColor}20` }}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-pink-500 to-indigo-500" />
          <span className="font-black text-[9px] bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">GlowBrand</span>
          <div className="flex gap-2.5 text-slate-400 font-semibold text-[7px]">
            <span>Shop</span>
            <span>Catalog</span>
          </div>
        </div>
      );
    }

    // Floating Pill
    if (variant === "floating_pill") {
      return (
        <div className="w-full h-[50px] flex items-center justify-center px-4 bg-slate-50 border rounded-md shadow-xs overflow-hidden" style={{ borderColor: `${primaryColor}10` }}>
          <div className="w-11/12 h-[34px] bg-white rounded-full border shadow-sm flex items-center justify-between px-4" style={{ borderColor: `${primaryColor}15` }}>
            <span className="font-black text-[7.5px] text-slate-800">Pill</span>
            <div className="flex gap-2 text-slate-400 font-bold text-[6px]">
              <span style={{ color: primaryColor }}>Shop</span>
              <span>Info</span>
            </div>
          </div>
        </div>
      );
    }

    // Fallback default navbar render
    return (
      <div className="w-full h-[50px] flex items-center justify-between px-6 border rounded-md shadow-xs bg-white text-left overflow-hidden" style={{ borderColor: `${primaryColor}20` }}>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full flex items-center justify-center text-white font-bold text-[6.5px]" style={{ backgroundColor: primaryColor }}>P</div>
          <span className="font-extrabold text-[8px] tracking-tight text-slate-800">Brand Store</span>
        </div>
        <div className="flex gap-2.5 text-slate-400 font-semibold text-[7px]">
          <span style={{ color: primaryColor }}>Home</span>
          <span>Shop</span>
          <span>Catalog</span>
        </div>
      </div>
    );
  }

  if (type === 'hero') {
    const isSlider = variant === "slider";
    const isCircleMask = variant === "circle_mask";
    const isSplit = ["split", "split_column", "half_banner", "asymmetric", "minimal_left", "left_sticky"].includes(variant);
    const isGradient = variant === "gradient";
    const isFloatingCard = variant === "floating_card";

    return (
      <div className="w-full h-[120px] rounded-md border bg-white overflow-hidden relative shadow-xs" style={{ borderColor: `${primaryColor}20` }}>
        {isSlider ? (
          <div className="w-full h-full relative">
            <img src={imageUrl} className="w-full h-full object-cover animate-in fade-in" />
            <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-3 text-left">
              <span className="text-[5.5px] uppercase tracking-wider text-white/90 font-bold">New Arrivals</span>
              <h2 className="text-[8px] font-black text-white leading-tight">Theme Slider Option</h2>
            </div>
          </div>
        ) : isCircleMask ? (
          <div className="w-full h-full grid grid-cols-2 items-center px-4 gap-2">
            <div className="text-left space-y-1">
              <h2 className="text-[9px] font-black leading-tight text-slate-800">Welcome Screen</h2>
              <p className="text-[5px] text-slate-400">Unique geometric layout theme.</p>
            </div>
            <div className="flex justify-center items-center">
              <div className="w-14 h-14 rounded-full border-2 overflow-hidden shadow-sm" style={{ borderColor: primaryColor }}>
                <img src={imageUrl} className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        ) : isSplit ? (
          <div className="w-full h-full grid grid-cols-2 items-center px-4 gap-2">
            <div className="text-left space-y-1">
              <h2 className="text-[9px] font-bold leading-tight text-slate-800">Designed with Elegance</h2>
              <div className="w-12 h-3.5 rounded-xs flex items-center justify-center text-white font-bold text-[5.5px]" style={{ backgroundColor: primaryColor }}>Catalog</div>
            </div>
            <div className="w-full h-16 rounded border overflow-hidden relative" style={{ borderColor: `${primaryColor}10` }}>
              <img src={imageUrl} className="w-full h-full object-cover" />
            </div>
          </div>
        ) : isGradient ? (
          <div className="w-full h-full flex items-center justify-center px-4">
            <div className="w-full h-[90px] rounded border flex overflow-hidden relative animate-in fade-in" style={{ background: `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}10)`, borderColor: `${primaryColor}10` }}>
              <div className="w-1/2 p-2 text-left flex flex-col justify-center space-y-1 z-10">
                <h2 className="text-[8px] font-black text-slate-800">Elevate Your Everyday Vibe</h2>
              </div>
              <div className="w-1/2 h-full absolute right-0 top-0 overflow-hidden opacity-90">
                <img src={imageUrl} className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        ) : isFloatingCard ? (
          <div className="w-full h-full relative">
            <img src={imageUrl} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/15 flex items-center justify-center">
              <div className="w-32 rounded bg-white/95 p-1.5 text-center shadow-xs border border-slate-100 flex flex-col items-center">
                <h3 className="font-extrabold text-[7px] text-slate-800 leading-none">Luxury Redefined</h3>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full relative">
            <img src={imageUrl} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/35 flex flex-col justify-center p-3 text-left">
              <h2 className="text-[9px] font-black text-white leading-tight">Handpicked Collection</h2>
              <p className="text-[5.5px] text-white/80 mt-0.5">Explore the premium style details.</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === 'category') {
    const isCircleCats = ["circles", "rounded_octagon", "modern_tabs"].includes(variant);
    const isPillCats = ["minimal_pills", "badge_with_counters"].includes(variant);
    return (
      <div className="w-full h-[60px] rounded-md border bg-slate-50 flex flex-col justify-center px-4 shadow-xs text-left" style={{ borderColor: `${primaryColor}20` }}>
        <p className="text-[5.5px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Shop Categories</p>
        <div className="flex gap-2 items-center justify-start overflow-hidden">
          {[1, 2, 3, 4].map((i) => {
            if (isCircleCats) {
              return (
                <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border border-slate-300 overflow-hidden shrink-0">
                  <img src={imageUrl} className="w-full h-full object-cover" />
                </div>
              );
            } else if (isPillCats) {
              return (
                <div key={i} className="px-2 py-0.5 rounded-full border text-[5.5px] font-bold bg-white shrink-0" style={{ borderColor: `${primaryColor}15` }}>
                  Cat {i}
                </div>
              );
            } else {
              return (
                <div key={i} className="w-8 h-6 rounded bg-slate-200 border border-slate-300 overflow-hidden shrink-0">
                  <img src={imageUrl} className="w-full h-full object-cover" />
                </div>
              );
            }
          })}
        </div>
      </div>
    );
  }

  if (type === 'product') {
    return (
      <div className="w-full h-[85px] rounded-md border bg-white flex flex-col justify-center px-4 shadow-xs text-left" style={{ borderColor: `${primaryColor}20` }}>
        <p className="text-[5.5px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Best Sellers</p>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded border bg-white flex flex-col overflow-hidden relative shadow-xs" style={{ borderColor: `${primaryColor}10` }}>
              <div className="h-6 w-full bg-slate-100 overflow-hidden">
                <img src={imageUrl} className="w-full h-full object-cover" />
              </div>
              <div className="p-0.5 text-[5px] font-bold text-slate-800 truncate">Product Name</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'promo') {
    return (
      <div className="w-full h-[45px] rounded-md border flex items-center justify-between px-4 shadow-xs text-left overflow-hidden" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor}cc)`, borderColor: `${primaryColor}20` }}>
        <div className="text-white text-left">
          <h3 className="text-[7.5px] font-black leading-none">Claim 50% Off</h3>
          <p className="text-[4.5px] text-white/80 mt-0.5">Use code: SAVE50 at checkout.</p>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-white text-[5px] font-extrabold text-slate-800 shadow-xs cursor-pointer">
          Apply
        </div>
      </div>
    );
  }

  if (type === 'footer') {
    return (
      <div className="w-full h-[35px] rounded-md border bg-slate-900 flex items-center justify-between px-4 shadow-xs text-left" style={{ borderColor: `${primaryColor}20` }}>
        <div className="flex flex-col gap-0.5 text-left">
          <span className="font-extrabold text-[6.5px] text-white">Brand Store</span>
          <span className="text-[6px] text-slate-400">© 2026 Rights Reserved</span>
        </div>
        <div className="flex gap-2 text-[5.5px] text-slate-500">
          <span>Terms</span>
          <span>Privacy</span>
        </div>
      </div>
    );
  }

  return null;
};

// ── Custom Theme Builder Modal ──────────────────────────────────────────────
interface BuilderModalProps {
  onClose: () => void;
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  themes: ThemeMaster[];
}

const CustomThemeBuilderModal = ({ onClose, data, setData, themes }: BuilderModalProps) => {
  const queryClient = useQueryClient();
  const [activeSelector, setActiveSelector] = useState<'nav' | 'hero' | 'usp_strip' | 'category' | 'product' | 'new_arrivals' | 'promo' | 'footer' | null>(null);
  const [activePage, setActivePage] = useState<string>('home');

  const [navStyle, setNavStyle] = useState(data.customThemeConfig?.nav || 'classic');
  const [footerStyle, setFooterStyle] = useState(data.customThemeConfig?.footer || 'classic');
  const [themeName, setThemeName] = useState(`Theme #${themes.length + 1} (Custom Remix)`);
  const [customPalette, setCustomPalette] = useState<Record<string, string> | null>(null);
  const [customFonts, setCustomFonts] = useState<Record<string, string> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: "Hello! I am your AI Theme Assistant. Tell me what changes you want (e.g. 'dark mode', 'make buttons orange', 'serif heading font', or 'slider hero layout') and I will apply them instantly!" }
  ]);

  const [chatPosition, setChatPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancelAI = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setAiLoading(false);
    setChatMessages(prev => [...prev, { role: 'assistant', content: "AI request cancelled. You can type a new instruction now!" }]);
    toast.info("AI request stopped.");
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('form')) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - chatPosition.x,
      y: e.clientY - chatPosition.y
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setChatPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      });
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Per-page section configuration. Each page maps to its own list of editable sections.
  // The manifest's pages object is built from this state at save time.
  const [pages, setPages] = useState<Record<string, Array<{ id: string; label: string; enabled: boolean; style: string; compulsive?: boolean }>>>(() => {
    // Hydrate from existing customThemeConfig if present, otherwise use defaults.
    if ((data.customThemeConfig as any)?.pages) {
      return JSON.parse(JSON.stringify((data.customThemeConfig as any).pages));
    }
    const initial: Record<string, any> = {};
    for (const page of Object.keys(PAGE_SECTION_DEFAULTS)) {
      initial[page] = JSON.parse(JSON.stringify(PAGE_SECTION_DEFAULTS[page]));
    }
    return initial;
  });

  // Backwards-compat: the old `sections` state was home-only. We derive it from
  // pages.home so existing helpers (interpretAIPrompt, handleAISubmit, preview URL)
  // keep working without a full rewrite.
  const sections = pages[activePage] ?? pages.home ?? [];

  const setSections = (next: any) => {
    setPages(prev => ({ ...prev, [activePage]: typeof next === 'function' ? next(prev[activePage] ?? prev.home ?? []) : next }));
  };

  const interpretAIPrompt = (promptText: string) => {
    const text = promptText.toLowerCase();
    
    const palette: Record<string, any> = customPalette ? { ...customPalette } : {
      primary: '#6366f1',
      secondary: '#10b981',
      accent: '#6366f1',
      background: '#ffffff',
      text: '#1f2937',
      card: '#f9fafb'
    };

    const fonts = customFonts ? { ...customFonts } : {
      heading: 'Inter',
      body: 'Inter'
    };

    let updatedSections = [...sections];
    let updatedNav = navStyle;
    let updatedFooter = footerStyle;
    let updatedThemeName = themeName;
    let changesDesc: string[] = [];

    const colorMap: Record<string, string> = {
      red: '#ef4444',
      blue: '#3b82f6',
      green: '#10b981',
      emerald: '#10b981',
      purple: '#a855f7',
      violet: '#8b5cf6',
      orange: '#f97316',
      amber: '#f59e0b',
      yellow: '#eab308',
      pink: '#ec4899',
      rose: '#f43f5e',
      indigo: '#6366f1',
      black: '#090d16',
      white: '#ffffff',
      slate: '#475569',
      gold: '#d97706',
      cyan: '#06b6d4',
      teal: '#0d9488',
      maroon: '#800000',
      navy: '#000080',
      lime: '#00ff00',
      brown: '#a52a2a',
      gray: '#808080',
      grey: '#808080',
      silver: '#c0c0c0',
      olive: '#808000',
      magenta: '#ff00ff',
      fuchsia: '#ff00ff',
      aqua: '#00ffff',
      crimson: '#dc143c',
      beige: '#f5f5dc',
      lavender: '#e6e6fa',
      coral: '#ff7f50',
      peach: '#ffdab9',
      plum: '#dda0dd'
    };

    let matchedColor: string | null = null;
    
    // Check for hex color matching (e.g. #800000 or #f00)
    const hexMatch = text.match(/#([0-9a-f]{3,6})/i);
    if (hexMatch) {
      matchedColor = hexMatch[0];
    } else {
      for (const key of Object.keys(colorMap)) {
        if (text.includes(key)) {
          matchedColor = colorMap[key];
          break;
        }
      }
    }

    if (matchedColor) {
      if (text.includes('button') || text.includes('cta') || text.includes('accent')) {
        palette.accent = matchedColor;
        palette.primary = matchedColor;
        changesDesc.push(`button colors changed to ${keyColorName(matchedColor)}`);
      } else if (text.includes('navbar') || text.includes('header')) {
        if (text.includes('font') || text.includes('text') || text.includes('link') || text.includes('icon') || text.includes('fg')) {
          palette.navbar_fg = matchedColor;
          changesDesc.push(`navbar text and icons color updated to ${keyColorName(matchedColor)}`);
        } else {
          palette.navbar_bg = matchedColor;
          changesDesc.push(`navbar colors updated to ${keyColorName(matchedColor)}`);
        }
      } else if (text.includes('background') || text.includes('bg') || text.includes('page')) {
        palette.background = matchedColor;
        palette.text = (matchedColor === '#090d16' || matchedColor === '#475569') ? '#ffffff' : '#1f2937';
        changesDesc.push(`page background updated to ${keyColorName(matchedColor)}`);
      } else {
        palette.accent = matchedColor;
        palette.primary = matchedColor;
        changesDesc.push(`theme accents updated to ${keyColorName(matchedColor)}`);
      }
    }

    if (text.includes('bold') && (text.includes('navbar') || text.includes('header') || text.includes('link') || text.includes('font') || text.includes('icon'))) {
      palette.navbar_bold = true;
      changesDesc.push('navbar font set to bold');
    }

    if (text.includes('dark mode') || text.includes('dark theme') || text.includes('black mode') || text.includes('slate theme')) {
      palette.background = '#090d16';
      palette.text = '#f8fafc';
      palette.card = '#111827';
      changesDesc.push('switched background to dark mode slate');
    }
    if (text.includes('light mode') || text.includes('white theme') || text.includes('clean background')) {
      palette.background = '#ffffff';
      palette.text = '#1f2937';
      palette.card = '#f9fafb';
      changesDesc.push('switched background to light mode white');
    }

    if (text.includes('serif')) {
      fonts.heading = 'Playfair Display';
      changesDesc.push('applied premium Serif heading typography');
    }
    if (text.includes('sans') || text.includes('modern font')) {
      fonts.heading = 'Outfit';
      changesDesc.push('applied modern Sans-Serif heading typography');
    }
    if (text.includes('outfit')) {
      fonts.heading = 'Outfit';
      changesDesc.push('heading font set to Outfit');
    }
    if (text.includes('roboto')) {
      fonts.heading = 'Roboto';
      changesDesc.push('heading font set to Roboto');
    }
    if (text.includes('inter')) {
      fonts.heading = 'Inter';
      changesDesc.push('heading font set to Inter');
    }

    if (text.includes('slider hero') || text.includes('hero slider') || text.includes('carousel hero')) {
      updatedSections = updatedSections.map(s => s.id === 'hero' ? { ...s, style: 'slider' } : s);
      changesDesc.push('hero banner changed to slider carousel');
    }
    if (text.includes('video hero') || text.includes('hero video')) {
      updatedSections = updatedSections.map(s => s.id === 'hero' ? { ...s, style: 'video' } : s);
      changesDesc.push('hero banner changed to video background');
    }
    if (text.includes('magazine hero')) {
      updatedSections = updatedSections.map(s => s.id === 'hero' ? { ...s, style: 'magazine' } : s);
      changesDesc.push('hero layout changed to magazine editorial');
    }

    if (text.includes('list product') || text.includes('product list')) {
      updatedSections = updatedSections.map(s => s.id === 'product' ? { ...s, style: 'editorial_list' } : s);
      changesDesc.push('products grid layout changed to editorial list');
    }
    if (text.includes('minimal product') || text.includes('product grid minimal')) {
      updatedSections = updatedSections.map(s => s.id === 'product' ? { ...s, style: 'grid_minimal' } : s);
      changesDesc.push('products grid changed to minimal grid');
    }

    if (text.includes('inverted navbar') || text.includes('dark navbar')) {
      updatedNav = 'dark_mode_inverted';
      changesDesc.push('navbar menu changed to dark mode inverted');
    }
    if (text.includes('glass navbar') || text.includes('glassmorphic navbar')) {
      updatedNav = 'glassmorphic_sticky';
      changesDesc.push('navbar style set to glassmorphic sticky');
    }

    if (changesDesc.length > 0) {
      updatedThemeName = `Theme #${themes.length + 1} (${text.includes('dark') ? 'Dark' : 'Custom'} Remix)`;
    }

    return {
      success: changesDesc.length > 0,
      palette,
      fonts,
      sections: updatedSections,
      nav: updatedNav,
      footer: updatedFooter,
      themeName: updatedThemeName,
      summary: changesDesc.join(', ')
    };
  };

  const keyColorName = (hex: string) => {
    const colorNames: Record<string, string> = {
      '#ef4444': 'red', '#3b82f6': 'blue', '#10b981': 'emerald green',
      '#a855f7': 'purple', '#8b5cf6': 'violet', '#f97316': 'orange',
      '#f59e0b': 'amber', '#eab308': 'yellow', '#ec4899': 'pink',
      '#f43f5e': 'rose', '#6366f1': 'indigo', '#090d16': 'black',
      '#ffffff': 'white', '#475569': 'slate', '#d97706': 'gold',
      '#06b6d4': 'cyan', '#0d9488': 'teal',
      '#800000': 'maroon', '#000080': 'navy', '#00ff00': 'lime',
      '#a52a2a': 'brown', '#808080': 'gray', '#c0c0c0': 'silver',
      '#808000': 'olive', '#ff00ff': 'magenta', '#00ffff': 'aqua',
      '#dc143c': 'crimson', '#f5f5dc': 'beige', '#e6e6fa': 'lavender',
      '#ff7f50': 'coral', '#ffdab9': 'peach', '#dda0dd': 'plum'
    };
    return colorNames[hex.toLowerCase()] || hex;
  };

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    const userMsg = aiPrompt.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiPrompt('');
    setAiLoading(true);

    const currentPalette = customPalette || {
      primary: '#6366f1',
      secondary: '#10b981',
      accent: '#6366f1',
      background: '#ffffff',
      text: '#1f2937',
      card: '#f9fafb',
      muted: '#6b7280'
    };

    const currentFonts = customFonts || {
      heading: 'Inter',
      body: 'Inter'
    };

    const cleanMsg = userMsg.toLowerCase().trim().replace(/[?!.,]/g, '');
    const greetings = ['hi', 'hii', 'hiii', 'hello', 'hey', 'greetings', 'sup', 'yo', 'good morning', 'good afternoon', 'good evening', 'namaste', 'helo'];
    
    if (greetings.some(g => cleanMsg === g || cleanMsg.startsWith(g + ' '))) {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Hello! How can I help you customize your store theme today? You can ask me to change navbar colors, make buttons rounded, use serif heading fonts, or swap homepage layouts!" 
      }]);
      setAiLoading(false);
      return;
    }

    const helpers = ['help', 'what can you do', 'how to use', 'commands', 'features'];
    if (helpers.some(h => cleanMsg.includes(h))) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: "I can customize your store layout instantly! Try asking me:\n- 'change navbar to maroon color'\n- 'make buttons orange'\n- 'use serif font'\n- 'change hero layout to slider'"
      }]);
      setAiLoading(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      console.log("Querying Nemotron-3...");
      const response = await fetch("/api/nvidia/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer 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",
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "nvidia/nemotron-3-ultra-550b-a55b",
          messages: [
            {
              role: "system",
              content: `You are an expert e-commerce theme layout customization engine. Your task is to apply user layout request on the current settings and return ONLY a JSON response matching the specifications below.
Do not output markdown codeblock ticks (like \`\`\`json) or any explanation. Output raw JSON only.

CURRENT CONFIGURATION:
- Palette: ${JSON.stringify(currentPalette)}
- Fonts: ${JSON.stringify(currentFonts)}
- Sections: ${JSON.stringify(sections)}
- Nav Style: "${navStyle}"
- Footer Style: "${footerStyle}"
- Theme Name: "${themeName}"

RULES:
1. Palette update: If user requests colors like maroon, navy, custom hex codes, etc. set them directly to "primary", "accent", "background", "text", "card", or "muted" in palette. Specifically, if they ask to customize the navbar or header color, set the "navbar_bg" property in palette to that color value.
- If they ask to customize the navbar or header FONT, TEXT, LINK, or ICON color, set the "navbar_fg" property in palette.
- If they ask to make the navbar font/text bold, set the "navbar_bold" property in palette to true (boolean).
2. Fonts update: Set "heading" and "body" font properties as requested (e.g. "Playfair Display" for serif, "Outfit" for modern sans-serif).
3. Do NOT add or insert new items to "sections". Do NOT delete items. Keep the original length and elements of "sections". Only update the "style" property of the existing items if requested.
4. "nav" style can be set to NAV_VARIANTS if requested.
5. "footer" style can be set to FOOTER_STYLES if requested.

OUTPUT FORMAT:
{
  "palette": {
    "primary": "string (color name or hex)",
    "secondary": "string (color name or hex)",
    "accent": "string (color name or hex)",
    "background": "string (color name or hex)",
    "text": "string (color name or hex)",
    "card": "string (color name or hex)",
    "muted": "string (color name or hex)",
    "navbar_bg": "string (color name or hex)",
    "navbar_fg": "string (color name or hex)",
    "navbar_bold": "boolean"
  },
  "fonts": {
    "heading": "string",
    "body": "string"
  },
  "sections": [
    { "id": "string", "label": "string", "enabled": true/false, "style": "string" }
  ],
  "nav": "string",
  "footer": "string",
  "themeName": "string",
  "summary": "Short description of changes applied"
}`
            },
            { role: "user", content: userMsg }
          ],
          temperature: 0.2,
          max_tokens: 2048
        })
      });

      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim() || '';
      const cleanContent = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsedResult = JSON.parse(cleanContent);

      if (parsedResult.palette) setCustomPalette(parsedResult.palette);
      if (parsedResult.fonts) setCustomFonts(parsedResult.fonts);
      
      if (Array.isArray(parsedResult.sections)) {
        const validatedSections = sections.map(original => {
          const match = parsedResult.sections.find((p: any) => p.id === original.id);
          return {
            ...original,
            enabled: match ? !!match.enabled : original.enabled,
            style: match && typeof match.style === 'string' ? match.style : original.style
          };
        });
        setSections(validatedSections);
      }
      
      if (parsedResult.nav) setNavStyle(parsedResult.nav);
      if (parsedResult.footer) setFooterStyle(parsedResult.footer);
      if (parsedResult.themeName) setThemeName(parsedResult.themeName);
      
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I have updated your layout settings using NVIDIA Nemotron-3: ${parsedResult.summary || 'Applied customizations'}. You can see it live on the preview canvas!` 
      }]);
      toast.success("AI updated layout styling using Nemotron-3!");
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        console.log("Fetch request aborted by user.");
        return;
      }
      console.warn("Nemotron request failed:", err);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I encountered an issue updating your settings. Please try again!" 
      }]);
      toast.error("NVIDIA Customizer error.");
    } finally {
      setAiLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleApply = async () => {
    setIsSaving(true);
    const customThemeId = `custom-theme-${Date.now()}`;
    
    try {
      const { data: ver } = await supabase
        .from('theme_master_versions')
        .select('files_manifest')
        .eq('theme_id', 'theme-style-1')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!ver?.files_manifest) throw new Error("Base theme manifest not found");

      const cleanUspStyle = (val: string) => {
        if (val.includes("classic")) return "classic";
        if (val.includes("minimal_center")) return "minimal_center";
        if (val.includes("left_border")) return "left_border_columns";
        if (val.includes("card")) return "card_style";
        if (val.includes("compact")) return "compact_banner";
        if (val.includes("accent")) return "accent_row";
        return "classic";
      };

      const manifest = JSON.parse(JSON.stringify(ver.files_manifest));
      manifest.header_style = navStyle;
      manifest.footer_style = footerStyle;
      
      if (customPalette) {
        manifest.dna = manifest.dna || {};
        manifest.dna.palette = { ...manifest.dna.palette, ...customPalette };
      }
      if (customFonts) {
        manifest.dna = manifest.dna || {};
        manifest.dna.fonts = { ...manifest.dna.fonts, ...customFonts };
      }

      if (manifest.pages?.home?.sections) {
        // Build sections for every configured page, not just home.
        // For each page we take the base manifest section (if present) and apply the
        // user's enabled/style choices from the `pages` state. Falls back to a
        // minimal { type, props.style } stub when the base manifest lacks the section.
        manifest.pages = manifest.pages || {};
        const baseHome = manifest.pages.home?.sections || [];

        for (const pageKey of Object.keys(pages)) {
          const pageSections = pages[pageKey] || [];
          const baseSections = manifest.pages[pageKey]?.sections ?? baseHome;

          manifest.pages[pageKey] = manifest.pages[pageKey] || {};
          manifest.pages[pageKey].sections = pageSections
            .filter((s: any) => s.enabled)
            .map((s: any) => {
              let matchType = s.id;
              if (s.id === 'product') matchType = 'product_grid';
              if (s.id === 'category') matchType = 'category_grid';
              if (s.id === 'promo') matchType = 'promo_banner';
              if (s.id === 'usp_strip') matchType = 'usp_strip';
              if (s.id === 'new_arrivals') matchType = 'new_arrivals';

              let match = baseSections.find((b: any) => b.type === matchType);

              if (!match) {
                if (matchType === 'new_arrivals') {
                  const pGrid = baseSections.find((b: any) => b.type === 'product_grid');
                  if (pGrid) {
                    match = JSON.parse(JSON.stringify(pGrid));
                    match.type = 'new_arrivals';
                  }
                } else if (matchType === 'usp_strip') {
                  match = {
                    type: 'usp_strip',
                    props: {
                      title: 'Why Shop With Us',
                      items: [
                        { icon: 'Shield', title: 'Secured Checkout', sub: 'SSL Certified Payment Methods' },
                        { icon: 'Truck', title: 'Free Global Shipping', sub: 'On orders over $50' },
                        { icon: 'RefreshCw', title: 'Easy returns', sub: '30-day refund window policy' }
                      ]
                    }
                  };
                }
              }

              if (match) {
                const cloned = JSON.parse(JSON.stringify(match));
                cloned.props = cloned.props || {};
                cloned.props.style = s.id === 'usp_strip' ? cleanUspStyle(s.style) : s.style;
                return cloned;
              }

              return {
                type: matchType,
                props: {
                  style: s.id === 'usp_strip' ? cleanUspStyle(s.style) : s.style
                }
              };
            });
        }
      }

      const customThemeName = themeName.trim() || `Theme #${themes.length + 1} (Custom Remix)`;
      
      const { data: newProj, error: errProj } = await supabase
        .from('theme_master_projects')
        .insert({
          theme_id: customThemeId,
          name: customThemeName,
          description: `Custom layout designed using AI Theme Builder.`,
          category: data.category || 'general',
          preview_image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&auto=format&fit=crop&q=60',
          is_active: true,
          is_default: false
        })
        .select()
        .single();

      if (errProj) throw errProj;

      const { error: errVer } = await supabase
        .from('theme_master_versions')
        .insert({
          theme_id: customThemeId,
          version: 1,
          files_manifest: manifest
        });

      if (errVer) throw errVer;

      setData(d => ({
        ...d,
        selectedThemeId: customThemeId,
        customThemeConfig: {
          nav: navStyle,
          footer: footerStyle,
          sections: pages.home ?? sections,
          pages,
          palette: customPalette,
          fonts: customFonts,
          name: customThemeName
        }
      }));

      queryClient.invalidateQueries({ queryKey: ['onboarding-theme-masters'] });
      toast.success(`Theme "${customThemeName}" created and applied successfully!`);
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(`Error saving custom theme: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setSections(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (index === sections.length - 1) return;
    setSections(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  const toggleSection = (index: number) => {
    if (sections[index]?.compulsive) return;
    setSections(prev => prev.map((s, idx) => idx === index ? { ...s, enabled: !s.enabled } : s));
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    setSections(prev => {
      const copy = [...prev];
      const draggedItem = copy[draggedIndex];
      copy.splice(draggedIndex, 1);
      copy.splice(targetIndex, 0, draggedItem);
      return copy;
    });
    setDraggedIndex(null);
    toast.success('Section order updated!');
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const colors = { primary: '#6366f1', secondary: '#10b981', text: '#1f2937', bg: '#ffffff', cardBg: '#f9fafb' };
  const placeholderImg = "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&auto=format&fit=crop&q=60";

  const NAV_VARIANTS = [
    { value: "classic", label: "Classic" },
    { value: "centered_logo", label: "Centered Logo" },
    { value: "minimal_thin", label: "Minimal Thin" },
    { value: "bold_serif", label: "Bold Serif" },
    { value: "glassmorphic_sticky", label: "Glassmorphic Sticky" },
    { value: "split_menu", label: "Split Menu" },
    { value: "left_align_all", label: "Left Align All" },
    { value: "double_deck", label: "Double Deck" },
    { value: "dark_mode_inverted", label: "Dark Mode Inverted" },
    { value: "minimal_icons_only", label: "Minimal Icons Only" },
    { value: "bordered_links", label: "Bordered Links" },
    { value: "sidebar_drawer", label: "Sidebar Drawer" },
    { value: "gradient_glow", label: "Gradient Glow" },
    { value: "floating_pill", label: "Floating Pill" },
    { value: "sidebar_glass_left", label: "Sidebar Glass Left" },
    { value: "sidebar_minimal_dark", label: "Sidebar Minimal Dark" },
    { value: "sidebar_split_double", label: "Sidebar Split Double" },
    { value: "sidebar_full_overlay", label: "Sidebar Full Overlay" },
    { value: "sidebar_accent_panel", label: "Sidebar Accent Panel" }
  ];

  const HERO_STYLES = [
    { value: "centered", label: "Centered Text" },
    { value: "fixed", label: "Fixed Container" },
    { value: "half_banner", label: "Half Banner" },
    { value: "split", label: "Split Grid" },
    { value: "fullscreen_image", label: "Fullscreen Cover" },
    { value: "video", label: "Video Mock" },
    { value: "magazine", label: "Magazine Style" },
    { value: "editorial_serif", label: "Editorial Serif" },
    { value: "minimal_left", label: "Minimal Left" },
    { value: "asymmetric", label: "Asymmetric Split" },
    { value: "gradient", label: "Gradient Glow" },
    { value: "slider", label: "Carousel Slider" },
    { value: "floating_card", label: "Floating Deal Card" },
    { value: "split_column", label: "Split Column" },
    { value: "dual_image", label: "Dual Images" },
    { value: "minimal_stripe", label: "Minimalist Stripe" },
    { value: "left_sticky", label: "Left Sticky Hero" },
    { value: "parallax_underlay", label: "Parallax Underlay" },
    { value: "circle_mask", label: "Circle Mask Accent" }
  ];

  const USP_STYLES = [
    { value: "classic", label: "Classic Columns" },
    { value: "minimal_center", label: "Minimal Centered Grid" },
    { value: "left_border_columns", label: "Left Border Columns" },
    { value: "card_style", label: "Shadow Grid Cards" },
    { value: "compact_banner", label: "Compact Banner Stripe" },
    { value: "accent_row", label: "Accent Color Row" },
    { value: "classic_2", label: "Subtle Dividers" },
    { value: "minimal_center_2", label: "Minimal Centered Accent" },
    { value: "left_border_2", label: "Left Accent Lines" },
    { value: "card_2", label: "Glassmorphic Cards" },
    { value: "compact_2", label: "Gradient Stripe" },
    { value: "accent_2", label: "Accent Border Outline" },
    { value: "classic_3", label: "Clean 3 Column Row" },
    { value: "minimal_3", label: "Dark Background Grid" },
    { value: "left_border_3", label: "Triple Deck Dividers" },
    { value: "card_3", label: "Thick Border Cards" },
    { value: "compact_3", label: "Split Columns Grid" },
    { value: "accent_3", label: "Glow Highlights Accent" },
    { value: "modern_minimal", label: "Modern Thin Grid Rows" }
  ];

  const CATEGORY_STYLES = [
    { value: "grid_4", label: "Grid 4 Column" },
    { value: "carousel_strip", label: "Carousel Strip" },
    { value: "circles", label: "Rounded Circles" },
    { value: "big_feature", label: "Big Feature Tile" },
    { value: "masonry", label: "Masonry Grid" },
    { value: "mosaic_2x2", label: "Mosaic 2x2" },
    { value: "minimal_pills", label: "Minimal Pills" },
    { value: "floating_cards_shadow", label: "Floating Shadow Cards" },
    { value: "gradient_tiles", label: "Gradient Tiles" },
    { value: "hover_reveal", label: "Hover Reveal Text" },
    { value: "list_with_arrow", label: "Simple List" },
    { value: "two_column_split", label: "Two Column Split" },
    { value: "badge_with_counters", label: "Counter Badges" },
    { value: "bordered_outline", label: "Bordered Outlines" },
    { value: "skewed_slats", label: "Skewed Slats" },
    { value: "dark_editorial", label: "Dark Editorial" },
    { value: "asymmetric_scatter", label: "Asymmetric Scatter" },
    { value: "rounded_octagon", label: "Rounded Octagon Tiles" },
    { value: "modern_tabs", label: "Modern Tabs Navigation" }
  ];

  const PRODUCT_STYLES = [
    { value: "grid_clean", label: "Clean Border Grid" },
    { value: "grid_minimal", label: "Minimal Grid" },
    { value: "editorial_list", label: "Editorial List" },
    { value: "carousel_slider", label: "Carousel Slider" },
    { value: "card_shadow", label: "Card Shadows" },
    { value: "bold_borders", label: "Bold Borders" },
    { value: "horizontal_card", label: "Horizontal Rows" },
    { value: "minimalist_under", label: "Minimalist Details Under" },
    { value: "masonry_products", label: "Masonry Heights" },
    { value: "overlay_details", label: "Overlay Details Hover" },
    { value: "badge_highlight", label: "Badge Highlight" },
    { value: "two_column_split", label: "Two Column Split" },
    { value: "list_compact", label: "Compact List" },
    { value: "gradient_back", label: "Gradient Background" },
    { value: "vintage_polaroid", label: "Vintage Polaroid Cards" },
    { value: "lookbook_hover", label: "Lookbook Hover Trigger" },
    { value: "skeuomorphic_card", label: "Skeuomorphic Board" },
    { value: "pinterest_board", label: "Pinterest Board Columns" },
    { value: "accent_borders", label: "Accent Color Borders" }
  ];

  const PROMO_STYLES = [
    { value: "classic_split", label: "Classic Split" },
    { value: "fullscreen_bg", label: "Fullscreen Background" },
    { value: "minimalist_strip", label: "Minimalist Strip" },
    { value: "gradient_accent", label: "Gradient Accent Accent" },
    { value: "floating_glass", label: "Floating Glass" },
    { value: "split_diagonal", label: "Split Diagonal Accent" },
    { value: "video_mock", label: "Video Mock Template" },
    { value: "editorial_full", label: "Editorial Full Panel" },
    { value: "bold_text_only", label: "Bold Text Only Title" },
    { value: "banner_carousel", label: "Banners Carousel" },
    { value: "glassmorphic_blur", label: "Glassmorphic Blur Overlay" },
    { value: "split_asymmetric", label: "Split Asymmetric" },
    { value: "layered_accent", label: "Layered Accent Panel" },
    { value: "bordered_thin", label: "Bordered Thin Frame" },
    { value: "grid_staggered", label: "Grid Staggered Layout" },
    { value: "dark_bold", label: "Dark Bold Colors" },
    { value: "minimal_clean", label: "Minimal Clean Banner" },
    { value: "angled_skew", label: "Angled Skew Slabs" },
    { value: "geometric_blocks", label: "Geometric Color Blocks" }
  ];

  const FOOTER_STYLES = [
    { value: "classic", label: "Classic Multi-column" },
    { value: "centered_socials", label: "Centered Social Icons" },
    { value: "minimal_thin", label: "Minimal Thin Row" },
    { value: "three_col_grid", label: "Three Column Grid" },
    { value: "bold_brand", label: "Bold Brand Typography" },
    { value: "split_links_right", label: "Split Links Right" },
    { value: "double_deck", label: "Double Deck Row" },
    { value: "dark_inverted", label: "Dark Inverted Background" },
    { value: "accent_strip", label: "Accent Colored Strip" },
    { value: "bordered_outline", label: "Bordered Outline Box" },
    { value: "floating_pill", label: "Floating Pill Row" },
    { value: "card_grid", label: "Card Grid Clusters" },
    { value: "gradient_glow", label: "Gradient Glow Bar" },
    { value: "minimalist_dark", label: "Minimalist Dark Slate" },
    { value: "glassmorphic_blur", label: "Glassmorphic Blur" },
    { value: "asymmetric_stagger", label: "Asymmetric Stagger Footer" },
    { value: "sidebar_extended", label: "Sidebar Extended" },
    { value: "split_double", label: "Split Double Bottom" },
    { value: "modern_minimal", label: "Modern Minimal White" }
  ];

  const selectorMap = {
    nav: { title: "Navbar Styles", options: NAV_VARIANTS },
    hero: { title: "Hero Banners", options: HERO_STYLES },
    usp_strip: { title: "Features / USP Styles", options: USP_STYLES },
    category: { title: "Category Listings", options: CATEGORY_STYLES },
    product: { title: "Product Grids", options: PRODUCT_STYLES },
    new_arrivals: { title: "New Arrivals Styles", options: PRODUCT_STYLES },
    promo: { title: "Promo Banners", options: PROMO_STYLES },
    footer: { title: "Footer Layouts", options: FOOTER_STYLES },
  };

  const sectionsQuery = sections
    .filter(s => s.enabled)
    .map(s => `${s.id}:${s.style}`)
    .join(',');

  const paletteQuery = customPalette 
    ? `&palette_primary=${encodeURIComponent(customPalette.primary)}&palette_accent=${encodeURIComponent(customPalette.accent)}&palette_bg=${encodeURIComponent(customPalette.background)}&palette_fg=${encodeURIComponent(customPalette.text)}&palette_navbar_bg=${encodeURIComponent(customPalette.navbar_bg || '')}`
    : '';
  
  const fontQuery = customFonts
    ? `&font_heading=${encodeURIComponent(customFonts.heading)}&font_body=${encodeURIComponent(customFonts.body)}`
    : '';

  // Preview URL — when editing a non-home page we point the iframe at that page's
  // storefront route so the merchant sees the sections they're configuring live.
  const previewPage = activePage === 'home' ? '' : activePage === 'shop' ? 'shop' : '';
  const basePath = previewPage ? `/store/${data.slug}/${previewPage}` : `/store/${data.slug}`;
  const previewUrl = `${basePath}?preview=owner&preview_theme=theme-style-1&preview_custom=1&nav=${navStyle}&footer=${footerStyle}&sections=${sectionsQuery}${paletteQuery}${fontQuery}&page=${activePage}`;

  return (
    <div className="fixed inset-0 z-50 flex bg-background/98 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      
      {/* Left Column: Live Storefront Iframe Preview */}
      <div className="flex-1 h-full bg-slate-900/40 relative border-r border-border min-w-[320px] flex flex-col">
        <div className="p-4 bg-background border-b border-border flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-extrabold tracking-widest text-primary uppercase">{(PAGE_TABS.find(t => t.id === activePage)?.label || 'Home')} Preview Canvas</span>
            <h2 className="text-xs text-muted-foreground mt-0.5">Real-time storefront rendering</h2>
          </div>
        </div>
        
        {/* Real Storefront Iframe */}
        <div className="flex-1 w-full bg-slate-100 relative">
          <iframe
            key={`${activePage}-${navStyle}-${footerStyle}-${sectionsQuery}-${JSON.stringify(customPalette)}-${JSON.stringify(customFonts)}`}
            src={previewUrl}
            className="w-full h-full border-none bg-white"
            title="Custom Store Preview"
          />

          {/* AI Chatbox Overlay inside preview panel */}
          {showAIChat && (
            <div 
              style={{
                transform: `translate(${chatPosition.x}px, ${chatPosition.y}px)`,
                cursor: isDragging ? 'grabbing' : 'default'
              }}
              className="absolute bottom-6 right-6 w-[340px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col z-40 overflow-hidden animate-in slide-in-from-bottom-5 duration-300 select-text"
            >
              <div 
                onMouseDown={handleMouseDown}
                className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
              >
                <div className="flex items-center gap-1.5 pointer-events-none">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">AI Customizer Assistant</span>
                </div>
                <button 
                  onClick={() => setShowAIChat(false)}
                  className="text-slate-400 hover:text-white transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex-1 max-h-[220px] overflow-y-auto p-4 space-y-3 scrollbar-thin text-left">
                {chatMessages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "p-2.5 rounded-xl text-xs max-w-[85%] leading-normal font-medium shadow-xs",
                      msg.role === 'user' 
                        ? "bg-primary text-primary-foreground ml-auto rounded-tr-none text-right" 
                        : "bg-slate-800 text-slate-200 mr-auto rounded-tl-none text-left"
                    )}
                  >
                    {msg.content}
                  </div>
                ))}
                {aiLoading && (
                  <div className="bg-slate-800 text-slate-400 mr-auto rounded-tl-none p-2.5 rounded-xl text-xs max-w-[85%] flex items-center justify-between gap-3 w-full border border-slate-700/50">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
                      <span>Updating colors...</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelAI}
                      className="text-[9px] font-bold text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/60 border border-rose-800/40 rounded px-1.5 py-0.5 transition shrink-0 uppercase tracking-wider"
                    >
                      Stop
                    </button>
                  </div>
                )}
              </div>

              <form onSubmit={handleAISubmit} className="p-2 border-t border-slate-800 bg-slate-950/40 flex items-center gap-1.5">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. dark mode, orange buttons, serif fonts..."
                  className="flex-1 bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
                <Button 
                  type="submit" 
                  disabled={!aiPrompt.trim() || aiLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-bold"
                >
                  Apply
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Selector Panel */}
      <div className="w-[400px] shrink-0 h-full flex flex-col bg-card border-l border-border text-left shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold tracking-tight">Theme Designer</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Customize each page's sections & styles</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAIChat(prev => !prev)}
              className="h-8 text-[10px] font-bold text-primary flex items-center gap-1 hover:bg-primary/5 rounded-lg border-primary/20 bg-primary/[0.02]"
            >
              <Sparkles className="h-3.5 w-3.5 animate-pulse" /> AI Customizer
            </Button>
            <button 
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-muted transition text-muted-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeSelector === null ? (
            <div className="space-y-3">
              
              {/* Naming block */}
              <div className="space-y-1.5 p-3.5 rounded-xl border border-border/80 bg-slate-50/50">
                <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest block">Theme Project Name</label>
                <input
                  type="text"
                  value={themeName}
                  onChange={(e) => setThemeName(e.target.value)}
                  placeholder="e.g. Luxury Dark, Neon Remix"
                  className="w-full bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-bold focus:outline-none focus:border-primary"
                />
              </div>

              {/* Global header/footer — these are store-wide, not per-page */}
              <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Global Layout</span>
              {/* Header Navbar - Compulsory */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-between transition">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Header / Navbar <span className="text-[9px] text-primary ml-1">(Global)</span></h4>
                  <p className="text-[10px] text-primary font-medium mt-0.5 capitalize">{navStyle.replace(/_/g, ' ')}</p>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveSelector('nav')}
                  className="h-7 text-[10px] font-bold text-primary px-2 hover:bg-primary/10 rounded-md"
                >
                  Change
                </Button>
              </div>

              {/* Footer Layout - Compulsory */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-between transition">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Footer Layout <span className="text-[9px] text-primary ml-1">(Global)</span></h4>
                  <p className="text-[10px] text-primary font-medium mt-0.5 capitalize">{footerStyle.replace(/_/g, ' ')}</p>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveSelector('footer')}
                  className="h-7 text-[10px] font-bold text-primary px-2 hover:bg-primary/10 rounded-md"
                >
                  Change
                </Button>
              </div>

              {/* Page Tabs */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest">Page Sections</span>
                  <span className="text-[10px] text-muted-foreground">
                    Editing: <span className="font-bold text-foreground">{PAGE_TABS.find(t => t.id === activePage)?.label || activePage}</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {PAGE_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activePage === tab.id;
                    const isEnabled = VISIBLE_PAGE_TAB_IDS.includes(tab.id);
                    if (!isEnabled) return null;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActivePage(tab.id)}
                        className={cn(
                          "text-[10px] font-bold px-2.5 py-1.5 rounded-md border transition flex items-center gap-1",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground/80 border-border/60 hover:border-primary/40"
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Middle Reorderable Sections */}
              {sections.map((s, idx) => (
                <div 
                  key={s.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "p-3.5 rounded-xl border flex items-center justify-between transition gap-2 cursor-grab active:cursor-grabbing",
                    s.enabled ? "border-border/80 bg-card hover:bg-slate-50/40" : "border-border/30 bg-muted/5 opacity-50",
                    draggedIndex === idx && "opacity-40 border-primary border-dashed bg-primary/5"
                  )}
                >
                  <div className="flex items-center">
                    {/* Drag Grip Handle */}
                    <div className="text-slate-400 hover:text-slate-600 transition shrink-0 mr-1.5 flex items-center">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    {/* Up/Down buttons for order */}
                    <div className="flex flex-col gap-0.5 mr-2.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveUp(idx)}
                        className="text-[9px] hover:bg-muted p-0.5 rounded text-slate-500 disabled:opacity-30"
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={idx === sections.length - 1}
                        onClick={() => moveDown(idx)}
                        className="text-[9px] hover:bg-muted p-0.5 rounded text-slate-500 disabled:opacity-30"
                        title="Move Down"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Toggle Checkbox */}
                    {s.compulsive ? (
                      <input
                        type="checkbox"
                        checked={true}
                        disabled={true}
                        className="mr-3 h-3.5 w-3.5 rounded border-gray-300 text-primary opacity-60 cursor-not-allowed shrink-0"
                        title="This section is required"
                      />
                    ) : (
                      <input
                        type="checkbox"
                        checked={s.enabled}
                        onChange={() => toggleSection(idx)}
                        className="mr-3 h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                        title="Enable/Disable Section"
                      />
                    )}

                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        {s.label}
                        {s.compulsive && <span className="text-[9px] text-primary">(Required)</span>}
                      </h4>
                      <p className="text-[10px] text-primary font-medium mt-0.5 capitalize">{s.style.replace(/_/g, ' ')}</p>
                    </div>
                  </div>

                  {s.enabled && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setActiveSelector(s.id as any)}
                      className="h-7 text-[10px] font-bold text-primary px-2 hover:bg-primary/10 rounded-md"
                    >
                      Change
                    </Button>
                  )}
                </div>
              ))}

            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <Button 
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveSelector(null)}
                  className="h-7 text-[10px] font-bold text-muted-foreground hover:bg-muted px-2.5 rounded-md flex items-center gap-1"
                >
                  ← Back to Sections
                </Button>
                <span className="text-xs font-black uppercase text-foreground">
                  {selectorMap[activeSelector].title}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3.5 pt-2">
                {selectorMap[activeSelector].options.map((opt, idx) => {
                  const isCurrent = activeSelector === 'nav' 
                    ? navStyle === opt.value 
                    : (activeSelector === 'footer' 
                      ? footerStyle === opt.value 
                      : sections.find(s => s.id === activeSelector)?.style === opt.value);
                  return (
                    <div 
                      key={opt.value}
                      onClick={() => {
                        if (activeSelector === 'nav') {
                          setNavStyle(opt.value);
                        } else if (activeSelector === 'footer') {
                          setFooterStyle(opt.value);
                        } else {
                          setSections(prev => prev.map(s => s.id === activeSelector ? { ...s, style: opt.value } : s));
                        }
                        setActiveSelector(null);
                        toast.success(`Updated ${activeSelector} style!`);
                      }}
                      className={cn(
                        "rounded-xl border p-2.5 cursor-pointer bg-card transition flex flex-col gap-2 relative shadow-xs",
                        isCurrent
                          ? "border-primary ring-2 ring-primary/10 bg-primary/[0.02]"
                          : "border-border/60 hover:border-primary/30"
                      )}
                    >
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-bold text-slate-800">{idx + 1}. {opt.label}</span>
                        {isCurrent && <span className="text-[9px] font-extrabold text-primary uppercase">Active</span>}
                      </div>
                      
                      {/* Sub-component preview render */}
                      <CustomThemeComponentPreview type={activeSelector === 'nav' ? 'navbar' : (activeSelector === 'usp_strip' ? 'promo' : activeSelector)} variant={opt.value} imageUrl={placeholderImg} colors={colors} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {activeSelector === null && (
          <div className="p-5 border-t border-border bg-muted/10 space-y-2">
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 border-2 border-primary text-primary hover:bg-primary/5 font-extrabold text-xs py-2.5 h-10 rounded-lg transition"
            >
              <Eye className="h-4 w-4" /> Live Fullscreen Experience
            </a>
            <Button
              type="button"
              disabled={isSaving}
              onClick={handleApply}
              className="w-full bg-primary text-primary-foreground font-black text-xs py-3 h-10 shadow-md hover:bg-primary/95 rounded-lg flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving Remix...
                </>
              ) : (
                'Apply Custom Theme & Save'
              )}
            </Button>
          </div>
        )}

      </div>

    </div>
  );
};

export default StepTheme;
