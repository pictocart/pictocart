import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { THEME_TEMPLATES, type ThemeTemplate } from '@/lib/themes';
import { Check, Crown, Palette } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { OnboardingData } from '@/pages/Onboarding';

interface Props {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}

const StepTheme = ({ data, setData }: Props) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const freeThemes = THEME_TEMPLATES.filter((t) => !t.isPremium);
  const premiumThemes = THEME_TEMPLATES.filter((t) => t.isPremium);

  const selectTheme = (theme: ThemeTemplate) => {
    if (theme.isPremium) return;
    setData((d) => ({ ...d, selectedThemeId: theme.id }));
  };

  return (
    <div className={`space-y-8 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 shadow-lg shadow-primary/10">
          <Palette className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Choose a theme</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Pick a look for your store. You can change or upgrade anytime from the dashboard.
        </p>
      </div>

      {/* Free themes */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Free Themes</p>
        <div className="grid grid-cols-2 gap-4">
          {freeThemes.map((theme, i) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              selected={data.selectedThemeId === theme.id}
              onClick={() => selectTheme(theme)}
              delay={i * 80}
            />
          ))}
        </div>
      </div>

      {premiumThemes.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Premium Themes</p>
          <div className="grid grid-cols-2 gap-4">
            {premiumThemes.map((theme, i) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                selected={false}
                onClick={() => {}}
                locked
                delay={i * 80 + 200}
              />
            ))}
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Premium themes can be unlocked from the dashboard after setup.
          </p>
        </div>
      )}
    </div>
  );
};

const ThemeCard = ({
  theme,
  selected,
  onClick,
  locked,
  delay = 0,
}: {
  theme: ThemeTemplate;
  selected: boolean;
  onClick: () => void;
  locked?: boolean;
  delay?: number;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={locked}
    className={cn(
      'relative rounded-2xl border-2 p-4 text-left transition-all duration-300 hover:-translate-y-0.5',
      selected
        ? 'border-primary bg-accent shadow-lg shadow-primary/10 ring-2 ring-primary/15'
        : locked
        ? 'border-border opacity-50 cursor-not-allowed'
        : 'border-border hover:border-primary/40 hover:shadow-md bg-card'
    )}
  >
    {/* Color swatches */}
    <div className="flex gap-1.5 mb-3">
      {[theme.colors.primary, theme.colors.secondary, theme.colors.accent, theme.colors.background].map(
        (color, i) => (
          <div
            key={i}
            className="h-6 w-6 rounded-lg border border-border/50 shadow-sm"
            style={{ backgroundColor: color }}
          />
        )
      )}
    </div>

    <p className="text-sm font-bold">{theme.name}</p>
    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{theme.description}</p>

    {selected && (
      <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
        <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
      </div>
    )}

    {locked && (
      <Badge variant="secondary" className="absolute top-3 right-3 text-[10px] gap-0.5 shadow-sm">
        <Crown className="h-2.5 w-2.5" /> ₹{theme.price}
      </Badge>
    )}
  </button>
);

export default StepTheme;
