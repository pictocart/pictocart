import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Eye, Globe, Trash2, RefreshCcw, Home, FileText, Loader2, ShoppingBag, LayoutGrid, Package, Lock, Clock, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useCustomPages } from "@/hooks/useCustomPages";
import { useProducts } from "@/hooks/useProducts";
import CreatePageWizard from "./CreatePageWizard";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildResolvedStorefrontManifest, getStorefrontConfig } from "@/lib/storefrontManifest";

type Kind = "default" | "shop" | "collections" | "product" | "custom";

const BUILTIN_OPTIONS: { id: Kind; label: string; description: string; icon: any }[] = [
  { id: "default", label: "Default Home", description: "Your theme's built-in homepage with sections", icon: Home },
  { id: "shop", label: "Shop (All products)", description: "Open straight to your full product catalog", icon: ShoppingBag },
  { id: "collections", label: "Collections", description: "Lead with a grid of all your categories", icon: LayoutGrid },
  { id: "product", label: "Single Product", description: "Spotlight one hero product (great for single-SKU brands)", icon: Package },
];

export default function PagesTab({ store, onStoreUpdated }: { store: any; onStoreUpdated?: (patch: any) => void }) {
  const storeId = store?.id;
  const { list, update, remove, generate } = useCustomPages(storeId);
  const { products } = useProducts();
  const pages = list.data || [];
  const [wizardOpen, setWizardOpen] = useState(false);
  const [homeKind, setHomeKind] = useState<Kind>((store?.home_page_kind as Kind) || "default");
  const [homePageId, setHomePageId] = useState<string | null>(store?.home_page_id || null);
  const [homeProductId, setHomeProductId] = useState<string | null>(store?.home_page_product_id || null);
  const [savingHome, setSavingHome] = useState(false);
  const [regenId, setRegenId] = useState<string | null>(null);

  useEffect(() => {
    setHomeKind((store?.home_page_kind as Kind) || "default");
    setHomePageId(store?.home_page_id || null);
    setHomeProductId(store?.home_page_product_id || null);
  }, [store?.home_page_kind, store?.home_page_id, store?.home_page_product_id]);

  const saveHome = async () => {
    if (!storeId) return;
    if (homeKind === "custom" && !homePageId) { toast.error("Pick a custom page"); return; }
    if (homeKind === "product" && !homeProductId) { toast.error("Pick a product to spotlight"); return; }
    setSavingHome(true);
    const patch = {
      home_page_kind: homeKind,
      home_page_id: homeKind === "custom" ? homePageId : null,
      home_page_product_id: homeKind === "product" ? homeProductId : null,
    };
    // Keep the resolved manifest snapshot's home_page in sync so any reader
    // that prefers the resolved manifest still sees the latest choice.
    const resolved_storefront_manifest = await buildResolvedStorefrontManifest({ ...store, ...patch } as any);
    const { error } = await (supabase as any).from("stores").update({ ...patch, resolved_storefront_manifest }).eq("id", storeId);
    if (error) toast.error(error.message);
    else {
      toast.success("Home page updated");
      onStoreUpdated?.({ ...patch, resolved_storefront_manifest });
    }
    setSavingHome(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this page? This can't be undone.")) return;
    if (homePageId === id) {
      const resetPatch = { home_page_kind: "default" as const, home_page_id: null };
      const resolved_storefront_manifest = await buildResolvedStorefrontManifest({ ...store, ...resetPatch } as any);
      await (supabase as any).from("stores").update({ ...resetPatch, resolved_storefront_manifest }).eq("id", storeId);
      setHomeKind("default"); setHomePageId(null);
      onStoreUpdated?.({ ...resetPatch, resolved_storefront_manifest });
    }
    await remove.mutateAsync(id);
    toast.success("Page deleted");
  };

  const handleRegenerate = async (id: string) => {
    setRegenId(id);
    try {
      await generate.mutateAsync({ page_id: id, regenerate: true });
      toast.success("Page regenerated");
    } catch (e: any) {
      toast.error(e?.message || "Regeneration failed");
    } finally {
      setRegenId(null);
    }
  };
  const disabledPages = (getStorefrontConfig(store) as any)?.theme_overrides?.disabled_pages ?? [];

  const handleToggleBuiltinPage = async (pageId: string, disable: boolean) => {
    if (!storeId) return;
    let nextDisabled = [...disabledPages];
    if (disable) {
      if (!nextDisabled.includes(pageId)) {
        nextDisabled.push(pageId);
      }
    } else {
      nextDisabled = nextDisabled.filter((id) => id !== pageId);
    }
    
    const config = getStorefrontConfig(store) as any;
    const theme_overrides = {
      ...(config.theme_overrides || {}),
      disabled_pages: nextDisabled,
    };
    const newConfig = {
      ...config,
      theme_overrides,
    };
    
    const resolved_storefront_manifest = await buildResolvedStorefrontManifest(store as any, newConfig as any);
    const { error } = await (supabase as any)
      .from("stores")
      .update({ resolved_storefront_manifest })
      .eq("id", storeId);
      
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(disable ? `Disabled /${pageId}` : `Published /${pageId}`);
      onStoreUpdated?.({ resolved_storefront_manifest });
    }
  };

  const BUILTIN_PAGES_LIST = [
    { id: "shop", label: "Shop (Catalog)", path: "/shop", icon: ShoppingBag },
    { id: "collections", label: "Collections", path: "/collections", icon: LayoutGrid },
    { id: "about", label: "About Us", path: "/about", icon: FileText },
    { id: "contact", label: "Contact Us", path: "/contact", icon: Phone },
    { id: "journal", label: "Journal / Blog", path: "/blog", icon: Clock },
    { id: "cart", label: "Shopping Cart", path: "/cart", icon: ShoppingBag },
    { id: "checkout", label: "Checkout", path: "/checkout", icon: Lock },
  ];

  const publishedPages = pages.filter((p) => p.status === "published");

  const currentRadioValue =
    homeKind === "custom" && homePageId ? `custom:${homePageId}` :
    homeKind === "product" ? "product" :
    homeKind === "shop" ? "shop" :
    homeKind === "collections" ? "collections" :
    "default";

  return (
    <div className="space-y-6">


      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Custom pages</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Build investor, team, press, or any page you need with AI.</p>
          </div>
          <Button size="sm" onClick={() => setWizardOpen(true)} className="gap-1.5">
            <Sparkles className="h-4 w-4" /> Create with AI
          </Button>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline-block text-muted-foreground" /></div>
          ) : pages.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed rounded-lg">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No custom pages yet.</p>
              <Button size="sm" variant="link" onClick={() => setWizardOpen(true)}>Create your first one</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {pages.map((p) => (
                <div key={p.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{p.title}</span>
                      <Badge variant={p.status === "published" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge>
                      <span className="text-xs text-muted-foreground">/p/{p.slug}</span>
                    </div>
                    {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <Switch
                          checked={p.show_in_nav}
                          onCheckedChange={(v) => update.mutate({ id: p.id, patch: { show_in_nav: v } })}
                        />
                        <span>Show in nav</span>
                      </label>
                      <span className="text-muted-foreground">{p.credits_spent} credits used</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/store/${store?.slug}/p/${p.slug}`} target="_blank"><Eye className="h-3.5 w-3.5 mr-1" /> Preview</Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleRegenerate(p.id)} disabled={regenId === p.id}>
                      {regenId === p.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5 mr-1" />} Regenerate
                    </Button>
                    {p.status === "draft" ? (
                      <Button size="sm" onClick={() => update.mutate({ id: p.id, patch: { status: "published" } })}>
                        <Globe className="h-3.5 w-3.5 mr-1" /> Publish
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: p.id, patch: { status: "draft" } })}>
                        Unpublish
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" /> Built-in pages
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Toggle built-in store pages on or off. Turning off a page will remove it from navigation menus and return a 404 Page Not Found error if visited.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {BUILTIN_PAGES_LIST.map((pageItem) => {
              const isDisabled = disabledPages.includes(pageItem.id);
              return (
                <div key={pageItem.id} className="border rounded-lg p-4 flex items-center justify-between gap-3 bg-card/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <pageItem.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-sm">{pageItem.label}</span>
                      <Badge variant={!isDisabled ? "default" : "secondary"} className="text-[10px]">
                        {!isDisabled ? "Published" : "Disabled"}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">{pageItem.path}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={!isDisabled}
                      onCheckedChange={(checked) => handleToggleBuiltinPage(pageItem.id, !checked)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {storeId && <CreatePageWizard storeId={storeId} open={wizardOpen} onOpenChange={setWizardOpen} />}
    </div>
  );
}
