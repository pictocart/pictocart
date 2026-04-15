import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, MapPin, Receipt } from 'lucide-react';
import type { OnboardingData } from '@/pages/Onboarding';

interface Props {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}

const StepStoreInfo = ({ data, setData }: Props) => {
  const update = (field: 'phone' | 'city' | 'gst', value: string) => {
    setData((d) => ({ ...d, storeInfo: { ...d.storeInfo, [field]: value } }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">Store contact info</h2>
        <p className="text-sm text-muted-foreground">
          Add business details for your customers. All fields are optional — you can fill these later.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number
          </Label>
          <Input
            id="phone"
            placeholder="+91 98765 43210"
            value={data.storeInfo.phone}
            onChange={(e) => update('phone', e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city" className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> City
          </Label>
          <Input
            id="city"
            placeholder="e.g. Mumbai, Delhi, Bangalore"
            value={data.storeInfo.city}
            onChange={(e) => update('city', e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gst" className="flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5 text-muted-foreground" /> GST Number
            <span className="text-xs text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="gst"
            placeholder="22AAAAA0000A1Z5"
            value={data.storeInfo.gst}
            onChange={(e) => update('gst', e.target.value.toUpperCase())}
            className="h-11 font-mono"
            maxLength={15}
          />
        </div>
      </div>
    </div>
  );
};

export default StepStoreInfo;
