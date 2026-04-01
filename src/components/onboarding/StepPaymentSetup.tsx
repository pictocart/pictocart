import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CreditCard, Banknote, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OnboardingData } from '@/pages/Onboarding';

interface Props {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}

const paymentMethods = [
  {
    id: 'cod' as const,
    label: 'Cash on Delivery',
    description: 'Collect payment when the order is delivered',
    icon: Banknote,
  },
  {
    id: 'upi' as const,
    label: 'UPI Payment',
    description: 'Accept payments via UPI (Google Pay, PhonePe, etc.)',
    icon: Smartphone,
  },
  {
    id: 'razorpay' as const,
    label: 'Card / Net Banking',
    description: 'Accept credit/debit cards and net banking via Razorpay',
    icon: CreditCard,
  },
];

const StepPaymentSetup = ({ data, setData }: Props) => {
  const toggle = (method: 'cod' | 'upi' | 'razorpay') => {
    setData((d) => ({
      ...d,
      paymentSettings: {
        ...d.paymentSettings,
        [method]: !d.paymentSettings[method],
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
          <CreditCard className="h-7 w-7 text-accent-foreground" />
        </div>
        <h2 className="text-xl font-bold">Payment Methods</h2>
        <p className="text-sm text-muted-foreground">
          Choose how you want to accept payments. You can change this later.
        </p>
      </div>

      <div className="space-y-3">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className={cn(
              'flex items-center justify-between rounded-xl border-2 p-4 transition-all',
              data.paymentSettings[method.id]
                ? 'border-primary bg-accent'
                : 'border-border'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <method.icon className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <Label className="text-sm font-medium cursor-pointer">{method.label}</Label>
                <p className="text-xs text-muted-foreground">{method.description}</p>
              </div>
            </div>
            <Switch
              checked={data.paymentSettings[method.id]}
              onCheckedChange={() => toggle(method.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default StepPaymentSetup;
