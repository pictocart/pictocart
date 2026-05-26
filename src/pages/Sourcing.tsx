import { useState, useEffect } from "react";
import { useStore } from "@/hooks/useStore";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Search, Flame, Bookmark, PackagePlus, Lock, MapPin, Star, Loader2,
  Phone, Mail, Globe, Check, Sparkles, TrendingUp, ShoppingBag,
} from "lucide-react";

type SourcingProduct = {
  id: string;
  supplier_id: string | null;
  source: string;
  title: string;
  description: string | null;
  category: string | null;
  hero_image: string | null;
  images: string[];
  moq: number | null;
  price_min: number | null;
  price_max: number | null;
  currency: string;
  supplier_name_cached: string | null;
  supplier_city_cached: string | null;
  supplier_phone_masked: string | null;
  rating: number | null;
  reviews_count: number | null;
  ai_score: number;
};

const CATEGORIES = [
  { key: "beauty", label: "Beauty & Personal Care", emoji: "💄" },
  { key: "home", label: "Home & Décor", emoji: "🏡" },
  { key: "fashion", label: "Fashion & Apparel", emoji: "👗" },
  { key: "kitchen", label: "Kitchen", emoji: "🍳" },
  { key: "festive", label: "Festive & Pooja", emoji: "🪔" },
  { key: "tech", label: "Mobile Accessories", emoji: "📱" },
  { key: "toys", label: "Toys & Kids", emoji: "🧸" },
  { key: "wellness", label: "Wellness", emoji: "🧘" },
];

const fmtINR = (n?: number | null) =>
  n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function Sourcing() {
  const { store } = useStore();
  const [tab, setTab] = useState("viral");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<SourcingProduct[]>([]);
  const [viral, setViral] = useState<SourcingProduct[]>([]);
  const [saved, setSaved] = useState<SourcingProduct[]>([]);
  const [selected, setSelected] = useState<SourcingProduct | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<SourcingProduct[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);

  useEffect(() => { loadViral(); }, []);
  useEffect(() => { if (store?.id) loadSaved(); }, [store?.id]);

  async function loadCategory(key: string) {
    setActiveCategory(key);
    setCategoryLoading(true);
    const { data } = await supabase
      .from("sourcing_products")
      .select("*")
      .eq("is_active", true)
      .eq("category", key)
      .order("ai_score", { ascending: false })
      .limit(24);
    setCategoryProducts((data as any) ?? []);
    setCategoryLoading(false);
  }

  async function refreshCategory(key: string) {
    toast("Refreshing in the background — this takes ~60s");
    supabase.functions.invoke("sourcing-prewarm", { body: { category_key: key } })
      .then(({ data, error }) => {
        if (error) { toast.error(error.message); return; }
        toast.success(`Updated ${data?.inserted ?? 0} products`);
        loadCategory(key);
      });
  }

  async function loadViral() {
    const { data } = await supabase
      .from("sourcing_viral_products")
      .select("rank, growth_pct, reason, product:sourcing_products(*)")
      .order("rank", { ascending: true })
      .limit(20);
    setViral((data ?? []).map((r: any) => r.product).filter(Boolean));
    // Also fetch fallback if viral is empty
    if (!data || data.length === 0) {
      const { data: latest } = await supabase
        .from("sourcing_products").select("*").eq("is_active", true)
        .order("ai_score", { ascending: false }).limit(12);
      setViral(latest ?? []);
    }
  }

  async function loadSaved() {
    if (!store?.id) return;
    const { data } = await supabase
      .from("merchant_sourcing_saved")
      .select("product:sourcing_products(*)")
      .eq("store_id", store.id);
    setSaved((data ?? []).map((r: any) => r.product).filter(Boolean));
  }

  async function runSearch(overrideQ?: string) {
    if (!store?.id) { toast.error("Select a store first"); return; }
    const q = (overrideQ ?? query).trim();
    if (!q) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sourcing-search", {
        body: { query: q, city: city || null, store_id: store.id, limit: 10, sources: ["indiamart", "justdial"] },
      });
      if (error) throw error;
      if (data?.error === "INSUFFICIENT_CREDITS") {
        toast.error("Not enough credits. Top up your AI wallet.");
        return;
      }
      setProducts(data?.products ?? []);
      toast.success(`Found ${data?.count ?? 0} products · ${data?.balance} credits left`);
      setTab("results");
    } catch (e: any) {
      toast.error(e.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function toggleSave(p: SourcingProduct) {
    if (!store?.id) return;
    const isSaved = saved.some((s) => s.id === p.id);
    if (isSaved) {
      await supabase.from("merchant_sourcing_saved").delete().eq("store_id", store.id).eq("product_id", p.id);
      toast("Removed from saved");
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("merchant_sourcing_saved").insert({
        store_id: store.id, user_id: user.id, product_id: p.id,
      });
      toast.success("Saved");
    }
    loadSaved();
  }

  function ProductCard({ p }: { p: SourcingProduct }) {
    const isSaved = saved.some((s) => s.id === p.id);
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
        <div className="relative aspect-square bg-muted" onClick={() => setSelected(p)}>
          {p.hero_image ? (
            <img src={p.hero_image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ShoppingBag className="w-12 h-12" />
            </div>
          )}
          <Badge className="absolute top-2 left-2 bg-background/90 text-foreground border">
            <Sparkles className="w-3 h-3 mr-1" /> {Math.round(p.ai_score)}
          </Badge>
          <Button
            size="icon" variant="ghost"
            className="absolute top-2 right-2 bg-background/90 hover:bg-background"
            onClick={(e) => { e.stopPropagation(); toggleSave(p); }}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-primary text-primary" : ""}`} />
          </Button>
        </div>
        <div className="p-3 space-y-2">
          <h3 className="font-medium text-sm line-clamp-2 leading-snug">{p.title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">{fmtINR(p.price_min)}</span>
            {p.price_max && p.price_max !== p.price_min && (
              <span className="text-xs text-muted-foreground">– {fmtINR(p.price_max)}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {p.moq ? <span>MOQ {p.moq}</span> : null}
            {p.rating ? (
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />{p.rating.toFixed(1)}
              </span>
            ) : null}
            {p.supplier_city_cached ? (
              <span className="flex items-center gap-0.5 truncate">
                <MapPin className="w-3 h-3" />{p.supplier_city_cached}
              </span>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="w-3 h-3" />
            {p.supplier_name_cached ? `${p.supplier_name_cached}` : "Supplier locked"}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-pink-500 to-rose-500 text-white p-6 md:p-8 shadow-lg">
        <div className="flex items-center gap-2 text-sm opacity-90 mb-2">
          <Flame className="w-4 h-4" /> Source Products · Powered by India's wholesale marketplaces
        </div>
        <h1 className="text-2xl md:text-4xl font-bold mb-1">SourceIndia 🇮🇳</h1>
        <p className="text-white/90 text-sm md:text-base">
          Discover viral wholesale products from trusted Indian suppliers — import in one click.
        </p>

        <div className="mt-5 flex flex-col md:flex-row gap-2 bg-white rounded-xl p-2 shadow-xl">
          <div className="flex-1 flex items-center gap-2 px-3">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. brass diyas, ayurvedic shampoo, LED bulbs, baby toys…"
              className="border-0 shadow-none focus-visible:ring-0 text-foreground"
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
          </div>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City (optional)"
            className="md:w-40 border-0 shadow-none focus-visible:ring-0 text-foreground"
          />
          <Button onClick={() => runSearch()} disabled={loading || !query.trim()} className="bg-foreground text-background hover:bg-foreground/90">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Search className="w-4 h-4 mr-1" />}
            Search · 2 credits
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="viral"><Flame className="w-4 h-4 mr-1" />Viral</TabsTrigger>
          <TabsTrigger value="results"><Search className="w-4 h-4 mr-1" />Results</TabsTrigger>
          <TabsTrigger value="categories"><TrendingUp className="w-4 h-4 mr-1" />Categories</TabsTrigger>
          <TabsTrigger value="saved"><Bookmark className="w-4 h-4 mr-1" />Saved</TabsTrigger>
        </TabsList>

        <TabsContent value="viral" className="mt-6">
          {viral.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No viral products yet — run a search to populate your feed.
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {viral.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          {loading && (
            <Card className="p-8 flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              Finding wholesale suppliers… this takes 30-60s
            </Card>
          )}
          {!loading && products.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">Run a search to see results here.</Card>
          )}
          {!loading && products.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CATEGORIES.map((c) => (
              <Card
                key={c.key}
                onClick={() => loadCategory(c.key)}
                className={`p-4 cursor-pointer hover:shadow-md transition-all ${activeCategory === c.key ? "border-primary shadow-md" : ""}`}
              >
                <div className="text-3xl mb-2">{c.emoji}</div>
                <div className="font-medium text-sm">{c.label}</div>
                <div className="text-xs text-muted-foreground mt-1">Tap to view</div>
              </Card>
            ))}
          </div>

          {activeCategory && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {CATEGORIES.find((c) => c.key === activeCategory)?.label}
                  <span className="text-sm text-muted-foreground font-normal ml-2">
                    {categoryProducts.length} cached
                  </span>
                </h2>
                <Button size="sm" variant="outline" onClick={() => refreshCategory(activeCategory!)}>
                  <Sparkles className="w-4 h-4 mr-1" /> Refresh
                </Button>
              </div>
              {categoryLoading ? (
                <Card className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></Card>
              ) : categoryProducts.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  No cached products yet. Tap <strong>Refresh</strong> to scrape this category.
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {categoryProducts.map((p) => <ProductCard key={p.id} p={p} />)}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-6">
          {saved.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">Save products to revisit later.</Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {saved.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ProductDrawer
        product={selected}
        onClose={() => setSelected(null)}
        storeId={store?.id ?? null}
      />
    </div>
  );
}

function ProductDrawer({ product, onClose, storeId }: { product: SourcingProduct | null; onClose: () => void; storeId: string | null }) {
  const [importing, setImporting] = useState(false);
  const [marginPct, setMarginPct] = useState(60);

  useEffect(() => { setMarginPct(60); }, [product?.id]);

  if (!product) return null;

  const retail = product.price_min ? Math.round(product.price_min * (1 + marginPct / 100)) : null;

  async function importToStore() {
    if (!storeId) return;
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("sourcing-import", {
        body: { store_id: storeId, product_id: product!.id, margin_pct: marginPct },
      });
      if (error) throw error;
      if (data?.error === "INSUFFICIENT_CREDITS") { toast.error("Not enough credits"); return; }
      toast.success(`Imported! Listed at ${fmtINR(data.retail_price)}`);
      onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setImporting(false); }
  }

  return (
    <Sheet open={!!product} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="line-clamp-2">{product.title}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="aspect-square bg-muted rounded-lg overflow-hidden">
            {product.hero_image && <img src={product.hero_image} alt={product.title} className="w-full h-full object-cover" />}
          </div>

          <div className="flex flex-wrap gap-2">
            {product.category && <Badge variant="outline">{product.category}</Badge>}
            <Badge className="bg-orange-100 text-orange-700 border-orange-200">
              <Sparkles className="w-3 h-3 mr-1" /> Score {Math.round(product.ai_score)}
            </Badge>
          </div>

          {product.description && (
            <p className="text-sm text-muted-foreground">{product.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Wholesale price</span><div className="font-bold text-lg">{fmtINR(product.price_min)}{product.price_max && product.price_max !== product.price_min ? ` – ${fmtINR(product.price_max)}` : ""}</div></div>
            <div><span className="text-muted-foreground">MOQ</span><div className="font-bold text-lg">{product.moq ?? "—"}</div></div>
          </div>

          {/* Margin calculator */}
          <Card className="p-3 bg-muted/30">
            <div className="flex items-center justify-between text-sm font-medium mb-2">
              <span>Margin calculator</span>
              <span className="text-primary">{marginPct}%</span>
            </div>
            <input type="range" min={10} max={300} step={5} value={marginPct}
              onChange={(e) => setMarginPct(Number(e.target.value))} className="w-full" />
            <div className="mt-2 text-sm">
              Wholesale {fmtINR(product.price_min)} → <span className="font-bold text-primary">Retail {retail ? fmtINR(retail) : "—"}</span>
            </div>
          </Card>

          {/* Supplier card */}
          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{product.supplier_name_cached ?? "Verified Supplier"}</div>
              {product.supplier_city_cached && <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />{product.supplier_city_cached}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              Import this product to your store and we'll handle sourcing & fulfilment for you.
            </p>
          </Card>

          <Button onClick={importToStore} disabled={importing} className="w-full" size="lg">
            {importing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <PackagePlus className="w-4 h-4 mr-1" />}
            Add to my store · 1 credit
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
