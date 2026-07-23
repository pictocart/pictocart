import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProducts, useProduct } from '@/hooks/useProducts';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { useCategories } from '@/hooks/useCategories';
import { useSubscription, PLAN_LIMITS } from '@/hooks/useSubscription';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Sparkles, Loader2, X, Save, Plus, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useAICredits } from '@/hooks/useAICredits';
import RechargeSheet from '@/components/wallet/RechargeSheet';

async function generateProductViaNvidiaFallback(
  imageUrl: string,
  category?: string,
  storeName?: string,
  productType?: string,
  productHint?: string
) {
  let base64ImageUrl = imageUrl;
  if (imageUrl.startsWith("http")) {
    try {
      if (imageUrl.includes("/storage/v1/object/public/")) {
        const parts = imageUrl.split("/storage/v1/object/public/");
        const pathParts = parts[1].split("/");
        const bucket = pathParts[0];
        const filePath = pathParts.slice(1).join("/");
        
        const { data: blob, error } = await supabase.storage.from(bucket).download(filePath);
        if (!error && blob) {
          base64ImageUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
      } else {
        const imgRes = await fetch(imageUrl);
        if (imgRes.ok) {
          const arrayBuffer = await imgRes.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          let binary = "";
          const len = uint8.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8[i]);
          }
          const base64 = btoa(binary);
          const contentType = imgRes.headers.get("content-type") || "image/jpeg";
          base64ImageUrl = `data:${contentType};base64,${base64}`;
        }
      }
    } catch (err) {
      console.error("Failed to convert image to base64 for NVIDIA client-side fallback:", err);
    }
  }

  let metadataDesc = "";
  const typeKey = (productType || "physical").toLowerCase();
  if (typeKey.includes("food")) {
    metadataDesc = "- metadata: Object with keys: ingredients, nutritional_info, shelf_life, allergens";
  } else if (typeKey.includes("fashion")) {
    metadataDesc = "- metadata: Object with keys: material, care_instructions, fit_type, gender";
  } else if (typeKey.includes("electronics")) {
    metadataDesc = "- metadata: Object with keys: warranty_period, model_number, power_rating, connectivity";
  } else if (typeKey.includes("beauty")) {
    metadataDesc = "- metadata: Object with keys: ingredients, skin_type, usage_instructions, expiry_date";
  } else if (typeKey.includes("handmade")) {
    metadataDesc = "- metadata: Object with keys: making_time, material, customization_available (boolean)";
  } else if (typeKey.includes("digital")) {
    metadataDesc = "- metadata: Object with keys: file_format, license_type";
  } else if (typeKey.includes("service")) {
    metadataDesc = "- metadata: Object with keys: duration, delivery_method, booking_required (boolean)";
  } else {
    metadataDesc = "- metadata: empty object {}";
  }

  const normalizedType = typeKey.includes("food") ? "food" :
                         typeKey.includes("fashion") ? "fashion" :
                         typeKey.includes("electronics") ? "electronics" :
                         typeKey.includes("beauty") ? "beauty" :
                         typeKey.includes("handmade") ? "handmade" :
                         typeKey.includes("digital") ? "digital" :
                         typeKey.includes("service") ? "service" : "physical";

  const prompt = `You are an expert e-commerce product analyst.
Analyze this product image and generate COMPREHENSIVE product details. Fill EVERY field.
Store name: ${storeName || "Pic To Cart"}
Store category: ${category || "general"}
Product type: ${normalizedType}
${productHint ? `Hint: ${productHint}` : ""}

Return a single JSON object with these fields:
- title: Catchy product title (2-6 words)
- description: Detailed description (60-120 words), features + benefits
- shortDescription: One-line summary (under 20 words)
- tags: Array of 5-8 search tags
- category: Best-fit product category
- suggestedPrice: Suggested INR price (number)
- seoTitle: SEO title (under 60 chars)
- seoDescription: SEO meta description (under 160 chars)
- highlights: Array of 4-6 short bullet selling points
- product_type: "${normalizedType}"
${metadataDesc}

Rules:
- Respond ONLY with a valid JSON object. Do not include markdown fences, backticks, or any conversational text.`;

  const apiKey = "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";
  
  try {
    const response = await fetch("/api/nvidia/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta/llama-3.2-11b-vision-instruct",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt + "\n\nCRITICAL: Return ONLY a raw valid JSON object. Do not include markdown blocks or backticks." },
              { type: "image_url", image_url: { url: base64ImageUrl } }
            ]
          }
        ]
      })
    });

    if (response.ok) {
      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content || "";
      return parseRobustProductJSON(content);
    }
  } catch (e) {
    console.error("NVIDIA local model 1 fallback failed:", e);
    if (e instanceof Error && e.message.startsWith("AI refusal")) throw e;
  }

  const response = await fetch("/api/nvidia/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "meta/llama-3.2-90b-vision-instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt + "\n\nCRITICAL: Return ONLY a raw valid JSON object. Do not include markdown blocks or backticks." },
            { type: "image_url", image_url: { url: base64ImageUrl } }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`NVIDIA Vision Error: ${response.status} - ${txt}`);
  }

  const aiData = await response.json();
  const content = aiData.choices?.[0]?.message?.content || "";
  return parseRobustProductJSON(content);
}

function parseRobustProductJSON(text: string): any {
  const cleaned = text.trim();
  try {
    return JSON.parse(cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch (parseErr) {
    console.warn("Standard JSON parsing failed, attempting fallback markdown extraction...");
    
    if (cleaned.toLowerCase().includes("cannot") || cleaned.toLowerCase().includes("sorry") || cleaned.toLowerCase().includes("unable")) {
      throw new Error(`AI refusal: ${cleaned}`);
    }

    const result: any = {
      title: "",
      description: "",
      shortDescription: "",
      tags: [],
      category: "",
      suggestedPrice: 0,
      seoTitle: "",
      seoDescription: "",
      highlights: [],
      product_type: "physical",
      metadata: {}
    };

    const lines = cleaned.split("\n");
    let currentKey = "";
    let currentTextBuffer = "";

    const keyMap: Record<string, string> = {
      title: "title",
      description: "description",
      "short description": "shortDescription",
      shortdescription: "shortDescription",
      tags: "tags",
      category: "category",
      "suggested price": "suggestedPrice",
      suggestedprice: "suggestedPrice",
      price: "suggestedPrice",
      "seo title": "seoTitle",
      seotitle: "seoTitle",
      "seo description": "seoDescription",
      seodescription: "seoDescription",
      highlights: "highlights",
      "product type": "product_type",
      product_type: "product_type"
    };

    const assignField = (obj: any, key: string, val: string) => {
      if (key === "title") obj.title = val;
      else if (key === "description") obj.description = val;
      else if (key === "shortDescription") obj.shortDescription = val;
      else if (key === "tags") obj.tags = val;
      else if (key === "category") obj.category = val;
      else if (key === "suggestedPrice") obj.suggestedPrice = val;
      else if (key === "seoTitle") obj.seoTitle = val;
      else if (key === "seoDescription") obj.seoDescription = val;
      else if (key === "highlights") obj.highlights = val;
      else if (key === "product_type") obj.product_type = val;
      else {
        obj.metadata[key] = val;
      }
    };

    for (const line of lines) {
      const match = line.match(/^\s*[\*\-]?\s*\*\*([^*]+)\*\*:\s*(.*)$/i);
      if (match) {
        if (currentKey && currentTextBuffer) {
          assignField(result, currentKey, currentTextBuffer.trim());
        }
        const boldKey = match[1].toLowerCase().trim().replace(/_/g, " ");
        currentKey = keyMap[boldKey] || boldKey;
        currentTextBuffer = match[2] || "";
      } else {
        if (currentKey) {
          const listMatch = line.match(/^\s*[\*\-\+]\s*(.*)$/);
          if (listMatch) {
            currentTextBuffer += "\n" + listMatch[1];
          } else {
            currentTextBuffer += " " + line.trim();
          }
        }
      }
    }

    if (currentKey && currentTextBuffer) {
      assignField(result, currentKey, currentTextBuffer.trim());
    }

    if (typeof result.highlights === "string") {
      result.highlights = result.highlights.split("\n").map((h: string) => h.replace(/^\s*[\*\-\+]\s*/, "").trim()).filter(Boolean);
    }
    if (typeof result.tags === "string") {
      result.tags = result.tags.split(/,/).map((t: string) => t.trim().replace(/^\s*[\*\-\+]\s*/, "")).filter(Boolean);
    }
    if (typeof result.suggestedPrice === "string") {
      const numeric = result.suggestedPrice.replace(/[^0-9]/g, "");
      result.suggestedPrice = numeric ? Number(numeric) : 0;
    }

    if (!result.title && result.description) {
      result.title = result.description.split(" ").slice(0, 4).join(" ");
    }

    return result;
  }
}

const ProductForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { store, setStore } = useStore();
  const { parentCategories, getSubcategories, createCategory, loading: loadingCategories } = useCategories();
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
  const [isReturnable, setIsReturnable] = useState(true);
  const [isExchangeable, setIsExchangeable] = useState(true);
  const [returnWindowDays, setReturnWindowDays] = useState('7');
  const [exchangeWindowDays, setExchangeWindowDays] = useState('7');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productType, setProductType] = useState<ProductType>(getDefaultProductType(store?.category));
  const [typeMetadata, setTypeMetadata] = useState<Record<string, any>>({});

  // Pre-fill FSSAI license from store settings once store is loaded (new product only)
  useEffect(() => {
    if (!isEdit && store) {
      const fssai = (store.settings as any)?.fssai;
      if (fssai) {
        setTypeMetadata((prev) => ({ fssai_license: fssai, ...prev }));
      }
    }
  }, [store, isEdit]);

  // When user fills FSSAI in product form, persist it back to store settings so it prefills next time
  const handleTypeMetadataChange = async (key: string, value: any) => {
    setTypeMetadata((prev) => ({ ...prev, [key]: value }));
    if (key === 'fssai_license' && store && value && String(value).length === 14) {
      const updatedSettings = { ...((store.settings as any) || {}), fssai: value };
      const { error } = await supabase.from('stores').update({ settings: updatedSettings }).eq('id', store.id);
      if (!error) setStore({ ...store, settings: updatedSettings });
    }
  };
  const [highlights, setHighlights] = useState<string[]>([]);
  const [highlightInput, setHighlightInput] = useState('');
  const [descriptionTab, setDescriptionTab] = useState('plain');
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [newCatDialogOpen, setNewCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSaving, setNewCatSaving] = useState(false);
  const aiCredits = useAICredits({ onInsufficient: () => setRechargeOpen(true) });

  const [dbQuestions, setDbQuestions] = useState<any[]>([]);

  useEffect(() => {
    const fetchDbQuestions = async () => {
      if (!id) return;
      const { data } = await supabase
        .from('product_questions')
        .select('*')
        .eq('product_id', id)
        .order('created_at', { ascending: true });
      if (data) {
        setDbQuestions(data);
      }
    };
    if (isEdit) {
      fetchDbQuestions();
    }
  }, [id, isEdit]);

  // AI Product Reviews states
  const [genReviewsOpen, setGenReviewsOpen] = useState(false);
  const [reviewCount, setReviewCount] = useState('3');
  const [sentiment, setSentiment] = useState('positive');
  const [generatingReviews, setGeneratingReviews] = useState(false);

  const handleGenerateReviews = async () => {
    if (!id || !store?.id) return;
    setGeneratingReviews(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-reviews', {
        body: {
          store_id: store.id,
          product_id: id,
          count: parseInt(reviewCount),
          sentiment,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast.success(`Successfully generated ${data.count} AI reviews!`);
      setGenReviewsOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate reviews');
    } finally {
      setGeneratingReviews(false);
    }
  };

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
      setIsReturnable((existingProduct as any).is_returnable ?? true);
      setIsExchangeable((existingProduct as any).is_exchangeable ?? true);
      setReturnWindowDays(String((existingProduct as any).return_window_days ?? 7));
      setExchangeWindowDays(String((existingProduct as any).exchange_window_days ?? 7));
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
      console.log("Generating product details client-side via NVIDIA Vision API...");
      const p = await generateProductViaNvidiaFallback(
        images[0],
        category || store?.category,
        store?.name,
        productType,
        productHint || undefined
      );

      if (!p) throw new Error("Could not generate details from product image");

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
      setTimeout(() => {
        const el = document.getElementById("product-details-card");
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    } catch (err: any) {
      toast.error(err.message || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddNewCategory = async () => {
    const name = newCatName.trim();
    if (!name) { toast.error('Category name is required'); return; }
    setNewCatSaving(true);
    try {
      const result = await createCategory.mutateAsync({ name, parent_id: null });
      setCategory(result.name);
      setNewCatDialogOpen(false);
      setNewCatName('');
    } catch {
      // error toasted by hook
    } finally {
      setNewCatSaving(false);
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
    if (!category.trim()) { toast.error('Category is required'); return; }
    if (!sku.trim()) { toast.error('SKU is required'); return; }
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
      is_returnable: isReturnable,
      is_exchangeable: isExchangeable,
      return_window_days: Number(returnWindowDays) || 7,
      exchange_window_days: Number(exchangeWindowDays) || 7,
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
      ai_generated_data: { product_type: productType, highlights, product_hint: productHint || undefined, product_videos: productVideos, ...typeMetadata } as any,
    };

    try {
      if (isEdit && id) {
        await updateProduct.mutateAsync({ id, ...payload });
        
        // Save answers back to database questions table
        for (const q of dbQuestions) {
          await supabase
            .from('product_questions')
            .update({ answer: q.answer })
            .eq('id', q.id);
        }
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

      {/* Add New Category Dialog */}
      <Dialog open={newCatDialogOpen} onOpenChange={(o) => { setNewCatDialogOpen(o); if (!o) setNewCatName(''); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="new-cat-name">Category Name</Label>
            <Input
              id="new-cat-name"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Electronics, Clothing..."
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAddNewCategory()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNewCatDialogOpen(false); setNewCatName(''); }}>Cancel</Button>
            <Button onClick={handleAddNewCategory} disabled={!newCatName.trim() || newCatSaving}>
              {newCatSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Header — sticky below the dashboard top bar (h-14 = 56px) */}
      <div className="sticky top-14 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/products')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{isEdit ? 'Edit Product' : 'Add Product'}</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              {isEdit ? 'Update product details' : 'Upload an image and let AI do the rest'}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {isEdit && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setGenReviewsOpen(true)}
              className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-violet-800"
            >
              <Sparkles className="h-4 w-4 text-violet-600 animate-pulse" />
              Generate AI Reviews
            </Button>
          )}
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
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <CardTitle className="text-base">Images & Product Hint</CardTitle>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Upload your product photo, optionally add a short description, then tap <span className="font-medium text-foreground">Generate with AI</span> — it will auto-fill the title, description, price suggestion, tags &amp; more for you.
                  </p>
                </div>
                <Button data-tour="product-ai-fill" variant="outline" size="sm" onClick={generateWithAI} disabled={aiLoading || images.length === 0} className="shrink-0">
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
          <Card id="product-details-card">
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
                  onChange={handleTypeMetadataChange}
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

          {/* Customer Q&A Manager */}
          {isEdit && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>Customer Q&A Manager</span>
                  <Badge variant="secondary">{dbQuestions.length}</Badge>
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Answer queries submitted by customers on the storefront product page.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {(dbQuestions.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                    No customer questions asked yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {dbQuestions.map((q, idx) => (
                      <div key={q.id || idx} className="p-3 border rounded-lg bg-muted/10 space-y-2 text-left">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span className="font-semibold text-foreground">{q.customer_name}</span>
                          <span>{q.created_at ? new Date(q.created_at).toLocaleDateString() : ''}</span>
                        </div>
                        <p className="text-xs font-medium">{q.question}</p>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Answer</Label>
                          <Textarea
                            value={q.answer || ''}
                            onChange={(e) => {
                              const updatedQuestions = [...dbQuestions];
                              updatedQuestions[idx] = { ...q, answer: e.target.value };
                              setDbQuestions(updatedQuestions);
                            }}
                            placeholder="Type the answer here..."
                            rows={2}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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
                <Label>Category <span className="text-destructive">*</span></Label>
                <Select
                  value={category}
                  onValueChange={(v) => {
                    if (v === '__add_new__') {
                      setNewCatDialogOpen(true);
                    } else {
                      setCategory(v);
                    }
                  }}
                >
                  <SelectTrigger className={!category ? 'border-destructive/50' : ''}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* + Add new category always at top */}
                    <SelectItem value="__add_new__" className="text-primary font-medium">
                      <span className="flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Add new category
                      </span>
                    </SelectItem>
                    {category && !parentCategories.some(c => c.name === category) && !parentCategories.some(p => getSubcategories(p.id).some(s => `${p.name} > ${s.name}` === category || s.name === category)) && (
                      <SelectItem value={category}>{category}</SelectItem>
                    )}
                    {parentCategories.length > 0 && (
                      <>
                        {parentCategories.map((parent) => {
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
                        })}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {!category && <p className="text-xs text-destructive">Category is required</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sku">SKU <span className="text-destructive">*</span></Label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="ABC-123"
                  className={!sku.trim() ? 'border-destructive/50' : ''}
                />
                {!sku.trim() && <p className="text-xs text-destructive">SKU is required</p>}
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

          {/* Return & Exchange Policy */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Return & Exchange Policy</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Configure return and exchange options for this product</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="returnable">Returnable</Label>
                  <p className="text-xs text-muted-foreground">Allow customers to return this product</p>
                </div>
                <Switch
                  id="returnable"
                  checked={isReturnable}
                  onCheckedChange={setIsReturnable}
                />
              </div>

              {isReturnable && (
                <div className="space-y-1.5 pl-4 border-l-2 border-muted">
                  <Label htmlFor="returnWindow">Return Window (Days)</Label>
                  <Input
                    id="returnWindow"
                    type="number"
                    min="1"
                    max="90"
                    value={returnWindowDays}
                    onChange={(e) => setReturnWindowDays(e.target.value)}
                    placeholder="7"
                  />
                  <p className="text-xs text-muted-foreground">Days after delivery within which returns are accepted</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="exchangeable">Exchangeable</Label>
                  <p className="text-xs text-muted-foreground">Allow customers to exchange this product</p>
                </div>
                <Switch
                  id="exchangeable"
                  checked={isExchangeable}
                  onCheckedChange={setIsExchangeable}
                />
              </div>

              {isExchangeable && (
                <div className="space-y-1.5 pl-4 border-l-2 border-muted">
                  <Label htmlFor="exchangeWindow">Exchange Window (Days)</Label>
                  <Input
                    id="exchangeWindow"
                    type="number"
                    min="1"
                    max="90"
                    value={exchangeWindowDays}
                    onChange={(e) => setExchangeWindowDays(e.target.value)}
                    placeholder="7"
                  />
                  <p className="text-xs text-muted-foreground">Days after delivery within which exchanges are accepted</p>
                </div>
              )}

              <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
                <p className="font-medium">💡 Tip:</p>
                <p className="text-muted-foreground">
                  For non-returnable items (e.g., personalized products, intimate wear), disable both options.
                  For perishable goods (food, beauty), set shorter windows (1-3 days).
                </p>
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
      {/* Generate AI Reviews Dialog */}
      <Dialog open={genReviewsOpen} onOpenChange={setGenReviewsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600 animate-pulse" />
              Generate AI Product Reviews
            </DialogTitle>
            <DialogDescription>
              Create authentic, high-quality simulated customer reviews for "{title}" with realistic ratings to build immediate buyer trust.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Review count */}
            <div className="space-y-2">
              <Label htmlFor="review-count">Number of reviews</Label>
              <Select value={reviewCount} onValueChange={setReviewCount}>
                <SelectTrigger id="review-count" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Reviews</SelectItem>
                  <SelectItem value="5">5 Reviews</SelectItem>
                  <SelectItem value="10">10 Reviews</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sentiment */}
            <div className="space-y-2">
              <Label htmlFor="review-sentiment">Review Tone & Sentiment</Label>
              <Select value={sentiment} onValueChange={setSentiment}>
                <SelectTrigger id="review-sentiment" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="highly_positive">Highly Positive (5 Stars only)</SelectItem>
                  <SelectItem value="positive">Positive (4 - 5 Stars)</SelectItem>
                  <SelectItem value="mixed">Mixed Vibe (3 - 5 Stars)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenReviewsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateReviews}
              disabled={generatingReviews}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 font-semibold"
            >
              {generatingReviews ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating reviews...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Reviews
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductForm;
