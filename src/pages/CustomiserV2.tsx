import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "@/hooks/useStore";
import { useThemeManifest } from '@/hooks/useThemeManifest';
import { buildResolvedStorefrontManifest, getStoreThemeId, getStorefrontConfig, getStoreThemeTokens } from '@/lib/storefrontManifest';
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useCategories";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Loader2, RotateCcw, Save, Upload, Trash2, Image as ImageIcon,
  Smartphone, Monitor, ExternalLink, Plus, ArrowUp, ArrowDown, Search, ShoppingBag,
  PanelTop, PanelBottom, Palette, Megaphone, Maximize2, Minimize2, Menu,
} from "lucide-react";
import PromoTickerEditor, { DEFAULT_PROMO_TICKER } from "@/components/store-design/PromoTickerEditor";
import type { PromoTickerConfig } from "@/components/storefront/PromoTicker";
import PagesTab from "@/components/store-design/PagesTab";
import HomeSourcePicker from "@/components/store-design/HomeSourcePicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, FileText as FileTextIcon, LayoutGrid } from "lucide-react";

const PAGES = [
  { id: "home", label: "Home" },
  { id: "shop", label: "Shop" },
  { id: "collections", label: "Collections" },
  { id: "product", label: "Product" },
  { id: "cart", label: "Cart" },
  { id: "checkout", label: "Checkout" },
  { id: "journal", label: "Journal" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
  { id: "signin", label: "Sign in" },
  { id: "signup", label: "Sign up" },
  { id: "account", label: "Account" },
];

const SECTION_LABEL: Record<string, string> = {
  hero: "Hero", usp_strip: "Trust strip", category_grid: "Categories",
  product_grid: "Products", trending: "Trending", story: "Brand Story",
  testimonials: "Testimonials", google_reviews: "Google Reviews", newsletter: "Newsletter", page_title: "Page title",
  values: "Values", signup: "Sign up form", signin: "Sign in form",
  forgot_password: "Forgot password", reset_password: "Reset password",
  line_items: "Line items", cart_summary: "Cart summary",
  checkout_stepper: "Checkout stepper", journal_strip: "Journal strip",
  journal_list: "Journal list", account_panel: "Account panel",
  contact_form: "Contact form", product_detail: "Product detail",
  collections_grid: "Collections grid", collection_detail: "Collection detail",
};



const TEXT_KEYS = ["title", "sub", "kicker", "cta", "cta_secondary", "body", "email", "phone", "address", "hours"];
const ICON_OPTIONS = ["truck", "shield", "refresh", "headphones", "lock", "tag", "gift", "sparkles"];

const NAV_PAGE_OPTIONS = [
  { value: "home", label: "Home" },
  { value: "shop", label: "Shop" },
  { value: "collections", label: "Collections" },
  { value: "about", label: "About" },
  { value: "contact", label: "Contact" },
  { value: "blog", label: "Journal / Blog" },
  { value: "account", label: "Account" },
  { value: "cart", label: "Cart" },
];

type Selection =
  | { kind: "section"; index: number }
  | { kind: "header" }
  | { kind: "footer" }
  | { kind: "ticker" }
  | { kind: "palette" };

const PALETTE_PRESETS: Array<{ name: string; colors: Record<string, string> }> = [
  { name: "Default theme", colors: {} },
  { name: "Kumkum & Brass", colors: { primary: "#9A2A2A", primary_fg: "#FFFFFF", accent: "#C9A227", bg: "#FBF6EE", surface: "#FFFFFF", fg: "#2A1A0F", muted: "#6B5A4A", border: "#E7DBC6" } },
  { name: "Midnight Indigo", colors: { primary: "#4f46e5", primary_fg: "#FFFFFF", accent: "#a78bfa", bg: "#0a0a1a", surface: "#141432", fg: "#f5f5fa", muted: "#9090b0", border: "#1e1e5a" } },
  { name: "Ocean Deep", colors: { primary: "#2d8a9e", primary_fg: "#FFFFFF", accent: "#5cbdb9", bg: "#f4f9fb", surface: "#FFFFFF", fg: "#0c2340", muted: "#6b8a9e", border: "#cfe0e7" } },
  { name: "Emerald Prestige", colors: { primary: "#0d7a5f", primary_fg: "#FFFFFF", accent: "#c9a84c", bg: "#f5f0e0", surface: "#FFFFFF", fg: "#064e3b", muted: "#5a7a6a", border: "#dcd3b8" } },
  { name: "Noir & Gold", colors: { primary: "#c9a84c", primary_fg: "#0d0d0d", accent: "#f0d78c", bg: "#0d0d0d", surface: "#1a1a1a", fg: "#f5f0e0", muted: "#a09680", border: "#2a2a2a" } },
  { name: "Sunset Blaze", colors: { primary: "#ff6b35", primary_fg: "#FFFFFF", accent: "#e84393", bg: "#fff8f3", surface: "#FFFFFF", fg: "#2a1a14", muted: "#8a6a5a", border: "#f0d8c8" } },
  { name: "Forest & Moss", colors: { primary: "#2d5a3d", primary_fg: "#FFFFFF", accent: "#a0c49d", bg: "#f3f6f1", surface: "#FFFFFF", fg: "#1a3c2a", muted: "#6a8a70", border: "#d0dccc" } },
];

const COLOR_KEYS: Array<{ key: string; label: string }> = [
  { key: "primary", label: "Primary" },
  { key: "primary_fg", label: "Primary text" },
  { key: "accent", label: "Accent" },
  { key: "bg", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "fg", label: "Text" },
  { key: "muted", label: "Muted text" },
  { key: "border", label: "Border" },
];

export default function CustomiserV2() {
  const { store, setStore } = useStore();
  const { categories, updateCategory, deleteCategory } = useCategories();
  const queryClient = useQueryClient();
  const { data: products = [] } = useQuery({
    queryKey: ['customiser-products', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!store?.id,
  });
  const settings = getStorefrontConfig(store) as any;
  const activeThemeId = getStoreThemeId(store) || "";
  const isCustom = activeThemeId?.startsWith("custom-theme-");
  const { data: dbManifest, isLoading: manifestLoading } = useThemeManifest(isCustom ? null : activeThemeId);
  const manifest = isCustom ? (getStoreThemeTokens(store) as any)?.manifest : dbManifest;
  const isLoading = isCustom ? false : manifestLoading;

  const [overrides, setOverrides] = useState<any>(settings.theme_overrides || {});
  const [promoTicker, setPromoTicker] = useState<PromoTickerConfig>({ ...DEFAULT_PROMO_TICKER, ...(settings.promo_ticker || {}) });
  const [page, setPage] = useState("home");
  const [selected, setSelected] = useState<Selection | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState<string | null>(null);
  const [pagesDialogOpen, setPagesDialogOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetSectionIndex, setTargetSectionIndex] = useState<number | null>(null);

  const handleToggleVisibility = (idx: number, isCurrentlyHidden: boolean) => {
    if (!isCurrentlyHidden) {
      setTargetSectionIndex(idx);
      setConfirmOpen(true);
    } else {
      updateField(idx, "hidden", false);
    }
  };

  const confirmHideSection = () => {
    if (targetSectionIndex !== null) {
      updateField(targetSectionIndex, "hidden", true);
      setConfirmOpen(false);
      setTargetSectionIndex(null);
    }
  };

  const mainRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    if (!mainRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    resizeObserver.observe(mainRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  // Resizable side panels — persist widths per user across sessions.
  const [leftWidth, setLeftWidth] = useState<number>(() => {
    const v = Number(localStorage.getItem("customiser_left_w"));
    return v >= 160 && v <= 480 ? v : 176;
  });
  const [rightWidth, setRightWidth] = useState<number>(() => {
    const v = Number(localStorage.getItem("customiser_right_w"));
    return v >= 260 && v <= 640 ? v : 360;
  });
  useEffect(() => { localStorage.setItem("customiser_left_w", String(leftWidth)); }, [leftWidth]);
  useEffect(() => { localStorage.setItem("customiser_right_w", String(rightWidth)); }, [rightWidth]);

  const startDrag = (side: "left" | "right") => (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = side === "left" ? leftWidth : rightWidth;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      if (side === "left") setLeftWidth(Math.max(160, Math.min(480, startW + delta)));
      else setRightWidth(Math.max(260, Math.min(640, startW - delta)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  useEffect(() => {
    if (!store?.id || hydrated === store.id) return;
    const s = getStorefrontConfig(store) as any;
    setOverrides(s.theme_overrides || {});
    setPromoTicker({ ...DEFAULT_PROMO_TICKER, ...(s.promo_ticker || {}) });
    setHydrated(store.id);
  }, [store, hydrated]);

  // Deep-link ?tab=ticker from sidebar opens the Promo Ticker inspector directly.
  useEffect(() => {
    if (tabParam === "ticker") setSelected({ kind: "ticker" });
  }, [tabParam]);

  const overridesRef = useRef(overrides);
  const pageRef = useRef(page);
  useEffect(() => { overridesRef.current = overrides; }, [overrides]);
  useEffect(() => { pageRef.current = page; }, [page]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "customiser:update", overrides, page, refreshCategories: true }, "*",
    );
  }, [overrides, page, categories]);

  useEffect(() => {
    const onReady = (ev: MessageEvent) => {
      if (ev.data?.type === "customiser:ready") {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "customiser:update", overrides: overridesRef.current, page: pageRef.current }, "*",
        );
      }
    };
    window.addEventListener("message", onReady);
    return () => window.removeEventListener("message", onReady);
  }, []);

  const isMaster = activeThemeId?.startsWith("theme-") || activeThemeId?.startsWith("layout1-") || activeThemeId?.startsWith("custom-theme-");
  const sections: any[] = useMemo(() => {
    const manifestSections = (manifest as any)?.pages?.[page]?.sections ?? [];
    if (manifestSections.length > 0) return manifestSections;
    // Mirror MasterThemeRenderer's synthesized pages so the seller can edit them.
    if (page === "collections") {
      return [
        { type: "page_title", props: { title: "Collections" } },
        { type: "collections_grid", props: {} },
      ];
    }
    if (page === "collection_detail") {
      return [{ type: "collection_detail", props: {} }];
    }
    if (page === "shop") {
      return [
        { type: "page_title", props: { title: "All Products" } },
        { type: "product_grid", props: { style: "grid_clean" } },
      ];
    }
    return [];
  }, [manifest, page]);
  const sectionOverrides: Record<string, any> =
    overrides?.pages?.[page]?.sections ??
    (page === "home" ? overrides?.sections ?? {} : {});

  const updateField = (idx: number, key: string, value: any) => {
    setOverrides((prev: any) => {
      const next = structuredClone(prev || {});
      next.pages = next.pages || {};
      next.pages[page] = next.pages[page] || {};
      next.pages[page].sections = next.pages[page].sections || {};
      next.pages[page].sections[idx] = { ...(next.pages[page].sections[idx] || {}), [key]: value };
      return next;
    });
  };

  const resetField = (idx: number, key: string) => {
    setOverrides((prev: any) => {
      const next = structuredClone(prev || {});
      const sec = next?.pages?.[page]?.sections?.[idx];
      if (sec) {
        delete sec[key];
        if (Object.keys(sec).length === 0) delete next.pages[page].sections[idx];
      }
      return next;
    });
  };

  const resetSection = (idx: number) => {
    setOverrides((prev: any) => {
      const next = structuredClone(prev || {});
      if (next?.pages?.[page]?.sections?.[idx]) delete next.pages[page].sections[idx];
      return next;
    });
    toast.success("Section reset to theme default");
  };

  const resetPage = () => {
    setOverrides((prev: any) => {
      const next = structuredClone(prev || {});
      if (next?.pages?.[page]) delete next.pages[page];
      return next;
    });
    toast.success(`Reset all changes on ${page}`);
  };

  const uploadImage = async (
    idx: number,
    file: File,
    target: "image" | "logo_url" | { slideIndex: number; key?: string } | { videoKey: "poster" | "src" } = "image",
  ) => {
    if (!store?.id) return;
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Please sign in again before uploading");
      const ext = file.name.split(".").pop();
      const path = `${userData.user.id}/stores/${store.id}/theme-overrides/${page}-${idx}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("store-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
      const url = data.publicUrl;
      if (target === "logo_url") {
        updateHeader("logo_url", url);
      } else if (typeof target === "object" && "slideIndex" in target) {
        // Update a single slide's image inside the slides array
        const cur = (overrides?.pages?.[page]?.sections?.[idx]?.slides
          ?? sections[idx]?.props?.slides ?? []) as any[];
        const next = [...cur];
        next[target.slideIndex] = { ...(next[target.slideIndex] || {}), [target.key || "image"]: url };
        updateField(idx, "slides", next);
      } else if (typeof target === "object" && "videoKey" in target) {
        const cur = overrides?.pages?.[page]?.sections?.[idx]?.video ?? sections[idx]?.props?.video ?? {};
        updateField(idx, "video", { ...cur, [target.videoKey]: url, provider: "upload" });
      } else {
        updateField(idx, "image", url);
      }
      toast.success("Image updated");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    }
  };

  // ---------- Header / Footer overrides ----------
  const headerOv = {
    logo_url: overrides?.logo_url || store?.logo_url || "",
    brand_name: overrides?.brand_name || "",
    ...(overrides?.header || {}),
  };
  const footerOv = overrides?.footer || {};
  const updateHeader = (key: string, value: any) => {
    setOverrides((prev: any) => {
      const next = structuredClone(prev || {});
      next.header = { ...(next.header || {}), [key]: value };
      return next;
    });
  };
  const resetHeader = () => {
    setOverrides((prev: any) => { const next = structuredClone(prev || {}); delete next.header; return next; });
    toast.success("Header reset to theme default");
  };
  const updateFooter = (key: string, value: any) => {
    setOverrides((prev: any) => {
      const next = structuredClone(prev || {});
      next.footer = { ...(next.footer || {}), [key]: value };
      return next;
    });
  };
  const resetFooter = () => {
    setOverrides((prev: any) => { const next = structuredClone(prev || {}); delete next.footer; return next; });
    toast.success("Footer reset to theme default");
  };

  // ---------- Global palette overrides ----------
  const paletteOv: Record<string, string> = (overrides?.palette as any) || {};
  const updatePalette = (key: string, value: string) => {
    setOverrides((prev: any) => {
      const next = structuredClone(prev || {});
      next.palette = { ...(next.palette || {}), [key]: value };
      return next;
    });
  };
  const applyPalettePreset = (preset: Record<string, string>) => {
    setOverrides((prev: any) => {
      const next = structuredClone(prev || {});
      if (!preset || Object.keys(preset).length === 0) delete next.palette;
      else next.palette = { ...preset };
      return next;
    });
    toast.success("Palette applied");
  };
  const resetPalette = () => {
    setOverrides((prev: any) => { const next = structuredClone(prev || {}); delete next.palette; return next; });
    toast.success("Palette reset to theme default");
  };

  // ---------- Per-section color override ----------
  const updateSectionColor = (idx: number, key: string, value: string) => {
    setOverrides((prev: any) => {
      const next = structuredClone(prev || {});
      next.pages = next.pages || {};
      next.pages[page] = next.pages[page] || {};
      next.pages[page].sections = next.pages[page].sections || {};
      const sec = next.pages[page].sections[idx] || {};
      sec.colors = { ...(sec.colors || {}), [key]: value };
      next.pages[page].sections[idx] = sec;
      return next;
    });
  };
  const resetSectionColors = (idx: number) => {
    setOverrides((prev: any) => {
      const next = structuredClone(prev || {});
      const sec = next?.pages?.[page]?.sections?.[idx];
      if (sec) {
        delete sec.colors;
        if (Object.keys(sec).length === 0) delete next.pages[page].sections[idx];
      }
      return next;
    });
  };

  // ---------- Auto-scroll preview when a section is picked ----------
  const selectAndScroll = (sel: Selection) => {
    setSelected(sel);
    const anchor =
      sel.kind === "header" ? "header" :
      sel.kind === "footer" ? "footer" :
      sel.kind === "section" ? `s-${sel.index}` : null;
    if (anchor) {
      iframeRef.current?.contentWindow?.postMessage({ type: "customiser:scroll", anchor }, "*");
    }
  };

  const uploadLogo = async (file: File) => {
    if (!store?.id) return;
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Please sign in again before uploading");
      const ext = file.name.split(".").pop();
      const path = `${userData.user.id}/stores/${store.id}/logo/header-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("store-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
      updateHeader("logo_url", data.publicUrl);
      toast.success("Logo uploaded");
    } catch (e: any) { toast.error(e?.message || "Logo upload failed"); }
  };

  const save = async () => {
    if (!store) return;
    setSaving(true);
    // Rendering-config keys go ONLY into resolved_storefront_manifest.config;
    // `stores.settings` is left untouched (business data stays single-source there).
    const newConfig = { ...settings, theme_overrides: overrides, promo_ticker: promoTicker };
    const resolved_storefront_manifest = await buildResolvedStorefrontManifest(store as any, newConfig as any);
    const { error } = await supabase.from("stores").update({ resolved_storefront_manifest: resolved_storefront_manifest as any }).eq("id", store.id);
    if (error) toast.error("Failed to save");
    else {
      setStore({ ...store, resolved_storefront_manifest });
      toast.success("Saved — live on your store");
    }
    setSaving(false);
  };

  if (!isMaster) {
    return (
      <div className="p-8 text-center space-y-3">
        <h2 className="text-xl font-semibold">Customiser v2 requires a marketplace theme</h2>
        <p className="text-sm text-muted-foreground">Pick one from /themes to start editing.</p>
      </div>
    );
  }
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!manifest) {
    return <div className="p-8 text-center text-muted-foreground">This theme has no published manifest yet.</div>;
  }

  const previewUrl = `/admin/themes/preview-live/${activeThemeId}?page=${page}&storeSlug=${store?.slug ?? ""}`;
  const iframeUrl = `/admin/themes/preview-live/${activeThemeId}?storeSlug=${store?.slug ?? ""}`;

  return (
    <div className={`flex flex-col bg-background ${isFullscreen ? "fixed inset-0 z-[9999] h-screen w-screen" : "-m-4 md:-m-6 h-[calc(100vh-4rem)]"}`}>
      <div className="border-b px-4 h-12 flex items-center justify-between gap-3 bg-card shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-sm">Customise</h1>
          <Badge variant="outline" className="text-[10px]">{activeThemeId}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md overflow-hidden bg-background">
            <button onClick={() => setDevice("desktop")} className={`p-1.5 ${device === "desktop" ? "bg-muted" : ""}`} title="Desktop"><Monitor className="h-3.5 w-3.5" /></button>
            <button onClick={() => setDevice("mobile")} className={`p-1.5 ${device === "mobile" ? "bg-muted" : ""}`} title="Mobile"><Smartphone className="h-3.5 w-3.5" /></button>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-1 px-2.5 h-8 text-xs bg-background" 
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen Workspace" : "Fullscreen Workspace"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5 text-indigo-600" /> : <Maximize2 className="h-3.5 w-3.5 text-indigo-600" />}
            <span className="hidden sm:inline">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
          </Button>
          <Button size="sm" variant="outline" className="bg-background" onClick={resetPage}><RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset page</Button>
          <Button size="sm" onClick={save} disabled={saving}><Save className="mr-1 h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: Pages + Sections */}
        <aside 
          className="border-r flex flex-col shrink-0 transition-all duration-200 overflow-hidden bg-background" 
          style={{ 
            width: leftCollapsed ? 0 : leftWidth, 
            display: leftCollapsed ? "none" : "flex" 
          }}
        >
          <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b bg-muted/10">Global Layout</div>
          <div className="px-2 py-2 space-y-0.5">
            {/* Synthetic Header row */}
            <button
              onClick={() => selectAndScroll({ kind: "header" })}
              className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md flex items-center justify-between ${selected?.kind === "header" ? "bg-accent text-accent-foreground font-semibold" : "hover:bg-muted text-muted-foreground"}`}
            >
              <span className="flex items-center gap-1.5"><PanelTop className="h-3.5 w-3.5 text-indigo-600" /> Header & Navbar</span>
              {Object.keys(headerOv).length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
            </button>

            {/* Synthetic Footer row */}
            <button
              onClick={() => selectAndScroll({ kind: "footer" })}
              className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md flex items-center justify-between ${selected?.kind === "footer" ? "bg-accent text-accent-foreground font-semibold" : "hover:bg-muted text-muted-foreground"}`}
            >
              <span className="flex items-center gap-1.5"><PanelBottom className="h-3.5 w-3.5 text-indigo-600" /> Footer Layout</span>
              {Object.keys(footerOv).length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
            </button>
          </div>
          <Separator />

          <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">Pages</div>
          <ScrollArea className="flex-1">
            <div className="px-2 pb-3 space-y-0.5">
              {PAGES.map((p) => {
                // 'collections' is auto-synthesized from the Categories the seller defines, so it's always available.
                const exists = p.id === "collections" ? true : !!(manifest as any)?.pages?.[p.id];
                const edited = !!overrides?.pages?.[p.id];
                return (
                  <button
                    key={p.id}
                    disabled={!exists}
                    onClick={() => { setPage(p.id); setSelected(null); }}
                    className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md flex items-center justify-between ${page === p.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"} ${!exists ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <span>{p.label}</span>
                    {edited && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                  </button>
                 );
              })}
            </div>
          </ScrollArea>
          <Separator />
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Custom Pages</span>
            <button
              onClick={() => setPagesDialogOpen(true)}
              className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20"
              title="Create custom pages with AI"
            >
              <Sparkles className="h-3 w-3" /> AI
            </button>
          </div>
          <div className="px-2 pb-2">
            <button
              onClick={() => setPagesDialogOpen(true)}
              className="w-full text-left text-xs px-2.5 py-1.5 rounded-md hover:bg-muted flex items-center gap-1.5 text-muted-foreground"
            >
              <FileTextIcon className="h-3 w-3" /> Manage pages & homepage
            </button>
          </div>
          <Separator />

          <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">Sections</div>
          <ScrollArea className="flex-1">
            <div className="px-2 pb-3 space-y-0.5">
              {/* Theme palette row */}
              <button
                onClick={() => selectAndScroll({ kind: "palette" })}
                className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md flex items-center justify-between ${selected?.kind === "palette" ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
              >
                <span className="flex items-center gap-1.5"><Palette className="h-3 w-3" /> Theme colors</span>
                {Object.keys(paletteOv).length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
              </button>

              {sections.length === 0 && <div className="px-2 py-3 text-[11px] text-muted-foreground">No sections on this page.</div>}
              {sections.map((s, i) => {
                const ov = sectionOverrides[i] ?? sectionOverrides[String(i)] ?? {};
                const edited = Object.keys(ov).length > 0;
                const isSel = selected?.kind === "section" && selected.index === i;
                const isHidden = !!ov.hidden;
                return (
                  <div key={i} className="flex items-center gap-1.5 px-1 py-0.5 group w-full">
                    <input
                      type="checkbox"
                      checked={!isHidden}
                      onChange={() => handleToggleVisibility(i, isHidden)}
                      className="h-3 w-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                      title={isHidden ? "Show Section" : "Hide Section"}
                    />
                    <button
                      onClick={() => selectAndScroll({ kind: "section", index: i })}
                      className={`flex-1 text-left text-xs px-2 py-1.5 rounded-md flex items-center justify-between transition-all ${isSel ? "bg-accent text-accent-foreground font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"} ${isHidden ? "opacity-45 line-through" : ""}`}
                    >
                      <span className="truncate">
                        {(() => {
                          const mergedProps = { ...(s.props || {}), ...ov };
                          const customTitle = mergedProps.title || mergedProps.heading;
                          return (customTitle && typeof customTitle === "string")
                            ? `${i + 1}. ${customTitle}`
                            : `${i + 1}. ${SECTION_LABEL[s.type] || s.type}`;
                        })()}
                      </span>
                      {edited && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                    </button>
                  </div>
                );
              })}

            </div>
          </ScrollArea>
        </aside>

        {/* Drag handle — left panel */}
        {!isFullscreen && !leftCollapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={startDrag("left")}
            className="w-1 cursor-col-resize bg-border/40 hover:bg-primary/60 active:bg-primary transition-colors shrink-0"
            title="Drag to resize"
          />
        )}

        {/* Middle: Live preview with auto-scaled desktop preview */}
        {(() => {
          const previewScale = device === "mobile" ? 1 : (containerWidth ? Math.min(1, (containerWidth - 32) / 1200) : 0.85);
          return (
            <main ref={mainRef} className="flex-1 bg-muted/40 flex items-center justify-center overflow-hidden p-4 relative">
              <div
                className="bg-background shadow-lg rounded-md overflow-hidden border transition-all duration-200"
                style={device === "mobile" ? {
                  width: 390,
                  height: "100%",
                  maxWidth: 390,
                } : {
                  width: 1200,
                  height: `${100 / previewScale}%`,
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top center",
                  position: "absolute",
                  top: 16,
                }}
              >
                <iframe 
                  ref={iframeRef} 
                  src={iframeUrl} 
                  onLoad={() => {
                    iframeRef.current?.contentWindow?.postMessage(
                      { type: "customiser:update", overrides: overridesRef.current, page: pageRef.current }, "*"
                    );
                  }}
                  title="Live preview" 
                  className="w-full h-full border-0" 
                />
              </div>
            </main>
          );
        })()}

        {/* Drag handle — right panel */}
        {!isFullscreen && (
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={startDrag("right")}
            className="w-1 cursor-col-resize bg-border/40 hover:bg-primary/60 active:bg-primary transition-colors shrink-0"
            title="Drag to resize"
          />
        )}

        {/* Right: Inspector */}
        <aside 
          className="border-l flex flex-col shrink-0 transition-all duration-200 overflow-hidden bg-background" 
          style={{ 
            width: rightWidth, 
            display: "flex" 
          }}
        >
          <InspectorHeader selected={selected} headerOv={headerOv} footerOv={footerOv} sections={sections} sectionOverrides={sectionOverrides}
            onResetHeader={resetHeader} onResetFooter={resetFooter} onResetSection={resetSection} />
          <ScrollArea className="flex-1">
            {!selected && (
              <div className="p-4 text-xs text-muted-foreground">
                Pick a section on the left to edit its text and images. Header and Footer are editable too — they apply across every page.
              </div>
            )}

            {selected?.kind === "header" && (
              <HeaderInspector
                headerOv={headerOv}
                storeName={store?.name || ""}
                onChange={updateHeader}
                onLogoUpload={uploadLogo}
              />
            )}

            {selected?.kind === "footer" && (
              <FooterInspector footerOv={footerOv} onChange={updateFooter} />
            )}

            {selected?.kind === "ticker" && (
              <div className="p-3">
                <PromoTickerEditor config={promoTicker} onChange={setPromoTicker} />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Click <span className="font-semibold">Save</span> in the top bar to publish the ticker to your live storefront.
                </p>
              </div>
            )}

            {selected?.kind === "palette" && (
              <PaletteInspector
                paletteOv={paletteOv}
                onChangeColor={updatePalette}
                onApplyPreset={applyPalettePreset}
                onReset={resetPalette}
              />
            )}

            {selected?.kind === "section" && (
              <SectionInspector
                idx={selected.index}
                section={sections[selected.index]}
                sectionOv={sectionOverrides[selected.index] ?? sectionOverrides[String(selected.index)] ?? {}}
                onUpdate={updateField}
                onReset={resetField}
                onUploadImage={uploadImage}
                onColorChange={updateSectionColor}
                onResetColors={resetSectionColors}
                previewUrl={previewUrl}
                categories={categories}
                updateCategory={updateCategory}
                deleteCategory={deleteCategory}
                products={products}
              />
            )}
          </ScrollArea>
        </aside>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm bg-background border rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle>Remove Section</DialogTitle>
          </DialogHeader>
          <div className="py-3 text-sm text-muted-foreground">
            Are you sure you want to remove this section from <strong>{PAGES.find(p => p.id === page)?.label || page}</strong> page?
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" className="bg-background" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button size="sm" variant="destructive" onClick={confirmHideSection}>Remove</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pagesDialogOpen} onOpenChange={setPagesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Pages, Homepage & AI Generator</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <HomeSourcePicker
              key={store?.id || "no-store"}
              store={store}
              onStoreUpdated={(patch: any) => {
                if (store) setStore({ ...store, ...patch });
                // Force the live-preview iframe to reflect the new home route immediately.
                try { iframeRef.current?.contentWindow?.location.reload(); } catch {}
              }}
            />
            <PagesTab 
              store={store} 
              onStoreUpdated={(patch: any) => {
                if (store) {
                  const nextStore = { ...store, ...patch };
                  setStore(nextStore);
                  const nextSettings = getStorefrontConfig(nextStore);
                  if (nextSettings?.theme_overrides) {
                    setOverrides(nextSettings.theme_overrides);
                  }
                  try { iframeRef.current?.contentWindow?.location.reload(); } catch {}
                }
              }} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Inspector sub-components ----------

function InspectorHeader({ selected, headerOv, footerOv, sections, sectionOverrides, onResetHeader, onResetFooter, onResetSection }: any) {
  let title = "No section selected";
  let resetBtn: React.ReactNode = null;
  if (selected?.kind === "palette") {
    title = "Theme colors";
  } else if (selected?.kind === "header") {
    title = "Header";
    if (Object.keys(headerOv).length > 0) {
      resetBtn = <Button size="sm" variant="ghost" onClick={onResetHeader}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset</Button>;
    }
  } else if (selected?.kind === "footer") {
    title = "Footer";
    if (Object.keys(footerOv).length > 0) {
      resetBtn = <Button size="sm" variant="ghost" onClick={onResetFooter}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset</Button>;
    }
  } else if (selected?.kind === "ticker") {
    title = "Promo Ticker";
  } else if (selected?.kind === "section") {
    const s = sections[selected.index];
    title = SECTION_LABEL[s?.type] || s?.type || "Section";
    const ov = sectionOverrides[selected.index] ?? sectionOverrides[String(selected.index)] ?? {};
    if (Object.keys(ov).length > 0) {
      resetBtn = <Button size="sm" variant="ghost" onClick={() => onResetSection(selected.index)}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset</Button>;
    }
  }
  return (
    <div className="px-4 py-3 border-b flex items-center justify-between">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Inspector</div>
        <div className="text-sm font-medium">{title}</div>
      </div>
      {resetBtn}
    </div>
  );
}

function HeaderInspector({ headerOv, storeName, onChange, onLogoUpload }: { headerOv: any; storeName: string; onChange: (k: string, v: any) => void; onLogoUpload: (f: File) => void }) {
  const links: Array<{ label: string; page: string }> = headerOv.nav_links ?? [
    { label: "Shop", page: "shop" }, { label: "Collections", page: "collections" }, { label: "About", page: "about" }, { label: "Journal", page: "blog" }, { label: "Contact", page: "contact" },
  ];
  const updateLinks = (next: typeof links) => onChange("nav_links", next);
  return (
    <div className="p-4 space-y-5">
      <div>
        <Label className="text-xs">Logo</Label>
        <div className="mt-1.5 flex items-start gap-3">
          <div className={`w-16 h-16 border bg-muted overflow-hidden flex items-center justify-center shrink-0 ${headerOv.logo_shape === 'circle' ? 'rounded-full' : 'rounded-md'}`}>
            {headerOv.logo_url ? (
              <img 
                src={headerOv.logo_url} 
                alt="" 
                className={headerOv.logo_shape === 'circle' ? "w-full h-full object-cover" : "w-full h-full object-contain p-1"} 
              />
            ) : (
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <label className="cursor-pointer">
                <Upload className="mr-1 h-3.5 w-3.5" /> {headerOv.logo_url ? "Replace" : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogoUpload(f); }} />
              </label>
            </Button>
            {headerOv.logo_url && (
              <Button size="sm" variant="outline" onClick={() => onChange("logo_url", "")}><Trash2 className="mr-1 h-3.5 w-3.5" /> Remove Logo</Button>
            )}
            <div className="flex flex-col gap-0.5 min-w-[120px]">
              <Label className="text-[9px] font-semibold text-muted-foreground">Logo Shape</Label>
              <select
                value={headerOv.logo_shape || 'rectangle'}
                onChange={(e) => onChange('logo_shape', e.target.value)}
                className="h-7 rounded border border-input bg-background px-2 py-0 text-xs focus-visible:outline-none"
              >
                <option value="rectangle">Rectangle</option>
                <option value="circle">Circle (Round)</option>
              </select>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">PNG/SVG with transparent background works best.</p>
      </div>

      {headerOv.logo_url && headerOv.logo_shape !== 'circle' && (
        <div className="space-y-3 rounded-md border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Fit logo to header height</Label>
              <p className="text-[10px] text-muted-foreground">Auto-stretches logo to fill header bar.</p>
            </div>
            <Switch
              checked={!!headerOv.logo_fit_header}
              onCheckedChange={(v) => onChange("logo_fit_header", v)}
            />
          </div>

          {!headerOv.logo_fit_header && (
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Logo size</Label>
                <span className="text-[10px] text-muted-foreground">{Number(headerOv.logo_size) || 40}px</span>
              </div>
              <Slider
                min={20}
                max={160}
                step={2}
                value={[Number(headerOv.logo_size) || 40]}
                onValueChange={([v]) => onChange("logo_size", v)}
                className="mt-2"
              />
            </div>
          )}

          <div>
            <Label className="text-xs">Image fit</Label>
            <Select value={(headerOv.logo_fit as string) || "contain"} onValueChange={(v) => onChange("logo_fit", v)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contain">Contain (no crop)</SelectItem>
                <SelectItem value="cover">Cover (crop to fill)</SelectItem>
                <SelectItem value="fill">Fill (stretch)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Typography settings */}
      <div className="grid grid-cols-2 gap-4 border-t pt-4">
        <div className="space-y-1">
          <Label className="text-xs">Font Family</Label>
          <select
            value={headerOv.nav_font || 'Inter'}
            onChange={(e) => onChange('nav_font', e.target.value)}
            className="w-full rounded border border-input bg-background px-2.5 py-1.5 text-xs focus-visible:outline-none"
          >
            <option value="Inter">Inter (Sans)</option>
            <option value="Playfair Display">Playfair (Serif)</option>
            <option value="Montserrat">Montserrat</option>
            <option value="Outfit">Outfit</option>
            <option value="Cinzel">Cinzel</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Font Weight</Label>
          <select
            value={headerOv.nav_weight || '500'}
            onChange={(e) => onChange('nav_weight', e.target.value)}
            className="w-full rounded border border-input bg-background px-2.5 py-1.5 text-xs focus-visible:outline-none"
          >
            <option value="400">Regular (400)</option>
            <option value="500">Medium (500)</option>
            <option value="600">Semibold (600)</option>
            <option value="700">Bold (700)</option>
          </select>
        </div>
      </div>

      <div className="space-y-1 border-t pt-4">
        <Label className="text-xs">Link Gap (Pixels)</Label>
        <Input 
          type="number" 
          value={headerOv.nav_gap ?? 16} 
          onChange={(e) => onChange('nav_gap', Number(e.target.value))} 
          className="h-8 text-xs w-full" 
        />
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <div>
          <Label className="text-xs font-semibold">Show Brand Display</Label>
          <p className="text-[10px] text-muted-foreground">Show Store Name text on Header.</p>
        </div>
        <Switch checked={headerOv.show_name !== false} onCheckedChange={(v) => onChange("show_name", v)} />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Brand name (shown in header & footer)</Label>
        <Input value={headerOv.brand_name ?? ""} onChange={(e) => onChange("brand_name", e.target.value)} placeholder={storeName} className="h-8 text-sm mt-1" />
      </div>

      <div className="border-t pt-4">
        <Label className="text-xs font-semibold">Header Navigation Menu Links</Label>
        <div className="mt-2 space-y-2">
          {links.map((l, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <Input value={l.label} onChange={(e) => updateLinks(links.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} className="h-8 text-xs flex-1" placeholder="Label" />
              <Select value={l.page} onValueChange={(v) => updateLinks(links.map((x, idx) => idx === i ? { ...x, page: v } : x))}>
                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{NAV_PAGE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <button onClick={() => updateLinks(links.filter((_, idx) => idx !== i))} className="text-destructive text-xs px-1.5"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
          <button onClick={() => updateLinks([...links, { label: "New link", page: "shop" }])} className="text-xs text-primary hover:underline inline-flex items-center gap-1"><Plus className="h-3 w-3" /> Add link</button>
        </div>
      </div>
    </div>
  );
}

function FooterInspector({ footerOv, onChange }: { footerOv: any; onChange: (k: string, v: any) => void }) {
  const social = footerOv.social ?? {};
  const columns: Array<{ title: string; links: Array<{ label: string; page?: string; href?: string }> }> = footerOv.columns ?? [
    { title: "Shop",     links: [{ label: "All products", page: "shop" }, { label: "Cart", page: "cart" }, { label: "My account", page: "account" }] },
    { title: "About",    links: [{ label: "About us", page: "about" }, { label: "Journal", page: "blog" }, { label: "Contact", page: "contact" }] },
    { title: "Policies", links: [{ label: "Privacy Policy", page: "privacy" }, { label: "Terms of Service", page: "terms" }, { label: "Refund Policy", page: "refund" }, { label: "Shipping Policy", page: "shipping" }] },
  ];
  const updateColumns = (next: typeof columns) => onChange("columns", next);

  return (
    <div className="p-4 space-y-5">
      <div>
        <Label className="text-xs">Tagline</Label>
        <Textarea rows={2} value={footerOv.tagline ?? ""} onChange={(e) => onChange("tagline", e.target.value)} className="text-sm mt-1" placeholder="A short tagline shown under your brand name in the footer." />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs">Show "Powered by Pic to Cart"</Label>
          <p className="text-[10px] text-muted-foreground">Disable on Premium to hide platform branding.</p>
        </div>
        <Switch checked={footerOv.show_powered_by !== false} onCheckedChange={(v) => onChange("show_powered_by", v)} />
      </div>

      <div>
        <Label className="text-xs">Social links</Label>
        <div className="space-y-1.5 mt-1">
          {(["instagram", "facebook", "twitter", "youtube"] as const).map((k) => (
            <div key={k} className="flex gap-1.5 items-center">
              <Label className="text-[10px] capitalize w-16 shrink-0">{k}</Label>
              <Input value={social[k] ?? ""} onChange={(e) => onChange("social", { ...social, [k]: e.target.value })} className="h-8 text-xs" placeholder={`https://${k}.com/yourbrand`} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs">Footer columns</Label>
        <div className="mt-2 space-y-3">
          {columns.map((col, ci) => (
            <div key={ci} className="border rounded-md p-2 space-y-2">
              <div className="flex items-center gap-1.5">
                <Input value={col.title} onChange={(e) => updateColumns(columns.map((c, i) => i === ci ? { ...c, title: e.target.value } : c))} className="h-7 text-xs flex-1" placeholder="Column title" />
                <button onClick={() => updateColumns(columns.filter((_, i) => i !== ci))} className="text-destructive text-xs px-1.5"><Trash2 className="h-3 w-3" /></button>
              </div>
              {col.links.map((l, li) => (
                <div key={li} className="flex gap-1.5 items-center pl-2">
                  <Input value={l.label} onChange={(e) => updateColumns(columns.map((c, i) => i === ci ? { ...c, links: c.links.map((x, j) => j === li ? { ...x, label: e.target.value } : x) } : c))} className="h-7 text-xs flex-1" placeholder="Label" />
                  <Select value={l.page ?? "home"} onValueChange={(v) => updateColumns(columns.map((c, i) => i === ci ? { ...c, links: c.links.map((x, j) => j === li ? { ...x, page: v, href: "" } : x) } : c))}>
                    <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NAV_PAGE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      <SelectItem value="privacy">Privacy Policy</SelectItem>
                      <SelectItem value="terms">Terms of Service</SelectItem>
                      <SelectItem value="refund">Refund Policy</SelectItem>
                      <SelectItem value="shipping">Shipping Policy</SelectItem>
                    </SelectContent>
                  </Select>
                  <button onClick={() => updateColumns(columns.map((c, i) => i === ci ? { ...c, links: c.links.filter((_, j) => j !== li) } : c))} className="text-destructive text-xs px-1.5"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
              <button onClick={() => updateColumns(columns.map((c, i) => i === ci ? { ...c, links: [...c.links, { label: "New link", page: "shop" }] } : c))} className="text-[11px] text-primary hover:underline ml-2 inline-flex items-center gap-1"><Plus className="h-3 w-3" /> Add link</button>
            </div>
          ))}
          <button onClick={() => updateColumns([...columns, { title: "New column", links: [] }])} className="text-xs text-primary hover:underline inline-flex items-center gap-1"><Plus className="h-3 w-3" /> Add column</button>
        </div>
      </div>
    </div>
  );
}

function SectionInspector({ idx, section, sectionOv, onUpdate, onReset, onUploadImage, onColorChange, onResetColors, previewUrl, categories = [], updateCategory, deleteCategory, products = [] }: any) {
  const handleUploadCatImage = async (catId: string, file: File) => {
    const loadingToast = toast.loading("Uploading category image...");
    try {
      const ext = file.name.split(".").pop();
      const path = `categories/${catId}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("store-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
      const url = data.publicUrl;
      await updateCategory.mutateAsync({ id: catId, image_url: url });
      toast.success("Category image updated!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const defaults = section?.props ?? {};
  const merged = { ...defaults, ...sectionOv };

  const typeSpecificKeys: Record<string, string[]> = {
    story: ["title", "body"],
    page_title: ["title"],
    contact_form: ["title", "sub", "email", "phone", "address", "hours"],
    newsletter: ["title", "sub", "cta"],
    values: ["title"],
    usp_strip: ["title"],
    promo_banner: ["title", "subtitle", "cta", "promo_code"],
  };
  const forcedKeys = typeSpecificKeys[section?.type] ?? [];
  const textKeys = TEXT_KEYS.filter((k) => (k in defaults) || forcedKeys.includes(k));

  const hasImage = "image" in defaults || section?.type === "story" || section?.type === "hero" || section?.type === "promo_banner";
  const hasItems = Array.isArray(defaults.items) || section?.type === "values" || section?.type === "usp_strip" || section?.type === "testimonials";

  const itemShape: "usp" | "testimonial" | "category" | "product" | "generic" | "value" =
    section?.type === "usp_strip" ? "usp"
    : section?.type === "testimonials" ? "testimonial"
    : section?.type === "values" ? "value"
    : section?.type === "category_grid" ? "category"
    : (section?.type === "product_grid" || section?.type === "trending") ? "product"
    : "generic";

  const items = merged.items ?? [];
  const updateItems = (next: any[]) => onUpdate(idx, "items", next);
  const isProductSection = 
    section?.type === "product_grid" || 
    section?.type === "trending" || 
    section?.type === "featured_products" || 
    section?.type === "new_arrivals" ||
    section?.type === "product_detail";

  const [pickerOpen, setPickerOpen] = useState(false);
  const [prodQuery, setProdQuery] = useState("");
  const [prodCategory, setProdCategory] = useState("");

  const isChooseProductSection = 
    section?.type === "product_grid" || 
    section?.type === "trending" || 
    section?.type === "featured_products" || 
    section?.type === "new_arrivals";

  const selectedIds = merged.selected_product_ids ?? [];
  const currentProds = useMemo(() => {
    return selectedIds
      .map((id: string) => products.find((pr: any) => pr.id === id))
      .filter(Boolean);
  }, [selectedIds, products]);

  const displayProducts = useMemo(() => {
    if (selectedIds.length > 0) return currentProds;
    if (section?.type === "featured_products" || section?.type === "product_grid") {
      return products.slice(0, 8);
    } else if (section?.type === "trending") {
      const sliceStart = products.length >= 8 ? 4 : 0;
      return products.slice(sliceStart, sliceStart + 8);
    } else if (section?.type === "new_arrivals") {
      const sliceStart = Math.max(0, products.length - 8);
      return products.slice(sliceStart).reverse();
    }
    return [];
  }, [products, selectedIds, currentProds, section?.type]);

  const filteredPickerProducts = useMemo(() => {
    return products.filter((pr: any) => {
      const matchQ = !prodQuery.trim() || pr.title.toLowerCase().includes(prodQuery.toLowerCase());
      const matchC = !prodCategory || pr.category === prodCategory;
      return matchQ && matchC;
    });
  }, [products, prodQuery, prodCategory]);

  // Hero gets its own rich inspector (slider/video/overlay/height/etc.)
  if (section?.type === "hero") {
    return (
      <HeroInspector
        idx={idx}
        section={section}
        sectionOv={sectionOv}
        onUpdate={onUpdate}
        onReset={onReset}
        onUploadImage={onUploadImage}
        onColorChange={onColorChange}
        onResetColors={onResetColors}
        previewUrl={previewUrl}
      />
    );
  }

  return (
    <div className="p-4 space-y-4">
      {isProductSection && (
        <div className="space-y-3 p-3 border rounded-lg bg-muted/40">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5 text-primary" /> Product Grid Styling
          </Label>
          
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[11px] text-muted-foreground">Columns (Desktop)</Label>
                <span className="text-[10px] font-mono bg-background px-1.5 py-0.5 rounded border">{merged.product_cols ?? 4} cols</span>
              </div>
              <Select 
                value={String(merged.product_cols ?? 4)} 
                onValueChange={(val) => onUpdate(idx, "product_cols", Number(val))}
              >
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                  <SelectItem value="4">4 Columns</SelectItem>
                  <SelectItem value="5">5 Columns</SelectItem>
                  <SelectItem value="6">6 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[11px] text-muted-foreground font-medium">Drag to resize Card Width</Label>
                <span className="text-[10px] font-mono bg-background px-1.5 py-0.5 rounded border">{merged.product_card_width ?? 220}px</span>
              </div>
              <Slider 
                value={[Number(merged.product_card_width ?? 220)]} 
                min={130} 
                max={350} 
                step={10} 
                onValueChange={([val]) => onUpdate(idx, "product_card_width", val)} 
                className="my-2"
              />
            </div>
          </div>
        </div>
      )}

      {isChooseProductSection && (
        <div className="space-y-3 p-3 border rounded-lg bg-muted/40 animate-fade-in">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-primary" /> Products List ({selectedIds.length > 0 ? `${selectedIds.length} Selected` : "Default"})
            </Label>
            {selectedIds.length > 0 && (
              <button 
                type="button" 
                onClick={() => onUpdate(idx, "selected_product_ids", null)}
                className="text-[10px] text-destructive hover:underline font-semibold"
              >
                Reset to default
              </button>
            )}
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 border rounded bg-background p-1.5">
            {displayProducts.map((pr: any, pi: number) => (
              <div key={pr.id || pi} className="flex items-center gap-2 text-[11px] p-1 hover:bg-muted/50 rounded transition-colors">
                <div className="w-6 h-6 rounded bg-muted overflow-hidden shrink-0 flex items-center justify-center border">
                  {pr.images?.[0] ? <img src={pr.images[0]} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="h-3 w-3 text-muted-foreground" />}
                </div>
                <span className="truncate flex-1 font-medium">{pr.title}</span>
                <span className="text-[9px] text-muted-foreground font-mono">₹{pr.price}</span>
              </div>
            ))}
            {displayProducts.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-2">No products showing. Choose products below.</p>
            )}
          </div>

          <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="w-full h-8 text-xs bg-background text-foreground hover:bg-muted/40">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add / Remove Products
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-background border rounded-lg shadow-lg">
              <DialogHeader>
                <DialogTitle>Select Section Products</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-3 mt-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input 
                      value={prodQuery} 
                      onChange={(e) => setProdQuery(e.target.value)} 
                      placeholder="Search products..." 
                      className="pl-8 h-8 text-xs bg-background" 
                    />
                  </div>
                  <select 
                    value={prodCategory} 
                    onChange={(e) => setProdCategory(e.target.value)} 
                    className="rounded-md border border-input px-2.5 h-8 text-xs bg-background w-32"
                  >
                    <option value="">All Categories</option>
                    {Array.from(new Set(products.map((p: any) => p.category).filter(Boolean))).map((cat: any) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="border rounded-lg max-h-60 overflow-y-auto divide-y bg-background">
                  {filteredPickerProducts.map((pr: any) => {
                    const isChecked = selectedIds.includes(pr.id);
                    return (
                      <label 
                        key={pr.id} 
                        className="flex items-center justify-between p-2.5 hover:bg-muted/50 cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              let nextIds;
                              if (isChecked) {
                                nextIds = selectedIds.filter((id: string) => id !== pr.id);
                              } else {
                                nextIds = [...selectedIds, pr.id];
                              }
                              onUpdate(idx, "selected_product_ids", nextIds);
                            }}
                            className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <div className="w-8 h-8 rounded bg-muted overflow-hidden shrink-0 border flex items-center justify-center">
                            {pr.images?.[0] ? <img src={pr.images[0]} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate">{pr.title}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{pr.category || "No category"}</p>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-muted-foreground ml-3">₹{pr.price}</span>
                      </label>
                    );
                  })}
                  {filteredPickerProducts.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">No products found</p>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] text-muted-foreground font-semibold">{selectedIds.length} products selected for this section</span>
                  <Button size="sm" onClick={() => setPickerOpen(false)}>
                    Done
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {hasImage && (
        <div>
          <Label className="text-xs">Section image</Label>
          <div className="mt-1.5 flex items-start gap-3">
            <div className="w-20 h-20 rounded-md border bg-muted overflow-hidden flex items-center justify-center shrink-0">
              {merged.image
                ? <img src={merged.image} alt="" className="w-full h-full object-cover" />
                : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" asChild>
                <label className="cursor-pointer">
                  <Upload className="mr-1 h-3.5 w-3.5" /> Replace
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadImage(idx, f); }} />
                </label>
              </Button>
              {merged.image && <Button size="sm" variant="outline" onClick={() => onUpdate(idx, "image", "")}><Trash2 className="mr-1 h-3.5 w-3.5" /> Remove</Button>}
              {"image" in sectionOv && <Button size="sm" variant="ghost" onClick={() => onReset(idx, "image")}><RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset</Button>}
            </div>
          </div>
        </div>
      )}

      {textKeys.map((k) => {
        const FIELD_FALLBACKS: Record<string, string> = {
          email: "support@storeontips.com",
          phone: "+91 98765 43210",
          address: "123 Luxury Lane, Phase 1, New Delhi - 110001",
          hours: "Mon - Sun: 11:00 AM - 9:00 PM",
        };
        const value = merged[k] ?? FIELD_FALLBACKS[k] ?? "";
        const isLong = k === "sub" || k === "body";
        return (
          <div key={k} className="space-y-1">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs capitalize">{k.replace("_", " ")}</Label>
              {k in sectionOv && (
                <button onClick={() => onReset(idx, k)} className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"><RotateCcw className="h-3 w-3" /> reset</button>
              )}
            </div>
            {isLong
              ? <Textarea rows={3} value={value} onChange={(e) => onUpdate(idx, k, e.target.value)} className="text-sm" />
              : <Input value={value} onChange={(e) => onUpdate(idx, k, e.target.value)} className="h-8 text-sm" />}
            
            {/* Text Color Picker */}
            <div className="flex items-center gap-2 mt-1 justify-end">
              <span className="text-[9px] text-muted-foreground font-medium">Text color:</span>
              <input 
                type="color" 
                value={merged[`${k}_color`] || "#000000"} 
                onChange={(e) => onUpdate(idx, `${k}_color`, e.target.value)} 
                className="w-4.5 h-4.5 rounded cursor-pointer border p-0 bg-transparent shrink-0" 
              />
              <Input 
                value={merged[`${k}_color`] || ""} 
                onChange={(e) => onUpdate(idx, `${k}_color`, e.target.value)} 
                placeholder="Default" 
                className="h-5 text-[9px] w-20 px-1 font-mono" 
              />
              {merged[`${k}_color`] && (
                <button 
                  type="button" 
                  onClick={() => {
                    onUpdate(idx, `${k}_color`, null);
                  }}
                  className="text-[9px] text-destructive hover:underline ml-1 font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        );
      })}

      {hasItems && itemShape === "usp" && (
        <ItemsEditor
          label="Trust strip items"
          items={items}
          renderRow={(it, update) => (
            <>
              <Select value={it.icon ?? "sparkles"} onValueChange={(v) => update({ ...it, icon: v })}>
                <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{ICON_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex-1 space-y-1">
                <Input value={it.title ?? ""} onChange={(e) => update({ ...it, title: e.target.value })} className="h-7 text-xs" placeholder="Title (e.g. Free shipping)" />
                <Input value={it.sub ?? ""}   onChange={(e) => update({ ...it, sub:   e.target.value })} className="h-7 text-xs" placeholder="Subtitle" />
              </div>
            </>
          )}
          blank={{ icon: "truck", title: "New benefit", sub: "Short description" }}
          onChange={updateItems}
        />
      )}

      {hasItems && itemShape === "testimonial" && (
        <ItemsEditor
          label="Testimonials"
          items={items}
          renderRow={(it, update) => (
            <div className="flex-1 space-y-1">
              <Textarea rows={2} value={it.quote ?? ""}    onChange={(e) => update({ ...it, quote:    e.target.value })} className="text-xs" placeholder="“Quote…”" />
              <div className="flex gap-1.5">
                <Input value={it.author ?? ""}   onChange={(e) => update({ ...it, author:   e.target.value })} className="h-7 text-xs flex-1" placeholder="Author" />
                <Input value={it.location ?? ""} onChange={(e) => update({ ...it, location: e.target.value })} className="h-7 text-xs flex-1" placeholder="Location" />
              </div>
            </div>
          )}
          blank={{ quote: "Great experience!", author: "Customer Name", location: "City" }}
          onChange={updateItems}
        />
      )}

      {hasItems && itemShape === "value" && (
        <ItemsEditor
          label="Our Values"
          items={items}
          renderRow={(it, update) => (
            <div className="flex-1 space-y-1">
              <Input value={it.title ?? ""} onChange={(e) => update({ ...it, title: e.target.value })} className="h-7 text-xs" placeholder="Value Title (e.g. Quality First)" />
              <Textarea rows={2} value={it.body ?? it.description ?? ""} onChange={(e) => update({ ...it, body: e.target.value, description: e.target.value })} className="text-xs" placeholder="Description of this value..." />
            </div>
          )}
          blank={{ title: "New Value", body: "Description of the value" }}
          onChange={updateItems}
        />
      )}

      {hasItems && itemShape === "category" && (
        <div className="space-y-3">
          <Label className="text-xs font-semibold">Categories (from database)</Label>
          <div className="space-y-4">
            {categories.map((cat: any) => {
              return (
                <div key={cat.id} className="p-3 border rounded-lg bg-card space-y-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Category name</Label>
                    <Input 
                      defaultValue={cat.name} 
                      onBlur={(e) => {
                        const nextVal = e.target.value.trim();
                        if (nextVal && nextVal !== cat.name) {
                          updateCategory.mutate({ id: cat.id, name: nextVal });
                        }
                      }} 
                      className="h-8 text-xs mt-1" 
                      placeholder="Category name" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Category Image</Label>
                    <div className="flex gap-2 items-center mt-1">
                      <div className="w-10 h-10 rounded border bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {cat.image_url ? (
                          <img src={cat.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <Input 
                        value={cat.image_url || ""} 
                        readOnly 
                        className="h-8 text-[10px] bg-muted/30 flex-1 truncate font-mono" 
                        placeholder="No image uploaded" 
                      />
                      <Button size="sm" variant="outline" asChild className="h-8 px-2.5 shrink-0 bg-background">
                        <label className="cursor-pointer">
                          <Upload className="h-3.5 w-3.5 mr-1" /> Update
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => { 
                              const f = e.target.files?.[0]; 
                              if (f) handleUploadCatImage(cat.id, f); 
                            }} 
                          />
                        </label>
                      </Button>
                      {cat.image_url && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => updateCategory.mutate({ id: cat.id, image_url: null })} 
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 shrink-0"
                          title="Remove image"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* Delete Category Button */}
                  <div className="flex items-center justify-between pt-1.5 border-t">
                    <span className="text-[10px] text-muted-foreground">Manage category</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={async () => {
                        if (confirm(`Are you sure you want to permanently delete the category "${cat.name}"?`)) {
                          await deleteCategory.mutateAsync(cat.id);
                        }
                      }} 
                      className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive px-2 shrink-0 font-semibold"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Category
                    </Button>
                  </div>
                </div>
              );
            })}
            {categories.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">No categories found in store. Create categories in the Catalog tab.</p>
            )}
          </div>
        </div>
      )}

      {"items" in sectionOv && (
        <button onClick={() => onReset(idx, "items")} className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <RotateCcw className="h-3 w-3" /> Reset items to theme default
        </button>
      )}

      {textKeys.length === 0 && !hasImage && !hasItems && (
        <p className="text-xs text-muted-foreground">This section has no editable fields exposed by the theme.</p>
      )}

      <div className="pt-3 border-t space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1.5"><Palette className="h-3 w-3" /> Section colors</Label>
          {sectionOv?.colors && (
            <button onClick={() => onResetColors(idx)} className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"><RotateCcw className="h-3 w-3" /> reset</button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">Override colors just for this section. Leave blank to use the theme default.</p>
        <div className="grid grid-cols-2 gap-2">
          {COLOR_KEYS.map(({ key, label }) => {
            const val = sectionOv?.colors?.[key] ?? "";
            return (
              <div key={key} className="space-y-1">
                <Label className="text-[10px]">{label}</Label>
                <div className="flex gap-1 items-center">
                  <input
                    type="color"
                    value={val || "#000000"}
                    onChange={(e) => onColorChange(idx, key, e.target.value)}
                    className="h-7 w-7 rounded border cursor-pointer shrink-0"
                  />
                  <Input
                    value={val}
                    onChange={(e) => onColorChange(idx, key, e.target.value)}
                    placeholder="theme"
                    className="h-7 text-[11px] font-mono"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-2 border-t">
        <a href={previewUrl} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
          <ExternalLink className="h-3 w-3" /> Open preview in new tab
        </a>
      </div>
    </div>
  );
}

function ItemsEditor({ label, items, renderRow, blank, onChange }: { label: string; items: any[]; renderRow: (it: any, update: (next: any) => void) => React.ReactNode; blank: any; onChange: (next: any[]) => void }) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items]; [next[i], next[j]] = [next[j], next[i]]; onChange(next);
  };
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-2 space-y-2">
        {items.map((it, i) => (
          <div key={i} className="border rounded-md p-2 flex gap-2 items-start">
            {renderRow(it, (next) => onChange(items.map((x, idx) => idx === i ? next : x)))}
            <div className="flex flex-col gap-0.5 shrink-0">
              <button onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground p-0.5" disabled={i === 0}><ArrowUp className="h-3 w-3" /></button>
              <button onClick={() => move(i,  1)} className="text-muted-foreground hover:text-foreground p-0.5" disabled={i === items.length - 1}><ArrowDown className="h-3 w-3" /></button>
              <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-destructive p-0.5"><Trash2 className="h-3 w-3" /></button>
            </div>
          </div>
        ))}
        <button onClick={() => onChange([...items, { ...blank }])} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
          <Plus className="h-3 w-3" /> Add item
        </button>
      </div>
    </div>
  );
}

function PaletteInspector({ paletteOv, onChangeColor, onApplyPreset, onReset }: { paletteOv: Record<string, string>; onChangeColor: (k: string, v: string) => void; onApplyPreset: (p: Record<string, string>) => void; onReset: () => void }) {
  return (
    <div className="p-4 space-y-5">
      <div>
        <Label className="text-xs">Quick palette presets</Label>
        <p className="text-[10px] text-muted-foreground mt-0.5">One click applies these colors across the whole storefront.</p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {PALETTE_PRESETS.map((preset) => {
            const swatchKeys = ["primary", "accent", "bg", "surface", "fg"];
            return (
              <button
                key={preset.name}
                onClick={() => onApplyPreset(preset.colors)}
                className="border rounded-md p-2 text-left hover:border-primary transition-colors"
              >
                <div className="flex gap-0.5 mb-1.5">
                  {swatchKeys.map((k) => (
                    <div
                      key={k}
                      className="h-4 flex-1 rounded-sm border"
                      style={{ background: preset.colors[k] || "#e5e5e5" }}
                    />
                  ))}
                </div>
                <div className="text-[11px] font-medium truncate">{preset.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs">Custom colors</Label>
          {Object.keys(paletteOv).length > 0 && (
            <button onClick={onReset} className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5">
              <RotateCcw className="h-3 w-3" /> reset
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {COLOR_KEYS.map(({ key, label }) => {
            const val = paletteOv[key] ?? "";
            return (
              <div key={key} className="space-y-1">
                <Label className="text-[10px]">{label}</Label>
                <div className="flex gap-1 items-center">
                  <input
                    type="color"
                    value={val || "#000000"}
                    onChange={(e) => onChangeColor(key, e.target.value)}
                    className="h-7 w-7 rounded border cursor-pointer shrink-0"
                  />
                  <Input
                    value={val}
                    onChange={(e) => onChangeColor(key, e.target.value)}
                    placeholder="theme"
                    className="h-7 text-[11px] font-mono"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- Hero Inspector — Shopify/WordPress-grade controls ----------
const HERO_STYLES: Array<{ value: string; label: string; hint: string }> = [
  { value: "slider",           label: "Slider / Carousel",  hint: "Multiple slides with autoplay" },
  { value: "fixed",            label: "Fixed Banner",        hint: "Single full-bleed image" },
  { value: "half_banner",      label: "Half Banner",         hint: "Compact, text + image side-by-side" },
  { value: "split",            label: "Split",               hint: "Big text left, image right" },
  { value: "fullscreen_image", label: "Full-screen Image",   hint: "Cinematic 80vh hero" },
  { value: "video",            label: "Video Background",    hint: "MP4 / YouTube / Vimeo" },
  { value: "magazine",         label: "Magazine / Editorial", hint: "Oversized headline + caption" },
  { value: "editorial_serif",  label: "Editorial Italic",    hint: "Italic serif headline" },
  { value: "minimal_left",     label: "Minimal Left",        hint: "Text-only, no image" },
  { value: "asymmetric",       label: "Asymmetric",          hint: "Diagonal image cut" },
  { value: "gradient",         label: "Gradient",            hint: "Brand gradient, no image" },
  { value: "centered",         label: "Centered (default)",  hint: "Classic centered hero" },
  { value: "floating_card",    label: "Floating Card",       hint: "Glassmorphic overlay card" },
  { value: "split_column",     label: "Split Column",        hint: "3-column editorial collage" },
  { value: "dual_image",       label: "Dual Image Collage",  hint: "Overlapping portrait images" },
  { value: "minimal_stripe",   label: "Minimal Stripe",      hint: "Clean horizontal brand banner" },
  { value: "left_sticky",      label: "Left Sticky Text",    hint: "Sticky header, scrolling gallery" },
  { value: "parallax_underlay",label: "Parallax Underlay",   hint: "Parallax scrolling background" },
  { value: "circle_mask",      label: "Circle Mask Grid",    hint: "Geometric circular image layout" },
];

const HEIGHT_OPTIONS = [
  { value: "auto",   label: "Auto" },
  { value: "short",  label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "tall",   label: "Tall" },
  { value: "full",   label: "Full" },
];

const ALIGN_GRID = [
  "top-left",    "top-center",    "top-right",
  "center-left", "center-center", "center-right",
  "bottom-left", "bottom-center", "bottom-right",
];

function HeroInspector({ idx, section, sectionOv, onUpdate, onReset, onUploadImage, onColorChange, onResetColors, previewUrl }: any) {
  const defaults = section?.props ?? {};
  const merged = { ...defaults, ...sectionOv };
  const style = merged.style ?? "centered";
  const slides: any[] = merged.slides ?? [];
  const slider = merged.slider ?? { autoplay: true, interval: 5000, transition: "fade", arrows: true, dots: true };
  const overlay = merged.overlay ?? { color: "#000000", opacity: 0.45, gradient: "none" };
  const effects = merged.effects ?? {};
  const video = merged.video ?? {};
  const height = merged.height ?? "auto";
  const contentAlign = merged.content_align ?? "center-center";

  const setSlider = (k: string, v: any) => onUpdate(idx, "slider", { ...slider, [k]: v });
  const setOverlay = (k: string, v: any) => onUpdate(idx, "overlay", { ...overlay, [k]: v });
  const setEffects = (k: string, v: any) => onUpdate(idx, "effects", { ...effects, [k]: v });
  const setVideo = (k: string, v: any) => onUpdate(idx, "video", { ...video, [k]: v });
  const setSlide = (i: number, patch: any) => {
    const next = [...slides];
    next[i] = { ...(next[i] || {}), ...patch };
    onUpdate(idx, "slides", next);
  };
  const addSlide = () => onUpdate(idx, "slides", [...slides, { title: `Slide ${slides.length + 1}`, sub: "", cta: "Shop now", image: "" }]);
  const removeSlide = (i: number) => onUpdate(idx, "slides", slides.filter((_, j) => j !== i));
  const moveSlide = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[i], next[j]] = [next[j], next[i]];
    onUpdate(idx, "slides", next);
  };

  return (
    <div className="p-4 space-y-5">
      <div>
        <Label className="text-xs">Choose Style</Label>
        <p className="text-[10px] text-muted-foreground mt-0.5">Switch the entire hero layout — the form below updates to match.</p>
        <Select value={style} onValueChange={(v) => onUpdate(idx, "style", v)}>
          <SelectTrigger className="h-9 text-sm mt-1.5"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-80">
            {HERO_STYLES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                <div className="flex flex-col">
                  <span className="text-sm">{s.label}</span>
                  <span className="text-[10px] text-muted-foreground">{s.hint}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {style === "slider" && (
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Slides ({slides.length})</Label>
            <Button size="sm" variant="outline" onClick={addSlide} className="h-7 text-xs"><Plus className="h-3 w-3 mr-1" /> Add slide</Button>
          </div>
          {slides.length === 0 && (
            <p className="text-[11px] text-muted-foreground">No slides yet. Click <strong>Add slide</strong> to start your carousel.</p>
          )}
          {slides.map((s, i) => (
            <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium">Slide {i + 1}</span>
                <div className="flex gap-0.5">
                  <button onClick={() => moveSlide(i, -1)} disabled={i === 0} className="p-1 disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                  <button onClick={() => moveSlide(i, 1)} disabled={i === slides.length - 1} className="p-1 disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                  <button onClick={() => removeSlide(i)} className="p-1 text-destructive"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-16 h-16 rounded border bg-background overflow-hidden flex items-center justify-center shrink-0">
                  {s.image ? <img src={s.image} className="w-full h-full object-cover" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                </div>
                <Button size="sm" variant="outline" asChild className="h-7 text-xs">
                  <label className="cursor-pointer">
                    <Upload className="h-3 w-3 mr-1" /> {s.image ? "Replace" : "Upload"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadImage(idx, f, { slideIndex: i, key: "image" }); }} />
                  </label>
                </Button>
              </div>
              <Input value={s.kicker ?? ""} placeholder="Kicker" onChange={(e) => setSlide(i, { kicker: e.target.value })} className="h-7 text-xs" />
              <Input value={s.title ?? ""}  placeholder="Headline" onChange={(e) => setSlide(i, { title:  e.target.value })} className="h-7 text-xs" />
              <Textarea value={s.sub ?? ""} placeholder="Sub headline" rows={2} onChange={(e) => setSlide(i, { sub: e.target.value })} className="text-xs" />
              <div className="space-y-1">
                <Label className="text-[10px]">Content Background Color</Label>
                <div className="flex gap-1.5 items-center">
                  <input
                    type="color"
                    value={s.content_bg || "#000000"}
                    onChange={(e) => setSlide(i, { content_bg: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border border-input"
                  />
                  <Input
                    value={s.content_bg || ""}
                    placeholder="#000000 or transparent"
                    onChange={(e) => setSlide(i, { content_bg: e.target.value })}
                    className="h-7 text-[11px] flex-1"
                  />
                  {s.content_bg && (
                    <button type="button" onClick={() => setSlide(i, { content_bg: "" })} className="text-[10px] hover:underline px-1 text-muted-foreground">Reset</button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <Input value={s.cta ?? ""}      placeholder="CTA label" onChange={(e) => setSlide(i, { cta: e.target.value })}      className="h-7 text-xs" />
                <Input value={s.cta_href ?? ""} placeholder="CTA link"  onChange={(e) => setSlide(i, { cta_href: e.target.value })} className="h-7 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <Input value={s.cta_secondary ?? ""}      placeholder="2nd CTA"  onChange={(e) => setSlide(i, { cta_secondary: e.target.value })}      className="h-7 text-xs" />
                <Input value={s.cta_secondary_href ?? ""} placeholder="2nd link" onChange={(e) => setSlide(i, { cta_secondary_href: e.target.value })} className="h-7 text-xs" />
              </div>
            </div>
          ))}

          <div className="border rounded-md p-3 space-y-2.5">
            <Label className="text-[11px] font-semibold">Slider behaviour</Label>
            <div className="flex items-center justify-between">
              <span className="text-xs">Autoplay</span>
              <Switch checked={slider.autoplay !== false} onCheckedChange={(v) => setSlider("autoplay", v)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Interval</span>
              <Select value={String(slider.interval ?? 5000)} onValueChange={(v) => setSlider("interval", Number(v))}>
                <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3000, 4000, 5000, 7000, 10000].map((n) => <SelectItem key={n} value={String(n)}>{n / 1000}s</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Transition</span>
              <Select value={slider.transition ?? "fade"} onValueChange={(v) => setSlider("transition", v)}>
                <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fade">Fade</SelectItem>
                  <SelectItem value="slide">Slide</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Show arrows</span>
              <Switch checked={slider.arrows !== false} onCheckedChange={(v) => setSlider("arrows", v)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Show dots</span>
              <Switch checked={slider.dots !== false} onCheckedChange={(v) => setSlider("dots", v)} />
            </div>
          </div>
        </div>
      )}

      {style === "video" && (
        <div className="space-y-2 border-t pt-4">
          <Label className="text-xs">Video source</Label>
          <p className="text-[10px] text-muted-foreground">Paste a YouTube / Vimeo URL, or upload an MP4.</p>
          <Input value={video.src ?? ""} placeholder="https://youtube.com/watch?v=… or https://vimeo.com/…" onChange={(e) => setVideo("src", e.target.value)} className="h-8 text-xs" />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild className="h-8 text-xs">
              <label className="cursor-pointer">
                <Upload className="h-3 w-3 mr-1" /> Upload MP4
                <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadImage(idx, f, { videoKey: "src" }); }} />
              </label>
            </Button>
            <Button size="sm" variant="outline" asChild className="h-8 text-xs">
              <label className="cursor-pointer">
                <ImageIcon className="h-3 w-3 mr-1" /> Poster
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadImage(idx, f, { videoKey: "poster" }); }} />
              </label>
            </Button>
          </div>
        </div>
      )}

      {!["slider", "video", "minimal_left", "gradient"].includes(style) && (
        <div className="border-t pt-4">
          <Label className="text-xs">Hero image</Label>
          <div className="mt-1.5 flex items-start gap-3">
            <div className="w-20 h-20 rounded-md border bg-muted overflow-hidden flex items-center justify-center shrink-0">
              {merged.image
                ? <img src={merged.image} alt="" className="w-full h-full object-cover" />
                : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" asChild>
                <label className="cursor-pointer">
                  <Upload className="mr-1 h-3.5 w-3.5" /> Replace
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadImage(idx, f); }} />
                </label>
              </Button>
              <HeroAiImageButton idx={idx} merged={merged} onUpdate={onUpdate} />
              {merged.image && <Button size="sm" variant="outline" onClick={() => onUpdate(idx, "image", "")}><Trash2 className="mr-1 h-3.5 w-3.5" /> Remove</Button>}
            </div>
          </div>
          <div className="mt-2">
            <Label className="text-[10px]">Focal point (object-position)</Label>
            <Input value={merged.focal ?? ""} placeholder="50% 50%" onChange={(e) => onUpdate(idx, "focal", e.target.value)} className="h-7 text-xs mt-0.5" />
          </div>
        </div>
      )}

      {style !== "slider" && (
        <div className="border-t pt-4 space-y-2">
          <Label className="text-[11px] font-semibold">Content</Label>
          <Input value={merged.kicker ?? ""} placeholder="Kicker" onChange={(e) => onUpdate(idx, "kicker", e.target.value)} className="h-8 text-xs" />
          <Input value={merged.title ?? ""}  placeholder="Headline" onChange={(e) => onUpdate(idx, "title",  e.target.value)} className="h-8 text-xs" />
          <Textarea rows={2} value={merged.sub ?? ""} placeholder="Sub headline" onChange={(e) => onUpdate(idx, "sub", e.target.value)} className="text-xs" />
          
          <div className="space-y-1">
            <Label className="text-[10px]">Content Box Background Color</Label>
            <div className="flex gap-1.5 items-center">
              <input
                type="color"
                value={merged.content_bg || "#000000"}
                onChange={(e) => onUpdate(idx, "content_bg", e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border border-input"
              />
              <Input
                value={merged.content_bg || ""}
                placeholder="#000000 or transparent"
                onChange={(e) => onUpdate(idx, "content_bg", e.target.value)}
                className="h-7 text-[11px] flex-1"
              />
              {merged.content_bg && (
                <button type="button" onClick={() => onUpdate(idx, "content_bg", "")} className="text-[10px] hover:underline px-1 text-muted-foreground">Reset</button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Input value={merged.cta ?? ""}      placeholder="CTA label" onChange={(e) => onUpdate(idx, "cta",      e.target.value)} className="h-7 text-xs" />
            <Input value={merged.cta_href ?? ""} placeholder="CTA link"  onChange={(e) => onUpdate(idx, "cta_href", e.target.value)} className="h-7 text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Input value={merged.cta_secondary ?? ""}      placeholder="2nd CTA"  onChange={(e) => onUpdate(idx, "cta_secondary",      e.target.value)} className="h-7 text-xs" />
            <Input value={merged.cta_secondary_href ?? ""} placeholder="2nd link" onChange={(e) => onUpdate(idx, "cta_secondary_href", e.target.value)} className="h-7 text-xs" />
          </div>
        </div>
      )}

      <div className="border-t pt-4 space-y-3">
        <Label className="text-[11px] font-semibold">Layout</Label>
        <div>
          <Label className="text-[10px]">Height</Label>
          <div className="grid grid-cols-5 gap-1 mt-1">
            {HEIGHT_OPTIONS.map((h) => (
              <button
                key={h.value}
                onClick={() => onUpdate(idx, "height", h.value)}
                className={`text-[10px] py-1.5 rounded border ${height === h.value ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-[10px]">Content position</Label>
          <div className="grid grid-cols-3 gap-1 mt-1 max-w-[140px]">
            {ALIGN_GRID.map((a) => (
              <button
                key={a}
                onClick={() => onUpdate(idx, "content_align", a)}
                className={`aspect-square rounded border text-[9px] ${contentAlign === a ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                title={a}
              >
                ●
              </button>
            ))}
          </div>
        </div>
      </div>

      <HeroButtonsPanel
        buttons={merged.buttons || {}}
        hasPrimary={!!merged.cta || !!(merged.slides?.[0]?.cta)}
        hasSecondary={!!merged.cta_secondary || !!(merged.slides?.[0]?.cta_secondary)}
        primaryLabel={merged.cta || (merged.slides?.[0]?.cta)}
        secondaryLabel={merged.cta_secondary || (merged.slides?.[0]?.cta_secondary)}
        onChange={(next: any) => onUpdate(idx, "buttons", next)}
      />

      {["slider", "video", "fullscreen_image", "fixed"].includes(style) && (
        <div className="border-t pt-4 space-y-2">
          <Label className="text-[11px] font-semibold">Overlay</Label>
          <div className="flex items-center gap-2">
            <Label className="text-[10px] w-16">Color</Label>
            <input type="color" value={overlay.color ?? "#000000"} onChange={(e) => setOverlay("color", e.target.value)} className="h-7 w-10 rounded border cursor-pointer" />
            <Input value={overlay.color ?? "#000000"} onChange={(e) => setOverlay("color", e.target.value)} className="h-7 text-[11px] font-mono flex-1" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[10px] w-16">Opacity</Label>
            <input type="range" min={0} max={0.9} step={0.05} value={overlay.opacity ?? 0.45} onChange={(e) => setOverlay("opacity", Number(e.target.value))} className="flex-1" />
            <span className="text-[10px] w-8 text-right">{Math.round((overlay.opacity ?? 0.45) * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[10px] w-16">Gradient</Label>
            <Select value={overlay.gradient ?? "none"} onValueChange={(v) => setOverlay("gradient", v)}>
              <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Solid</SelectItem>
                <SelectItem value="bottom">Fade from bottom</SelectItem>
                <SelectItem value="top">Fade from top</SelectItem>
                <SelectItem value="radial">Radial vignette</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="border-t pt-4 space-y-2">
        <Label className="text-[11px] font-semibold">Effects</Label>
        <div className="flex items-center justify-between">
          <span className="text-xs">Ken Burns zoom</span>
          <Switch checked={!!effects.ken_burns} onCheckedChange={(v) => setEffects("ken_burns", v)} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs">Parallax (fixed bg)</span>
          <Switch checked={!!effects.parallax} onCheckedChange={(v) => setEffects("parallax", v)} />
        </div>
      </div>

      <div className="pt-3 border-t space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1.5"><Palette className="h-3 w-3" /> Section colors</Label>
          {sectionOv?.colors && (
            <button onClick={() => onResetColors(idx)} className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"><RotateCcw className="h-3 w-3" /> reset</button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {COLOR_KEYS.map(({ key, label }) => {
            const val = sectionOv?.colors?.[key] ?? "";
            return (
              <div key={key} className="space-y-1">
                <Label className="text-[10px]">{label}</Label>
                <div className="flex gap-1 items-center">
                  <input type="color" value={val || "#000000"} onChange={(e) => onColorChange(idx, key, e.target.value)} className="h-7 w-7 rounded border cursor-pointer shrink-0" />
                  <Input value={val} onChange={(e) => onColorChange(idx, key, e.target.value)} placeholder="theme" className="h-7 text-[11px] font-mono" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-2 border-t">
        <a href={previewUrl} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
          <ExternalLink className="h-3 w-3" /> Open preview in new tab
        </a>
      </div>
    </div>
  );
}

// ---------- Hero Buttons Inspector ----------
const BTN_SIZE_OPTS = [
  { value: "sm", label: "S" }, { value: "md", label: "M" },
  { value: "lg", label: "L" }, { value: "xl", label: "XL" },
];
const BTN_SHADOW_OPTS = [
  { value: "none", label: "None" }, { value: "soft", label: "Soft" },
  { value: "medium", label: "Medium" }, { value: "hard", label: "Hard" },
  { value: "glow", label: "Glow" }, { value: "inset", label: "Inset" },
];
const BTN_ANIM_OPTS = [
  { value: "none", label: "None" }, { value: "pulse", label: "Pulse" },
  { value: "bounce", label: "Bounce" }, { value: "shine", label: "Shine" },
  { value: "float", label: "Float" }, { value: "wobble", label: "Wobble" },
];
const BTN_HOVER_OPTS = [
  { value: "none", label: "None" }, { value: "lift", label: "Lift" },
  { value: "scale", label: "Scale" }, { value: "glow", label: "Glow" },
  { value: "invert", label: "Invert" },
];

function ColorRow({ label, value, onChange, placeholder }: any) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-[10px] w-16 shrink-0">{label}</Label>
      <input type="color" value={value || "#000000"} onChange={(e) => onChange(e.target.value)} className="h-6 w-7 rounded border cursor-pointer shrink-0" />
      <Input value={value || ""} placeholder={placeholder || "theme"} onChange={(e) => onChange(e.target.value)} className="h-6 text-[11px] font-mono" />
      {value && <button onClick={() => onChange("")} className="text-[10px] text-muted-foreground hover:text-foreground"><RotateCcw className="h-3 w-3" /></button>}
    </div>
  );
}

function ButtonStyleEditor({ kind, cfg, label, onChange }: { kind: "primary" | "secondary"; cfg: any; label?: string; onChange: (next: any) => void }) {
  const set = (k: string, v: any) => onChange({ ...cfg, [k]: v });
  const isPrimary = kind === "primary";
  return (
    <div className="border rounded-md p-2.5 space-y-2 bg-muted/30">
      <div className="text-[11px] font-semibold uppercase tracking-wide">{isPrimary ? "Primary button" : "Secondary button"}{label ? ` ("${label}")` : ""}</div>
      <ColorRow label="BG" value={cfg.bg} onChange={(v: string) => set("bg", v)} placeholder={isPrimary ? "primary" : "transparent"} />
      <ColorRow label="Text" value={cfg.color} onChange={(v: string) => set("color", v)} placeholder={isPrimary ? "on-primary" : "#fff"} />
      <ColorRow label="Border" value={cfg.border_color} onChange={(v: string) => set("border_color", v)} placeholder="auto" />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Border width</Label>
          <Slider value={[Number(cfg.border_width ?? (isPrimary ? 0 : 1))]} min={0} max={6} step={1} onValueChange={([v]) => set("border_width", v)} className="mt-1.5" />
        </div>
        <div>
          <Label className="text-[10px]">Radius</Label>
          <Slider value={[Number(cfg.radius ?? 8)]} min={0} max={60} step={1} onValueChange={([v]) => set("radius", v)} className="mt-1.5" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Size</Label>
          <Select value={cfg.size || "md"} onValueChange={(v) => set("size", v)}>
            <SelectTrigger className="h-7 text-xs mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{BTN_SIZE_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px]">Shadow</Label>
          <Select value={cfg.shadow || (isPrimary ? "soft" : "none")} onValueChange={(v) => set("shadow", v)}>
            <SelectTrigger className="h-7 text-xs mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{BTN_SHADOW_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Animation</Label>
          <Select value={cfg.animation || "none"} onValueChange={(v) => set("animation", v)}>
            <SelectTrigger className="h-7 text-xs mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{BTN_ANIM_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px]">Hover</Label>
          <Select value={cfg.hover || "lift"} onValueChange={(v) => set("hover", v)}>
            <SelectTrigger className="h-7 text-xs mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{BTN_HOVER_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        <Label className="text-[10px]">Uppercase</Label>
        <Switch checked={!!cfg.uppercase} onCheckedChange={(v) => set("uppercase", v)} />
      </div>
    </div>
  );
}

function ButtonPositionCanvas({ buttons, onMove }: { buttons: any; onMove: (kind: "primary" | "secondary", pos: { x: number; y: number }) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<null | "primary" | "secondary">(null);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
      onMove(dragging, { x: Math.round(x), y: Math.round(y) });
    };
    const up = () => setDragging(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [dragging, onMove]);

  const p = buttons?.primary || {};
  const s = buttons?.secondary || {};
  return (
    <div ref={ref} className="relative h-32 rounded-md border-2 border-dashed bg-gradient-to-br from-muted/40 to-muted/10 select-none touch-none overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground pointer-events-none">Drag pills to position over hero</div>
      <div
        onPointerDown={(e) => { e.preventDefault(); setDragging("primary"); }}
        className="absolute px-2 py-1 text-[10px] bg-primary text-primary-foreground rounded cursor-grab active:cursor-grabbing shadow font-medium"
        style={{ left: `${p.x ?? 35}%`, top: `${p.y ?? 78}%`, transform: "translate(-50%, -50%)" }}
      >Primary</div>
      <div
        onPointerDown={(e) => { e.preventDefault(); setDragging("secondary"); }}
        className="absolute px-2 py-1 text-[10px] border border-foreground/60 rounded cursor-grab active:cursor-grabbing font-medium bg-background/70"
        style={{ left: `${s.x ?? 65}%`, top: `${s.y ?? 78}%`, transform: "translate(-50%, -50%)" }}
      >Secondary</div>
    </div>
  );
}

function HeroButtonsPanel({ buttons, hasPrimary, hasSecondary, primaryLabel, secondaryLabel, onChange }: { buttons: any; hasPrimary: boolean; hasSecondary: boolean; primaryLabel?: string; secondaryLabel?: string; onChange: (next: any) => void }) {
  const primary = buttons.primary || {};
  const secondary = buttons.secondary || {};
  const freePos = !!buttons.free_position;
  return (
    <div className="border-t pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-semibold">Buttons design</Label>
        <button
          onClick={() => onChange({})}
          className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
        ><RotateCcw className="h-3 w-3" /> reset</button>
      </div>

      <div className="flex items-center justify-between p-2 rounded-md border bg-muted/20">
        <div>
          <Label className="text-xs">Free position (drag anywhere)</Label>
          <p className="text-[10px] text-muted-foreground">Place buttons anywhere over the hero.</p>
        </div>
        <Switch checked={freePos} onCheckedChange={(v) => onChange({ ...buttons, free_position: v })} />
      </div>

      {freePos && (
        <ButtonPositionCanvas
          buttons={buttons}
          onMove={(kind, pos) => onChange({ ...buttons, [kind]: { ...(buttons[kind] || {}), ...pos } })}
        />
      )}

      {hasPrimary && (
        <ButtonStyleEditor kind="primary" cfg={primary} label={primaryLabel} onChange={(next) => onChange({ ...buttons, primary: next })} />
      )}
      {hasSecondary && (
        <ButtonStyleEditor kind="secondary" cfg={secondary} label={secondaryLabel} onChange={(next) => onChange({ ...buttons, secondary: next })} />
      )}
      {!hasPrimary && !hasSecondary && (
        <p className="text-[11px] text-muted-foreground">Add a CTA label above to style buttons.</p>
      )}
    </div>
  );
}

// ---------- Hero AI Image Generation ----------
function HeroAiImageButton({ idx, merged, onUpdate }: { idx: number; merged: any; onUpdate: (idx: number, key: string, value: any) => void }) {
  const { store } = useStore();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState<string>(merged.title ? `${merged.title} hero banner` : "");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!store?.id) { toast.error("Store still loading"); return; }
    if (!prompt.trim()) { toast.error("Describe the hero image"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-product-image", {
        body: { store_id: store.id, prompt: `Wide cinematic e-commerce hero banner: ${prompt.trim()}`, productName: merged.title || "", category: (store as any)?.category || "", storeName: store.name },
      });
      if (error) throw error;
      if ((data as any)?.error === "INSUFFICIENT_CREDITS") {
        toast.error("Out of AI credits. Top up to keep generating.");
        return;
      }
      const url = (data as any)?.imageUrl;
      if (!url) throw new Error("No image returned");
      onUpdate(idx, "image", url);
      toast.success(`Hero image generated · ${10} credits used`);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 hover:from-violet-500/20 hover:to-fuchsia-500/20">
        <Sparkles className="mr-1 h-3.5 w-3.5 text-violet-600" /> Generate with AI
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-600" /> Generate hero image</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Describe the hero image</Label>
              <Textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Golden hour shot of fresh croissants on rustic wood table, warm steam, bakery vibe" className="text-sm mt-1" />
            </div>
            <p className="text-[11px] text-muted-foreground">Uses 10 AI credits per image. Replaces the current hero image when ready.</p>
            <Button onClick={run} disabled={busy} className="w-full">
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate (10 credits)</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
