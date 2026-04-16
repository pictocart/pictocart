import { Truck, ShieldCheck, RotateCcw, CreditCard, Headphones, Leaf, Award, Lock, Sparkles, Heart, Gift, Zap, Star, Package, Users, Clock, BadgeCheck, ThumbsUp, Smile, MessageCircle } from 'lucide-react';

export const ICON_MAP: Record<string, any> = {
  truck: Truck, shield: ShieldCheck, return: RotateCcw, card: CreditCard,
  headphones: Headphones, leaf: Leaf, award: Award, lock: Lock, sparkles: Sparkles,
  heart: Heart, gift: Gift, zap: Zap, star: Star, package: Package, users: Users,
  clock: Clock, badge: BadgeCheck, thumb: ThumbsUp, smile: Smile, chat: MessageCircle,
};

export const ICON_OPTIONS = Object.keys(ICON_MAP);

interface Props {
  iconKey: string;
  color: string;
  bg?: string;
  size?: number;
  variant?: 'circle' | 'square' | 'rounded' | 'minimal';
}

const TrustBadgeIcon = ({ iconKey, color, bg, size = 24, variant = 'circle' }: Props) => {
  const Icon = ICON_MAP[iconKey] || ShieldCheck;
  const containerSize = size + 20;
  const radiusMap = { circle: '9999px', square: '0px', rounded: '12px', minimal: '8px' };
  return (
    <div
      className="flex items-center justify-center shrink-0 transition-transform hover:scale-110"
      style={{
        width: containerSize,
        height: containerSize,
        backgroundColor: bg || color + '15',
        borderRadius: radiusMap[variant],
      }}
    >
      <Icon style={{ width: size, height: size, color }} strokeWidth={2} />
    </div>
  );
};

export default TrustBadgeIcon;
