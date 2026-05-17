import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/hooks/useStore";
import { useThemeManifest } from "@/hooks/useThemeManifest";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Loader2, RotateCcw, Save, Upload, Trash2, Image as ImageIcon,
  Smartphone, Monitor, ExternalLink,
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
  testimonials: "Testimonials", newsletter: "Newsletter", page_title: "Page title",
  values: "Values", signup: "Sign up form", signin: "Sign in form",
  forgot_password: "Forgot password", reset_password: "Reset password",
  line_items: "Line items", cart_summary: "Cart summary",
  checkout_stepper: "Checkout stepper", journal_strip: "Journal strip",
  journal_list: "Journal list", account_panel: "Account panel",
  contact_form: "Contact form", product_detail: "Product detail",
};

const TEXT_KEYS = ["title", "sub", "kicker", "cta", "cta_secondary", "body", "email", "phone"];

export default function CustomiserV2() {
  const { store, setStore } = useStore();
  const settings = (store?.settings || {}) as any;
  const activeThemeId =
    (store?.theme as any)?.theme_id || (store?.theme as any)?.name || "";
  const { data: manifest, isLoading } = useThemeManifest(activeThemeId);

  const [overrides, setOverrides] = useState<any>(settings.theme_overrides || {});
  const [page, setPage] = useState("home");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!store?.id || hydrated === store.id) return;
    setOverrides((store.settings as any)?.theme_overrides || {});
    setHydrated(store.id);
  }, [store, hydrated]);

  // Push updates to iframe whenever overrides or page change.
  useEffect(() => {
    const send = () => iframeRef.current?.contentWindow?.postMessage(
      { type: "customiser:update", overrides, page }, "*",
    );
    send();
  }, [overrides, page]);

  // Re-push when iframe signals ready.
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
  const pageOverrides = overrides?.pages?.[page] ?? overrides; // backwards compat: legacy stored at root
  // We standardize on overrides.pages[page].sections[idx]
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

  const uploadImage = async (idx: number, file: File) => {
    if (!store?.id) return;
    try {
      const ext = file.name.split(".").pop();
      const path = `${store.id}/theme-overrides/${page}-${idx}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("store-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
      updateField(idx, "image", data.publicUrl);
      toast.success("Image updated");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    }
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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!manifest) {
    return <div className="p-8 text-center text-muted-foreground">This theme has no published manifest yet.</div>;
  }

  const selected = selectedIdx !== null ? sections[selectedIdx] : null;
  const selectedDefaults = selected?.props ?? {};
  const selectedOv = sectionOverrides[selectedIdx as any] ?? sectionOverrides[String(selectedIdx)] ?? {};
  const selectedMerged = { ...selectedDefaults, ...selectedOv };
  const textKeys = TEXT_KEYS.filter((k) => k in selectedDefaults);
  const hasImage = "image" in selectedDefaults;

  const previewUrl = `/admin/themes/preview-live/${activeThemeId}?page=${page}&storeSlug=${store?.slug ?? ""}`;

  return (
    <div className="-m-4 md:-m-6 h-[calc(100vh-4rem)] flex flex-col bg-background">
      {/* Top bar */}
      <div className="border-b px-4 h-12 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-sm">Customise</h1>
          <Badge variant="outline" className="text-[10px]">{activeThemeId}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md overflow-hidden">
            <button onClick={() => setDevice("desktop")} className={`p-1.5 ${device === "desktop" ? "bg-muted" : ""}`} title="Desktop">
              <Monitor className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setDevice("mobile")} className={`p-1.5 ${device === "mobile" ? "bg-muted" : ""}`} title="Mobile">
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button size="sm" variant="outline" onClick={resetPage}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset page
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            <Save className="mr-1 h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: Pages */}
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
                    onClick={() => { setPage(p.id); setSelectedIdx(null); }}
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
              {sections.length === 0 && <div className="px-2 py-3 text-[11px] text-muted-foreground">No sections on this page.</div>}
              {sections.map((s, i) => {
                const ov = sectionOverrides[i] ?? sectionOverrides[String(i)] ?? {};
                const edited = Object.keys(ov).length > 0;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedIdx(i)}
                    className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md flex items-center justify-between ${selectedIdx === i ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                  >
                    <span className="truncate">{i + 1}. {SECTION_LABEL[s.type] || s.type}</span>
                    {edited && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                  </button>
                );
              })}
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
            <iframe
              ref={iframeRef}
              src={previewUrl}
              title="Live preview"
              className="w-full h-full border-0"
            />
          </div>
        </main>

        {/* Right: Inspector */}
        <aside className="w-80 border-l flex flex-col">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Inspector</div>
              <div className="text-sm font-medium">
                {selected ? (SECTION_LABEL[selected.type] || selected.type) : "No section selected"}
              </div>
            </div>
            {selected && Object.keys(selectedOv).length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => resetSection(selectedIdx!)}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
              </Button>
            )}
          </div>
          <ScrollArea className="flex-1">
            {!selected && (
              <div className="p-4 text-xs text-muted-foreground">
                Pick a section on the left to edit its text and images. Reset any field to fall back to the theme's default.
              </div>
            )}
            {selected && (
              <div className="p-4 space-y-4">
                {hasImage && (
                  <div>
                    <Label className="text-xs">Section image</Label>
                    <div className="mt-1.5 flex items-start gap-3">
                      <div className="w-20 h-20 rounded-md border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                        {selectedMerged.image
                          ? <img src={selectedMerged.image} alt="" className="w-full h-full object-cover" />
                          : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" variant="outline" asChild>
                          <label className="cursor-pointer">
                            <Upload className="mr-1 h-3.5 w-3.5" /> Replace
                            <input
                              type="file" accept="image/*" className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) uploadImage(selectedIdx!, f);
                              }}
                            />
                          </label>
                        </Button>
                        {selectedMerged.image && (
                          <Button size="sm" variant="outline" onClick={() => updateField(selectedIdx!, "image", "")}>
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
                          </Button>
                        )}
                        {"image" in selectedOv && (
                          <Button size="sm" variant="ghost" onClick={() => resetField(selectedIdx!, "image")}>
                            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {textKeys.map((k) => {
                  const value = selectedMerged[k] ?? "";
                  const isLong = k === "sub" || k === "body";
                  return (
                    <div key={k}>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs capitalize">{k.replace("_", " ")}</Label>
                        {k in selectedOv && (
                          <button onClick={() => resetField(selectedIdx!, k)} className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5">
                            <RotateCcw className="h-3 w-3" /> reset
                          </button>
                        )}
                      </div>
                      {isLong
                        ? <Textarea rows={3} value={value} onChange={(e) => updateField(selectedIdx!, k, e.target.value)} className="text-sm" />
                        : <Input value={value} onChange={(e) => updateField(selectedIdx!, k, e.target.value)} className="h-8 text-sm" />}
                    </div>
                  );
                })}
                {textKeys.length === 0 && !hasImage && (
                  <p className="text-xs text-muted-foreground">This section has no editable fields exposed by the theme.</p>
                )}
                <div className="pt-2 border-t">
                  <a
                    href={previewUrl}
                    target="_blank" rel="noreferrer"
                    className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Open preview in new tab
                  </a>
                </div>
              </div>
            )}
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
