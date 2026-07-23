import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useThemeManifest } from '@/hooks/useThemeManifest';
import { getStorefrontConfig, getStoreThemeId, buildResolvedStorefrontManifest } from '@/lib/storefrontManifest';
import { 
  Save, RotateCcw, Upload, Trash2, Image as ImageIcon, Flame, 
  Sparkles, Eye, Layers, Settings, ArrowRight, X, Search, Filter, Plus, ListChecks,
  Heading, PanelBottom, Instagram, Facebook, Twitter, Youtube, Link as LinkIcon
} from 'lucide-react';

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero Banner',
  category_grid: 'Shop by Category',
  featured_products: 'Featured Collection',
  usp_strip: 'Trust Badges',
  promo_banner: 'Promo Banner',
  trending: 'Trending Selection',
  new_arrivals: 'New Arrivals',
};

const iconEmojiMap: Record<string, string> = {
  truck: '🚚',
  shield: '🔒',
  refresh: '🔄',
  headphones: '🎧',
  percent: '🏷️',
  clock: '⏰',
  heart: '❤️',
  star: '⭐',
};

// Map valid styles for each section type to options
const SECTION_STYLE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  hero: [
    { value: 'centered', label: 'Centered Overlay' },
    { value: 'fullscreen_image', label: 'Fullscreen Image' },
    { value: 'half_banner', label: 'Half Banner Layout' },
    { value: 'magazine', label: 'Magazine Editorial' },
    { value: 'magazine_serif', label: 'Magazine Serif' },
    { value: 'asymmetric', label: 'Asymmetric Split' },
    { value: 'video', label: 'Video Background' },
    { value: 'gradient', label: 'Mesh Gradient' },
    { value: 'split', label: '50/50 Split Image' },
    { value: 'circle_mask', label: 'Circle Mask Accent' },
    { value: 'holographic_3d', label: 'Holographic 3D (Premium)' },
    { value: 'liquid_metal', label: 'Liquid Metal 3D (Premium)' },
    { value: 'neon_botanical', label: 'Neon Botanical 3D (Premium)' },
  ],
  category_grid: [
    { value: 'grid_4', label: '4-Column Grid' },
    { value: 'circles', label: 'Circular Avatar Badges' },
    { value: 'floating_orbs', label: 'Floating Orbs Layout' },
    { value: 'carousel_strip', label: 'Horizontal Carousel' },
    { value: 'modern_tabs', label: 'Modern Tabs cards' },
  ],
  product_grid: [
    { value: 'grid_clean', label: 'Clean Layout Grid' },
    { value: 'editorial_list', label: 'Editorial Product Row' },
    { value: 'carousel_strip', label: 'Horizontal Carousel' },
    { value: 'accent_borders', label: 'Soft Accent Borders' },
    { value: 'bold_borders', label: 'Bold Editorial Borders' },
    { value: 'card_shadow', label: 'Card Shadow Hover' },
  ],
  trending: [
    { value: 'grid_clean', label: 'Clean Layout Grid' },
    { value: 'editorial_list', label: 'Editorial Product Row' },
    { value: 'carousel_strip', label: 'Horizontal Carousel' },
    { value: 'accent_borders', label: 'Soft Accent Borders' },
    { value: 'bold_borders', label: 'Bold Editorial Borders' },
    { value: 'card_shadow', label: 'Card Shadow Hover' },
  ],
  featured_products: [
    { value: 'grid_clean', label: 'Clean Layout Grid' },
    { value: 'editorial_list', label: 'Editorial Product Row' },
    { value: 'carousel_strip', label: 'Horizontal Carousel' },
    { value: 'accent_borders', label: 'Soft Accent Borders' },
    { value: 'bold_borders', label: 'Bold Editorial Borders' },
    { value: 'card_shadow', label: 'Card Shadow Hover' },
  ],
  new_arrivals: [
    { value: 'grid_clean', label: 'Clean Layout Grid' },
    { value: 'editorial_list', label: 'Editorial Product Row' },
    { value: 'carousel_strip', label: 'Horizontal Carousel' },
    { value: 'accent_borders', label: 'Soft Accent Borders' },
    { value: 'bold_borders', label: 'Bold Editorial Borders' },
    { value: 'card_shadow', label: 'Card Shadow Hover' },
  ],
  usp_strip: [
    { value: 'classic', label: 'Classic Row Layout' },
    { value: 'minimal_center', label: 'Minimal Center Alignment' },
    { value: 'left_border_columns', label: 'Border Columns' },
    { value: 'card_style', label: 'Card Blocks Grid' },
    { value: 'compact_banner', label: 'Compact Banner Row' },
    { value: 'accent_row', label: 'Accent Background Block' },
  ],
};

const DEFAULT_HEADER = {
  logo_position: 'left',
  show_store_name: true,
  nav_links: [
    { label: 'Shop', href: '#products' },
    { label: 'Collections', href: '#categories' },
    { label: 'About', href: '#about' },
    { label: 'Journal', href: '/blog' },
    { label: 'Contact', href: '#contact' },
  ],
  nav_font: 'Inter',
  nav_weight: '500',
  nav_gap: 16,
  logo_url: '',
};

const DEFAULT_FOOTER = {
  custom_text: '',
  show_powered_by: true,
  background_color: '',
  text_color: '',
  background_image: '',
  background_opacity: 30,
  social_links: { instagram: '', facebook: '', twitter: '', youtube: '' },
  custom_links: [],
};

export default function CustomiseSections() {
  const { store, setStore } = useStore();
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | string | null>(null);

  // Modal selector states
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSectionIdx, setActiveSectionIdx] = useState<number | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalCategory, setModalCategory] = useState('');
  const [modalTempSelectedIds, setModalTempSelectedIds] = useState<string[]>([]);

  const activeThemeId = getStoreThemeId(store) || 'theme-style-19';
  const { data: manifest, isLoading: manifestLoading } = useThemeManifest(activeThemeId);

  const settings = getStorefrontConfig(store) as any;
  const [themeOverrides, setThemeOverrides] = useState<any>(settings.theme_overrides || {});

  // Header & Footer configurations
  const [headerConfig, setHeaderConfig] = useState<any>({ ...DEFAULT_HEADER, ...(settings.header || {}) });
  const [footerConfig, setFooterConfig] = useState<any>({ ...DEFAULT_FOOTER, ...(settings.footer || {}) });

  // Sync state if store updates
  useEffect(() => {
    if (store) {
      const s = getStorefrontConfig(store) as any;
      setThemeOverrides(s.theme_overrides || {});
      setHeaderConfig({ ...DEFAULT_HEADER, ...(s.header || {}) });
      setFooterConfig({ ...DEFAULT_FOOTER, ...(s.footer || {}) });
    }
  }, [store]);

  // Fetch active store products
  const { data: storeProducts = [] } = useQuery({
    queryKey: ['customise-sections-products', store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', store.id)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  // Fetch store categories
  const { data: storeCategories = [] } = useQuery({
    queryKey: ['customise-sections-categories', store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('store_id', store.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  // Filtered products list inside modal
  const filteredModalProducts = useMemo(() => {
    return storeProducts.filter(p => {
      const matchS = p.title.toLowerCase().includes(modalSearch.toLowerCase());
      const matchC = !modalCategory || p.category === modalCategory;
      return matchS && matchC;
    });
  }, [storeProducts, modalSearch, modalCategory]);

  if (manifestLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Loading sections layout configuration...</p>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="text-center py-10">
        <h2 className="text-lg font-semibold">Theme manifest not found</h2>
        <p className="text-sm text-muted-foreground mt-1">Please apply Theme 19 or publish a master version to edit homepage sections.</p>
      </div>
    );
  }

  const sections = (manifest as any)?.pages?.home?.sections ?? [];
  const sectionOverrides = themeOverrides?.sections ?? {};

  const updateField = (idx: number, key: string, value: any) => {
    const current = sectionOverrides[idx] ?? sectionOverrides[String(idx)] ?? {};
    const next = {
      ...themeOverrides,
      sections: {
        ...sectionOverrides,
        [idx]: {
          ...current,
          [key]: value,
        },
      },
    };
    setThemeOverrides(next);
  };

  const resetField = (idx: number, key: string) => {
    const current = { ...(sectionOverrides[idx] ?? sectionOverrides[String(idx)] ?? {}) };
    delete current[key];
    const next = {
      ...themeOverrides,
      sections: {
        ...sectionOverrides,
        [idx]: current,
      },
    };
    setThemeOverrides(next);
  };

  const uploadImage = async (target: number | string, file: File) => {
    setUploadingIdx(target);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Please sign in again before uploading');
      const ext = file.name.split('.').pop();
      const path = `${userData.user.id}/stores/${store.id}/theme-overrides/${target}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('store-assets').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('store-assets').getPublicUrl(path);
      
      if (target === 'header-logo') {
        setHeaderConfig((h: any) => ({ ...h, logo_url: data.publicUrl }));
      } else if (typeof target === 'number') {
        updateField(target, 'image', data.publicUrl);
      }
      toast.success('Image uploaded successfully');
    } catch (e: any) {
      toast.error(e.message || 'Image upload failed');
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleSave = async () => {
    if (!store) return;
    setSaving(true);

    try {
      const newConfig = {
        ...settings,
        theme_overrides: themeOverrides,
        header: headerConfig,
        footer: footerConfig,
      };

      const resolved_storefront_manifest = await buildResolvedStorefrontManifest(store as any, newConfig as any);
      const { error } = await supabase
        .from('stores')
        .update({ resolved_storefront_manifest: resolved_storefront_manifest as any })
        .eq('id', store.id);

      if (error) throw error;
      
      setStore({ ...store, resolved_storefront_manifest });
      toast.success('Homepage & Header/Footer layout changes saved successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Helper to determine currently visible items for product sections
  const getCurrentlyVisibleProducts = (sectionProps: any, sectionType: string) => {
    const selectedIds = sectionProps.selected_product_ids;
    if (Array.isArray(selectedIds) && selectedIds.length > 0) {
      return selectedIds
        .map(id => storeProducts.find(p => p.id === id))
        .filter(Boolean);
    }
    
    // Default slices logic
    if (sectionType === 'featured_products' || sectionType === 'product_grid') {
      return storeProducts.slice(0, 8);
    } else if (sectionType === 'trending') {
      const sliceStart = storeProducts.length >= 8 ? 4 : 0;
      return storeProducts.slice(sliceStart, sliceStart + 8);
    } else if (sectionType === 'new_arrivals') {
      const sliceStart = Math.max(0, storeProducts.length - 8);
      return [...storeProducts.slice(sliceStart)].reverse();
    }
    return [];
  };

  // Open modal selection
  const openProductSelector = (idx: number, currentIds: string[]) => {
    setActiveSectionIdx(idx);
    setModalTempSelectedIds([...currentIds]);
    setModalSearch('');
    setModalCategory('');
    setModalOpen(true);
  };

  // Save selection inside modal
  const applyModalSelection = () => {
    if (activeSectionIdx !== null) {
      updateField(activeSectionIdx, 'selected_product_ids', modalTempSelectedIds);
    }
    setModalOpen(false);
    toast.success('Product selection updated. Don\'t forget to click Save Configuration.');
  };

  return (
    <div className="space-y-6 pb-12 relative">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Storefront layout Customizer</h1>
          <p className="text-sm text-muted-foreground">
            Manage sections layouts, header navigation, footers, and visual styles. Active Theme ID: <span className="font-semibold">{activeThemeId}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`/store/${store.slug}`} target="_blank" rel="noopener noreferrer">
              <Eye className="mr-1.5 h-4 w-4" /> View Live Store
            </a>
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? (
              <>Saving changes...</>
            ) : (
              <>
                <Save className="mr-1.5 h-4 w-4" /> Save Configuration
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="section-header" className="w-full">
        <div className="grid md:grid-cols-4 gap-6">
          {/* Navigation Tab Buttons Left */}
          <div className="md:col-span-1">
            <Card className="p-2 bg-muted/30">
              <div className="text-xs font-semibold px-3 py-2 text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" /> Layout Customizer
              </div>
              <TabsList className="flex flex-col w-full h-auto bg-transparent border-0 gap-1 p-0 mt-1">
                {/* Header settings tab at the top */}
                <TabsTrigger
                  value="section-header"
                  className="justify-start w-full text-left py-2 px-3 text-xs h-9 rounded-md transition-all border-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold"
                >
                  <Heading className="mr-2 h-4 w-4 shrink-0" />
                  <span>Header Layout</span>
                </TabsTrigger>

                {/* Homepage Sections */}
                {sections.map((s: any, idx: number) => {
                  const label = SECTION_LABELS[s.type] || s.type;
                  return (
                    <TabsTrigger
                      key={idx}
                      value={`section-${idx}`}
                      className="justify-start w-full text-left py-2 px-3 text-xs h-9 rounded-md transition-all border-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium"
                    >
                      <Badge variant="outline" className="mr-2 text-[9px] w-5 h-5 flex items-center justify-center p-0 rounded-full shrink-0">
                        {idx + 1}
                      </Badge>
                      <span className="truncate">{label}</span>
                    </TabsTrigger>
                  );
                })}

                {/* Footer settings tab at the bottom */}
                <TabsTrigger
                  value="section-footer"
                  className="justify-start w-full text-left py-2 px-3 text-xs h-9 rounded-md transition-all border-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold"
                >
                  <PanelBottom className="mr-2 h-4 w-4 shrink-0" />
                  <span>Footer Layout</span>
                </TabsTrigger>
              </TabsList>
            </Card>
          </div>

          {/* Right Main Content Tabs Panels */}
          <div className="md:col-span-3 space-y-6">

            {/* --- HEADER SETTINGS TAB PANEL --- */}
            <TabsContent value="section-header" className="mt-0 outline-none">
              <Card className="shadow-sm">
                <CardHeader className="border-b bg-muted/20">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Heading className="h-5 w-5 text-primary" /> Header Settings
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-normal uppercase">Global Theme Header</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Header Preview */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
                      <Eye className="h-3.5 w-3.5" /> Present Display Status (Live Now)
                    </h3>
                    <div className="bg-white border rounded-lg p-4 shadow-md flex items-center justify-between gap-4 font-sans text-slate-800">
                      {/* Left: Brand */}
                      <div className="flex items-center gap-6">
                        {headerConfig.logo_url ? (
                          <img 
                            src={headerConfig.logo_url} 
                            alt="" 
                            className={headerConfig.logo_shape === 'circle' ? "h-9 w-9 rounded-full object-cover border" : "h-7 object-contain max-w-[120px]"} 
                          />
                        ) : (
                          <span className="font-extrabold text-lg tracking-tight text-slate-900">{store?.name || 'Vogue Elite'}</span>
                        )}
                        
                        {/* Nav Links */}
                        <div 
                          className="hidden lg:flex items-center text-xs font-semibold text-slate-600"
                          style={{ 
                            gap: `${headerConfig.nav_gap || 16}px`,
                            fontFamily: headerConfig.nav_font || 'Inter',
                            fontWeight: headerConfig.nav_weight || '500'
                          }}
                        >
                          {(headerConfig.nav_links || []).map((link: any, lIdx: number) => (
                            <span key={lIdx} className="hover:text-indigo-600 transition cursor-pointer">{link.label}</span>
                          ))}
                        </div>
                      </div>

                      {/* Right side: Search & Buttons */}
                      <div className="flex items-center gap-3">
                        {/* Search Input Mockup */}
                        <div className="relative hidden md:block">
                          <input 
                            type="text" 
                            placeholder="Search..." 
                            disabled 
                            className="bg-slate-50 border border-slate-200 text-[10px] rounded-md pl-3 pr-8 py-1.5 w-40 cursor-not-allowed opacity-80"
                          />
                          <Search className="absolute right-2.5 top-2 h-3 w-3 text-slate-400" />
                        </div>

                        {/* Sign in Button */}
                        <button disabled className="border border-indigo-200 hover:border-indigo-300 text-indigo-600 rounded-md px-3 py-1.5 text-[11px] font-semibold bg-indigo-50/10 cursor-not-allowed opacity-80">
                          Sign in
                        </button>

                        {/* Cart Button */}
                        <button disabled className="bg-indigo-600 text-white rounded-md px-3 py-1.5 text-[11px] font-semibold flex items-center gap-1.5 cursor-not-allowed opacity-90 shadow-sm">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                          Cart · 0
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Header Configuration Panel */}
                  <div className="border-t pt-5 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Settings className="h-3.5 w-3.5" /> Edit Header Configuration
                    </h3>

                    {/* Show/Hide name and Logo */}
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Store Brand Display</Label>
                        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/10">
                          <Switch
                            checked={headerConfig.show_store_name !== false}
                            onCheckedChange={(checked) => setHeaderConfig((h: any) => ({ ...h, show_store_name: checked }))}
                          />
                          <span className="text-xs font-medium">Show Store Name text on Header</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Logo Align Placement</Label>
                        <select
                          value={headerConfig.logo_position || 'left'}
                          onChange={(e) => setHeaderConfig((h: any) => ({ ...h, logo_position: e.target.value }))}
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none"
                        >
                          <option value="left">Left Aligned</option>
                          <option value="center">Center Centered</option>
                        </select>
                      </div>
                    </div>

                    {/* Logo Image Uploader */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Custom Brand Logo (Replaces Store Name text)</Label>
                      <div className="flex items-center gap-4">
                        <div className={`w-28 h-12 border bg-muted flex items-center justify-center overflow-hidden shrink-0 ${headerConfig.logo_shape === 'circle' ? 'rounded-full w-12 h-12' : 'rounded'}`}>
                          {headerConfig.logo_url ? (
                            <img 
                              src={headerConfig.logo_url} 
                              alt="" 
                              className={headerConfig.logo_shape === 'circle' ? "w-full h-full object-cover" : "w-full h-full object-contain p-1"} 
                            />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button size="xs" variant="outline" disabled={uploadingIdx === 'header-logo'} asChild>
                            <label className="cursor-pointer">
                              <Upload className="mr-1.5 h-3.5 w-3.5" />
                              {uploadingIdx === 'header-logo' ? 'Uploading…' : 'Upload Logo'}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) uploadImage('header-logo', f);
                                }}
                              />
                            </label>
                          </Button>
                          {headerConfig.logo_url && (
                            <Button size="xs" variant="outline" onClick={() => setHeaderConfig((h: any) => ({ ...h, logo_url: '' }))}>
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove Logo
                            </Button>
                          )}
                          <div className="flex flex-col gap-0.5 min-w-[120px] ml-2">
                            <Label className="text-[9px] font-semibold text-muted-foreground">Logo Shape</Label>
                            <select
                              value={headerConfig.logo_shape || 'rectangle'}
                              onChange={(e) => setHeaderConfig((h: any) => ({ ...h, logo_shape: e.target.value }))}
                              className="h-7 rounded border border-input bg-background px-2 py-0 text-xs focus-visible:outline-none"
                            >
                              <option value="rectangle">Rectangle</option>
                              <option value="circle">Circle (Round)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Font customizations */}
                    <div className="grid grid-cols-3 gap-4 border-t pt-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Font Family</Label>
                        <select
                          value={headerConfig.nav_font || 'Inter'}
                          onChange={(e) => setHeaderConfig((h: any) => ({ ...h, nav_font: e.target.value }))}
                          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                        >
                          <option value="Inter">Inter (Sans)</option>
                          <option value="Roboto">Roboto</option>
                          <option value="Montserrat">Montserrat</option>
                          <option value="Lora">Lora (Serif)</option>
                          <option value="Outfit">Outfit</option>
                          <option value="Playfair Display">Playfair Display</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Font Weight</Label>
                        <select
                          value={headerConfig.nav_weight || '500'}
                          onChange={(e) => setHeaderConfig((h: any) => ({ ...h, nav_weight: e.target.value }))}
                          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                        >
                          <option value="300">Light (300)</option>
                          <option value="400">Regular (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="600">Semi Bold (600)</option>
                          <option value="700">Bold (700)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Link Gap (Pixels)</Label>
                        <Input
                          type="number"
                          value={headerConfig.nav_gap || 16}
                          onChange={(e) => setHeaderConfig((h: any) => ({ ...h, nav_gap: Number(e.target.value) }))}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    {/* Navigation links custom list */}
                    <div className="space-y-2 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Header Navigation Menu Links</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            const current = [...(headerConfig.nav_links || [])];
                            current.push({ label: 'New Link', href: '#products' });
                            setHeaderConfig((h: any) => ({ ...h, nav_links: current }));
                          }}
                          className="h-6 text-[10px]"
                        >
                          <Plus className="mr-1 h-3 w-3" /> Add Link
                        </Button>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(headerConfig.nav_links || []).map((link: any, lIdx: number) => (
                          <div key={lIdx} className="flex gap-2 items-center bg-muted/10 p-2 border rounded-md">
                            <Input
                              placeholder="Link Text (e.g. Shop)"
                              value={link.label || ''}
                              onChange={(e) => {
                                const current = [...(headerConfig.nav_links || [])];
                                current[lIdx] = { ...current[lIdx], label: e.target.value };
                                setHeaderConfig((h: any) => ({ ...h, nav_links: current }));
                              }}
                              className="h-8 text-xs flex-1"
                            />
                            <Input
                              placeholder="Destination URL (e.g. #products)"
                              value={link.href || ''}
                              onChange={(e) => {
                                const current = [...(headerConfig.nav_links || [])];
                                current[lIdx] = { ...current[lIdx], href: e.target.value };
                                setHeaderConfig((h: any) => ({ ...h, nav_links: current }));
                              }}
                              className="h-8 text-xs flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const current = (headerConfig.nav_links || []).filter((_: any, idx: number) => idx !== lIdx);
                                setHeaderConfig((h: any) => ({ ...h, nav_links: current }));
                              }}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- SECTIONS LIST TAB PANELS --- */}
            {sections.map((s: any, idx: number) => {
              const label = SECTION_LABELS[s.type] || s.type;
              const ov = sectionOverrides[idx] ?? sectionOverrides[String(idx)] ?? {};
              const defaults = s.props ?? {};
              const merged = { ...defaults, ...ov };

              const isProductType = ['product_grid', 'trending', 'featured_products', 'new_arrivals'].includes(s.type);
              const isHero = s.type === 'hero';
              const isPromo = s.type === 'promo_banner';
              const isCategory = s.type === 'category_grid';

              return (
                <TabsContent key={idx} value={`section-${idx}`} className="mt-0 outline-none">
                  <Card className="shadow-sm">
                    <CardHeader className="border-b bg-muted/20">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <Badge className="bg-primary/10 text-primary border-0">{idx + 1}</Badge>
                          {label}
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px] font-normal uppercase">
                          Type: {s.type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">

                      {/* --- PRESENT TIME VISIBLE PREVIEW BLOCK --- */}
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
                          <Eye className="h-3.5 w-3.5" /> Present Display Status (Live Now)
                        </h3>

                        {/* Product type Preview */}
                        {isProductType && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/20 p-3 rounded-lg border border-dashed">
                            {getCurrentlyVisibleProducts(merged, s.type).map((prod: any, pIdx: number) => (
                              <div key={prod.id || pIdx} className="bg-card border rounded p-2 flex flex-col text-xs gap-1.5 shadow-sm">
                                <div className="aspect-square bg-muted rounded overflow-hidden relative shrink-0">
                                  {prod.images?.[0] ? (
                                    <img src={prod.images[0]} alt={prod.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center opacity-30 text-[9px]">No Img</div>
                                  )}
                                  <Badge className="absolute top-1 left-1 text-[8px] bg-primary text-white h-4 px-1 rounded-sm">
                                    #{pIdx + 1}
                                  </Badge>
                                </div>
                                <div className="font-semibold truncate">{prod.title}</div>
                                <div className="text-primary text-[10px] font-bold">₹{prod.price}</div>
                              </div>
                            ))}
                            {getCurrentlyVisibleProducts(merged, s.type).length === 0 && (
                              <div className="col-span-4 text-center py-6 text-xs text-muted-foreground">
                                No products are currently selected or available in this section.
                              </div>
                            )}
                          </div>
                        )}

                        {/* Hero Preview */}
                        {isHero && (
                          <div className="bg-muted/10 border rounded-lg p-4 relative overflow-hidden flex flex-col gap-2 min-h-[160px] justify-center shadow-sm">
                            {merged.image && (
                              <img src={merged.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" />
                            )}
                            <div className="relative space-y-1">
                              {merged.kicker && <Badge variant="secondary" className="text-[9px] py-0">{merged.kicker}</Badge>}
                              <h2 className="text-lg font-extrabold">{merged.title || 'Welcome'}</h2>
                              <p className="text-xs text-muted-foreground max-w-md">{merged.sub}</p>
                              {merged.cta && (
                                <Button size="sm" className="mt-2 text-[10px] h-7 px-3 pointer-events-none">
                                  {merged.cta} <ArrowRight className="ml-1 h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Promo Banner Preview */}
                        {isPromo && (
                          <div className="bg-muted/10 border rounded-lg p-4 relative overflow-hidden flex items-center justify-between min-h-[100px] shadow-sm">
                            {merged.image && (
                              <img src={merged.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none" />
                            )}
                            <div className="relative space-y-1">
                              <h3 className="text-sm font-bold">{merged.title}</h3>
                              <p className="text-xs text-muted-foreground">{merged.subtitle}</p>
                            </div>
                            {merged.promo_code && (
                              <div className="relative border-2 border-dashed border-primary bg-primary/5 rounded px-2.5 py-1 text-xs font-mono font-bold text-primary">
                                CODE: {merged.promo_code}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Categories Preview */}
                        {isCategory && (
                          <div className="grid grid-cols-4 gap-3 bg-muted/20 p-3 rounded-lg border border-dashed">
                            {/* Determine which categories are filtered on the home page */}
                            {(storeCategories.filter(cat => !merged.selected_category_ids || merged.selected_category_ids.includes(cat.id))).slice(0, 4).map((cat: any) => (
                              <div key={cat.id} className="flex flex-col items-center gap-1 text-center bg-card p-2 rounded border shadow-sm">
                                <div className="w-12 h-12 rounded-full overflow-hidden border bg-muted">
                                  {cat.image_url && <img src={cat.image_url} alt="" className="w-full h-full object-cover" />}
                                </div>
                                <span className="text-[10px] font-medium truncate w-full">{cat.name}</span>
                              </div>
                            ))}
                            {storeCategories.length === 0 && (
                              <div className="col-span-4 text-center py-4 text-xs text-muted-foreground">
                                No catalog categories defined yet. Add them in Catalog &gt; Categories.
                              </div>
                            )}
                          </div>
                        )}

                        {/* Trust Badges (USP) Preview */}
                        {s.type === 'usp_strip' && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/20 p-3 rounded-lg border border-dashed">
                            {(merged.items || []).map((item: any, iIdx: number) => (
                              <div key={iIdx} className="bg-card border rounded p-3 text-center flex flex-col items-center gap-1.5 shadow-sm">
                                <span className="text-2xl">{iconEmojiMap[item.icon] || item.icon || '⭐'}</span>
                                <div className="font-semibold text-xs truncate w-full">{item.title || 'Badge Title'}</div>
                                <div className="text-muted-foreground text-[10px] line-clamp-1">{item.sub || 'Subtext details'}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* --- EDITABLE CONFIGURATION PANEL --- */}
                      <div className="border-t pt-5 space-y-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Settings className="h-3.5 w-3.5" /> Edit Section Configuration
                        </h3>

                        {/* Trust Badges (USP) items editor */}
                        {s.type === 'usp_strip' && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold">Customize Badges Content (Up to 4)</Label>
                              {'items' in ov && (
                                <button
                                  type="button"
                                  onClick={() => resetField(idx, 'items')}
                                  className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition"
                                >
                                  <RotateCcw className="h-2.5 w-2.5" /> Revert to defaults
                                </button>
                              )}
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                              {(merged.items || []).slice(0, 4).map((item: any, iIdx: number) => (
                                <Card key={iIdx} className="p-3 bg-muted/10 border-muted">
                                  <CardTitle className="text-xs font-semibold mb-2.5 flex items-center gap-1.5">
                                    <Badge variant="secondary" className="text-[9px] w-5 h-5 flex items-center justify-center p-0 rounded-full">
                                      {iIdx + 1}
                                    </Badge>
                                    Badge #{iIdx + 1}
                                  </CardTitle>
                                  <div className="space-y-2">
                                    {/* Icon Select */}
                                    <div className="space-y-1">
                                      <Label className="text-[10px] font-medium text-muted-foreground">Badge Icon</Label>
                                      <select
                                        value={item.icon || 'truck'}
                                        onChange={(e) => {
                                          const currentItems = merged.items ? [...merged.items] : [];
                                          while (currentItems.length <= iIdx) {
                                            currentItems.push({ icon: 'truck', title: 'New Badge', sub: 'Details' });
                                          }
                                          currentItems[iIdx] = { ...currentItems[iIdx], icon: e.target.value };
                                          updateField(idx, 'items', currentItems);
                                        }}
                                        className="w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                      >
                                        <option value="truck">Delivery Truck (🚚)</option>
                                        <option value="shield">Secure Checkout (🔒)</option>
                                        <option value="refresh">Easy Returns (🔄)</option>
                                        <option value="headphones">24/7 Support (🎧)</option>
                                        <option value="percent">Offers & Discounts (🏷️)</option>
                                        <option value="clock">Fast Dispatch (⏰)</option>
                                        <option value="heart">Handcrafted/Quality (❤️)</option>
                                        <option value="star">Verified Products (⭐)</option>
                                      </select>
                                    </div>
                                    {/* Title Input */}
                                    <div className="space-y-1">
                                      <Label className="text-[10px] font-medium text-muted-foreground">Badge Title</Label>
                                      <Input
                                        value={item.title || ''}
                                        onChange={(e) => {
                                          const currentItems = merged.items ? [...merged.items] : [];
                                          while (currentItems.length <= iIdx) {
                                            currentItems.push({ icon: 'truck', title: 'New Badge', sub: 'Details' });
                                          }
                                          currentItems[iIdx] = { ...currentItems[iIdx], title: e.target.value };
                                          updateField(idx, 'items', currentItems);
                                        }}
                                        className="h-7 text-xs"
                                      />
                                    </div>
                                    {/* Subtitle Input */}
                                    <div className="space-y-1">
                                      <Label className="text-[10px] font-medium text-muted-foreground">Badge Description</Label>
                                      <Input
                                        value={item.sub || ''}
                                        onChange={(e) => {
                                          const currentItems = merged.items ? [...merged.items] : [];
                                          while (currentItems.length <= iIdx) {
                                            currentItems.push({ icon: 'truck', title: 'New Badge', sub: 'Details' });
                                          }
                                          currentItems[iIdx] = { ...currentItems[iIdx], sub: e.target.value };
                                          updateField(idx, 'items', currentItems);
                                        }}
                                        className="h-7 text-xs"
                                      />
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Shop by Category tab custom checkboxes selector */}
                        {isCategory && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold">Select Categories to display on Home page</Label>
                              {'selected_category_ids' in ov && (
                                <button
                                  type="button"
                                  onClick={() => resetField(idx, 'selected_category_ids')}
                                  className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition"
                                >
                                  <RotateCcw className="h-2.5 w-2.5" /> Reset to show all
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 border rounded-md p-3 bg-card max-h-40 overflow-y-auto">
                              {storeCategories.map((cat: any) => {
                                const selectedCatIds = merged.selected_category_ids || [];
                                // If overrides doesn't have selection yet, treat all categories as checked (defaults)
                                const checked = !('selected_category_ids' in ov) || selectedCatIds.includes(cat.id);
                                return (
                                  <label key={cat.id} className={`flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-muted/40 transition text-xs ${checked ? 'border-primary/40 bg-primary/[0.02]' : ''}`}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => {
                                        let nextIds = 'selected_category_ids' in ov ? [...selectedCatIds] : storeCategories.map((c: any) => c.id);
                                        if (e.target.checked) {
                                          if (!nextIds.includes(cat.id)) nextIds.push(cat.id);
                                        } else {
                                          nextIds = nextIds.filter((id: string) => id !== cat.id);
                                        }
                                        updateField(idx, 'selected_category_ids', nextIds);
                                      }}
                                      className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                                    />
                                    <span className="truncate font-medium">{cat.name}</span>
                                  </label>
                                );
                              })}
                              {storeCategories.length === 0 && (
                                <div className="col-span-2 text-center text-xs text-muted-foreground py-2">No categories found in store database.</div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Product list customized editor: list of selected products + Add button */}
                        {isProductType && (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold">Custom Products Selected</Label>
                              <div className="flex items-center gap-2">
                                {'selected_product_ids' in ov && (
                                  <button
                                    type="button"
                                    onClick={() => resetField(idx, 'selected_product_ids')}
                                    className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition"
                                  >
                                    <RotateCcw className="h-2.5 w-2.5" /> Revert to defaults
                                  </button>
                                )}
                                <Button
                                  type="button"
                                  onClick={() => openProductSelector(idx, merged.selected_product_ids || [])}
                                  size="sm"
                                  className="h-7 text-[10px] px-2.5 flex items-center gap-1"
                                >
                                  <Plus className="h-3 w-3" /> Add / Edit Products
                                </Button>
                              </div>
                            </div>

                            {/* List showing currently selected items with remove quick buttons */}
                            <div className="border rounded-lg bg-muted/10 divide-y overflow-hidden shadow-sm">
                              {getCurrentlyVisibleProducts(merged, s.type).map((prod: any, pIdx: number) => {
                                const isManual = Array.isArray(merged.selected_product_ids) && merged.selected_product_ids.includes(prod.id);
                                return (
                                  <div key={prod.id || pIdx} className="p-2 flex items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2 truncate">
                                      <div className="w-8 h-8 rounded border bg-muted shrink-0 overflow-hidden">
                                        {prod.images?.[0] && <img src={prod.images[0]} alt="" className="w-full h-full object-cover" />}
                                      </div>
                                      <div className="truncate">
                                        <div className="font-semibold truncate">{prod.title}</div>
                                        <div className="text-[10px] text-muted-foreground truncate">{prod.category || 'No Category'}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-[10px] font-semibold text-primary">₹{prod.price}</span>
                                      {isManual ? (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            const filterIds = (merged.selected_product_ids || []).filter((id: string) => id !== prod.id);
                                            updateField(idx, 'selected_product_ids', filterIds);
                                          }}
                                          className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      ) : (
                                        <Badge variant="outline" className="text-[8px] tracking-wide text-muted-foreground uppercase font-normal h-5">Default</Badge>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              {getCurrentlyVisibleProducts(merged, s.type).length === 0 && (
                                <div className="text-center py-6 text-xs text-muted-foreground">No products selected yet.</div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Image Editor (for Hero or Promo) */}
                        {(isHero || isPromo) && (
                          <div className="space-y-2">
                            <Label className="text-xs">Replace Section Background Image</Label>
                            <div className="flex items-start gap-4">
                              <div className="w-28 h-20 rounded-md border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                {merged.image ? (
                                  <img src={merged.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button size="xs" variant="outline" disabled={uploadingIdx === idx} asChild>
                                  <label className="cursor-pointer">
                                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                                    {uploadingIdx === idx ? 'Uploading…' : 'Upload Image'}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) uploadImage(idx, f);
                                      }}
                                    />
                                  </label>
                                </Button>
                                {merged.image && (
                                  <Button size="xs" variant="outline" onClick={() => updateField(idx, 'image', '')}>
                                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                                  </Button>
                                )}
                                {'image' in ov && (
                                  <Button size="xs" variant="ghost" onClick={() => resetField(idx, 'image')}>
                                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Revert
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Text fields & Dropdown Selector Inputs */}
                        <div className="grid sm:grid-cols-2 gap-4">
                          {/* We only render keys that exist in s.props */}
                          {Object.keys(defaults).filter(k => k !== 'image' && k !== 'items' && k !== 'selected_product_ids' && k !== 'slides' && k !== 'selected_category_ids').map((keyName) => {
                            const value = merged[keyName] ?? '';
                            const isStyleDropdown = keyName === 'style' && SECTION_STYLE_OPTIONS[s.type];
                            const isLong = keyName === 'sub' || keyName === 'subtitle' || keyName === 'body';
                            
                            return (
                              <div key={keyName} className={isLong ? 'sm:col-span-2 space-y-1' : 'space-y-1'}>
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-semibold capitalize">{keyName.replace('_', ' ')}</Label>
                                  {keyName in ov && (
                                    <button
                                      type="button"
                                      onClick={() => resetField(idx, keyName)}
                                      className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
                                    >
                                      <RotateCcw className="h-2.5 w-2.5" /> reset
                                    </button>
                                  )}
                                </div>
                                {isStyleDropdown ? (
                                  <select
                                    value={value}
                                    onChange={(e) => updateField(idx, keyName, e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                  >
                                    {SECTION_STYLE_OPTIONS[s.type].map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : isLong ? (
                                  <Textarea
                                    rows={2}
                                    value={value}
                                    onChange={(e) => updateField(idx, keyName, e.target.value)}
                                    className="text-xs"
                                  />
                                ) : (
                                  <Input
                                    value={value}
                                    onChange={(e) => updateField(idx, keyName, e.target.value)}
                                    className="h-8 text-xs"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>

                      </div>

                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}

            {/* --- FOOTER SETTINGS TAB PANEL --- */}
            <TabsContent value="section-footer" className="mt-0 outline-none">
              <Card className="shadow-sm">
                <CardHeader className="border-b bg-muted/20">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <PanelBottom className="h-5 w-5 text-primary" /> Footer Settings
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-normal uppercase">Global Theme Footer</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Footer Preview */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
                      <Eye className="h-3.5 w-3.5" /> Present Display Status (Live Now)
                    </h3>
                    <div className="bg-slate-900 text-white rounded-lg p-5 flex flex-col gap-4 shadow-md text-xs">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
                        <span className="font-extrabold text-sm">{store?.name || 'Vogue Store'}</span>
                        <div className="flex gap-3 text-slate-400">
                          {footerConfig.social_links?.instagram && <Instagram className="h-4 w-4 text-rose-400" />}
                          {footerConfig.social_links?.facebook && <Facebook className="h-4 w-4 text-blue-400" />}
                          {footerConfig.social_links?.twitter && <Twitter className="h-4 w-4 text-sky-400" />}
                          {footerConfig.social_links?.youtube && <Youtube className="h-4 w-4 text-red-500" />}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-400 text-[10px]">
                        <span>{footerConfig.custom_text || `© ${new Date().getFullYear()} ${store?.name || 'Vogue Store'}. All rights reserved.`}</span>
                        {footerConfig.show_powered_by !== false && <span>Powered by PicToCart</span>}
                      </div>
                    </div>
                  </div>

                  {/* Footer Configuration Panel */}
                  <div className="border-t pt-5 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Settings className="h-3.5 w-3.5" /> Edit Footer Configuration
                    </h3>

                    {/* Copy and Badge Toggle */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Custom copyright text</Label>
                        <Input
                          value={footerConfig.custom_text || ''}
                          onChange={(e) => setFooterConfig((f: any) => ({ ...f, custom_text: e.target.value }))}
                          placeholder={`© ${new Date().getFullYear()} ${store?.name || 'Vogue Store'}. All rights reserved.`}
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/10">
                        <Switch
                          checked={footerConfig.show_powered_by !== false}
                          onCheckedChange={(checked) => setFooterConfig((f: any) => ({ ...f, show_powered_by: checked }))}
                        />
                        <span className="text-xs font-medium">Show "Powered by PicToCart" badge</span>
                      </div>
                    </div>

                    {/* Social Media Inputs */}
                    <div className="space-y-2 border-t pt-4">
                      <Label className="text-xs font-semibold">Social Media Handles Links</Label>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {/* Instagram */}
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><Instagram className="h-3.5 w-3.5 text-rose-500" /> Instagram URL</Label>
                          <Input
                            value={footerConfig.social_links?.instagram || ''}
                            onChange={(e) => {
                              const links = { ...(footerConfig.social_links || {}) };
                              links.instagram = e.target.value;
                              setFooterConfig((f: any) => ({ ...f, social_links: links }));
                            }}
                            placeholder="https://instagram.com/mybrand"
                            className="h-8 text-xs"
                          />
                        </div>
                        {/* Facebook */}
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><Facebook className="h-3.5 w-3.5 text-blue-600" /> Facebook URL</Label>
                          <Input
                            value={footerConfig.social_links?.facebook || ''}
                            onChange={(e) => {
                              const links = { ...(footerConfig.social_links || {}) };
                              links.facebook = e.target.value;
                              setFooterConfig((f: any) => ({ ...f, social_links: links }));
                            }}
                            placeholder="https://facebook.com/mybrand"
                            className="h-8 text-xs"
                          />
                        </div>
                        {/* Twitter */}
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><Twitter className="h-3.5 w-3.5 text-sky-500" /> Twitter URL</Label>
                          <Input
                            value={footerConfig.social_links?.twitter || ''}
                            onChange={(e) => {
                              const links = { ...(footerConfig.social_links || {}) };
                              links.twitter = e.target.value;
                              setFooterConfig((f: any) => ({ ...f, social_links: links }));
                            }}
                            placeholder="https://twitter.com/mybrand"
                            className="h-8 text-xs"
                          />
                        </div>
                        {/* Youtube */}
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><Youtube className="h-3.5 w-3.5 text-red-600" /> YouTube Channel URL</Label>
                          <Input
                            value={footerConfig.social_links?.youtube || ''}
                            onChange={(e) => {
                              const links = { ...(footerConfig.social_links || {}) };
                              links.youtube = e.target.value;
                              setFooterConfig((f: any) => ({ ...f, social_links: links }));
                            }}
                            placeholder="https://youtube.com/mybrand"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick Custom Links Footer */}
                    <div className="space-y-2 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Custom Quick Footer Links</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            const current = [...(footerConfig.custom_links || [])];
                            current.push({ label: 'Privacy Policy', href: '/policies/privacy-policy' });
                            setFooterConfig((f: any) => ({ ...f, custom_links: current }));
                          }}
                          className="h-6 text-[10px]"
                        >
                          <Plus className="mr-1 h-3 w-3" /> Add Link
                        </Button>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(footerConfig.custom_links || []).map((link: any, lIdx: number) => (
                          <div key={lIdx} className="flex gap-2 items-center bg-muted/10 p-2 border rounded-md">
                            <Input
                              placeholder="Link Title (e.g. Terms)"
                              value={link.label || ''}
                              onChange={(e) => {
                                const current = [...(footerConfig.custom_links || [])];
                                current[lIdx] = { ...current[lIdx], label: e.target.value };
                                setFooterConfig((f: any) => ({ ...f, custom_links: current }));
                              }}
                              className="h-8 text-xs flex-1"
                            />
                            <Input
                              placeholder="Destination URL (e.g. /terms)"
                              value={link.href || ''}
                              onChange={(e) => {
                                const current = [...(footerConfig.custom_links || [])];
                                current[lIdx] = { ...current[lIdx], href: e.target.value };
                                setFooterConfig((f: any) => ({ ...f, custom_links: current }));
                              }}
                              className="h-8 text-xs flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const current = (footerConfig.custom_links || []).filter((_: any, idx: number) => idx !== lIdx);
                                setFooterConfig((f: any) => ({ ...f, custom_links: current }));
                              }}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </div>
        </div>
      </Tabs>

      {/* --- PREMIUM BACKDROP DIALOG MODAL FOR PRODUCT SEARCH & SELECTION --- */}
      {modalOpen && activeSectionIdx !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="border-b p-4 flex items-center justify-between bg-muted/10 shrink-0">
              <div>
                <h3 className="text-base font-bold flex items-center gap-1.5">
                  <ListChecks className="h-5 w-5 text-primary animate-pulse" />
                  Select Homepage Section Products
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customize which products show up in the section. Sequence represents selection order.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setModalOpen(false)}
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Filters Bar */}
            <div className="p-4 border-b bg-muted/5 flex flex-col sm:flex-row gap-3 shrink-0">
              {/* Search Title */}
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
                <Input
                  type="text"
                  placeholder="Search products by title..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              {/* Category Filter */}
              <div className="relative w-full sm:w-56">
                <select
                  value={modalCategory}
                  onChange={(e) => setModalCategory(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background pl-8 pr-3 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2"
                >
                  <option value="">All Categories</option>
                  {storeCategories.map((c: any) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto p-4 divide-y">
              {filteredModalProducts.map((prod: any) => {
                const checked = modalTempSelectedIds.includes(prod.id);
                const orderIndex = modalTempSelectedIds.indexOf(prod.id);
                return (
                  <label
                    key={prod.id}
                    className={`flex items-center justify-between gap-4 py-2.5 px-3 cursor-pointer hover:bg-muted/30 transition rounded-md border border-transparent ${checked ? 'border-primary/20 bg-primary/[0.01]' : ''}`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      {/* Checkbox input */}
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          let nextTempIds = [...modalTempSelectedIds];
                          if (e.target.checked) {
                            if (nextTempIds.length >= 8) {
                              toast.error('You can select a maximum of 8 products');
                              return;
                            }
                            nextTempIds.push(prod.id);
                          } else {
                            nextTempIds = nextTempIds.filter(id => id !== prod.id);
                          }
                          setModalTempSelectedIds(nextTempIds);
                        }}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 shrink-0"
                      />
                      
                      {/* Product Thumbnail image */}
                      <div className="w-10 h-10 rounded border bg-muted overflow-hidden shrink-0">
                        {prod.images?.[0] && <img src={prod.images[0]} alt="" className="w-full h-full object-cover" />}
                      </div>
                      
                      {/* Meta */}
                      <div className="truncate">
                        <div className="font-semibold text-xs truncate">{prod.title}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{prod.category || 'Uncategorized'}</div>
                      </div>
                    </div>

                    {/* Price and Badge Sequence indicators */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-bold text-primary">₹{prod.price}</span>
                      {checked && (
                        <Badge className="bg-primary hover:bg-primary text-white h-5 text-[9px] px-1.5 rounded-sm">
                          Sequence #{orderIndex + 1}
                        </Badge>
                      )}
                    </div>
                  </label>
                );
              })}
              {filteredModalProducts.length === 0 && (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  No products matched the search/category criteria.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t p-4 flex items-center justify-between bg-muted/10 shrink-0">
              <div className="text-xs text-muted-foreground">
                Selected: <span className="font-bold text-foreground">{modalTempSelectedIds.length}</span> of 8 products
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={applyModalSelection}
                  className="font-semibold"
                >
                  Apply Selection
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
