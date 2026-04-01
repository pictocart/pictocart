import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store, ShoppingBag } from 'lucide-react';
import type { OnboardingData } from '@/pages/Onboarding';

interface Props {
  data: OnboardingData;
}

const StepStorePreview = ({ data }: Props) => {
  const product = data.aiProduct;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">Store Preview</h2>
        <p className="text-sm text-muted-foreground">
          Here's how your store will look to customers.
        </p>
      </div>

      {/* Mock storefront */}
      <div className="rounded-xl border border-border overflow-hidden bg-background shadow-sm">
        {/* Store header */}
        <div className="bg-primary px-4 py-4 text-primary-foreground">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <Store className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-sm">{data.storeName || 'Your Store'}</p>
              <p className="text-xs opacity-80">{data.category || 'Shop'}</p>
            </div>
          </div>
        </div>

        {/* Product card */}
        <div className="p-4">
          {product && (data.productImageUrl || product.title) ? (
            <Card className="overflow-hidden">
              {data.productImageUrl && (
                <img
                  src={data.productImageUrl}
                  alt={product.title}
                  className="w-full h-48 object-contain bg-secondary/30"
                />
              )}
              <CardContent className="p-3 space-y-2">
                <h3 className="font-semibold text-sm">{product.title || 'Product Title'}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {product.shortDescription || 'Product description will appear here.'}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">
                    ₹{product.suggestedPrice || '---'}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    <ShoppingBag className="h-3 w-3 mr-1" /> Add to Cart
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <ShoppingBag className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">Your products will appear here</p>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        You can customize your store theme later from the dashboard.
      </p>
    </div>
  );
};

export default StepStorePreview;
