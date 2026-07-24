import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import type { OnboardingData } from '@/pages/Onboarding';

interface Props {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  storeId?: string;
}

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
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
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

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
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

const StepAIGenerate = ({ data, setData, storeId }: Props) => {
  const [generating, setGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const generate = async () => {
    if (!data.productImageUrl) {
      toast.error('Please upload an image first');
      return;
    }

    setGenerating(true);
    try {
      console.log("Generating product details client-side via NVIDIA Vision API...");
      const aiProduct = await generateProductViaNvidiaFallback(
        data.productImageUrl,
        data.category,
        data.storeName
      );

      if (aiProduct) {
        setData((d) => ({ ...d, aiProduct }));
        toast.success('Product details generated!');
      }
    } catch (e: any) {
      console.error('AI generation error:', e);
      if (e?.message !== 'INSUFFICIENT_CREDITS') {
        toast.error('AI generation failed. Please fill in manually.');
      }
      setData((d) => ({
        ...d,
        aiProduct: {
          title: '',
          description: '',
          shortDescription: '',
          tags: [],
          category: data.category || 'general',
          suggestedPrice: 0,
          seoTitle: '',
          seoDescription: '',
          highlights: [],
          product_type: 'physical',
          metadata: {},
        },
      }));
    } finally {
      setGenerating(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setData((d) => ({
      ...d,
      aiProduct: d.aiProduct ? { ...d.aiProduct, [field]: value } : null,
    }));
  };

  if (!data.aiProduct && !generating) {
    return (
      <div className={`space-y-8 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 shadow-lg shadow-primary/10">
            <Wand2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">AI Product Generation</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {data.productImageUrl
              ? 'Let our AI analyze your product image and generate all the details automatically.'
              : 'Go back and upload an image, or fill in details manually.'}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
          {data.productImageUrl && (
            <div className="rounded-2xl border-2 border-primary/10 overflow-hidden shadow-lg">
              <img
                src={data.productImageUrl}
                alt="Product"
                className="h-44 w-44 object-contain bg-secondary/30"
              />
            </div>
          )}
          <Button onClick={generate} disabled={!data.productImageUrl} className="gap-2 px-8 h-12 text-base shadow-lg shadow-primary/20" size="lg">
            <Sparkles className="h-5 w-5" /> Generate with AI
          </Button>
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={() =>
              setData((d) => ({
                ...d,
                aiProduct: {
                  title: '',
                  description: '',
                  shortDescription: '',
                  tags: [],
                  category: data.category || 'general',
                  suggestedPrice: 0,
                  seoTitle: '',
                  seoDescription: '',
                },
              }))
            }
          >
            Fill in manually instead
          </Button>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="relative">
          <div className="h-20 w-20 rounded-full border-4 border-primary/15 border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="h-7 w-7 text-primary animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold">AI is analyzing your product...</p>
          <p className="text-sm text-muted-foreground">This usually takes 5-10 seconds</p>
        </div>
      </div>
    );
  }

  const product = data.aiProduct!;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold">Product Details</h2>
        {data.productImageUrl && (
          <Button variant="outline" size="sm" onClick={generate} className="gap-1.5 rounded-xl">
            <RefreshCw className="h-3.5 w-3.5" /> Regenerate
          </Button>
        )}
      </div>

      <div className="space-y-5 max-w-lg">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Title</Label>
          <Input value={product.title} onChange={(e) => updateField('title', e.target.value)} className="h-12 rounded-xl" />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Short Description</Label>
          <Input
            value={product.shortDescription}
            onChange={(e) => updateField('shortDescription', e.target.value)}
            className="h-12 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Full Description</Label>
          <Textarea
            value={product.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={4}
            className="rounded-xl"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Suggested Price (₹)</Label>
            <Input
              type="number"
              value={product.suggestedPrice}
              onChange={(e) => updateField('suggestedPrice', Number(e.target.value))}
              className="h-12 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Category</Label>
            <Input value={product.category} onChange={(e) => updateField('category', e.target.value)} className="h-12 rounded-xl" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Tags</Label>
          <div className="flex flex-wrap gap-2">
            {product.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="cursor-pointer rounded-lg px-3 py-1 hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => {
                updateField('tags', product.tags.filter((_, j) => j !== i));
              }}>
                {tag} ×
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepAIGenerate;
