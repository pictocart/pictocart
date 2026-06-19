import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProducts, useProduct } from '@/hooks/useProducts';
import { useStore } from '@/hooks/useStore';
import { useCategories } from '@/hooks/useCategories';
import { useSubscription, PLAN_LIMITS } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import ImageUploader from '@/components/products/ImageUploader';
import VideoUploader from '@/components/products/VideoUploader';
import VoiceVideoRecorder from '@/components/products/VoiceVideoRecorder';
import VariantMatrix, { type VariantOption } from '@/components/products/VariantMatrix';
import ProductTypeFields, { PRODUCT_TYPES, getDefaultProductType, type ProductType } from '@/components/products/ProductTypeFields';
import ProductPreviewCard from '@/components/products/ProductPreviewCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Sparkles, Loader2, X, Save, Plus, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useAICredits } from '@/hooks/useAICredits';
import RechargeSheet from '@/components/wallet/RechargeSheet';

const ProductForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { store } = useStore();
  const { parentCategories, getSubcategories, loading: loadingCategories } = useCategories();
  const { products, createProduct, updateProduct } = useProducts();
  const { plan, limits } = useSubscription();
  const { data: existingProduct, isLoading: loadingProduct } = useProduct(id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [productHint, setProductHint] = useState('');
  const [category, setCategory] = useState('');
  const [sku, setSku] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [productVideos, setProductVideos] = useState<string[]>([]);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [inventoryCount, setInventoryCount] = useState('0');
  const [costPrice, setCostPrice] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productType, setProductType] = useState<ProductType>(getDefaultProductType(store?.category));
  const [typeMetadata, setTypeMetadata] = useState<Record<string, any>>({});
  const [highlights, setHighlights] = useState<string[]>([]);
  const [highlightInput, setHighlightInput] = useState('');
  const [descriptionTab, setDescriptionTab] = useState('plain');
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const aiCredits = useAICredits({ onInsufficient: () => setRechargeOpen(true) });

  // Populate form for edit
  useEffect(() => {
    if (existingProduct) {
      setTitle(existingProduct.title);
      setDescription(existingProduct.description || '');
      setShortDescription(existingProduct.short_description || '');
      setPrice(String(existingProduct.price));
      setCompareAtPrice(existingProduct.compare_at_price ? String(existingProduct.compare_at_price) : '');
      if (existingProduct.compare_at_price && existingProduct.price) {
        const disc = Math.round(((existingProduct.compare_at_price - existingProduct.price) / existingProduct.compare_at_price) * 100);
        if (disc > 0) setDiscountPercent(String(disc));
      }
      const aiData = (existingProduct.ai_generated_data || {}) as Record<string, any>;
      if (aiData.product_hint) setProductHint(aiData.product_hint);
      setCategory(existingProduct.category || '');
      setSku(existingProduct.sku || '');
      setTags((existingProduct.tags as string[]) || []);
      setImages((existingProduct.images as string[]) || []);
      setVariants((existingProduct.variants as unknown as VariantOption[]) || []);
      setInventoryCount(String(existingProduct.inventory_count ?? 0));
      setCostPrice(existingProduct.cost_price ? String(existingProduct.cost_price) : '');
      setTaxRate((existingProduct as any).tax_rate ? String((existingProduct as any).tax_rate) : '');
      setIsActive(existingProduct.is_active ?? true);
      setSeoTitle(existingProduct.seo_title || '');
      setSeoDescription(existingProduct.seo_description || '');
      if (aiData.product_type) setProductType(aiData.product_type as ProductType);
      if (aiData.highlights) setHighlights(aiData.highlights);
      if (Array.isArray(aiData.product_videos)) setProductVideos(aiData.product_videos);
      const { product_type, highlights: _h, product_hint: _hint, product_videos: _pv, ...rest } = aiData;
      setTypeMetadata(rest);
    }
  }, [existingProduct]);

  const generateWithAI = async () => {
    if (images.length === 0) { toast.error('Upload at least one image to generate with AI'); return; }
    setAiLoading(true);
    try {
      const { data, insufficient } = await aiCredits.invoke<{ product: any }>('generate-product', {
        imageUrl: images[0], category: category || store?.category, storeName: store?.name, productType, productHint: productHint || undefined,
      });
      if (insufficient) { setRechargeOpen(true); return; }
      if (!data) return;
      const p = data.product;
      if (p.title) setTitle(p.title);
      if (p.description) setDescription(p.description);
      if (p.shortDescription) setShortDescription(p.shortDescription);
      if (p.suggestedPrice) setPrice(String(p.suggestedPrice));
      if (p.category) setCategory(p.category);
      if (p.tags) setTags(p.tags);
      if (p.seoTitle) setSeoTitle(p.seoTitle);
      if (p.seoDescription) setSeoDescription(p.seoDescription);
      if (p.highlights) setHighlights(p.highlights);
      if (p.product_type) setProductType(p.product_type as ProductType);
      if (p.metadata && typeof p.metadata === 'object') {
        setTypeMetadata((prev) => ({ ...prev, ...p.metadata }));
      }
      toast.success('AI generated product details!');
    } catch (err: any) {
      toast.error(err.message || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const addHighlight = () => {
    const h = highlightInput.trim();
    if (h) setHighlights([...highlights, h]);
    setHighlightInput('');
  };

  const handleSave = async (asDraft: boolean) => {
    if (!isEdit && typeof limits.products === 'number' && products.length >= limits.products) {
      toast.error(`Free plan allows only ${limits.products} products. Upgrade to Premium for unlimited.`);
      navigate('/billing');
      return;
    }
    if (!title.trim()) { toast.error('Product title is required'); return; }
    if (!price || Number(price) <= 0) { toast.error('Valid price is required'); return; }
    setSaving(true);
    const payload = {
      title: title.trim(),
      description,
      short_description: shortDescription,
      price: Number(price),
      compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
      category: category || null,
      sku: sku || null,
      tags,
      images,
      variants: variants as any,
      inventory_count: Number(inventoryCount) || 0,
      cost_price: costPrice ? Number(costPrice) : 0,
      tax_rate: taxRate ? Number(taxRate) : 0,
      is_active: asDraft ? false : isActive,
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
      ai_generated_data: { product_type: productType, highlights, product_hint: productHint || undefined, product_videos: productVideos, ...typeMetadata } as any,
    };

    try {
      if (isEdit && id) {
        await updateProduct.mutateAsync({ id, ...payload });
      } else {
        await createProduct.mutateAsync(payload);
      }
      navigate('/products');
    } catch {
      // error toasted by hook
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && loadingProduct) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20 md:pb-0">
      <RechargeSheet open={rechargeOpen} onOpenChange={setRechargeOpen} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/products')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{isEdit ? 'Edit Product' : 'Add Product'}</h1>
            <p className="text-sm text-muted-foreground">
              {isEdit ? 'Update product details' : 'Upload an image and let AI do the rest'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave(true)} disabled={saving}>Save Draft</Button>
          <Button data-tour="product-save" onClick={() => handleSave(false)} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            <Save className="mr-1 h-4 w-4" />
            {isEdit ? 'Update' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Product Type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Product Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={productType} onValueChange={(v) => setProductType(v as ProductType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Images & Product Hint */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Images & Product Hint</CardTitle>
                <Button data-tour="product-ai-fill" variant="outline" size="sm" onClick={generateWithAI} disabled={aiLoading || images.length === 0}>
                  {aiLoading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
                  {aiLoading ? 'Generating...' : 'Generate with AI'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div data-tour="product-image">
                <ImageUploader
                  images={images}
                  onChange={setImages}
                  enableAI={/food|beverage|restaurant|cafe|bakery|cloud kitchen/i.test(String(store?.category || ''))}
                  aiContext={{ productName: title, category: category || store?.category, storeName: store?.name }}
                  onInsufficientCredits={() => setRechargeOpen(true)}
                />
              </div>
              {images.length > 0 && images.length < 4 && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  💡 Upload 4–5 photos from different angles for much better AI-generated details and a richer product page.
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="productHint">One-liner about this product</Label>
                <Input
                  id="productHint"
                  value={productHint}
                  onChange={(e) => setProductHint(e.target.value)}
                  placeholder="e.g. Georgette saree with stone work and shimmer finish"
                />
                <p className="text-[11px] text-muted-foreground">
                  Briefly describe the product in your own words — this helps AI generate accurate details.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Product Video & Voiceover */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Video & Voiceover</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <VideoUploader videos={productVideos} onChange={setProductVideos} maxVideos={2} />
              <VoiceVideoRecorder
                videoUrl={productVideos[0] || null}
                onMerged={(url) => setProductVideos((prev) => [url, ...prev.slice(1)])}
              />
            </CardContent>
          </Card>

          {/* Basic info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Product Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product title" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shortDesc">Short Description</Label>
                <Input id="shortDesc" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="One-line summary" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Tabs value={descriptionTab} onValueChange={setDescriptionTab}>
                  <TabsList className="h-8">
                    <TabsTrigger value="plain" className="text-xs px-3 h-7">Plain Text</TabsTrigger>
                    <TabsTrigger value="highlights" className="text-xs px-3 h-7">Key Highlights</TabsTrigger>
                  </TabsList>
                  <TabsContent value="plain">
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Full product description..." rows={5} />
                  </TabsContent>
                  <TabsContent value="highlights">
                    <div className="space-y-2">
                      {highlights.map((h, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <GripVertical className="h-3.5 w-3.5 opacity-30" />
                          <span className="flex-1">{h}</span>
                          <button onClick={() => setHighlights(highlights.filter((_, j) => j !== i))} className="text-destructive hover:opacity-70">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          value={highlightInput}
                          onChange={(e) => setHighlightInput(e.target.value)}
                          placeholder="Add a key feature..."
                          className="flex-1"
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHighlight())}
                        />
                        <Button type="button" variant="secondary" size="sm" onClick={addHighlight}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Category-specific fields */}
          {productType !== 'physical' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{PRODUCT_TYPES.find(t => t.value === productType)?.label} Details</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductTypeFields
                  productType={productType}
                  metadata={typeMetadata}
                  onChange={(key, value) => setTypeMetadata((prev) => ({ ...prev, [key]: value }))}
                />
              </CardContent>
            </Card>
          )}

          {/* Pricing & Discount */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Pricing & Discount</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="comparePrice">MRP (₹)</Label>
                  <Input
                    id="comparePrice"
                    type="number"
                    min="0"
                    value={compareAtPrice}
                    onChange={(e) => {
                      const mrp = e.target.value;
                      setCompareAtPrice(mrp);
                      if (mrp && discountPercent) {
                        const selling = Math.round(Number(mrp) * (1 - Number(discountPercent) / 100));
                        setPrice(String(selling));
                      } else if (mrp && !discountPercent) {
                        setPrice(mrp);
                      }
                    }}
                    placeholder="Maximum Retail Price"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="discount">Discount (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="99"
                    value={discountPercent}
                    onChange={(e) => {
                      const disc = e.target.value;
                      setDiscountPercent(disc);
                      if (compareAtPrice && disc) {
                        const selling = Math.round(Number(compareAtPrice) * (1 - Number(disc) / 100));
                        setPrice(String(selling));
                      } else if (compareAtPrice && !disc) {
                        setPrice(compareAtPrice);
                      }
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price">Selling Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => {
                    const sp = e.target.value;
                    setPrice(sp);
                    if (compareAtPrice && sp) {
                      const disc = Math.round(((Number(compareAtPrice) - Number(sp)) / Number(compareAtPrice)) * 100);
                      setDiscountPercent(disc > 0 ? String(disc) : '');
                    }
                  }}
                  placeholder="Auto-calculated or enter manually"
                />
              </div>
              {Number(compareAtPrice) > 0 && Number(price) > 0 && Number(price) < Number(compareAtPrice) && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                  <span className="line-through text-muted-foreground">₹{Number(compareAtPrice).toLocaleString('en-IN')}</span>
                  <span className="font-bold text-green-700">₹{Number(price).toLocaleString('en-IN')}</span>
                  <Badge className="bg-green-600 text-white text-[10px]">{discountPercent || Math.round(((Number(compareAtPrice) - Number(price)) / Number(compareAtPrice)) * 100)}% OFF</Badge>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cost_price">Cost Price (₹)</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="What you paid"
                  />
                  <p className="text-[11px] text-muted-foreground">Used for COGS in Profit &amp; Loss</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tax_rate">GST Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    min="0"
                    max="28"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    placeholder="0, 5, 12, 18, 28"
                  />
                  <p className="text-[11px] text-muted-foreground">Inclusive in selling price</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-tour="product-variants">
            <CardContent className="pt-6">
              <VariantMatrix category={category} options={variants} onChange={setVariants} />
            </CardContent>
          </Card>
        </div>

        {/* Right column — sidebar */}
        <div className="space-y-6">
          {/* Live Preview */}
          <ProductPreviewCard
            title={title}
            price={price}
            compareAtPrice={compareAtPrice}
            image={images[0]}
            category={category}
          />

          {/* Status */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Status</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm">{isActive ? 'Active' : 'Draft'}</span>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </CardContent>
          </Card>

          {/* Organization */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Organization</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {parentCategories.length === 0 ? (
                      <SelectItem value="__none" disabled>No categories — create them first</SelectItem>
                    ) : (
                      parentCategories.map((parent) => {
                        const subs = getSubcategories(parent.id);
                        if (subs.length === 0) return <SelectItem key={parent.id} value={parent.name}>{parent.name}</SelectItem>;
                        return (
                          <SelectGroup key={parent.id}>
                            <SelectLabel className="text-xs font-semibold text-muted-foreground">{parent.name}</SelectLabel>
                            {subs.map((sub) => (
                              <SelectItem key={sub.id} value={`${parent.name} > ${sub.name}`}>{sub.name}</SelectItem>
                            ))}
                          </SelectGroup>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="ABC-123" />
              </div>
              <div className="space-y-1.5">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag..." onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} className="flex-1" />
                  <Button type="button" variant="secondary" size="sm" onClick={addTag}>Add</Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map((t) => (
                      <Badge key={t} variant="secondary" className="gap-1 pr-1">
                        {t}
                        <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Inventory */}
          <Card data-tour="product-inventory">
            <CardHeader className="pb-3"><CardTitle className="text-base">Inventory</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label htmlFor="inventory">Stock Quantity</Label>
                <Input id="inventory" type="number" min="0" value={inventoryCount} onChange={(e) => setInventoryCount(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card data-tour="product-seo">
            <CardHeader className="pb-3"><CardTitle className="text-base">SEO</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="seoTitle">SEO Title</Label>
                <Input id="seoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Under 60 characters" maxLength={60} />
                <p className="text-xs text-muted-foreground">{seoTitle.length}/60</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="seoDesc">SEO Description</Label>
                <Textarea id="seoDesc" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="Under 160 characters" maxLength={160} rows={3} />
                <p className="text-xs text-muted-foreground">{seoDescription.length}/160</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
