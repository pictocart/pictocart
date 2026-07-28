import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Zap, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/hooks/useCart';
import confetti from 'canvas-confetti';

interface Product {
  id: string;
  title?: string;
  name?: string;
  price: number;
  image?: string | null;
  images?: string[] | null;
  inventory_count?: number | null;
}

interface Props {
  storeSlug: string;
  product: Product;
  primaryColor?: string;
  primaryFg?: string;
  borderRadius?: string | number;
  compact?: boolean;
  storeCategory?: string;
}

/**
 * Add to Cart + Buy Now buttons rendered on shop / listing product cards.
 * Clicking either stops parent <Link> navigation. Buy Now adds the item then
 * routes straight to the store checkout.
 */
const ProductCardActions = ({ storeSlug, product, primaryColor = 'hsl(var(--primary))', primaryFg = '#fff', borderRadius = '8px', compact = false, storeCategory }: Props) => {
  const navigate = useNavigate();
  const { addItem } = useCart(storeSlug);
  const [isAdding, setIsAdding] = React.useState(false);
  const [isAdded, setIsAdded] = React.useState(false);

  const title = product.title || product.name || 'Product';
  const image = product.image ?? product.images?.[0] ?? null;
  const isOutOfStock = product.inventory_count !== null && product.inventory_count !== undefined && product.inventory_count <= 0;
  const radius = typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius;

  const stop = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); };

  const triggerConfetti = () => {
    if (storeCategory === 'food') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#FFC107', '#8BC34A', '#FFFFFF', '#FF5722']
      });
    }
  };

  const triggerParabolicFly = (e: React.MouseEvent, qty: number = 1) => {
    const button = e.currentTarget as HTMLElement;
    const card = button.closest('.group') || button.closest('a') || button.closest('div');
    const imgEl = card ? card.querySelector('img') : null;
    let startRect = imgEl ? imgEl.getBoundingClientRect() : null;
    
    if (!startRect || startRect.top < 0 || startRect.bottom > window.innerHeight) {
      startRect = button.getBoundingClientRect();
    }
    
    const getCartButton = () => {
      const mobileCart = document.getElementById('mobile-cart-btn');
      if (mobileCart) {
        const rect = mobileCart.getBoundingClientRect();
        if (rect.top >= 0 && rect.bottom <= window.innerHeight && rect.width > 0) {
          return mobileCart;
        }
      }
      const headerCart = document.getElementById('header-cart-btn');
      if (headerCart) {
        const rect = headerCart.getBoundingClientRect();
        if (rect.top >= 0 && rect.bottom <= window.innerHeight && rect.width > 0) {
          return headerCart;
        }
      }
      return document.getElementById('header-cart-btn') || 
             document.getElementById('mobile-cart-btn') || 
             document.querySelector('.shopping-bag');
    };

    const cartBtn = getCartButton();
    if (!cartBtn) return;
    const endRect = cartBtn.getBoundingClientRect();
    
    // Starting coordinates (top right of the card image or center of button)
    const startX = startRect.left + startRect.width - 12;
    const startY = startRect.top - 12;
    
    // Target coordinates (center of the cart icon)
    const endX = endRect.left + endRect.width / 2 - 11;
    const endY = endRect.top + endRect.height / 2 - 11;
    
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    
    const flyEl = document.createElement('div');
    flyEl.className = 'dynamic-cart-flyer';
    flyEl.style.left = `${startX}px`;
    flyEl.style.top = `${startY}px`;
    flyEl.style.setProperty('--tx', `${deltaX}px`);
    flyEl.style.setProperty('--ty', `${deltaY}px`);
    
    const flyInner = document.createElement('div');
    flyInner.className = 'dynamic-cart-flyer-inner';
    flyInner.innerText = String(qty);
    flyEl.appendChild(flyInner);
    
    document.body.appendChild(flyEl);
    
    setTimeout(() => {
      flyEl.remove();
      
      // Apply shake animation on the cart button
      cartBtn.classList.remove('shake-cart');
      void cartBtn.offsetWidth; // trigger reflow
      cartBtn.classList.add('shake-cart');
      
      // Wiggle badge if any
      const badge = cartBtn.querySelector('.animate-badge-pop');
      if (badge) {
        badge.classList.remove('animate-badge-pop');
        void (badge as HTMLElement).offsetWidth;
        badge.classList.add('animate-badge-pop');
      }
      
      setTimeout(() => {
        cartBtn.classList.remove('shake-cart');
      }, 500);
    }, 800);
  };

  // Expose to window for global access
  if (typeof window !== 'undefined') {
    (window as any).triggerParabolicFly = triggerParabolicFly;
  }

  const handleAdd = (e: React.MouseEvent) => {
    stop(e);
    if (isOutOfStock) { toast.error('Out of stock'); return; }
    if (isAdding || isAdded) return;

    setIsAdding(true);
    triggerParabolicFly(e, 1);
    
    setTimeout(() => {
      addItem({ productId: product.id, title, price: Number(product.price), image }, 1);
      setIsAdding(false);
      setIsAdded(true);
      triggerConfetti();
      toast.success(`${title} added to cart`);
      setTimeout(() => {
        setIsAdded(false);
      }, 2000);
    }, 800);
  };

  const handleBuy = (e: React.MouseEvent) => {
    stop(e);
    if (isOutOfStock) { toast.error('Out of stock'); return; }
    triggerParabolicFly(e, 1);
    
    setTimeout(() => {
      addItem({ productId: product.id, title, price: Number(product.price), image }, 1);
      triggerConfetti();
      navigate(`/store/${storeSlug}/checkout`);
    }, 800);
  };

  if (isOutOfStock) {
    return (
      <div className="mt-2.5 w-full">
        <button
          type="button"
          disabled
          className="w-full h-8 text-[11px] font-bold inline-flex items-center justify-center gap-1.5 bg-gray-500/20 text-gray-500 cursor-not-allowed border-none"
          style={{ borderRadius: radius }}
        >
          <span>Out of Stock</span>
        </button>
      </div>
    );
  }

  const heightClass = compact ? 'h-8' : 'h-9';
  const textClass = compact ? 'text-[11px]' : 'text-xs';
  const iconBtnWidth = compact ? 'w-8' : 'w-9';

  return (
    <div className="flex flex-col gap-1.5 mt-2.5 w-full" onClick={stop}>
      <button
        type="button"
        onClick={handleBuy}
        disabled={isOutOfStock}
        className={`w-full ${heightClass} ${textClass} font-bold inline-flex items-center justify-center gap-1.5 transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed`}
        style={{ background: primaryColor, color: primaryFg, borderRadius: radius }}
      >
        <Zap className="h-3.5 w-3.5" />
        <span>{storeCategory === 'food' ? 'Order Now' : 'Buy Now'}</span>
      </button>
      <button
        type="button"
        onClick={handleAdd}
        disabled={isOutOfStock || isAdding || isAdded}
        className={`w-full ${heightClass} ${textClass} font-semibold inline-flex items-center justify-center gap-1.5 border-2 transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-85 disabled:cursor-not-allowed`}
        style={{
          borderColor: isAdded ? '#16a34a' : primaryColor,
          color: isAdded ? '#16a34a' : primaryColor,
          background: isAdded ? '#16a34a10' : 'transparent',
          borderRadius: radius
        }}
      >
        {isAdding ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isAdded ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <ShoppingBag className="h-3.5 w-3.5" />
        )}
        <span>{isAdding ? 'Adding...' : isAdded ? 'Added!' : 'Add to Cart'}</span>
      </button>
    </div>
  );
};

export default ProductCardActions;
