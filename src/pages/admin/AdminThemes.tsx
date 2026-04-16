import { useState, useMemo } from 'react';
import { useThemePacks, useGenerateThemePack, useUpdateThemePack, useDeleteThemePack, useAllThemePurchases, useRemixTheme, type ThemePack } from '@/hooks/useThemePacks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Crown, Sparkles, Loader2, Palette, Trash2, Eye, IndianRupee, TrendingUp, Package, ExternalLink, Shuffle, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const CATEGORIES = ['fashion', 'food', 'electronics', 'beauty', 'health', 'sports', 'home-decor', 'general'];

const MOODS = ['Minimalist', 'Luxurious', 'Bold', 'Playful', 'Earthy', 'Futuristic', 'Vintage', 'Editorial'];
const CARD_EFFECTS = ['Glare', 'Tilt 3D', 'Lift Shadow', 'Border Glow', 'Zoom Image'];
const HERO_STYLES = ['Parallax', 'Ken Burns Zoom', 'Video Background', 'Split Layout', 'Full Bleed'];
const COLOR_MOODS = ['Warm', 'Cool', 'Monochrome', 'Vibrant', 'Pastel', 'Dark', 'Earth Tones'];
const TYPOGRAPHY_FEELS = ['Modern Sans', 'Classic Serif', 'Handwritten', 'Geometric', 'Mixed'];
const SECTIONS_OPTIONS = [
  'Announcement Bar', 'Testimonials', 'Countdown Timer', 'Trust Badges',
  'Brand Marquee', 'Instagram Feed', 'Collection Showcase', 'Newsletter',
  'Image With Text', 'FAQ Accordion',
];

const CATEGORY_DEFAULTS: Record<string, { mood: string; hero: string; cards: string[]; color: string; typo: string; sections: string[] }> = {
  fashion:      { mood: 'Luxurious',   hero: 'Parallax',       cards: ['Glare', 'Lift Shadow'],  color: 'Vibrant', typo: 'Modern Sans',   sections: ['Testimonials', 'Instagram Feed', 'Newsletter', 'Collection Showcase'] },
  food:         { mood: 'Earthy',      hero: 'Split Layout',   cards: ['Lift Shadow', 'Zoom Image'], color: 'Warm',  typo: 'Classic Serif', sections: ['Trust Badges', 'Testimonials', 'Newsletter', 'Image With Text'] },
  electronics:  { mood: 'Futuristic',  hero: 'Ken Burns Zoom', cards: ['Glare', 'Tilt 3D'],      color: 'Dark',    typo: 'Geometric',    sections: ['Trust Badges', 'Countdown Timer', 'Brand Marquee', 'Newsletter'] },
  beauty:       { mood: 'Minimalist',  hero: 'Full Bleed',     cards: ['Glare', 'Zoom Image'],   color: 'Pastel',  typo: 'Modern Sans',   sections: ['Testimonials', 'Instagram Feed', 'Newsletter', 'Image With Text'] },
  health:       { mood: 'Earthy',      hero: 'Split Layout',   cards: ['Lift Shadow'],           color: 'Earth Tones', typo: 'Modern Sans', sections: ['Trust Badges', 'Testimonials', 'Newsletter'] },
  sports:       { mood: 'Bold',        hero: 'Parallax',       cards: ['Tilt 3D', 'Lift Shadow'], color: 'Vibrant', typo: 'Geometric',    sections: ['Countdown Timer', 'Trust Badges', 'Brand Marquee', 'Newsletter'] },
  'home-decor': { mood: 'Minimalist',  hero: 'Ken Burns Zoom', cards: ['Lift Shadow', 'Zoom Image'], color: 'Warm', typo: 'Classic Serif', sections: ['Image With Text', 'Instagram Feed', 'Newsletter', 'Collection Showcase'] },
  general:      { mood: 'Bold',        hero: 'Full Bleed',     cards: ['Glare', 'Lift Shadow'],  color: 'Vibrant', typo: 'Modern Sans',   sections: ['Trust Badges', 'Newsletter', 'Testimonials'] },
};

const ChipSelect = ({ options, value, onChange, multi = false }: { options: string[]; value: string | string[]; onChange: (v: any) => void; multi?: boolean }) => {
  const selected = multi ? (value as string[]) : [value as string];
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => {
              if (multi) {
                const arr = value as string[];
                onChange(active ? arr.filter(v => v !== opt) : [...arr, opt]);
              } else {
                onChange(opt);
              }
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-border hover:bg-accent'}`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
};

const CollapsibleSection = ({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-semibold hover:text-primary transition-colors">
        {title}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const GenerateModal = ({ onClose }: { onClose: () => void }) => {
  const [category, setCategory] = useState('fashion');
  const defaults = CATEGORY_DEFAULTS[category] || CATEGORY_DEFAULTS.general;

  const [mood, setMood] = useState(defaults.mood);
  const [animIntensity, setAnimIntensity] = useState([65]);
  const [cardEffects, setCardEffects] = useState<string[]>(defaults.cards);
  const [heroStyle, setHeroStyle] = useState(defaults.hero);
  const [colorMood, setColorMood] = useState(defaults.color);
  const [typoFeel, setTypoFeel] = useState(defaults.typo);
  const [sections, setSections] = useState<string[]>(defaults.sections);
  const [specialReqs, setSpecialReqs] = useState('');

  const generate = useGenerateThemePack();

  const applyDefaults = (cat: string) => {
    const d = CATEGORY_DEFAULTS[cat] || CATEGORY_DEFAULTS.general;
    setMood(d.mood);
    setCardEffects(d.cards);
    setHeroStyle(d.hero);
    setColorMood(d.color);
    setTypoFeel(d.typo);
    setSections(d.sections);
  };

  const surpriseMe = () => {
    const r = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const rMulti = <T,>(arr: T[], n: number) => arr.sort(() => 0.5 - Math.random()).slice(0, n);
    setMood(r(MOODS));
    setAnimIntensity([Math.floor(Math.random() * 80) + 20]);
    setCardEffects(rMulti(CARD_EFFECTS, 2 + Math.floor(Math.random() * 2)));
    setHeroStyle(r(HERO_STYLES));
    setColorMood(r(COLOR_MOODS));
    setTypoFeel(r(TYPOGRAPHY_FEELS));
    setSections(rMulti(SECTIONS_OPTIONS, 4 + Math.floor(Math.random() * 4)));
  };

  const buildStyleHints = () => {
    const parts = [
      `Mood: ${mood}`,
      `Animation Intensity: ${animIntensity[0]}%`,
      `Card Effects: ${cardEffects.join(', ') || 'none'}`,
      `Hero Style: ${heroStyle}`,
      `Color Mood: ${colorMood}`,
      `Typography: ${typoFeel}`,
      `Include Sections: ${sections.join(', ')}`,
    ];
    if (specialReqs.trim()) parts.push(`Special: ${specialReqs.trim()}`);
    return parts.join('. ');
  };

  const handleGenerate = async () => {
    const styleHints = buildStyleHints();
    await generate.mutateAsync({ category, styleHints });
    onClose();
  };

  return (
    <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
      {/* Category + Surprise Me */}
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs font-semibold">Category</Label>
          <Select value={category} onValueChange={(v) => { setCategory(v); applyDefaults(v); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace('-', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={surpriseMe} className="gap-1.5 shrink-0">
          <Shuffle className="h-3.5 w-3.5" /> Surprise Me
        </Button>
      </div>

      <div className="border-t" />

      {/* Mood & Aesthetic */}
      <CollapsibleSection title="🎨 Mood & Aesthetic" defaultOpen>
        <ChipSelect options={MOODS} value={mood} onChange={setMood} />
      </CollapsibleSection>

      {/* Animation Intensity */}
      <CollapsibleSection title="✨ Animation Intensity" defaultOpen>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtle</span>
            <span className="font-semibold text-foreground">{animIntensity[0]}%</span>
            <span>Dramatic</span>
          </div>
          <Slider value={animIntensity} onValueChange={setAnimIntensity} min={10} max={100} step={5} />
        </div>
      </CollapsibleSection>

      {/* Card Effects */}
      <CollapsibleSection title="💎 Card Effects">
        <ChipSelect options={CARD_EFFECTS} value={cardEffects} onChange={setCardEffects} multi />
      </CollapsibleSection>

      {/* Hero Style */}
      <CollapsibleSection title="🖼️ Hero Style">
        <ChipSelect options={HERO_STYLES} value={heroStyle} onChange={setHeroStyle} />
      </CollapsibleSection>

      {/* Color Mood */}
      <CollapsibleSection title="🌈 Color Mood">
        <ChipSelect options={COLOR_MOODS} value={colorMood} onChange={setColorMood} />
      </CollapsibleSection>

      {/* Typography */}
      <CollapsibleSection title="🔤 Typography Feel">
        <ChipSelect options={TYPOGRAPHY_FEELS} value={typoFeel} onChange={setTypoFeel} />
      </CollapsibleSection>

      {/* Sections to Include */}
      <CollapsibleSection title="📄 Sections to Include" defaultOpen>
        <div className="grid grid-cols-2 gap-2">
          {SECTIONS_OPTIONS.map(sec => (
            <label key={sec} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent rounded px-2 py-1.5 transition-colors">
              <Checkbox
                checked={sections.includes(sec)}
                onCheckedChange={(checked) => {
                  setSections(checked ? [...sections, sec] : sections.filter(s => s !== sec));
                }}
              />
              {sec}
            </label>
          ))}
        </div>
      </CollapsibleSection>

      {/* Special Requests */}
      <CollapsibleSection title="💬 Special Requests">
        <Textarea
          value={specialReqs}
          onChange={e => setSpecialReqs(e.target.value)}
          placeholder="e.g., 'Use dark mode with neon accents', 'Add a video hero section with autoplay'..."
          className="h-16 text-xs"
        />
      </CollapsibleSection>

      {/* Cost Savings Indicator */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-1">
        <p className="text-xs font-semibold text-primary">💡 Smart Cost Optimization Active</p>
        <p className="text-[11px] text-muted-foreground">
          Two-tier AI prompting + image pool reuse. First theme in a category costs ~₹8-10. Subsequent themes drop to ₹0.50-1.50 as images are cached.
        </p>
      </div>

      {/* Generation Progress */}
      {generate.isPending && (
        <div className="bg-muted rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating premium theme with AI...
          </div>
          <p className="text-xs text-muted-foreground">Design DNA → Blueprint assembly → Image generation (parallel). ~10-30 seconds...</p>
          <div className="h-1.5 bg-background rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      <Button onClick={handleGenerate} disabled={generate.isPending} className="w-full" size="lg">
        {generate.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate Premium Theme</>}
      </Button>
    </div>
  );
};

const ThemePackEditor = ({ pack, onClose }: { pack: ThemePack; onClose: () => void }) => {
  const [name, setName] = useState(pack.name);
  const [description, setDescription] = useState(pack.description);
  const [price, setPrice] = useState(pack.price);
  const [category, setCategory] = useState(pack.category);
  const update = useUpdateThemePack();

  const handleSave = async () => {
    await update.mutateAsync({ id: pack.id, name, description, price, category });
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} className="h-20" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Price (₹)</Label>
          <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {pack.thumbnail && (
        <div>
          <Label className="text-xs">Thumbnail</Label>
          <img src={pack.thumbnail} alt={pack.name} className="mt-1 rounded-lg h-32 w-full object-cover" />
        </div>
      )}
      <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
        <p><strong>Pages:</strong> {Object.keys(pack.pages || {}).length} pages configured</p>
        <p><strong>Colors:</strong> {pack.theme_config?.colors ? Object.values(pack.theme_config.colors).join(', ') : 'N/A'}</p>
        <p><strong>Fonts:</strong> {pack.theme_config?.fonts ? `${pack.theme_config.fonts.heading} / ${pack.theme_config.fonts.body}` : 'N/A'}</p>
      </div>
      <Button onClick={handleSave} disabled={update.isPending} className="w-full">
        {update.isPending ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
};

const ThemePreviewModal = ({ pack }: { pack: ThemePack }) => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const previewUrl = `${window.location.origin}/store/preview-theme?theme=${pack.id}`;
  const widthMap = { desktop: '100%', tablet: '768px', mobile: '375px' };

  return (
    <div className="space-y-3">
      {/* Responsive toggles */}
      <div className="flex items-center justify-center gap-2">
        {(['desktop', 'tablet', 'mobile'] as const).map(vp => (
          <button
            key={vp}
            onClick={() => setViewport(vp)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all capitalize ${viewport === vp ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-border hover:bg-accent'}`}
          >
            {vp === 'desktop' ? '🖥️' : vp === 'tablet' ? '📱' : '📲'} {vp}
          </button>
        ))}
      </div>

      {/* Pages info */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <span className="text-xs text-muted-foreground">Pages:</span>
        {Object.keys(pack.pages || {}).map(page => (
          <span key={page} className="px-2 py-0.5 text-[10px] font-medium bg-secondary rounded-full capitalize">
            {page.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      {/* Iframe preview */}
      <div className="flex justify-center" style={{ minHeight: '500px' }}>
        <div
          className="border rounded-lg overflow-hidden shadow-lg transition-all duration-300 bg-white"
          style={{ width: widthMap[viewport], maxWidth: '100%', height: viewport === 'mobile' ? '667px' : viewport === 'tablet' ? '600px' : '500px' }}
        >
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title={`${pack.name} Preview`}
            style={{ transform: viewport === 'desktop' ? 'scale(0.65)' : viewport === 'tablet' ? 'scale(0.75)' : 'scale(0.85)', transformOrigin: 'top left', width: viewport === 'desktop' ? '153.8%' : viewport === 'tablet' ? '133.3%' : '117.6%', height: viewport === 'desktop' ? '153.8%' : viewport === 'tablet' ? '133.3%' : '117.6%' }}
          />
        </div>
      </div>
    </div>
  );
};

const AdminThemes = () => {
  const { data: packs = [], isLoading } = useThemePacks(false);
  const { data: allPurchases = [] } = useAllThemePurchases();
  const updatePack = useUpdateThemePack();
  const deletePack = useDeleteThemePack();
  const remixTheme = useRemixTheme();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<ThemePack | null>(null);
  const [previewPack, setPreviewPack] = useState<ThemePack | null>(null);

  const totalAiCost = packs.reduce((s, p) => s + Number(p.ai_generation_cost), 0);
  const totalRevenue = packs.reduce((s, p) => s + (p.price * p.sales_count), 0);
  const totalSales = packs.reduce((s, p) => s + p.sales_count, 0);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Theme Marketplace</h1>
          <p className="text-sm text-muted-foreground">Generate, manage, and sell AI-powered theme packs</p>
        </div>
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogTrigger asChild>
            <Button><Sparkles className="mr-2 h-4 w-4" /> Generate with AI</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Generate Premium Theme Pack</DialogTitle></DialogHeader>
            <GenerateModal onClose={() => setGenerateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="themes">
        <TabsList>
          <TabsTrigger value="themes"><Package className="mr-1.5 h-3.5 w-3.5" /> Themes ({packs.length})</TabsTrigger>
          <TabsTrigger value="economics"><IndianRupee className="mr-1.5 h-3.5 w-3.5" /> Cost Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="themes" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Themes</p><p className="text-2xl font-bold">{packs.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Published</p><p className="text-2xl font-bold">{packs.filter(p => p.is_published).length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Sales</p><p className="text-2xl font-bold">{totalSales}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Revenue</p><p className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p></CardContent></Card>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : packs.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <Palette className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">No theme packs yet. Generate your first one!</p>
              <Button onClick={() => setGenerateOpen(true)}><Sparkles className="mr-2 h-4 w-4" /> Generate Theme</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {packs.map(pack => (
                <Card key={pack.id} className="overflow-hidden">
                  {pack.thumbnail ? (
                    <img src={pack.thumbnail} alt={pack.name} className="h-36 w-full object-cover" />
                  ) : (
                    <div className="h-36 flex gap-0.5">
                      {Object.values(pack.theme_config?.colors || {}).slice(0, 6).map((c: any, i) => (
                        <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  )}
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-sm">{pack.name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">{pack.category}</p>
                      </div>
                      <Badge variant={pack.is_published ? 'default' : 'secondary'}>
                        {pack.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{pack.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold">₹{pack.price}</span>
                      <span className="text-muted-foreground">{pack.sales_count} sales · AI Cost ₹{Number(pack.ai_generation_cost).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch checked={pack.is_published} onCheckedChange={(checked) => updatePack.mutate({ id: pack.id, is_published: checked })} />
                      <span className="text-xs text-muted-foreground">Published</span>
                      <div className="flex-1" />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewPack(pack)} title="Wireframe preview">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        const previewUrl = `${window.location.origin}/store/preview-theme?theme=${pack.id}`;
                        window.open(previewUrl, '_blank');
                      }} title="Open full preview in new tab">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        if (confirm(`Remix "${pack.name}" with new colors & fonts? (Cost: ~₹0.10-0.30)`)) remixTheme.mutate(pack.id);
                      }} title="Remix with new colors/fonts" disabled={remixTheme.isPending}>
                        {remixTheme.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shuffle className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingPack(pack)}>
                        <Palette className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                        if (confirm('Delete this theme pack?')) deletePack.mutate(pack.id);
                      }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="economics" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total AI Spend</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{totalAiCost.toFixed(2)}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Theme Revenue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Net Profit</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{(totalRevenue - totalAiCost).toFixed(2)}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Avg ROI</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalAiCost > 0 ? `${Math.round(((totalRevenue - totalAiCost) / totalAiCost) * 100)}%` : 'N/A'}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Per-Theme Economics</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Theme</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">AI Cost</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packs.map(pack => {
                    const rev = pack.price * pack.sales_count;
                    const cost = Number(pack.ai_generation_cost);
                    const profit = rev - cost;
                    const roi = cost > 0 ? Math.round((profit / cost) * 100) : 0;
                    return (
                      <TableRow key={pack.id}>
                        <TableCell className="font-medium text-sm">{pack.name}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize text-xs">{pack.category}</Badge></TableCell>
                        <TableCell className="text-right text-sm">₹{cost.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-sm">₹{pack.price}</TableCell>
                        <TableCell className="text-right text-sm">{pack.sales_count}</TableCell>
                        <TableCell className="text-right text-sm">₹{rev.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-right text-sm font-medium" style={{ color: profit >= 0 ? '#16a34a' : '#dc2626' }}>₹{profit.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-sm">{roi}%</TableCell>
                      </TableRow>
                    );
                  })}
                  {packs.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No themes generated yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={!!editingPack} onOpenChange={(o) => !o && setEditingPack(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Theme Pack</DialogTitle></DialogHeader>
          {editingPack && <ThemePackEditor pack={editingPack} onClose={() => setEditingPack(null)} />}
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewPack} onOpenChange={(o) => !o && setPreviewPack(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{previewPack?.name} — Live Preview</DialogTitle></DialogHeader>
          {previewPack && <ThemePreviewModal pack={previewPack} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminThemes;
