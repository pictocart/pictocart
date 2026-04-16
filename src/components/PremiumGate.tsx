import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  feature: keyof typeof import('@/hooks/useSubscription').PLAN_LIMITS['free'];
  children: React.ReactNode;
  fallbackMessage?: string;
}

const PremiumGate = ({ feature, children, fallbackMessage }: Props) => {
  const { canUse, isPremium, loading } = useSubscription();
  const navigate = useNavigate();

  if (loading) return <>{children}</>;

  if (canUse(feature)) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="pointer-events-none opacity-40 blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
        <div className="text-center p-6">
          <Crown className="h-8 w-8 text-primary mx-auto mb-3" />
          <h3 className="text-base font-semibold mb-1">Premium Feature</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs">
            {fallbackMessage || 'Upgrade to Premium to unlock this feature.'}
          </p>
          <Button size="sm" onClick={() => navigate('/billing')} className="gap-2">
            <Crown className="h-3.5 w-3.5" /> Upgrade Plan
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PremiumGate;
