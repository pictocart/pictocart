import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, SkipForward, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { THEME_TEMPLATES } from '@/lib/themes';
import { getReferralCode, clearReferralCookie } from '@/lib/referralCookie';
import { getStoreThemeId, getStoreThemeTokens } from '@/lib/storefrontManifest';
import PicToCartLogo from '@/components/PicToCartLogo';

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
  fssaiNumber?: string;
  customThemeConfig?: {
    nav: string;
    footer: string;
    sections: Array<{ id: string; enabled: boolean; style: string }>;
  };
}

const defaultData: OnboardingData = {
  storeName: '',
  slug: '',
  description: '',
  category: '',
  logoUrl: '',
  selectedThemeId: '',
  productImageUrl: '',
  productImageFile: null,
  aiProduct: null,
  storeInfo: { phone: '', city: '', gst: '' },
  paymentSettings: { cod: true, upi: false, razorpay: false },
  emailTemplatesGenerated: false,
  slugAvailable: false,
  fssaiNumber: '',
  customThemeConfig: undefined,
};

const Onboarding = () => {
  const { user } = useAuth();
  const { store, setStore } = useStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
      // Without this guard, a stale onboarding_step can land users on Theme
      // selection when they reload while already fully signed up.
      let resumeStep = store.onboarding_step + 1;
      // boundary check
      if (resumeStep > TOTAL_STEPS) resumeStep = TOTAL_STEPS;
      setCurrentStep(resumeStep);
      
      // Seed data with loaded store values
      setData(d => ({
        ...d,
        storeName: store.name || '',
        slug: store.slug || '',
        description: store.description || '',
        category: store.category || '',
        logoUrl: store.logo_url || '',
        selectedThemeId: getStoreThemeId(store),
      }));
    } else if (store.onboarding_step !== null && store.onboarding_step >= TOTAL_STEPS) {
      navigate('/dashboard', { replace: true });
    }
  }, [store, navigate]);

  const progress = (currentStep / TOTAL_STEPS) * 100;

  const saveStep = async (step: number) => {
    if (!user) return;
    setSaving(true);
    try {
      const themeData = data.selectedThemeId
        ? { theme_id: data.selectedThemeId }
        : (getStoreThemeTokens(store) || THEME_TEMPLATES[0]);

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
              fssai: data.fssaiNumber || null,
            },
          })
          .select()
          .single();
        if (!error && newStore) {
          setStore(newStore as any);
          queryClient.invalidateQueries({ queryKey: ['storefront', newStore.slug] });
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
          fssai: data.fssaiNumber || ((store.settings as any)?.fssai ?? null),
        };

        const { data: updated, error } = await supabase
          .from('stores')
          .update(updates)
          .eq('id', store.id)
          .select()
          .single();
        if (!error && updated) {
          setStore(updated as any);
          queryClient.invalidateQueries({ queryKey: ['storefront', updated.slug] });
        }
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
          let isPremiumMaster = false;
          // If a master theme (theme-xxxx) was chosen, seed its manifest into
          // store.theme + theme_overrides so the customiser has defaults to edit.
          if (data.selectedThemeId?.startsWith('custom-theme-') && data.customThemeConfig) {
            try {
              const cfg = data.customThemeConfig;
              const { data: ver } = await supabase
                .from('theme_master_versions')
                .select('files_manifest, version')
                .eq('theme_id', 'theme-style-1')
                .order('version', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (ver?.files_manifest) {
                const manifest = JSON.parse(JSON.stringify(ver.files_manifest));
                const cleanUspStyle = (val: string) => {
                  if (val.includes("classic")) return "classic";
                  if (val.includes("minimal_center")) return "minimal_center";
                  if (val.includes("left_border")) return "left_border_columns";
                  if (val.includes("card")) return "card_style";
                  if (val.includes("compact")) return "compact_banner";
                  if (val.includes("accent")) return "accent_row";
                  return "classic";
                };

                manifest.header_style = cfg.nav;
                manifest.footer_style = cfg.footer;
                if (manifest.pages?.home?.sections) {
                  const baseSections = manifest.pages.home.sections || [];
                  manifest.pages.home.sections = cfg.sections
                    .filter((s: any) => s.enabled)
                    .map((s: any) => {
                      let matchType = s.id;
                      if (s.id === 'product') matchType = 'product_grid';
                      if (s.id === 'category') matchType = 'category_grid';
                      if (s.id === 'promo') matchType = 'promo_banner';
                      if (s.id === 'usp_strip') matchType = 'usp_strip';
                      if (s.id === 'new_arrivals') matchType = 'new_arrivals';

                      let match = baseSections.find((b: any) => b.type === matchType);
                      
                      if (!match) {
                        if (matchType === 'new_arrivals') {
                          const pGrid = baseSections.find((b: any) => b.type === 'product_grid');
                          if (pGrid) {
                            match = JSON.parse(JSON.stringify(pGrid));
                            match.type = 'new_arrivals';
                          }
                        } else if (matchType === 'usp_strip') {
                          match = {
                            type: 'usp_strip',
                            props: {
                              title: 'Why Shop With Us',
                              items: [
                                { icon: 'Shield', title: 'Secured Checkout', sub: 'SSL Certified Payment Methods' },
                                { icon: 'Truck', title: 'Free Global Shipping', sub: 'On orders over $50' },
                                { icon: 'RefreshCw', title: 'Easy returns', sub: '30-day refund window policy' }
                              ]
                            }
                          };
                        }
                      }

                      if (match) {
                        const cloned = JSON.parse(JSON.stringify(match));
                        cloned.props = cloned.props || {};
                        cloned.props.style = s.id === 'usp_strip' ? cleanUspStyle(s.style) : s.style;
                        return cloned;
                      }

                      return {
                        type: matchType,
                        props: {
                          style: s.id === 'usp_strip' ? cleanUspStyle(s.style) : s.style
                        }
                      };
                    });
                }

                const dna = manifest?.dna ?? {};
                const palette = dna.palette ?? {};
                const fonts = dna.fonts ?? {};
                const home = manifest?.pages?.home?.sections ?? [];

                const seedSections: Record<string, any> = {};
                home.forEach((s: any, i: number) => {
                  seedSections[i] = { ...(s.props ?? {}) };
                });

                const themeOverrides = {
                  brand_name: store?.name ?? dna.name,
                  logo_url:   store?.logo_url ?? null,
                  palette:    { ...palette },
                  fonts:      { ...fonts },
                  sections:   seedSections,
                };

                const newTheme = {
                  theme_id: data.selectedThemeId,
                  name: 'Custom Theme',
                  manifest_ref: data.selectedThemeId,
                  version: ver.version,
                  primary_color: palette.primary,
                  colors: {
                    primary: palette.primary,
                    secondary: palette.surface,
                    accent: palette.accent,
                    background: palette.bg,
                    text: palette.fg,
                    card: palette.surface,
                  },
                  fonts: { heading: fonts.heading, body: fonts.body },
                  manifest: manifest
                };

                const { buildResolvedStorefrontManifest, getStorefrontConfig } = await import('@/lib/storefrontManifest');
                // theme_overrides is rendering config — goes only into
                // resolved_storefront_manifest.config; `stores.settings` stays
                // untouched (business data only).
                const newConfig = { ...getStorefrontConfig(store as any), theme_overrides: themeOverrides };
                const resolved_storefront_manifest = await buildResolvedStorefrontManifest({
                  ...store,
                  theme: newTheme,
                  theme_id: data.selectedThemeId,
                  theme_tokens: newTheme,
                } as any, newConfig as any);
                await supabase
                  .from('stores')
                  .update({ theme: newTheme as any, theme_id: data.selectedThemeId, theme_tokens: newTheme as any, resolved_storefront_manifest: resolved_storefront_manifest as any })
                  .eq('id', store.id);
              }
            } catch (e) {
              console.error('Failed to apply custom theme on finish:', e);
            }
          } else if (data.selectedThemeId?.startsWith('theme-') || data.selectedThemeId?.startsWith('layout1-')) {
            try {
              // Check if premium
              const { data: meta } = await supabase
                .from('theme_master_projects')
                .select('is_premium, price')
                .eq('theme_id', data.selectedThemeId)
                .maybeSingle();
              isPremiumMaster = !!meta?.is_premium;

              const { applyMasterTheme } = await import('@/lib/applyMasterTheme');
              await applyMasterTheme(store.id, data.selectedThemeId, (store.settings as any) || {});
            } catch (e) {
              console.error('Failed to apply master theme on finish:', e);
            }
          }
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
          // Re-fetch the full row (theme apply above may have just written
          // theme_id/theme_tokens/resolved_storefront_manifest) so we build the
          // final resolved snapshot from up-to-date data instead of stale state.
          const { data: freshStore } = await supabase
            .from('stores').select('*').eq('id', store.id).maybeSingle();
          const liveStore = (freshStore || store) as any;
          const currentSettings = { ...(liveStore.settings || {}) };

          // Tag pending premium theme so dashboard + customise show the paywall.
          // Merchants get a 14-day free trial of any premium theme — after that
          // the Customiser locks and a storefront ticker urges them to pay.
          // This is purchase/entitlement state, not rendering config, so it
          // stays in `stores.settings`.
          const purchased: string[] = currentSettings.purchased_themes || [];
          if (isPremiumMaster && !purchased.includes(data.selectedThemeId)) {
            const { buildPendingPremiumTheme } = await import('@/lib/premiumThemeTrial');
            currentSettings.pending_premium_theme = buildPendingPremiumTheme(data.selectedThemeId);
          }

          // homepage_sections default-seeding IS rendering config, so it goes
          // only into resolved_storefront_manifest.config, built fresh here so
          // it doesn't miss what the theme-apply step above already set.
          const { getStorefrontConfig, buildResolvedStorefrontManifest } = await import('@/lib/storefrontManifest');
          const existingConfig = getStorefrontConfig(liveStore);
          let homepageSections = existingConfig.homepage_sections;
          if (!homepageSections?.length) {
            const { generateDefaultSections } = await import('@/lib/defaultSections');
            homepageSections = generateDefaultSections(data.storeName || store.name, data.category || store.category || undefined);
          }
          const newConfig = { ...existingConfig, homepage_sections: homepageSections };
          const resolved_storefront_manifest = await buildResolvedStorefrontManifest(liveStore, newConfig as any);

          await supabase.from('stores').update({
            is_published: true,
            onboarding_step: TOTAL_STEPS,
            settings: currentSettings,
            resolved_storefront_manifest: resolved_storefront_manifest as any,
          }).eq('id', store.id);
          // Update the context cache synchronously so the dashboard's
          // "Your store is live at … View" ribbon renders immediately on
          // first paint instead of waiting for a refetch.
          setStore({
            ...store,
            is_published: true,
            onboarding_step: TOTAL_STEPS,
            settings: currentSettings,
          } as any);
        }
        navigate('/dashboard', { replace: true });
      }} />;
      default: return null;
    }
  };

  return (
    <div className={cn(
      "bg-gradient-to-br from-background via-background to-accent/20 flex flex-col",
      currentStep === 3 ? "h-screen overflow-hidden" : "min-h-screen"
    )}>
      {/* Header */}
      <header className="border-b border-border/50 px-6 py-3 flex items-center gap-3 backdrop-blur-sm bg-background/80 sticky top-0 z-10">
        <PicToCartLogo size={36} />
        <div>
          <span className="font-semibold text-sm text-foreground block leading-tight">
            {data.storeName || 'Set up your store'}
          </span>
          <span className="text-xs text-muted-foreground">Step {currentStep} of {TOTAL_STEPS}</span>
        </div>
        <div className="ml-auto">
          <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            {stepLabels[currentStep - 1]}
          </span>
        </div>
      </header>

      {/* Progress stepper */}
      <div className="px-6 pt-4 pb-3 max-w-3xl mx-auto w-full">
        {/* Progress bar */}
        <div className="relative h-1.5 bg-muted rounded-full overflow-hidden mb-4">
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
                      ? 'h-5 w-5 bg-primary text-primary-foreground shadow-md shadow-primary/25'
                      : isCurrent
                      ? 'h-6 w-6 bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/15'
                      : 'h-4 w-4 bg-muted border-2 border-muted-foreground/15'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  ) : isCurrent ? (
                    <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground animate-pulse" />
                  ) : null}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    'text-[9px] sm:text-[10px] mt-1.5 text-center leading-tight transition-all duration-300 hidden sm:block',
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
      {/* Step 3 (Theme): flex-1 + overflow-hidden so only the inner grid scrolls */}
      <div className={cn(
        "w-full",
        currentStep === 3
          ? "flex-1 min-h-0 overflow-hidden px-4 max-w-7xl mx-auto flex flex-col py-3"
          : "flex-1 py-4 px-6 max-w-3xl mx-auto"
      )}>
        <div
          ref={contentRef}
          className={cn(
            'transition-all duration-300 ease-out',
            currentStep === 3 ? 'flex flex-col flex-1 min-h-0' : '',
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
