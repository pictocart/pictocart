import { Product } from '@/hooks/useProducts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Pencil, Trash2, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';

interface ProductCardProps {
  product: Product;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onToggleActive: (active: boolean) => void;
  onDelete: () => void;
}

const ProductCard = ({ product, selected, onSelect, onToggleActive, onDelete }: ProductCardProps) => {
  const navigate = useNavigate();
  const mainImage = product.images?.[0];

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-square bg-muted">
        {mainImage ? (
          <img src={mainImage} alt={product.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <Checkbox
            checked={selected}
            onCheckedChange={onSelect}
            className="bg-background/80"
          />
        </div>
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-7 w-7">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/products/${product.id}`)}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="text-sm font-medium leading-tight line-clamp-2 cursor-pointer hover:text-primary transition-colors"
            onClick={() => navigate(`/products/${product.id}`)}
          >
            {product.title}
          </h3>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">₹{product.price}</span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-xs text-muted-foreground line-through">₹{product.compare_at_price}</span>
          )}
        </div>
        <div className="flex items-center justify-between pt-1">
          <Badge variant={product.is_active ? 'default' : 'secondary'} className="text-[10px] h-5">
            {product.is_active ? 'Active' : 'Draft'}
          </Badge>
          <Switch
            checked={product.is_active ?? false}
            onCheckedChange={onToggleActive}
            className="scale-75"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
