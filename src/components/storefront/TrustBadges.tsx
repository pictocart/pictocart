import { Truck, ShieldCheck, RotateCcw, CreditCard, Headphones, Leaf } from 'lucide-react';

interface Props {
  colors: any;
  borderRadius: number;
  category?: string | null;
}

const BADGES = [
  { icon: Truck, label: 'Free Shipping', sub: 'Orders above ₹499' },
  { icon: ShieldCheck, label: 'Secure Payment', sub: '100% protected' },
  { icon: RotateCcw, label: 'Easy Returns', sub: '7-day return policy' },
  { icon: CreditCard, label: 'COD Available', sub: 'Pay on delivery' },
];

const CATEGORY_BADGES: Record<string, { icon: typeof Truck; label: string; sub: string }[]> = {
  food: [
    { icon: Leaf, label: 'FSSAI Licensed', sub: 'Quality assured' },
    { icon: Truck, label: 'Fresh Delivery', sub: 'Temperature controlled' },
    { icon: ShieldCheck, label: 'Hygiene Certified', sub: '100% safe' },
    { icon: RotateCcw, label: 'Easy Refund', sub: 'If not satisfied' },
  ],
  fashion: [
    { icon: Truck, label: 'Free Shipping', sub: 'All orders' },
    { icon: RotateCcw, label: 'Easy Exchange', sub: '15-day window' },
    { icon: ShieldCheck, label: 'Genuine Products', sub: '100% authentic' },
    { icon: CreditCard, label: 'COD Available', sub: 'Pay on delivery' },
  ],
  electronics: [
    { icon: ShieldCheck, label: 'Warranty Included', sub: 'Manufacturer warranty' },
    { icon: Truck, label: 'Fast Delivery', sub: 'Express shipping' },
    { icon: RotateCcw, label: '10-Day Returns', sub: 'No questions asked' },
    { icon: Headphones, label: 'Tech Support', sub: 'Expert assistance' },
  ],
};

const TrustBadges = ({ colors, borderRadius, category }: Props) => {
  const cat = category?.toLowerCase() || '';
  const badges = CATEGORY_BADGES[cat] || BADGES;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {badges.map((badge, i) => {
        const Icon = badge.icon;
        return (
          <div
            key={i}
            className="flex items-center gap-3 p-3 trust-badge-enter"
            style={{
              backgroundColor: colors.secondary + '40',
              borderRadius: `${borderRadius}px`,
              animationDelay: `${i * 0.1}s`,
            }}
          >
            <div
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: colors.primary + '15' }}
            >
              <Icon className="h-4 w-4" style={{ color: colors.primary }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{badge.label}</p>
              <p className="text-[10px] opacity-50 truncate">{badge.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TrustBadges;
