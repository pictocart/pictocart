import { Star, Heart, ShoppingBag } from 'lucide-react';

interface Props {
  title: string;
  price: string;
  compareAtPrice: string;
  image?: string;
  category?: string;
}

const ProductPreviewCard = ({ title, price, compareAtPrice, image, category }: Props) => {
  const p = Number(price) || 0;
  const cp = Number(compareAtPrice) || 0;
  const discount = cp > p ? Math.round(((cp - p) / cp) * 100) : 0;

  return (
    <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="text-[10px] font-medium text-muted-foreground px-3 pt-2 pb-1 border-b bg-muted/30">
        📱 Live Preview
      </div>
      <div className="aspect-square bg-muted relative">
        {image ? (
          <img src={image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No image</div>
        )}
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            {discount}% OFF
          </span>
        )}
        <button className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center">
          <Heart className="h-3.5 w-3.5 text-gray-400" />
        </button>
      </div>
      <div className="p-3 space-y-1.5">
        {category && (
          <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{category}</span>
        )}
        <h4 className="text-sm font-semibold truncate">{title || 'Product Title'}</h4>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-orange-500">₹{p.toLocaleString('en-IN')}</span>
          {discount > 0 && (
            <span className="text-[10px] line-through text-gray-400">₹{cp.toLocaleString('en-IN')}</span>
          )}
        </div>
        <div className="flex gap-1.5 pt-1">
          <div className="flex-1 bg-orange-50 border border-orange-200 text-orange-600 text-[10px] font-semibold py-1.5 rounded text-center flex items-center justify-center gap-1">
            <ShoppingBag className="h-3 w-3" /> Add to Cart
          </div>
          <div className="flex-1 bg-orange-500 text-white text-[10px] font-semibold py-1.5 rounded text-center">
            Buy Now
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPreviewCard;
