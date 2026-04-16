import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy, Rocket, PartyPopper, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import type { OnboardingData } from '@/pages/Onboarding';
import type { Store } from '@/hooks/useStore';

interface Props {
  data: OnboardingData;
  store: Store | null;
  onFinish: () => Promise<void>;
}

const StepGoLive = ({ data, store, onFinish }: Props) => {
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  const storeUrl = `${window.location.host}/store/${data.slug || store?.slug || 'my-store'}`;

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#F97316', '#FB923C', '#FED7AA', '#FDBA74', '#EA580C'],
    });
  }, []);

  const handlePublish = async () => {
    setPublishing(true);
    await onFinish();
    setPublishing(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`https://${storeUrl}`);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`space-y-10 text-center transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <div className="space-y-4">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/30 shadow-2xl shadow-primary/20">
          <PartyPopper className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Your store is ready! 🎉</h2>
        <p className="text-muted-foreground max-w-sm mx-auto text-base">
          You've set up <span className="font-semibold text-foreground">{data.storeName || 'your store'}</span>.
          Go live now and start sharing with customers!
        </p>
      </div>

      {/* Store URL */}
      <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 max-w-sm mx-auto shadow-lg shadow-primary/10">
        <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-medium">Your store link</p>
        <div className="flex items-center gap-2 justify-center bg-background/80 rounded-xl px-4 py-2.5">
          <code className="text-sm font-medium text-foreground">{storeUrl}</code>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copyLink}>
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Button
        size="lg"
        onClick={handlePublish}
        disabled={publishing}
        className="gap-3 text-lg px-10 h-14 rounded-xl shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5"
      >
        {publishing ? (
          <>
            <div className="h-5 w-5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
            Publishing...
          </>
        ) : (
          <>
            <Rocket className="h-6 w-6" /> Go Live Now <ArrowRight className="h-5 w-5" />
          </>
        )}
      </Button>

      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        You can add more products, customize your theme, and connect a custom domain from the dashboard.
      </p>
    </div>
  );
};

export default StepGoLive;
