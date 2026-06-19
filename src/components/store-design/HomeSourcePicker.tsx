import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, FileText, ShoppingBag, LayoutGrid, Package } from "lucide-react";
import { useCustomPages } from "@/hooks/useCustomPages";
import { useProducts } from "@/hooks/useProducts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Kind = "default" | "shop" | "collections" | "product" | "custom";

const BUILTIN: { id: Kind; label: string; description: string; icon: any }[] = [
  { id: "default", label: "Default Home", description: "Your theme's built-in homepage with sections", icon: Home },
  { id: "shop", label: "Shop (All products)", description: "Open straight to your full product catalog", icon: ShoppingBag },
  { id: "collections", label: "Collections", description: "Lead with a grid of all your categories", icon: LayoutGrid },
  { id: "product", label: "Single Product", description: "Spotlight one hero product (great for single-SKU brands)", icon: Package },
];

export default function HomeSourcePicker({ store, onStoreUpdated }: { store: any; onStoreUpdated?: (patch: any) => void }) {
  const storeId = store?.id;
  const { list } = useCustomPages(storeId);
  const { products } = useProducts();
  const pages = list.data || [];
  const [homeKind, setHomeKind] = useState<Kind>((store?.home_page_kind as Kind) || "default");
  const [homePageId, setHomePageId] = useState<string | null>(store?.home_page_id || null);
  const [homeProductId, setHomeProductId] = useState<string | null>(store?.home_page_product_id || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHomeKind((store?.home_page_kind as Kind) || "default");
    setHomePageId(store?.home_page_id || null);
    setHomeProductId(store?.home_page_product_id || null);
  }, [store?.home_page_kind, store?.home_page_id, store?.home_page_product_id]);

  const save = async () => {
    if (!storeId) return;
    if (homeKind === "custom" && !homePageId) { toast.error("Pick a custom page"); return; }
    if (homeKind === "product" && !homeProductId) { toast.error("Pick a product to spotlight"); return; }
    setSaving(true);
    const patch = {
      home_page_kind: homeKind,
      home_page_id: homeKind === "custom" ? homePageId : null,
      home_page_product_id: homeKind === "product" ? homeProductId : null,
    };
    const { error } = await (supabase as any).from("stores").update(patch).eq("id", storeId);
    if (error) toast.error(error.message);
    else { toast.success("Home page updated"); onStoreUpdated?.(patch); }
    setSaving(false);
  };

  const publishedPages = pages.filter((p: any) => p.status === "published");
  const value =
    homeKind === "custom" && homePageId ? `custom:${homePageId}` :
    homeKind === "product" ? "product" :
    homeKind === "shop" ? "shop" :
    homeKind === "collections" ? "collections" : "default";

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Home className="h-4 w-4" /> Home page source
          <Badge variant="secondary" className="text-[10px]">WordPress-style</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Choose what visitors see at /store/{store?.slug}. Any page can be your front page.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={value}
          onValueChange={(v) => {
            if (v.startsWith("custom:")) { setHomeKind("custom"); setHomePageId(v.replace("custom:", "")); }
            else { setHomeKind(v as Kind); setHomePageId(null); }
          }}
          className="grid sm:grid-cols-2 gap-2"
        >
          {BUILTIN.map((opt) => {
            const Icon = opt.icon;
            return (
              <label key={opt.id} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/30 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value={opt.id} className="mt-1" />
                <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.description}</div>
                  {opt.id === "product" && homeKind === "product" && (
                    <div className="mt-2" onClick={(e) => e.preventDefault()}>
                      <Select value={homeProductId || ""} onValueChange={(v) => setHomeProductId(v)}>
                        <SelectTrigger className="h-9 w-full"><SelectValue placeholder={products.length ? "Pick a product…" : "No products yet"} /></SelectTrigger>
                        <SelectContent>
                          {products.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </label>
            );
          })}
          {publishedPages.map((p: any) => (
            <label key={p.id} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/30 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <RadioGroupItem value={`custom:${p.id}`} className="mt-1" />
              <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium text-sm flex items-center gap-2">{p.title} <Badge variant="secondary" className="text-[10px]">Custom</Badge></div>
                <div className="text-xs text-muted-foreground">{p.description || `/p/${p.slug}`}</div>
              </div>
            </label>
          ))}
        </RadioGroup>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save home page"}</Button>
      </CardContent>
    </Card>
  );
}
