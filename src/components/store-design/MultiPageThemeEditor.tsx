import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Image as ImageIcon, Trash2, Upload, RotateCcw, Loader2,
  GripVertical, Plus, ChevronUp, ChevronDown, Eye, EyeOff,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useThemeManifest } from '@/hooks/useThemeManifest';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DEFAULT_PAGE_SECTIONS, PAGE_META, PageSection,
  getAllPageKeys, isPageEnabledByDefault,
} from '@/lib/defaultPageSections';

interface Props {
  themeId: string;
  storeId: string;
  overrides: any;
  onChange: (next: any) => void;
}

// ─── Section catalogue — all section types available to add ─────────────────
const SECTION_CATALOGUE: Record<string, { label: string; defaultProps: Record<string, any> }> = {
  hero:                  { label: 'Hero Banner',         defaultProps: { style: 'centered', title: 'Welcome', sub: 'Discover our products', cta: 'Shop Now' } },
  usp_strip:             { label: 'Trust Strip',          defaultProps: { style: 'classic', items: [{ icon: 'truck', title: 'Free Shipping', sub: 'On orders above ₹999' }, { icon: 'shield', title: 'Secure Payment', sub: '100% encrypted' }, { icon: 'refresh', title: 'Easy Returns', sub: '7-day policy' }] } },
  product_grid:          { label: 'Product Grid',         defaultProps: { style: 'grid_clean', title: 'Our Products' } },
  trending:              { label: 'Trending Products',    defaultProps: { style: 'horizontal_scroll', title: 'Trending Now' } },
  featured_products:     { label: 'Featured Products',    defaultProps: { style: 'grid_clean', title: 'Featured' } },
  new_arrivals:          { label: 'New Arrivals',         defaultProps: { style: 'horizontal_card', title: 'New Arrivals' } },
  category_grid:         { label: 'Category Grid',        defaultProps: { style: 'grid_4', title: 'Shop by Category' } },
  collections_grid:      { label: 'Collections Grid',     defaultProps: { style: 'card_hover' } },
  collection_detail:     { label: 'Collection Detail',    defaultProps: { style: 'banner_top' } },
  promo_banner:          { label: 'Promo Banner',         defaultProps: { style: 'classic_split', title: 'Special Offer', sub: 'Limited time deal', cta: 'Shop Now' } },
  product_detail:        { label: 'Product Detail',       defaultProps: { style: 'split_left' } },
  story:                 { label: 'Brand Story',          defaultProps: { style: 'text_left_image_right', title: 'Our Story', body: 'We started with a simple idea...' } },
  values:                { label: 'Values / Features',    defaultProps: { style: 'icon_grid', title: 'Our Values', items: [{ icon: 'shield', title: 'Quality', body: 'Only the best.' }, { icon: 'truck', title: 'Speed', body: 'Fast delivery.' }] } },
  testimonials:          { label: 'Testimonials',         defaultProps: { style: 'card_grid', title: 'What Customers Say' } },
  google_reviews:        { label: 'Google Reviews',       defaultProps: { style: 'marquee' } },
  newsletter:            { label: 'Newsletter Signup',    defaultProps: { title: 'Join Our Newsletter', sub: 'Get 10% off your first order', cta: 'Subscribe' } },
  contact_form:          { label: 'Contact Form',         defaultProps: { style: 'centered_card', title: 'Send Us a Message' } },
  map_and_contact:       { label: 'Map & Contact Info',   defaultProps: { title: 'Visit Us', address: '123 Main St', hours: 'Mon-Sun 9-9', phone: '+91 98765 43210' } },
  page_title:            { label: 'Page Title',           defaultProps: { title: 'Page Title', subtitle: '' } },
  journal_list:          { label: 'Blog / Journal List',  defaultProps: { style: 'editorial_grid' } },
  journal_strip:         { label: 'Journal Strip',        defaultProps: {} },
  account_panel:         { label: 'Account Panel',        defaultProps: { style: 'sidebar_tabs' } },
  line_items:            { label: 'Cart Line Items',      defaultProps: { style: 'table' } },
  cart_summary:          { label: 'Cart Summary',         defaultProps: { style: 'sticky_sidebar' } },
  checkout_stepper:      { label: 'Checkout Stepper',     defaultProps: { style: 'linear', steps: ['Address', 'Payment', 'Review'] } },
  provider_team:         { label: 'Team / Providers',     defaultProps: { title: 'Meet Our Team' } },
  service_menu:          { label: 'Service Menu',         defaultProps: { title: 'Our Services' } },
  service_packages:      { label: 'Service Packages',     defaultProps: { title: 'Packages' } },
  booking_widget:        { label: 'Booking Widget',       defaultProps: {} },
};

const EDITABLE_TEXT_KEYS = ['title', 'sub', 'kicker', 'subtitle', 'cta', 'cta_secondary', 'body', 'html'];

// ─── Helper: get page-level section list from overrides, else manifest, else default ──
function getEffectiveSections(
  page: string,
  overrides: any,
  manifestPages: Record<string, any>,
): PageSection[] {
  // Merchant-saved section list takes priority
  if (overrides?.pages?.[page]?.sectionsList) {
    return overrides.pages[page].sectionsList as PageSection[];
  }
  // Then manifest
  if (manifestPages[page]?.sections?.length) {
    return manifestPages[page].sections as PageSection[];
  }
  // Then hardcoded defaults
  return DEFAULT_PAGE_SECTIONS[page] ?? [];
}

export default function MultiPageThemeEditor({ themeId, storeId, overrides, onChange }: Props) {
  const { data: manifest, isLoading } = useThemeManifest(themeId);
  const [uploadingIdx, setUploadingIdx] = useState<{ page: string; index: number } | null>(null);
  const [activePage, setActivePage] = useState<string>('home');
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionType, setNewSectionType] = useState<string>('');

  const manifestPages = useMemo(() => {
    if (!manifest?.pages) return {};
    return manifest.pages as Record<string, any>;
  }, [manifest]);

  const allPageKeys = useMemo(() => {
    const manifestKeys = Object.keys(manifestPages);
    const defaultKeys = getAllPageKeys();
    return [...new Set([...manifestKeys, ...defaultKeys])];
  }, [manifestPages]);

  const visiblePages = allPageKeys.filter(
    (page) => isPageEnabledByDefault(page) || manifestPages[page]?.sections?.length,
  );

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!manifest) {
    return (
      <Card><CardContent className="py-8 text-sm text-muted-foreground text-center">
        This theme has no manifest published yet.
      </CardContent></Card>
    );
  }

  // ── Section list CRUD helpers ──────────────────────────────────────────────

  const getSectionsList = (page: string): PageSection[] =>
    getEffectiveSections(page, overrides, manifestPages);

  const updateSectionsList = (page: string, newList: PageSection[]) => {
    onChange({
      ...overrides,
      pages: {
        ...overrides?.pages,
        [page]: {
          ...overrides?.pages?.[page],
          sectionsList: newList,
        },
      },
    });
  };

  const addSection = (page: string) => {
    if (!newSectionType) return;
    const cat = SECTION_CATALOGUE[newSectionType];
    const newSection: PageSection = {
      type: newSectionType,
      props: { ...(cat?.defaultProps ?? {}) },
    };
    updateSectionsList(page, [...getSectionsList(page), newSection]);
    setNewSectionType('');
    setAddingSection(false);
    toast.success(`${cat?.label ?? newSectionType} section added`);
  };

  const removeSection = (page: string, idx: number) => {
    const list = getSectionsList(page).filter((_, i) => i !== idx);
    updateSectionsList(page, list);
    toast.success('Section removed');
  };

  const moveSection = (page: string, idx: number, dir: -1 | 1) => {
    const list = [...getSectionsList(page)];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    [list[idx], list[swapIdx]] = [list[swapIdx], list[idx]];
    updateSectionsList(page, list);
  };

  const toggleSection = (page: string, idx: number) => {
    const list = [...getSectionsList(page)];
    const s = { ...list[idx], props: { ...(list[idx].props ?? {}) } };
    s.props._hidden = !s.props._hidden;
    list[idx] = s;
    updateSectionsList(page, list);
    toast.success(s.props._hidden ? 'Section hidden' : 'Section visible');
  };

  // ── Field-level overrides (text, image) ───────────────────────────────────

  const getSectionOverrides = (page: string) =>
    overrides?.pages?.[page]?.sections ?? {};

  const updateField = (page: string, idx: number, key: string, value: any) => {
    const pageOverrides = getSectionOverrides(page);
    const current = pageOverrides[idx] ?? pageOverrides[String(idx)] ?? {};
    onChange({
      ...overrides,
      pages: {
        ...overrides?.pages,
        [page]: {
          ...overrides?.pages?.[page],
          sections: { ...pageOverrides, [idx]: { ...current, [key]: value } },
        },
      },
    });
  };

  const resetField = (page: string, idx: number, key: string) => {
    const pageOverrides = getSectionOverrides(page);
    const current = { ...(pageOverrides[idx] ?? pageOverrides[String(idx)] ?? {}) };
    delete current[key];
    onChange({
      ...overrides,
      pages: {
        ...overrides?.pages,
        [page]: {
          ...overrides?.pages?.[page],
          sections: { ...pageOverrides, [idx]: current },
        },
      },
    });
  };

  const uploadImage = async (page: string, idx: number, file: File) => {
    setUploadingIdx({ page, index: idx });
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Please sign in again before uploading');
      const ext = file.name.split('.').pop();
      const path = `${userData.user.id}/stores/${storeId}/theme-overrides/${page}/${idx}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('store-assets').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('store-assets').getPublicUrl(path);
      updateField(page, idx, 'image', data.publicUrl);
      toast.success('Image updated');
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploadingIdx(null);
    }
  };

  // ── Section card render ────────────────────────────────────────────────────

  const renderSection = (page: string, s: PageSection, i: number, total: number) => {
    const sectionOverrides = getSectionOverrides(page);
    const ov = sectionOverrides[i] ?? sectionOverrides[String(i)] ?? {};
    const defaults = s.props ?? {};
    const merged = { ...defaults, ...ov };
    const editableTextKeys = EDITABLE_TEXT_KEYS.filter((k) => k in defaults);
    const hasImage = 'image' in defaults;
    const label = SECTION_CATALOGUE[s.type]?.label || s.type;
    const isHidden = !!merged._hidden;

    return (
      <Card key={i} className={`group transition-opacity ${isHidden ? 'opacity-50' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              <Badge variant="secondary" className="text-[10px] shrink-0">#{i + 1}</Badge>
              <span className="font-medium text-sm truncate">{label}</span>
              {s.props?.style && (
                <span className="text-[10px] text-muted-foreground hidden sm:inline">· {s.props.style}</span>
              )}
            </div>
            {/* Controls */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => moveSection(page, i, -1)}
                disabled={i === 0}
                className="p-1 rounded hover:bg-muted disabled:opacity-30"
                title="Move up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => moveSection(page, i, 1)}
                disabled={i === total - 1}
                className="p-1 rounded hover:bg-muted disabled:opacity-30"
                title="Move down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => toggleSection(page, i)}
                className="p-1 rounded hover:bg-muted"
                title={isHidden ? 'Show section' : 'Hide section'}
              >
                {isHidden
                  ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                  : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              <button
                onClick={() => removeSection(page, i)}
                className="p-1 rounded hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Remove section"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </CardHeader>

        {!isHidden && (
          <CardContent className="space-y-3 pt-0">
            {/* Image upload */}
            {hasImage && (
              <div>
                <Label className="text-xs">Section Image</Label>
                <div className="mt-1.5 flex items-start gap-3">
                  <div className="w-20 h-20 rounded border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                    {merged.image
                      ? <img src={merged.image} alt="" className="w-full h-full object-cover" />
                      : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline"
                      disabled={uploadingIdx?.page === page && uploadingIdx?.index === i} asChild>
                      <label className="cursor-pointer">
                        <Upload className="mr-1 h-3.5 w-3.5" />
                        {uploadingIdx?.page === page && uploadingIdx?.index === i ? 'Uploading…' : 'Replace'}
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(page, i, f); }} />
                      </label>
                    </Button>
                    {merged.image && (
                      <Button size="sm" variant="outline" onClick={() => updateField(page, i, 'image', '')}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                      </Button>
                    )}
                    {'image' in ov && (
                      <Button size="sm" variant="ghost" onClick={() => resetField(page, i, 'image')}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Editable text fields */}
            {editableTextKeys.map((k) => {
              const value = merged[k] ?? '';
              const isLong = k === 'sub' || k === 'body';
              return (
                <div key={k}>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs capitalize">{k.replace('_', ' ')}</Label>
                    {k in ov && (
                      <button onClick={() => resetField(page, i, k)}
                        className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5">
                        <RotateCcw className="h-3 w-3" /> reset
                      </button>
                    )}
                  </div>
                  {isLong
                    ? <Textarea rows={2} value={value}
                        onChange={(e) => updateField(page, i, k, e.target.value)} className="text-sm" />
                    : <Input value={value}
                        onChange={(e) => updateField(page, i, k, e.target.value)} className="h-8 text-sm" />}
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>
    );
  };

  // ── Add-section panel ──────────────────────────────────────────────────────

  const renderAddPanel = (page: string) => (
    <div className="border border-dashed rounded-lg p-4 space-y-3 bg-muted/30">
      <p className="text-xs font-medium text-muted-foreground">Add a section to this page</p>
      <div className="flex gap-2 flex-wrap">
        <Select value={newSectionType} onValueChange={setNewSectionType}>
          <SelectTrigger className="h-8 text-xs w-[220px]">
            <SelectValue placeholder="Choose section type…" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SECTION_CATALOGUE).map(([type, meta]) => (
              <SelectItem key={type} value={type} className="text-xs">
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={!newSectionType} onClick={() => addSection(page)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setAddingSection(false); setNewSectionType(''); }}>
          Cancel
        </Button>
      </div>
    </div>
  );

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Edit text and images, add or remove sections, and reorder them on each page.
        Changes are saved when you click <strong>Save All</strong>.
      </p>

      <Tabs
        defaultValue={activePage}
        onValueChange={(v) => { setActivePage(v); setAddingSection(false); setNewSectionType(''); }}
        className="w-full"
      >
        <TabsList className="flex flex-wrap h-auto gap-1 pb-2 border-b">
          {visiblePages.map((page) => (
            <TabsTrigger
              key={page}
              value={page}
              className="text-xs px-2 py-1.5 h-auto"
              title={PAGE_META[page]?.description}
            >
              {PAGE_META[page]?.icon && (
                <span className="mr-1 text-xs">{PAGE_META[page].icon}</span>
              )}
              {PAGE_META[page]?.label || page}
            </TabsTrigger>
          ))}
        </TabsList>

        {visiblePages.map((page) => {
          const sections = getSectionsList(page);
          return (
            <TabsContent key={page} value={page} className="space-y-3 pt-3">
              {sections.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    No sections on this page yet. Add one below.
                  </CardContent>
                </Card>
              ) : (
                sections.map((s: PageSection, i: number) =>
                  renderSection(page, s, i, sections.length),
                )
              )}

              {/* Add section button / panel */}
              {activePage === page && (
                addingSection
                  ? renderAddPanel(page)
                  : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-dashed text-muted-foreground hover:text-foreground"
                      onClick={() => setAddingSection(true)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Section
                    </Button>
                  )
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
