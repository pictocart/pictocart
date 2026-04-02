import { THEME_TEMPLATES } from '@/lib/themes';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Crown, Palette } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const AdminThemes = () => {
  const [defaultPrice, setDefaultPrice] = useState(500);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Theme Management</h1>
        <p className="text-sm text-muted-foreground">Configure theme pricing and availability</p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <div className="space-y-1.5 flex-1">
            <Label className="text-xs">Default Premium Theme Price (₹)</Label>
            <Input
              type="number"
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(Number(e.target.value))}
              className="max-w-[120px] h-8"
            />
          </div>
          <Button size="sm" onClick={() => toast.success(`Default price set to ₹${defaultPrice}`)}>
            Update Price
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {THEME_TEMPLATES.map((theme) => (
          <Card key={theme.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-1">
                {Object.values(theme.colors).slice(0, 4).map((c, i) => (
                  <div key={i} className="h-5 flex-1 rounded-sm first:rounded-l-md last:rounded-r-md" style={{ backgroundColor: c }} />
                ))}
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    {theme.isPremium && <Crown className="h-3 w-3 text-amber-500" />}
                    {theme.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{theme.category}</p>
                </div>
                <Badge variant={theme.isPremium ? 'default' : 'outline'} className="text-xs">
                  {theme.isPremium ? `₹${theme.price}` : 'Free'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminThemes;
