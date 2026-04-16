import { useState } from 'react';
import { useThemePacks, useGenerateThemePack, useUpdateThemePack, useDeleteThemePack, useAllThemePurchases, type ThemePack } from '@/hooks/useThemePacks';
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
import { Crown, Sparkles, Loader2, Palette, Trash2, Eye, IndianRupee, TrendingUp, Package, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

const CATEGORIES = ['fashion', 'food', 'electronics', 'beauty', 'health', 'sports', 'home-decor', 'general'];

const GenerateModal = ({ onClose }: { onClose: () => void }) => {
  const [category, setCategory] = useState('fashion');
  const [styleHints, setStyleHints] = useState('');
  const generate = useGenerateThemePack();

  const handleGenerate = async () => {
    await generate.mutateAsync({ category, styleHints: styleHints || undefined });
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Style Hints (optional)</Label>
        <Textarea
          value={styleHints}
          onChange={(e) => setStyleHints(e.target.value)}
          placeholder="e.g., minimalist, luxury gold & black, vibrant neon, earthy organic..."
          className="h-20"
        />
      </div>
      {generate.isPending && (
        <div className="bg-muted rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating theme with AI...
          </div>
          <p className="text-xs text-muted-foreground">This takes 30-60 seconds. Generating structure, colors, fonts, and images...</p>
          <div className="h-1.5 bg-background rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}
      <Button onClick={handleGenerate} disabled={generate.isPending} className="w-full">
        {generate.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate Theme Pack</>}
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
  const pages = pack.pages || {};
  const homeSections = pages.home || [];

  const SectionLabel = ({ label }: { label: string }) => (
    <div className="absolute top-1 left-1 bg-foreground/70 text-background text-[9px] font-semibold px-1.5 py-0.5 rounded z-10">
      {label}
    </div>
  );

  const WireframeBlock = ({ h = 'h-3', w = 'w-full' }: { h?: string; w?: string }) => (
    <div className={`${h} ${w} rounded bg-muted-foreground/20`} />
  );

  return (
    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      {/* Page: Header */}
      <div className="rounded-lg border bg-muted/30 p-3 relative">
        <SectionLabel label="Header / Navigation" />
        <div className="mt-5 flex items-center justify-between">
          <div className="h-6 w-20 rounded bg-muted-foreground/25" />
          <div className="flex gap-3">
            {['Home', 'Shop', 'About', 'Blog', 'Contact'].map(l => (
              <div key={l} className="h-3 w-10 rounded bg-muted-foreground/15" />
            ))}
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-5 rounded-full bg-muted-foreground/15" />
            <div className="h-5 w-5 rounded-full bg-muted-foreground/15" />
          </div>
        </div>
      </div>

      {/* Page: Hero Section */}
      <div className="rounded-lg border bg-muted/30 p-3 relative">
        <SectionLabel label="Hero Banner" />
        <div className="mt-5 h-28 rounded bg-muted-foreground/10 flex flex-col items-center justify-center gap-2">
          <WireframeBlock h="h-4" w="w-48" />
          <WireframeBlock h="h-3" w="w-64" />
          <div className="h-7 w-28 rounded bg-muted-foreground/25 mt-1" />
        </div>
      </div>

      {/* Home sections from theme data */}
      {homeSections.map((section: any, i: number) => (
        <div key={i} className="rounded-lg border bg-muted/30 p-3 relative">
          <SectionLabel label={section.type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || `Section ${i + 1}`} />
          <div className="mt-5">
            {section.type === 'featured_products' && (
              <div className="space-y-2">
                <WireframeBlock h="h-3" w="w-36" />
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} className="rounded border border-muted-foreground/10 overflow-hidden">
                      <div className="h-14 bg-muted-foreground/10" />
                      <div className="p-1.5 space-y-1">
                        <WireframeBlock h="h-2" w="w-3/4" />
                        <WireframeBlock h="h-2" w="w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {section.type === 'newsletter' && (
              <div className="flex flex-col items-center gap-2 py-2">
                <WireframeBlock h="h-3" w="w-40" />
                <div className="flex gap-2 w-full max-w-xs">
                  <div className="flex-1 h-7 rounded border border-muted-foreground/15" />
                  <div className="h-7 w-20 rounded bg-muted-foreground/25" />
                </div>
              </div>
            )}
            {section.type === 'text_block' && (
              <div className="flex flex-col items-center gap-1.5 py-2">
                <WireframeBlock h="h-3" w="w-44" />
                <WireframeBlock h="h-2" w="w-56" />
              </div>
            )}
            {section.type === 'hero' && (
              <div className="h-20 rounded bg-muted-foreground/10 flex flex-col items-center justify-center gap-1.5">
                <WireframeBlock h="h-3" w="w-32" />
                <WireframeBlock h="h-2" w="w-48" />
              </div>
            )}
            {!['featured_products', 'newsletter', 'text_block', 'hero'].includes(section.type) && (
              <div className="h-16 rounded bg-muted-foreground/8 flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground capitalize">{section.type?.replace(/_/g, ' ')}</span>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Page: Product Listing */}
      <div className="rounded-lg border bg-muted/30 p-3 relative">
        <SectionLabel label="Product Listing Page" />
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <WireframeBlock h="h-3" w="w-24" />
            <div className="flex gap-2">
              <div className="h-5 w-16 rounded border border-muted-foreground/15 bg-muted-foreground/5" />
              <div className="h-5 w-16 rounded border border-muted-foreground/15 bg-muted-foreground/5" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className="rounded border border-muted-foreground/10 overflow-hidden">
                <div className="h-16 bg-muted-foreground/10" />
                <div className="p-1.5 space-y-1">
                  <WireframeBlock h="h-2" w="w-3/4" />
                  <WireframeBlock h="h-2" w="w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Page: Product Detail */}
      <div className="rounded-lg border bg-muted/30 p-3 relative">
        <SectionLabel label="Product Detail Page" />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="h-32 rounded bg-muted-foreground/10" />
          <div className="space-y-2">
            <WireframeBlock h="h-4" w="w-3/4" />
            <WireframeBlock h="h-3" w="w-1/3" />
            <WireframeBlock h="h-2" w="w-full" />
            <WireframeBlock h="h-2" w="w-5/6" />
            <div className="flex gap-2 mt-3">
              <div className="h-7 w-24 rounded bg-muted-foreground/25" />
              <div className="h-7 w-20 rounded border border-muted-foreground/15" />
            </div>
          </div>
        </div>
      </div>

      {/* Page: Cart */}
      <div className="rounded-lg border bg-muted/30 p-3 relative">
        <SectionLabel label="Cart Page" />
        <div className="mt-5 space-y-2">
          {[1, 2].map(n => (
            <div key={n} className="flex items-center gap-3 p-2 rounded border border-muted-foreground/10">
              <div className="h-10 w-10 rounded bg-muted-foreground/10 shrink-0" />
              <div className="flex-1 space-y-1">
                <WireframeBlock h="h-2" w="w-2/3" />
                <WireframeBlock h="h-2" w="w-1/4" />
              </div>
              <div className="h-6 w-14 rounded border border-muted-foreground/15" />
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <div className="h-8 w-32 rounded bg-muted-foreground/25" />
          </div>
        </div>
      </div>

      {/* Page: Blog */}
      <div className="rounded-lg border bg-muted/30 p-3 relative">
        <SectionLabel label="Blog Page" />
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[1, 2, 3].map(n => (
            <div key={n} className="rounded border border-muted-foreground/10 overflow-hidden">
              <div className="h-12 bg-muted-foreground/10" />
              <div className="p-1.5 space-y-1">
                <WireframeBlock h="h-2" w="w-full" />
                <WireframeBlock h="h-2" w="w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Page: Footer */}
      <div className="rounded-lg border bg-muted/30 p-3 relative">
        <SectionLabel label="Footer" />
        <div className="mt-5 grid grid-cols-4 gap-3">
          {['Brand', 'Links', 'Support', 'Social'].map(col => (
            <div key={col} className="space-y-1.5">
              <WireframeBlock h="h-2.5" w="w-12" />
              <WireframeBlock h="h-2" w="w-16" />
              <WireframeBlock h="h-2" w="w-14" />
              <WireframeBlock h="h-2" w="w-10" />
            </div>
          ))}
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
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<ThemePack | null>(null);
  const [previewPack, setPreviewPack] = useState<ThemePack | null>(null);

  // Cost matrix calculations
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
          <DialogContent>
            <DialogHeader><DialogTitle>Generate Theme Pack with AI</DialogTitle></DialogHeader>
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
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Themes</p>
                <p className="text-2xl font-bold">{packs.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Published</p>
                <p className="text-2xl font-bold">{packs.filter(p => p.is_published).length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{totalSales}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p>
              </CardContent>
            </Card>
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
                      <Switch
                        checked={pack.is_published}
                        onCheckedChange={(checked) => updatePack.mutate({ id: pack.id, is_published: checked })}
                      />
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
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total AI Spend</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">₹{totalAiCost.toFixed(2)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Theme Revenue</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Net Profit</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">₹{(totalRevenue - totalAiCost).toFixed(2)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Avg ROI</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{totalAiCost > 0 ? `${Math.round(((totalRevenue - totalAiCost) / totalAiCost) * 100)}%` : 'N/A'}</p></CardContent>
            </Card>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{previewPack?.name} — Page Wireframes</DialogTitle></DialogHeader>
          {previewPack && <ThemePreviewModal pack={previewPack} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminThemes;
