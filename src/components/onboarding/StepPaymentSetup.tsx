import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CreditCard, Banknote, Smartphone, ShieldCheck } from 'lucide-react';
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
    color: 'text-green-600',
    bg: 'bg-green-500/10',
  },
  {
    id: 'upi' as const,
    label: 'UPI Payment',
    description: 'Accept payments via UPI (Google Pay, PhonePe, etc.)',
    icon: Smartphone,
    color: 'text-purple-600',
    bg: 'bg-purple-500/10',
  },
  {
    id: 'razorpay' as const,
    label: 'Card / Net Banking',
    description: 'Accept credit/debit cards and net banking via Razorpay',
    icon: CreditCard,
    color: 'text-blue-600',
    bg: 'bg-blue-500/10',
  },
];

const StepPaymentSetup = ({ data, setData }: Props) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

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
    <div className={`space-y-8 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 shadow-lg shadow-primary/10">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Payment Methods</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Choose how you want to accept payments. You can always change this later.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {paymentMethods.map((method, i) => (
          <div
            key={method.id}
            style={{ transitionDelay: `${i * 80}ms` }}
            className={cn(
              'flex items-center justify-between rounded-2xl border-2 p-5 transition-all duration-300 cursor-pointer hover:-translate-y-0.5',
              data.paymentSettings[method.id]
                ? 'border-primary bg-accent shadow-md shadow-primary/10'
                : 'border-border hover:border-primary/30 hover:shadow-sm'
            )}
            onClick={() => toggle(method.id)}
          >
            <div className="flex items-center gap-4">
              <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', method.bg)}>
                <method.icon className={cn('h-6 w-6', method.color)} />
              </div>
              <div>
                <Label className="text-sm font-semibold cursor-pointer">{method.label}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{method.description}</p>
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
