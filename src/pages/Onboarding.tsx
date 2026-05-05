import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, SkipForward, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { THEME_TEMPLATES } from '@/lib/themes';
import { getReferralCode, clearReferralCookie } from '@/lib/referralCookie';

import StepStoreName from '@/components/onboarding/StepStoreName';
import StepCategory from '@/components/onboarding/StepCategory';
import StepTheme from '@/components/onboarding/StepTheme';
import StepGoLive from '@/components/onboarding/StepGoLive';

// Phase 1: collapsed from 11 → 4 mandatory steps. Logo/Products/Payments/Email/etc.
// are now setup checklist cards on the Dashboard.
const TOTAL_STEPS = 4;

const stepLabels = ['Store Name', 'Category', 'Theme', 'Go Live'];

export interface OnboardingData {
  storeName: string;
  slug: string;
  description: string;
  category: string;
  logoUrl: string;
  selectedThemeId: string;
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
  storeInfo: {
    phone: string;
    city: string;
    gst: string;
  };
  paymentSettings: {
    cod: boolean;
    upi: boolean;
    razorpay: boolean;
  };
  emailTemplatesGenerated: boolean;
  slugAvailable: boolean;
}

const defaultData: OnboardingData = {
  storeName: '',
  slug: '',
  description: '',
  category: '',
  logoUrl: '',
  selectedThemeId: 'minimal-light',
  productImageUrl: '',
  productImageFile: null,
  aiProduct: null,
  storeInfo: { phone: '', city: '', gst: '' },
  paymentSettings: { cod: true, upi: false, razorpay: false },
  emailTemplatesGenerated: false,
  slugAvailable: false,
};

const Onboarding = () => {
  const { user } = useAuth();
  const { store, setStore } = useStore();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Resume from saved step — only on initial load
  const hasResumed = useRef(false);
  useEffect(() => {
    if (hasResumed.current || !store) return;
    hasResumed.current = true;
    if (store.onboarding_step !== null && store.onboarding_step < TOTAL_STEPS) {
      setCurrentStep(store.onboarding_step + 1);
      setData((d) => ({
        ...d,
        storeName: store.name || '',
        slug: store.slug || '',
        category: store.category || '',
        description: store.description || '',
        logoUrl: store.logo_url || '',
        selectedThemeId: (store.theme as any)?.name || 'minimal-light',
      }));
    } else if (store.onboarding_step !== null && store.onboarding_step >= TOTAL_STEPS) {
      navigate('/dashboard', { replace: true });
    }
  }, [store]);

  const progress = (currentStep / TOTAL_STEPS) * 100;

  const saveStep = async (step: number) => {
    if (!user) return;
    setSaving(true);
    try {
      const selectedTheme = THEME_TEMPLATES.find((t) => t.id === data.selectedThemeId);
      const themeData = selectedTheme
        ? { name: selectedTheme.id, primary_color: selectedTheme.colors.primary, ...selectedTheme.colors, fonts: selectedTheme.fonts }
        : { name: 'minimal-light', primary_color: '#F97316' };

      if (!store) {
        const refCode = getReferralCode();
        const { data: newStore, error } = await supabase
          .from('stores')
          .insert({
            user_id: user.id,
            name: data.storeName || 'My Store',
            slug: data.slug || `store-${Date.now()}`,
            category: data.category || null,
            description: data.description || null,
            logo_url: data.logoUrl || null,
            theme: themeData,
            onboarding_step: step,
            referred_by_code: refCode,
            settings: {
              payments: data.paymentSettings,
              phone: data.storeInfo.phone || null,
              city: data.storeInfo.city || null,
              gst: data.storeInfo.gst || null,
            },
          })
          .select()
          .single();
        if (!error && newStore) {
          setStore(newStore as any);
          // Create referral record (best-effort, non-blocking)
          if (refCode) {
            const { data: partner } = await supabase
              .from('partners')
              .select('id')
              .eq('referral_code', refCode)
              .maybeSingle();
            if (partner) {
              await supabase.from('partner_referrals').insert({
                partner_id: partner.id,
                store_id: (newStore as any).id,
                referred_user_id: user.id,
                status: 'signup',
              });
              clearReferralCookie();
            }
          }
        }
      } else {
        const updates: any = { onboarding_step: step };
        if (data.storeName) updates.name = data.storeName;
        if (data.category) updates.category = data.category;
        if (data.description) updates.description = data.description;
        updates.logo_url = data.logoUrl || null;
        updates.theme = themeData;
        updates.settings = {
          ...((store.settings as any) || {}),
          payments: data.paymentSettings,
          phone: data.storeInfo.phone || null,
          city: data.storeInfo.city || null,
          gst: data.storeInfo.gst || null,
        };

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

  const animateTransition = (dir: 'forward' | 'back', callback: () => void) => {
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      callback();
      setTimeout(() => setAnimating(false), 50);
    }, 200);
  };

  const goNext = async () => {
    await saveStep(currentStep);
    if (currentStep < TOTAL_STEPS) {
      animateTransition('forward', () => setCurrentStep((s) => s + 1));
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      animateTransition('back', () => setCurrentStep((s) => s - 1));
    }
  };

  const skip = async () => {
    await saveStep(currentStep);
    if (currentStep < TOTAL_STEPS) {
      animateTransition('forward', () => setCurrentStep((s) => s + 1));
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1: return data.storeName.trim().length >= 2 && data.slugAvailable;
      case 2: return data.category !== '';
      case 3: return data.selectedThemeId !== '';
      case 4: return true;
      default: return true;
    }
  };

  const isSkippable = (_step: number) => false;

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <StepStoreName data={data} setData={setData} />;
      case 2: return <StepCategory data={data} setData={setData} />;
      case 3: return <StepTheme data={data} setData={setData} />;
      case 4: return <StepGoLive data={data} store={store} onFinish={async () => {
        await saveStep(TOTAL_STEPS);
        if (store) {
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
          // Auto-generate default homepage sections if none exist
          const currentSettings = (store.settings as any) || {};
          if (!currentSettings.homepage_sections?.length) {
            const { generateDefaultSections } = await import('@/lib/defaultSections');
            const defaultSections = generateDefaultSections(data.storeName || store.name, data.category || store.category || undefined);
            await supabase.from('stores').update({
              is_published: true,
              onboarding_step: TOTAL_STEPS,
              settings: { ...currentSettings, homepage_sections: defaultSections },
            }).eq('id', store.id);
          } else {
            await supabase.from('stores').update({ is_published: true, onboarding_step: TOTAL_STEPS }).eq('id', store.id);
          }
        }
        navigate('/dashboard', { replace: true });
      }} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 px-6 py-4 flex items-center gap-3 backdrop-blur-sm bg-background/80 sticky top-0 z-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-lg shadow-primary/20">
          {data.storeName ? data.storeName[0].toUpperCase() : 'S'}
        </div>
        <div>
          <span className="font-semibold text-foreground block leading-tight">
            {data.storeName || 'Set up your store'}
          </span>
          <span className="text-xs text-muted-foreground">Step {currentStep} of {TOTAL_STEPS}</span>
        </div>
        <div className="ml-auto">
          <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full">
            {stepLabels[currentStep - 1]}
          </span>
        </div>
      </header>

      {/* Progress stepper */}
      <div className="px-6 pt-8 pb-4 max-w-3xl mx-auto w-full">
        {/* Progress bar */}
        <div className="relative h-1.5 bg-muted rounded-full overflow-hidden mb-6">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
          {/* Glow effect */}
          <div
            className="absolute inset-y-0 left-0 bg-primary/30 rounded-full blur-sm transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex justify-between items-start">
          {stepLabels.map((label, i) => {
            const stepNum = i + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;
            const isFuture = stepNum > currentStep;

            return (
              <div key={label} className="flex flex-col items-center group" style={{ width: `${100 / TOTAL_STEPS}%` }}>
                {/* Dot / checkmark */}
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full transition-all duration-500 ease-out',
                    isCompleted
                      ? 'h-6 w-6 bg-primary text-primary-foreground shadow-md shadow-primary/25'
                      : isCurrent
                      ? 'h-7 w-7 bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/15'
                      : 'h-5 w-5 bg-muted border-2 border-muted-foreground/15'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : isCurrent ? (
                    <div className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
                  ) : null}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    'text-[9px] sm:text-[10px] mt-2 text-center leading-tight transition-all duration-300 hidden sm:block',
                    isCompleted ? 'text-primary font-medium' : isCurrent ? 'text-foreground font-semibold' : 'text-muted-foreground/50'
                  )}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content with animation */}
      <div className="flex-1 px-6 py-8 max-w-3xl mx-auto w-full">
        <div
          ref={contentRef}
          className={cn(
            'transition-all duration-300 ease-out',
            animating
              ? direction === 'forward'
                ? 'opacity-0 translate-x-8'
                : 'opacity-0 -translate-x-8'
              : 'opacity-100 translate-x-0'
          )}
        >
          {renderStep()}
        </div>
      </div>

      {/* Footer navigation */}
      {currentStep < TOTAL_STEPS && (
        <div className="border-t border-border/50 backdrop-blur-sm bg-background/80 sticky bottom-0">
          <div className="px-6 py-4 flex items-center justify-between max-w-3xl mx-auto w-full">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={currentStep === 1 || saving}
              className="gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            <div className="flex gap-3">
              {isSkippable(currentStep) && (
                <Button
                  variant="ghost"
                  onClick={skip}
                  disabled={saving}
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  Skip <SkipForward className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                onClick={goNext}
                disabled={!canProceed() || saving}
                className="gap-2 px-6 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                size="lg"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
