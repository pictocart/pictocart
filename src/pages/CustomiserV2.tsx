import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/hooks/useStore";
import { useThemeManifest } from "@/hooks/useThemeManifest";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2, RotateCcw, Save, Upload, Trash2, Image as ImageIcon,
  Smartphone, Monitor, ExternalLink, Plus, ArrowUp, ArrowDown,
  PanelTop, PanelBottom, Palette,
} from "lucide-react";

const PAGES = [
  { id: "home", label: "Home" },
  { id: "shop", label: "Shop" },
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
};

const TEXT_KEYS = ["title", "sub", "kicker", "cta", "cta_secondary", "body", "email", "phone"];
const ICON_OPTIONS = ["truck", "shield", "refresh", "headphones", "lock", "tag", "gift", "sparkles"];

const NAV_PAGE_OPTIONS = [
  { value: "home", label: "Home" },
  { value: "shop", label: "Shop" },
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
  const settings = (store?.settings || {}) as any;
  const activeThemeId =
    (store?.theme as any)?.theme_id || (store?.theme as any)?.name || "";
  const { data: manifest, isLoading } = useThemeManifest(activeThemeId);

  const [overrides, setOverrides] = useState<any>(settings.theme_overrides || {});
  const [page, setPage] = useState("home");
  const [selected, setSelected] = useState<Selection | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!store?.id || hydrated === store.id) return;
    setOverrides((store.settings as any)?.theme_overrides || {});
    setHydrated(store.id);
  }, [store, hydrated]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "customiser:update", overrides, page }, "*",
    );
  }, [overrides, page]);

  useEffect(() => {
    const onReady = (ev: MessageEvent) => {
      if (ev.data?.type === "customiser:ready") {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "customiser:update", overrides, page }, "*",
        );
      }
    };
    window.addEventListener("message", onReady);
    return () => window.removeEventListener("message", onReady);
  }, [overrides, page]);

  const isMaster = activeThemeId?.startsWith("theme-");
  const sections: any[] = useMemo(
    () => (manifest as any)?.pages?.[page]?.sections ?? [],
    [manifest, page],
  );
  const sectionOverrides: Record<string, any> =
    overrides?.pages?.[page]?.sections ?? {};

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

  const uploadImage = async (idx: number, file: File, key: "image" | "logo_url" = "image") => {
    if (!store?.id) return;
    try {
      const ext = file.name.split(".").pop();
      const path = `${store.id}/theme-overrides/${page}-${idx}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("store-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
      if (key === "logo_url") updateHeader("logo_url", data.publicUrl);
      else updateField(idx, "image", data.publicUrl);
      toast.success("Image updated");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    }
  };

  // ---------- Header / Footer overrides ----------
  const headerOv = overrides?.header || {};
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
      const ext = file.name.split(".").pop();
      const path = `${store.id}/logo/header-${Date.now()}.${ext}`;
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
    const newSettings = { ...settings, theme_overrides: overrides };
    const { error } = await supabase.from("stores").update({ settings: newSettings }).eq("id", store.id);
    if (error) toast.error("Failed to save");
    else {
      setStore({ ...store, settings: newSettings });
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

  return (
    <div className="-m-4 md:-m-6 h-[calc(100vh-4rem)] flex flex-col bg-background">
      <div className="border-b px-4 h-12 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-sm">Customise</h1>
          <Badge variant="outline" className="text-[10px]">{activeThemeId}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md overflow-hidden">
            <button onClick={() => setDevice("desktop")} className={`p-1.5 ${device === "desktop" ? "bg-muted" : ""}`} title="Desktop"><Monitor className="h-3.5 w-3.5" /></button>
            <button onClick={() => setDevice("mobile")} className={`p-1.5 ${device === "mobile" ? "bg-muted" : ""}`} title="Mobile"><Smartphone className="h-3.5 w-3.5" /></button>
          </div>
          <Button size="sm" variant="outline" onClick={resetPage}><RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset page</Button>
          <Button size="sm" onClick={save} disabled={saving}><Save className="mr-1 h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: Pages + Sections */}
        <aside className="w-44 border-r flex flex-col">
          <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">Pages</div>
          <ScrollArea className="flex-1">
            <div className="px-2 pb-3 space-y-0.5">
              {PAGES.map((p) => {
                const exists = !!(manifest as any)?.pages?.[p.id];
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

              {/* Synthetic Header row */}
              <button
                onClick={() => selectAndScroll({ kind: "header" })}
                className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md flex items-center justify-between ${selected?.kind === "header" ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
              >
                <span className="flex items-center gap-1.5"><PanelTop className="h-3 w-3" /> Header</span>
                {Object.keys(headerOv).length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
              </button>

              {sections.length === 0 && <div className="px-2 py-3 text-[11px] text-muted-foreground">No sections on this page.</div>}
              {sections.map((s, i) => {
                const ov = sectionOverrides[i] ?? sectionOverrides[String(i)] ?? {};
                const edited = Object.keys(ov).length > 0;
                const isSel = selected?.kind === "section" && selected.index === i;
                return (
                  <button
                    key={i}
                    onClick={() => selectAndScroll({ kind: "section", index: i })}
                    className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md flex items-center justify-between ${isSel ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                  >
                    <span className="truncate">{i + 1}. {SECTION_LABEL[s.type] || s.type}</span>
                    {edited && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                  </button>
                );
              })}

              {/* Synthetic Footer row */}
              <button
                onClick={() => selectAndScroll({ kind: "footer" })}
                className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md flex items-center justify-between ${selected?.kind === "footer" ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
              >
                <span className="flex items-center gap-1.5"><PanelBottom className="h-3 w-3" /> Footer</span>
                {Object.keys(footerOv).length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
              </button>
            </div>
          </ScrollArea>
        </aside>

        {/* Middle: Live preview */}
        <main className="flex-1 bg-muted/40 flex items-center justify-center overflow-hidden p-4">
          <div
            className="bg-background shadow-lg rounded-md overflow-hidden border transition-all"
            style={{
              width: device === "mobile" ? 390 : "100%",
              height: "100%",
              maxWidth: device === "mobile" ? 390 : 1280,
            }}
          >
            <iframe ref={iframeRef} src={previewUrl} title="Live preview" className="w-full h-full border-0" />
          </div>
        </main>

        {/* Right: Inspector */}
        <aside className="w-80 border-l flex flex-col">
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
              />
            )}
          </ScrollArea>
        </aside>
      </div>
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
    { label: "Shop", page: "shop" }, { label: "About", page: "about" }, { label: "Journal", page: "blog" }, { label: "Contact", page: "contact" },
  ];
  const updateLinks = (next: typeof links) => onChange("nav_links", next);
  return (
    <div className="p-4 space-y-5">
      <div>
        <Label className="text-xs">Logo</Label>
        <div className="mt-1.5 flex items-start gap-3">
          <div className="w-16 h-16 rounded-md border bg-muted overflow-hidden flex items-center justify-center shrink-0">
            {headerOv.logo_url
              ? <img src={headerOv.logo_url} alt="" className="w-full h-full object-contain" />
              : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" asChild>
              <label className="cursor-pointer">
                <Upload className="mr-1 h-3.5 w-3.5" /> {headerOv.logo_url ? "Replace" : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogoUpload(f); }} />
              </label>
            </Button>
            {headerOv.logo_url && (
              <Button size="sm" variant="outline" onClick={() => onChange("logo_url", "")}><Trash2 className="mr-1 h-3.5 w-3.5" /> Remove</Button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">PNG/SVG with transparent background works best.</p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs">Show store name</Label>
          <p className="text-[10px] text-muted-foreground">Hide if your logo already includes the name.</p>
        </div>
        <Switch checked={headerOv.show_name !== false} onCheckedChange={(v) => onChange("show_name", v)} />
      </div>

      <div>
        <Label className="text-xs">Brand name (shown in header & footer)</Label>
        <Input value={headerOv.brand_name ?? ""} onChange={(e) => onChange("brand_name", e.target.value)} placeholder={storeName} className="h-8 text-sm mt-1" />
      </div>

      <div>
        <Label className="text-xs">Navigation links</Label>
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

function SectionInspector({ idx, section, sectionOv, onUpdate, onReset, onUploadImage, onColorChange, onResetColors, previewUrl }: any) {
  const defaults = section?.props ?? {};
  const merged = { ...defaults, ...sectionOv };
  const textKeys = TEXT_KEYS.filter((k) => k in defaults);
  const hasImage = "image" in defaults;
  const hasItems = Array.isArray(defaults.items);
  const itemShape: "usp" | "testimonial" | "category" | "product" | "generic" =
    section?.type === "usp_strip" ? "usp"
    : section?.type === "testimonials" ? "testimonial"
    : section?.type === "category_grid" ? "category"
    : (section?.type === "product_grid" || section?.type === "trending") ? "product"
    : "generic";

  const items = merged.items ?? [];
  const updateItems = (next: any[]) => onUpdate(idx, "items", next);

  return (
    <div className="p-4 space-y-4">
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
        const value = merged[k] ?? "";
        const isLong = k === "sub" || k === "body";
        return (
          <div key={k}>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs capitalize">{k.replace("_", " ")}</Label>
              {k in sectionOv && (
                <button onClick={() => onReset(idx, k)} className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"><RotateCcw className="h-3 w-3" /> reset</button>
              )}
            </div>
            {isLong
              ? <Textarea rows={3} value={value} onChange={(e) => onUpdate(idx, k, e.target.value)} className="text-sm" />
              : <Input value={value} onChange={(e) => onUpdate(idx, k, e.target.value)} className="h-8 text-sm" />}
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

      {hasItems && itemShape === "category" && (
        <ItemsEditor
          label="Categories"
          items={items}
          renderRow={(it, update) => (
            <div className="flex-1 space-y-1">
              <Input value={it.name ?? ""}  onChange={(e) => update({ ...it, name:  e.target.value })} className="h-7 text-xs" placeholder="Category name" />
              <Input value={it.image ?? ""} onChange={(e) => update({ ...it, image: e.target.value })} className="h-7 text-xs" placeholder="Image URL" />
            </div>
          )}
          blank={{ name: "New category", image: "" }}
          onChange={updateItems}
        />
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
