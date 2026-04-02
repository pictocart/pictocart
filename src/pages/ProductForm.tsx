import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProducts, useProduct } from '@/hooks/useProducts';
import { useStore } from '@/hooks/useStore';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/integrations/supabase/client';
import ImageUploader from '@/components/products/ImageUploader';
import VariantMatrix, { type VariantOption } from '@/components/products/VariantMatrix';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Sparkles, Loader2, X, Save } from 'lucide-react';
import { toast } from 'sonner';

const ProductForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { store } = useStore();
  const { parentCategories, getSubcategories, loading: loadingCategories } = useCategories();
  const { createProduct, updateProduct } = useProducts();
  const { data: existingProduct, isLoading: loadingProduct } = useProduct(id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [category, setCategory] = useState('');
  const [sku, setSku] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [inventoryCount, setInventoryCount] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Populate form for edit
  useEffect(() => {
    if (existingProduct) {
      setTitle(existingProduct.title);
      setDescription(existingProduct.description || '');
      setShortDescription(existingProduct.short_description || '');
      setPrice(String(existingProduct.price));
      setCompareAtPrice(existingProduct.compare_at_price ? String(existingProduct.compare_at_price) : '');
      setCategory(existingProduct.category || '');
      setSku(existingProduct.sku || '');
      setTags((existingProduct.tags as string[]) || []);
      setImages((existingProduct.images as string[]) || []);
      setVariants((existingProduct.variants as unknown as VariantOption[]) || []);
      setInventoryCount(String(existingProduct.inventory_count ?? 0));
      setIsActive(existingProduct.is_active ?? true);
      setSeoTitle(existingProduct.seo_title || '');
      setSeoDescription(existingProduct.seo_description || '');
    }
  }, [existingProduct]);

  const generateWithAI = async () => {
    if (images.length === 0) {
      toast.error('Upload at least one image to generate with AI');
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-product', {
        body: { imageUrl: images[0], category: category || store?.category, storeName: store?.name },
      });
      if (error) throw error;
      const p = data.product;
      if (p.title) setTitle(p.title);
      if (p.description) setDescription(p.description);
      if (p.shortDescription) setShortDescription(p.shortDescription);
      if (p.suggestedPrice) setPrice(String(p.suggestedPrice));
      if (p.category) setCategory(p.category);
      if (p.tags) setTags(p.tags);
      if (p.seoTitle) setSeoTitle(p.seoTitle);
      if (p.seoDescription) setSeoDescription(p.seoDescription);
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

  const handleSave = async (asDraft: boolean) => {
    if (!title.trim()) {
      toast.error('Product title is required');
      return;
    }
    if (!price || Number(price) <= 0) {
      toast.error('Valid price is required');
      return;
    }
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
      is_active: asDraft ? false : isActive,
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
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
          <Button variant="outline" onClick={() => handleSave(true)} disabled={saving}>
            Save Draft
          </Button>
          <Button onClick={() => handleSave(false)} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            <Save className="mr-1 h-4 w-4" />
            {isEdit ? 'Update' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Images */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Images</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateWithAI}
                  disabled={aiLoading || images.length === 0}
                >
                  {aiLoading ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                  )}
                  {aiLoading ? 'Generating...' : 'Generate with AI'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ImageUploader images={images} onChange={setImages} />
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
                <Input
                  id="shortDesc"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="One-line summary"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Full product description..."
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comparePrice">Compare at Price (₹)</Label>
                  <Input
                    id="comparePrice"
                    type="number"
                    min="0"
                    value={compareAtPrice}
                    onChange={(e) => setCompareAtPrice(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Variants */}
          <Card>
            <CardContent className="pt-6">
              <VariantMatrix category={category} options={variants} onChange={setVariants} />
            </CardContent>
          </Card>
        </div>

        {/* Right column — sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm">{isActive ? 'Active' : 'Draft'}</span>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </CardContent>
          </Card>

          {/* Organization */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {parentCategories.length === 0 ? (
                      <SelectItem value="__none" disabled>No categories — create them first</SelectItem>
                    ) : (
                      parentCategories.map((parent) => {
                        const subs = getSubcategories(parent.id);
                        if (subs.length === 0) {
                          return <SelectItem key={parent.id} value={parent.name}>{parent.name}</SelectItem>;
                        }
                        return (
                          <SelectGroup key={parent.id}>
                            <SelectLabel className="text-xs font-semibold text-muted-foreground">{parent.name}</SelectLabel>
                            {subs.map((sub) => (
                              <SelectItem key={sub.id} value={`${parent.name} > ${sub.name}`}>
                                {sub.name}
                              </SelectItem>
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
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add tag..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1"
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={addTag}>
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map((t) => (
                      <Badge key={t} variant="secondary" className="gap-1 pr-1">
                        {t}
                        <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Inventory */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label htmlFor="inventory">Stock Quantity</Label>
                <Input
                  id="inventory"
                  type="number"
                  min="0"
                  value={inventoryCount}
                  onChange={(e) => setInventoryCount(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="seoTitle">SEO Title</Label>
                <Input
                  id="seoTitle"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Under 60 characters"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">{seoTitle.length}/60</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="seoDesc">SEO Description</Label>
                <Textarea
                  id="seoDesc"
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Under 160 characters"
                  maxLength={160}
                  rows={3}
                />
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
