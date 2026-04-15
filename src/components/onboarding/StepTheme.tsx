import { cn } from '@/lib/utils';
import { THEME_TEMPLATES, type ThemeTemplate } from '@/lib/themes';
import { Check, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { OnboardingData } from '@/pages/Onboarding';

interface Props {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}

const StepTheme = ({ data, setData }: Props) => {
  const freeThemes = THEME_TEMPLATES.filter((t) => !t.isPremium);
  const premiumThemes = THEME_TEMPLATES.filter((t) => t.isPremium);

  const selectTheme = (theme: ThemeTemplate) => {
    // Only allow free themes during onboarding
    if (theme.isPremium) return;
    setData((d) => ({ ...d, selectedThemeId: theme.id }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">Choose a theme</h2>
        <p className="text-sm text-muted-foreground">
          Pick a look for your store. You can change or upgrade anytime.
        </p>
      </div>

      {/* Free themes */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Free Themes</p>
        <div className="grid grid-cols-2 gap-3">
          {freeThemes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              selected={data.selectedThemeId === theme.id}
              onClick={() => selectTheme(theme)}
            />
          ))}
        </div>
      </div>

      {/* Premium themes - shown but locked */}
      {premiumThemes.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Premium Themes</p>
          <div className="grid grid-cols-2 gap-3">
            {premiumThemes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                selected={false}
                onClick={() => {}}
                locked
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
}: {
  theme: ThemeTemplate;
  selected: boolean;
  onClick: () => void;
  locked?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={locked}
    className={cn(
      'relative rounded-xl border-2 p-3 text-left transition-all',
      selected
        ? 'border-primary bg-accent shadow-sm'
        : locked
        ? 'border-border opacity-60 cursor-not-allowed'
        : 'border-border hover:border-primary/40 hover:shadow-sm'
    )}
  >
    {/* Color swatches */}
    <div className="flex gap-1 mb-2">
      {[theme.colors.primary, theme.colors.secondary, theme.colors.accent, theme.colors.background].map(
        (color, i) => (
          <div
            key={i}
            className="h-5 w-5 rounded-full border border-border/50"
            style={{ backgroundColor: color }}
          />
        )
      )}
    </div>

    <p className="text-sm font-semibold">{theme.name}</p>
    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{theme.description}</p>

    {selected && (
      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
        <Check className="h-3 w-3 text-primary-foreground" />
      </div>
    )}

    {locked && (
      <Badge variant="secondary" className="absolute top-2 right-2 text-[10px] gap-0.5">
        <Crown className="h-2.5 w-2.5" /> ₹{theme.price}
      </Badge>
    )}
  </button>
);

export default StepTheme;
