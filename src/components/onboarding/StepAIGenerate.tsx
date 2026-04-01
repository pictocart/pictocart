import { useState } from 'react';
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
        },
      });

      if (error) throw error;

      if (result?.product) {
        setData((d) => ({ ...d, aiProduct: result.product }));
        toast.success('Product details generated!');
      }
    } catch (e: any) {
      console.error('AI generation error:', e);
      toast.error('AI generation failed. Please fill in manually.');
      // Provide fallback data
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
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
            <Wand2 className="h-7 w-7 text-accent-foreground" />
          </div>
          <h2 className="text-xl font-bold">AI Product Generation</h2>
          <p className="text-sm text-muted-foreground">
            {data.productImageUrl
              ? 'Let our AI analyze your product image and generate all the details.'
              : 'Go back and upload an image, or fill in details manually.'}
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          {data.productImageUrl && (
            <img
              src={data.productImageUrl}
              alt="Product"
              className="h-40 w-40 object-contain rounded-xl border border-border"
            />
          )}
          <Button onClick={generate} disabled={!data.productImageUrl} className="gap-2">
            <Sparkles className="h-4 w-4" /> Generate with AI
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
            Fill in manually
          </Button>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-sm font-medium">AI is analyzing your product...</p>
        <p className="text-xs text-muted-foreground">This may take a few seconds</p>
      </div>
    );
  }

  const product = data.aiProduct!;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Product Details</h2>
        {data.productImageUrl && (
          <Button variant="outline" size="sm" onClick={generate} className="gap-1">
            <RefreshCw className="h-3 w-3" /> Regenerate
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={product.title} onChange={(e) => updateField('title', e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Short Description</Label>
          <Input
            value={product.shortDescription}
            onChange={(e) => updateField('shortDescription', e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Full Description</Label>
          <Textarea
            value={product.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={4}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Suggested Price (₹)</Label>
            <Input
              type="number"
              value={product.suggestedPrice}
              onChange={(e) => updateField('suggestedPrice', Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Input value={product.category} onChange={(e) => updateField('category', e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-1.5">
            {product.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => {
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
