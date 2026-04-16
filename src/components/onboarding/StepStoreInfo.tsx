import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, MapPin, Receipt, Building2 } from 'lucide-react';
import type { OnboardingData } from '@/pages/Onboarding';

interface Props {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}

const StepStoreInfo = ({ data, setData }: Props) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const update = (field: 'phone' | 'city' | 'gst', value: string) => {
    setData((d) => ({ ...d, storeInfo: { ...d.storeInfo, [field]: value } }));
  };

  return (
    <div className={`space-y-8 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 shadow-lg shadow-primary/10">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Store contact info</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Add business details for your customers. All fields are optional — you can fill these later.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-5">
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
            <Phone className="h-4 w-4 text-muted-foreground" /> Phone Number
          </Label>
          <Input
            id="phone"
            placeholder="+91 98765 43210"
            value={data.storeInfo.phone}
            onChange={(e) => update('phone', e.target.value)}
            className="h-12 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city" className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-muted-foreground" /> City
          </Label>
          <Input
            id="city"
            placeholder="e.g. Mumbai, Delhi, Bangalore"
            value={data.storeInfo.city}
            onChange={(e) => update('city', e.target.value)}
            className="h-12 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gst" className="flex items-center gap-2 text-sm font-medium">
            <Receipt className="h-4 w-4 text-muted-foreground" /> GST Number
            <span className="text-xs text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="gst"
            placeholder="22AAAAA0000A1Z5"
            value={data.storeInfo.gst}
            onChange={(e) => update('gst', e.target.value.toUpperCase())}
            className="h-12 font-mono rounded-xl"
            maxLength={15}
          />
        </div>
      </div>
    </div>
  );
};

export default StepStoreInfo;
