import { Heart } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  isWishlisted: boolean;
  onToggle: () => Promise<{ action: 'added' | 'removed' }>;
  isLoggedIn: boolean;
  primaryColor: string;
  size?: 'sm' | 'md';
}

const WishlistButton = ({ isWishlisted, onToggle, isLoggedIn, primaryColor, size = 'sm' }: Props) => {
  return null;
  /*
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const padding = size === 'sm' ? 'p-1.5' : 'p-2';

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      toast.info('Please sign in to save items to your wishlist');
      return;
    }
    try {
      const result = await onToggle();
      toast.success(result.action === 'added' ? 'Added to wishlist ❤️' : 'Removed from wishlist');
    } catch {
      toast.error('Something went wrong');
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`${padding} rounded-full backdrop-blur-sm transition-all hover:scale-110`}
      style={{
        backgroundColor: isWishlisted ? primaryColor + '20' : 'rgba(255,255,255,0.7)',
      }}
      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart
        className={`${iconSize} transition-colors`}
        style={{
          fill: isWishlisted ? '#ef4444' : 'transparent',
          color: isWishlisted ? '#ef4444' : '#666',
        }}
      />
    </button>
  );
  */
};

export default WishlistButton;
