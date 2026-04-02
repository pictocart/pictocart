import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';

import StepStoreName from '@/components/onboarding/StepStoreName';
import StepCategory from '@/components/onboarding/StepCategory';
import StepUploadImage from '@/components/onboarding/StepUploadImage';
import StepAIGenerate from '@/components/onboarding/StepAIGenerate';
import StepStorePreview from '@/components/onboarding/StepStorePreview';
import StepPaymentSetup from '@/components/onboarding/StepPaymentSetup';
import StepGoLive from '@/components/onboarding/StepGoLive';

const TOTAL_STEPS = 7;

const stepLabels = [
  'Store Name',
  'Category',
  'Upload Image',
  'AI Magic',
  'Preview',
  'Payments',
  'Go Live',
];

export interface OnboardingData {
  storeName: string;
  slug: string;
  category: string;
  productImageUrl: string;
  productImageFile: File | null;
  aiProduct: {
    title: string;
    description: string;
    shortDescription: string;
    tags: string[];
    category: string;
    suggestedPrice: number;
    seoTitle: string;
    seoDescription: string;
  } | null;
  paymentSettings: {
    cod: boolean;
    upi: boolean;
    razorpay: boolean;
  };
}

const defaultData: OnboardingData = {
  storeName: '',
  slug: '',
  category: '',
  productImageUrl: '',
  productImageFile: null,
  aiProduct: null,
  paymentSettings: { cod: true, upi: false, razorpay: false },
};

const Onboarding = () => {
  const { user } = useAuth();
  const { store, setStore } = useStore();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [saving, setSaving] = useState(false);

  // Resume from saved step
  useEffect(() => {
    if (store && store.onboarding_step && store.onboarding_step < TOTAL_STEPS) {
      setCurrentStep(store.onboarding_step + 1);
      setData((d) => ({
        ...d,
        storeName: store.name || '',
        slug: store.slug || '',
        category: store.category || '',
      }));
    } else if (store && store.onboarding_step >= TOTAL_STEPS) {
      navigate('/', { replace: true });
    }
  }, [store]);

  const progress = (currentStep / TOTAL_STEPS) * 100;

  const saveStep = async (step: number) => {
    if (!user) return;
    setSaving(true);
    try {
      if (!store) {
        // Create store
        const { data: newStore, error } = await supabase
          .from('stores')
          .insert({
            user_id: user.id,
            name: data.storeName || 'My Store',
            slug: data.slug || `store-${Date.now()}`,
            category: data.category || null,
            onboarding_step: step,
            settings: { payments: data.paymentSettings },
          })
          .select()
          .single();
        if (!error && newStore) setStore(newStore as any);
      } else {
        // Update store
        const updates: any = { onboarding_step: step };
        if (data.storeName) updates.name = data.storeName;
        if (data.slug) updates.slug = data.slug;
        if (data.category) updates.category = data.category;
        updates.settings = { ...((store.settings as any) || {}), payments: data.paymentSettings };

        const { data: updated, error } = await supabase
          .from('stores')
          .update(updates)
          .eq('id', store.id)
          .select()
          .single();
        if (!error && updated) setStore(updated as any);
      }
    } catch (e) {
      console.error('Save step error:', e);
    }
    setSaving(false);
  };

  const goNext = async () => {
    await saveStep(currentStep);
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const skip = async () => {
    await saveStep(currentStep);
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1: return data.storeName.trim().length >= 2;
      case 2: return data.category !== '';
      case 3: return true; // image upload is skippable
      case 4: return true;
      case 5: return true;
      case 6: return true;
      case 7: return true;
      default: return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <StepStoreName data={data} setData={setData} />;
      case 2: return <StepCategory data={data} setData={setData} />;
      case 3: return <StepUploadImage data={data} setData={setData} storeId={store?.id} />;
      case 4: return <StepAIGenerate data={data} setData={setData} storeId={store?.id} />;
      case 5: return <StepStorePreview data={data} />;
      case 6: return <StepPaymentSetup data={data} setData={setData} />;
      case 7: return <StepGoLive data={data} store={store} onFinish={async () => {
        await saveStep(TOTAL_STEPS);
        if (store) {
          // Create the AI-generated product if available
          if (data.aiProduct && data.aiProduct.title) {
            try {
              await supabase.from('products').insert({
                store_id: store.id,
                title: data.aiProduct.title,
                description: data.aiProduct.description || '',
                short_description: data.aiProduct.shortDescription || '',
                price: data.aiProduct.suggestedPrice || 0,
                category: data.aiProduct.category || data.category || null,
                tags: data.aiProduct.tags || [],
                images: data.productImageUrl ? [data.productImageUrl] : [],
                seo_title: data.aiProduct.seoTitle || '',
                seo_description: data.aiProduct.seoDescription || '',
                ai_generated_data: data.aiProduct as any,
                is_active: true,
              });
            } catch (e) {
              console.error('Failed to create onboarding product:', e);
            }
          }
          await supabase.from('stores').update({ is_published: true, onboarding_step: TOTAL_STEPS }).eq('id', store.id);
        }
        navigate('/', { replace: true });
      }} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          A
        </div>
        <span className="font-semibold text-foreground">Set up your store</span>
      </header>

      {/* Progress */}
      <div className="px-4 pt-4 pb-2 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Step {currentStep} of {TOTAL_STEPS}</span>
          <span className="text-xs font-medium text-primary">{stepLabels[currentStep - 1]}</span>
        </div>
        <Progress value={progress} className="h-2" />
        {/* Step dots */}
        <div className="flex justify-between mt-2">
          {stepLabels.map((label, i) => (
            <div
              key={label}
              className={cn(
                'flex flex-col items-center',
                i + 1 <= currentStep ? 'text-primary' : 'text-muted-foreground/40'
              )}
            >
              <div
                className={cn(
                  'h-2 w-2 rounded-full',
                  i + 1 < currentStep ? 'bg-primary' : i + 1 === currentStep ? 'bg-primary ring-2 ring-primary/30' : 'bg-muted-foreground/20'
                )}
              />
              <span className="text-[10px] mt-1 hidden sm:block">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        {renderStep()}
      </div>

      {/* Footer navigation */}
      {currentStep < 7 && (
        <div className="border-t border-border px-4 py-3 flex items-center justify-between max-w-2xl mx-auto w-full">
          <Button
            variant="ghost"
            onClick={goBack}
            disabled={currentStep === 1}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          <div className="flex gap-2">
            {currentStep >= 3 && currentStep <= 6 && (
              <Button variant="ghost" onClick={skip} className="gap-1 text-muted-foreground">
                Skip <SkipForward className="h-4 w-4" />
              </Button>
            )}
            <Button
              onClick={goNext}
              disabled={!canProceed() || saving}
              className="gap-1"
            >
              {saving ? 'Saving...' : 'Continue'} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
