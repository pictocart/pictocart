import logo from '@/assets/pictocart-logo.png';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  size?: number;
  withWordmark?: boolean;
  wordmarkClassName?: string;
}

const PicToCartLogo = ({ className, size = 36, withWordmark = false, wordmarkClassName }: Props) => (
  <span className={cn('inline-flex items-center gap-2', className)}>
    <img
      src={logo}
      alt="Pic to Cart logo"
      width={size}
      height={size}
      loading="lazy"
      className="object-contain drop-shadow-sm"
      style={{ width: size, height: size }}
    />
    {withWordmark && (
      <span className={cn('font-extrabold tracking-tight', wordmarkClassName)}>
        Pic to Cart
      </span>
    )}
  </span>
);

export default PicToCartLogo;
export { logo as picToCartLogoSrc };
