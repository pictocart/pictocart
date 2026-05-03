import { Truck, RotateCcw, Award, HandHeart } from 'lucide-react';
import { tokens } from './tokens';

const items = [
  { icon: HandHeart, label: 'Handmade in India' },
  { icon: Truck, label: 'Free shipping ₹999+' },
  { icon: RotateCcw, label: '7-day easy returns' },
  { icon: Award, label: 'GI-tagged crafts' },
];

export const BazaarUSPStrip = () => (
  <section
    className="border-y"
    style={{ borderColor: tokens.colors.border, background: tokens.colors.surface }}
  >
    <div className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4 gap-4 px-6 py-6">
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-3">
          <Icon className="h-5 w-5" style={{ color: tokens.colors.primary }} />
          <span className="text-sm" style={{ color: tokens.colors.text }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  </section>
);
