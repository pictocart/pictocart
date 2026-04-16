import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const PRODUCT_TYPES = [
  { value: 'physical', label: 'Physical Product' },
  { value: 'digital', label: 'Digital Product' },
  { value: 'food', label: 'Food & Beverage' },
  { value: 'fashion', label: 'Fashion & Apparel' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'beauty', label: 'Beauty & Cosmetics' },
  { value: 'handmade', label: 'Handmade / Craft' },
  { value: 'service', label: 'Service' },
] as const;

export type ProductType = typeof PRODUCT_TYPES[number]['value'];

const CATEGORY_TO_TYPE: Record<string, ProductType> = {
  fashion: 'fashion', clothing: 'fashion', apparel: 'fashion',
  food: 'food', grocery: 'food', bakery: 'food', restaurant: 'food',
  electronics: 'electronics', gadgets: 'electronics', tech: 'electronics',
  beauty: 'beauty', cosmetics: 'beauty', skincare: 'beauty',
  handmade: 'handmade', craft: 'handmade', art: 'handmade',
  digital: 'digital', software: 'digital', ebook: 'digital',
  service: 'service', services: 'service',
};

export const getDefaultProductType = (storeCategory?: string | null): ProductType => {
  if (!storeCategory) return 'physical';
  const lower = storeCategory.toLowerCase();
  for (const [key, type] of Object.entries(CATEGORY_TO_TYPE)) {
    if (lower.includes(key)) return type;
  }
  return 'physical';
};

interface Props {
  productType: ProductType;
  metadata: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

const ProductTypeFields = ({ productType, metadata, onChange }: Props) => {
  const field = (key: string, label: string, placeholder: string, multiline = false) => (
    <div className="space-y-1.5" key={key}>
      <Label>{label}</Label>
      {multiline ? (
        <Textarea value={metadata[key] || ''} onChange={(e) => onChange(key, e.target.value)} placeholder={placeholder} rows={3} />
      ) : (
        <Input value={metadata[key] || ''} onChange={(e) => onChange(key, e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );

  const selectField = (key: string, label: string, options: string[]) => (
    <div className="space-y-1.5" key={key}>
      <Label>{label}</Label>
      <Select value={metadata[key] || ''} onValueChange={(v) => onChange(key, v)}>
        <SelectTrigger><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  const toggleField = (key: string, label: string) => (
    <div className="flex items-center justify-between" key={key}>
      <Label>{label}</Label>
      <Switch checked={!!metadata[key]} onCheckedChange={(v) => onChange(key, v)} />
    </div>
  );

  switch (productType) {
    case 'fashion':
      return (
        <div className="space-y-4">
          {field('material', 'Material', 'e.g. 100% Cotton')}
          {field('care_instructions', 'Care Instructions', 'e.g. Machine wash cold', true)}
          {selectField('fit_type', 'Fit Type', ['Slim Fit', 'Regular Fit', 'Loose Fit', 'Oversized'])}
          {selectField('gender', 'Gender', ['Men', 'Women', 'Unisex', 'Kids', 'Boys', 'Girls'])}
        </div>
      );
    case 'food':
      return (
        <div className="space-y-4">
          {field('ingredients', 'Ingredients', 'List all ingredients', true)}
          {field('nutritional_info', 'Nutritional Info', 'Calories, protein, etc.', true)}
          {field('shelf_life', 'Shelf Life', 'e.g. 6 months')}
          {field('allergens', 'Allergens', 'e.g. Contains nuts, gluten')}
          {field('fssai_license', 'FSSAI License No.', 'License number')}
        </div>
      );
    case 'electronics':
      return (
        <div className="space-y-4">
          {field('warranty_period', 'Warranty Period', 'e.g. 1 year manufacturer warranty')}
          {field('model_number', 'Model Number', 'e.g. MX-2024')}
          {field('power_rating', 'Power Rating', 'e.g. 65W')}
          {field('connectivity', 'Connectivity', 'e.g. Bluetooth 5.3, WiFi 6')}
        </div>
      );
    case 'beauty':
      return (
        <div className="space-y-4">
          {field('ingredients', 'Ingredients', 'Key ingredients', true)}
          {selectField('skin_type', 'Skin Type', ['All Skin Types', 'Oily', 'Dry', 'Combination', 'Sensitive', 'Normal'])}
          {field('usage_instructions', 'Usage Instructions', 'How to use', true)}
          {field('expiry_date', 'Expiry Date', 'MM/YYYY')}
        </div>
      );
    case 'handmade':
      return (
        <div className="space-y-4">
          {field('making_time', 'Making Time', 'e.g. 3-5 days')}
          {field('material', 'Material', 'e.g. Handwoven jute')}
          {toggleField('customization_available', 'Customization Available')}
        </div>
      );
    case 'digital':
      return (
        <div className="space-y-4">
          {field('file_format', 'File Format', 'e.g. PDF, MP4, ZIP')}
          {field('download_link', 'Download Link', 'URL for digital delivery')}
          {selectField('license_type', 'License Type', ['Personal Use', 'Commercial Use', 'Extended License', 'Open Source'])}
        </div>
      );
    case 'service':
      return (
        <div className="space-y-4">
          {field('duration', 'Duration', 'e.g. 1 hour session')}
          {field('delivery_method', 'Delivery Method', 'e.g. Online / In-person')}
          {toggleField('booking_required', 'Booking Required')}
        </div>
      );
    default:
      return null;
  }
};

export default ProductTypeFields;
