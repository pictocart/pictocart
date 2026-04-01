import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store } from 'lucide-react';
import type { OnboardingData } from '@/pages/Onboarding';

interface Props {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}

const slugify = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const StepStoreName = ({ data, setData }: Props) => {
  const handleChange = (name: string) => {
    setData((d) => ({ ...d, storeName: name, slug: slugify(name) }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
          <Store className="h-7 w-7 text-accent-foreground" />
        </div>
        <h2 className="text-xl font-bold">What's your store name?</h2>
        <p className="text-sm text-muted-foreground">
          Pick a name that represents your brand. You can change it later.
        </p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="store-name">Store Name</Label>
        <Input
          id="store-name"
          placeholder="e.g. Priya's Fashion Hub"
          value={data.storeName}
          onChange={(e) => handleChange(e.target.value)}
          className="text-base h-12"
          autoFocus
        />
      </div>

      {data.slug && (
        <div className="rounded-lg border border-border bg-secondary/50 p-3">
          <p className="text-xs text-muted-foreground mb-1">Your store URL</p>
          <p className="text-sm font-medium text-foreground">
            <span className="text-muted-foreground">antariksh.shop/</span>
            {data.slug}
          </p>
        </div>
      )}
    </div>
  );
};

export default StepStoreName;
