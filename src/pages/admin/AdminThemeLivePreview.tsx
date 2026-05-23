import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import MasterThemeRenderer from "@/components/theme/MasterThemeRenderer";

/**
 * Live preview surface for Customiser v2 + standalone admin preview.
 *
 * Adds a sticky page-switcher tab bar so admins can browse EVERY page the
 * generator emits (home, shop, product, cart, checkout, journal, about,
 * contact, account, auth). Without this the header nav in the theme is a
 * dead <span> when no storeSlug is passed, which made the preview look
 * like it only had a home page.
 *
 * Also listens for postMessage({ type: 'customiser:update', overrides, page })
 * from the parent window so Customiser v2 edits reflect instantly.
 */
export default function AdminThemeLivePreview() {
  const { themeId } = useParams();
  const [params, setParams] = useSearchParams();
  const initialPage = params.get("page") ?? "home";
  const storeSlug = params.get("storeSlug") ?? undefined;
  const embedded = params.get("embed") === "1";

  const [manifest, setManifest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState<any>({});
  const [page, setPage] = useState<string>(initialPage);
  const [products, setProducts] = useState<any[]>([]);
  const [sellerCategories, setSellerCategories] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("theme_master_versions")
        .select("files_manifest")
        .eq("theme_id", themeId!)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      setManifest(data?.files_manifest ?? null);
      setLoading(false);
      window.parent?.postMessage({ type: "customiser:ready" }, "*");
    })();
  }, [themeId]);

  // Load the merchant's real store data so the preview mirrors the live storefront
  // (products, categories, saved theme overrides). Parent customiser still
  // postMessages live edits on top via `customiser:update`.
  useEffect(() => {
    if (!storeSlug) return;
    (async () => {
      const { data: store } = await supabase
        .from("stores")
        .select("id, name, settings")
        .eq("slug", storeSlug)
        .maybeSingle();
      if (!store) return;
      const savedOv = (store.settings as any)?.theme_overrides;
      if (savedOv) {
        setOverrides((cur: any) => (Object.keys(cur || {}).length ? cur : { ...savedOv, brand_name: savedOv?.brand_name || store.name }));
      }
      const [{ data: prods }, { data: cats }] = await Promise.all([
        supabase.from("products").select("id, title, price, compare_at_price, images, category").eq("store_id", store.id).eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("categories").select("id, name, image_url, description, parent_id, sort_order").eq("store_id", store.id).order("sort_order", { ascending: true }),
      ]);
      setProducts((prods ?? []) as any[]);
      const allCats = (cats ?? []) as any[];
      setSellerCategories(
        allCats
          .filter((c) => !c.parent_id)
          .map((p) => ({
            id: p.id,
            name: p.name,
            image_url: p.image_url,
            description: p.description,
            subs: allCats.filter((c) => c.parent_id === p.id).map((c) => ({ id: c.id, name: c.name, image_url: c.image_url })),
          })),
      );
    })();
  }, [storeSlug]);

  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      const msg = ev.data;
      if (!msg) return;
      if (msg.type === "customiser:update") {
        if (msg.overrides !== undefined) setOverrides(msg.overrides ?? {});
        if (msg.page !== undefined) setPage(msg.page);
        return;
      }
      if (msg.type === "customiser:scroll") {
        // Scroll after the next paint so newly-rendered sections are measurable.
        requestAnimationFrame(() => {
          const sel = msg.anchor ? `[data-section-anchor="${msg.anchor}"]` : null;
          const el = sel ? document.querySelector(sel) as HTMLElement | null : null;
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const pages = useMemo(() => {
    const all = manifest?.pages ? Object.keys(manifest.pages) : [];
    // Preferred order for navigation
    const order = ["home", "shop", "product", "cart", "checkout", "journal", "about", "contact", "account", "auth"];
    return [...order.filter((p) => all.includes(p)), ...all.filter((p) => !order.includes(p))];
  }, [manifest]);

  const setActive = (p: string) => {
    setPage(p);
    const next = new URLSearchParams(params);
    next.set("page", p);
    setParams(next, { replace: true });
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!manifest) {
    return <div className="p-8 text-center text-muted-foreground">Theme not found.</div>;
  }

  return (
    <div>
      {!embedded && (
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs text-muted-foreground mr-2 whitespace-nowrap">Pages:</span>
            {pages.map((p) => (
              <button
                key={p}
                onClick={() => setActive(p)}
                className={`text-xs px-3 py-1.5 rounded-md whitespace-nowrap transition ${
                  p === page ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {p}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">
              {themeId}
            </span>
          </div>
        </div>
      )}
      <MasterThemeRenderer manifest={manifest} page={page} overrides={overrides} storeSlug={storeSlug} onNavigate={setActive} products={products} sellerCategories={sellerCategories} />
    </div>
  );
}
