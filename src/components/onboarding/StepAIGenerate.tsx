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
      const { data: result, error } = await supabase.functions.invoke('generate-product', {
        body: {
          imageUrl: data.productImageUrl,
          category: data.category,
          storeName: data.storeName,
          store_id: storeId,
        },
      });

      let parsedErr: any = null;
      if (error && (error as any).context?.clone) {
        try { parsedErr = await (error as any).context.clone().json(); } catch { /* ignore */ }
      }
      const errMsg = parsedErr?.error || result?.error || error?.message;
      if (errMsg === 'INSUFFICIENT_CREDITS') {
        toast.error('You need credits in your wallet to generate. Please recharge.');
        throw new Error('INSUFFICIENT_CREDITS');
      }
      if (errMsg) throw new Error(errMsg);

      if (result?.product) {
        setData((d) => ({ ...d, aiProduct: result.product }));
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
        },
      }));
    }
    setGenerating(false);
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
