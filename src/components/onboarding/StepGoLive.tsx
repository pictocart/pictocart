import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy, Rocket, PartyPopper } from 'lucide-react';
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

  const storeUrl = `${window.location.host}/store/${data.slug || store?.slug || 'my-store'}`;

  useEffect(() => {
    // Fire confetti on mount
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#F97316', '#FB923C', '#FED7AA', '#FDBA74'],
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
    <div className="space-y-8 text-center">
      <div className="space-y-3">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent">
          <PartyPopper className="h-10 w-10 text-accent-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Your store is ready! 🎉</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          You've set up <span className="font-semibold text-foreground">{data.storeName || 'your store'}</span>.
          Go live now and start sharing with customers!
        </p>
      </div>

      {/* Store URL */}
      <div className="rounded-xl border border-border bg-secondary/50 p-4 max-w-sm mx-auto">
        <p className="text-xs text-muted-foreground mb-2">Your store link</p>
        <div className="flex items-center gap-2 justify-center">
          <code className="text-sm font-medium">{storeUrl}</code>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyLink}>
            {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      <Button
        size="lg"
        onClick={handlePublish}
        disabled={publishing}
        className="gap-2 text-base px-8"
      >
        {publishing ? (
          'Publishing...'
        ) : (
          <>
            <Rocket className="h-5 w-5" /> Go Live Now
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground">
        You can add more products, customize your theme, and connect a custom domain from the dashboard.
      </p>
    </div>
  );
};

export default StepGoLive;
