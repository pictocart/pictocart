import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Play, RefreshCw, SkipForward, Send, ExternalLink,
  Sparkles, Search, CalendarPlus, Save, Wand2, Plus, Store, Briefcase, Filter, X,
} from "lucide-react";

// ── Industry taxonomy ────────────────────────────────────────────────────────
// Map vertical → (kind, label, category-group). Verticals that ship services
// are marked "service"; everything else is "sale". Category groups bundle
// related professions/merchant types under a friendly umbrella.
type Kind = "sale" | "service";
const VERTICAL_META: Record<string, { kind: Kind; label: string; group: string }> = {
  services:    { kind: "service", label: "Professional Services", group: "Healthcare, Beauty & Home Pros" },
  food:        { kind: "sale",    label: "Food & Beverage",       group: "Cafés, Restaurants & Packaged Food" },
  fashion:     { kind: "sale",    label: "Fashion & Apparel",     group: "Clothing, Footwear & Accessories" },
  jewellery:   { kind: "sale",    label: "Jewellery",             group: "Fine, Designer & Fashion Jewellery" },
  beauty:      { kind: "sale",    label: "Beauty & Personal Care",group: "Skincare, Haircare & Cosmetics" },
  health:      { kind: "sale",    label: "Health & Wellness",     group: "Ayurveda, Supplements & Devices" },
  home:        { kind: "sale",    label: "Home & Living",         group: "Décor, Furniture & Kitchenware" },
  electronics: { kind: "sale",    label: "Electronics & Gadgets", group: "Mobiles, Audio & Smart Home" },
  kids:        { kind: "sale",    label: "Kids & Baby",           group: "Toys, Clothing & Essentials" },
  books:       { kind: "sale",    label: "Books & Stationery",    group: "Reading, Art & Office" },
  sports:      { kind: "sale",    label: "Sports & Fitness",      group: "Athleisure, Gear & Outdoor" },
  automotive:  { kind: "sale",    label: "Automotive",            group: "Accessories, Care & EV" },
  pets:        { kind: "sale",    label: "Pet Care",              group: "Food, Toys & Grooming" },
  handicraft:  { kind: "sale",    label: "Handicrafts & Art",     group: "Handmade, Folk & Heritage" },
  gifts:       { kind: "sale",    label: "Gifting & Festive",     group: "Festivals, Weddings & Corporate" },
  religious:   { kind: "sale",    label: "Religious & Spiritual", group: "Pooja, Idols & Spiritual Goods" },
  agri:        { kind: "sale",    label: "Agriculture & Farming", group: "Seeds, Tools & Dairy" },
  b2b:         { kind: "sale",    label: "B2B & Industrial",      group: "Packaging, Safety & Office" },
  hobby:       { kind: "sale",    label: "Hobby & Collectibles",  group: "Music, Games & Crafts" },
  general:     { kind: "sale",    label: "General Store",         group: "Mixed catalogue" },
};

// Search synonyms — typing "nursing" also matches doctor/clinic/hospital themes.
const SYNONYMS: Record<string, string[]> = {
  doctor: ["clinic", "nursing", "hospital", "physician", "medical", "health", "care"],
  nursing: ["doctor", "clinic", "hospital", "medical", "care", "patient"],
  clinic: ["doctor", "nursing", "hospital", "medical"],
  dentist: ["dental", "doctor", "clinic"],
  salon: ["barber", "stylist", "hairdresser", "beauty", "parlour", "spa"],
  barber: ["salon", "stylist", "hairdresser", "shave"],
  spa: ["wellness", "massage", "salon", "serenity", "luxury"],
  cafe: ["coffee", "restaurant", "bakery", "bistro"],
  restaurant: ["cafe", "dining", "kitchen", "bistro", "menu"],
  bakery: ["cake", "patisserie", "cafe", "dessert"],
  jewellery: ["jewelry", "gold", "diamond", "ornament"],
  boutique: ["fashion", "apparel", "designer"],
};
function expandQuery(q: string): string[] {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  const out = new Set<string>(tokens);
  tokens.forEach((t) => (SYNONYMS[t] ?? []).forEach((s) => out.add(s)));
  return [...out];
}

type Slot = { id: string; slot_date: string; category: string | null; status: string; theme_brief: any };
type Version = { id: string; theme_id: string; version: number; files_manifest: any; created_at: string };
type Metric = { theme_id: string; total_cost_inr: number; image_count: number; reuse_hits: number; shipped_to_pictocart: boolean; pictocart_response: any };
type ResearchJob = { id: string; status: string; query: string | null; total: number; completed: number; found_urls: string[]; results: any[]; error: string | null; started_at: string };
type Settings = { auto_research: boolean; auto_generate: boolean; cadence_days: number; themes_per_batch: number; research_query: string; last_research_at: string | null; last_generation_at: string | null };

export default function ThemeMasterPipeline() {
  const [tab, setTab] = useState("library");
  const [calendar, setCalendar] = useState<Slot[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [metrics, setMetrics] = useState<Record<string, Metric>>({});
  const [settings, setSettings] = useState<Settings | null>(null);
  const [job, setJob] = useState<ResearchJob | null>(null);
  const [jobHistory, setJobHistory] = useState<ResearchJob[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [refineFor, setRefineFor] = useState<string | null>(null);
  const [refineText, setRefineText] = useState("");
  const [adhocName, setAdhocName] = useState("");
  const [adhocVibe, setAdhocVibe] = useState("");
  const [adhocVertical, setAdhocVertical] = useState("general");
  const [adhocSub, setAdhocSub] = useState("general");
  const [briefs, setBriefs] = useState<Array<{ vertical: string; subcategory: string; display_name: string }>>([]);
  const [layouts, setLayouts] = useState<Array<{ slug: string; name: string; description: string }>>([]);
  const [adhocLayout, setAdhocLayout] = useState<string>("auto");
  const [adhocKind, setAdhocKind] = useState<Kind>("sale");
  const [searchQuery, setSearchQuery] = useState("");
  const [libQuery, setLibQuery] = useState("");
  const [libKind, setLibKind] = useState<"all" | Kind>("all");
  const pollRef = useRef<number | null>(null);

  async function loadAll() {
    const [c, v, m, s, jh] = await Promise.all([
      supabase.from("theme_release_calendar").select("*").order("slot_date"),
      supabase.from("theme_master_versions").select("*").order("created_at", { ascending: false }),
      supabase.from("theme_master_metrics").select("theme_id, total_cost_inr, image_count, reuse_hits, shipped_to_pictocart, pictocart_response"),
      supabase.from("theme_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("research_jobs").select("*").order("started_at", { ascending: false }).limit(25),
    ]);
    setCalendar((c.data ?? []) as Slot[]);
    // Keep latest version per theme_id only.
    const seen = new Set<string>();
    const latest = ((v.data ?? []) as Version[]).filter((x) => { if (seen.has(x.theme_id)) return false; seen.add(x.theme_id); return true; });
    setVersions(latest);
    const map: Record<string, Metric> = {};
    (m.data ?? []).forEach((x: any) => { map[x.theme_id] = x; });
    setMetrics(map);
    if (s.data) setSettings(s.data as Settings);
    setJobHistory((jh.data ?? []) as ResearchJob[]);
    if (searchQuery && !s.data?.research_query) setSearchQuery("");
  }
  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("theme_category_briefs").select("vertical,subcategory,display_name").eq("is_active", true).order("sort_order");
      setBriefs((data ?? []) as any);
      const { data: lay } = await supabase.from("theme_layout_archetypes").select("slug,name,description").eq("is_active", true).order("sort_order");
      setLayouts((lay ?? []) as any);
    })();
  }, []);
  useEffect(() => { if (settings && !searchQuery) setSearchQuery(settings.research_query); /* eslint-disable-next-line */ }, [settings]);

  // Poll active research job.
  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") {
      if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (pollRef.current) return;
    pollRef.current = window.setInterval(async () => {
      const { data } = await supabase.from("research_jobs").select("*").eq("id", job.id).maybeSingle();
      if (data) setJob(data as ResearchJob);
    }, 2000);
    return () => { if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; } };
  }, [job]);

  async function startResearch() {
    setBusy("research");
    try {
      const { data, error } = await supabase.functions.invoke("theme-action", {
        body: { action: "auto_research", query: searchQuery || undefined, limit: 8 },
      });
      if (error) throw error;
      const { data: j } = await supabase.from("research_jobs").select("*").eq("id", data.job_id).maybeSingle();
      if (j) setJob(j as ResearchJob);
      toast.success("Research started — crawling theme galleries");
      setTab("research");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function planMonth() {
    setBusy("plan");
    try {
      const { data, error } = await supabase.functions.invoke("theme-action", {
        body: { action: "plan_now", payload: { count: settings?.themes_per_batch ?? 4, cadence_days: settings?.cadence_days ?? 7 } },
      });
      if (error) throw error;
      if (data?.planned > 0) toast.success(`Planned ${data.planned} themes`);
      else toast.info(`No new slots — try a different month or clear existing slots. Skipped: ${(data?.skipped_dates ?? []).join(", ") || "none"}`);
      await loadAll();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function generate(slotId: string) {
    setBusy(slotId);
    try {
      const { data, error } = await supabase.functions.invoke("theme-action", { body: { action: "generate_slot", calendar_id: slotId } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Generation failed");
      toast.success(`Generated · ₹${data?.total_cost_inr ?? "?"}`);
      await loadAll();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function generateAdhoc() {
    if (!adhocName.trim()) { toast.error("Theme name required"); return; }
    setBusy("adhoc");
    try {
      const { data, error } = await supabase.functions.invoke("theme-action", {
        body: { action: "generate_adhoc", brief: { name: adhocName, category: adhocVertical, subcategory: adhocSub, vibe: adhocVibe || `${adhocVertical}/${adhocSub} aesthetic`, layout_slug: adhocLayout === "auto" ? undefined : adhocLayout } },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed");
      toast.success(`Generated "${adhocName}" · ₹${data?.total_cost_inr ?? "?"}`);
      setAdhocName(""); setAdhocVibe("");
      await loadAll();
      setTab("library");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function regenerate(themeId: string) {
    setBusy(themeId);
    try {
      const { data, error } = await supabase.functions.invoke("theme-action", { body: { action: "regenerate_theme", theme_id: themeId } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed");
      toast.success(`Regenerated · ₹${data?.total_cost_inr ?? "?"}`);
      await loadAll();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function refine(themeId: string) {
    if (!refineText.trim()) { toast.error("Describe what to change"); return; }
    setBusy(themeId);
    try {
      const { data, error } = await supabase.functions.invoke("theme-action", { body: { action: "refine_theme", theme_id: themeId, feedback: refineText } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed");
      toast.success(`Refined → v${data.version}`);
      setRefineFor(null); setRefineText("");
      await loadAll();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function ship(_themeId: string) {
    // Themes are auto-published to the in-project marketplace at generation time.
    toast.success("Already published — visible in Master Projects tab.");
  }


  async function skip(slotId: string) {
    setBusy(slotId);
    try { await supabase.functions.invoke("theme-action", { body: { action: "skip_slot", calendar_id: slotId } }); await loadAll(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function saveSettings(patch: Partial<Settings>) {
    setBusy("settings");
    try {
      const { data, error } = await supabase.functions.invoke("theme-action", { body: { action: "update_settings", ...patch } });
      if (error) throw error;
      setSettings(data.settings);
      toast.success("Settings saved");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Themes</h1>
          <p className="text-muted-foreground">Research, plan, generate, refine, and ship themes — one place.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={loadAll}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
          <Button onClick={startResearch} disabled={busy === "research"} variant="secondary">
            {busy === "research" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}Auto-research
          </Button>
          <Button onClick={planMonth} disabled={busy === "plan"}>
            {busy === "plan" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarPlus className="h-4 w-4 mr-2" />}Plan next batch
          </Button>
        </div>
      </header>

      {/* Quick ad-hoc generator — hierarchical professional selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Wand2 className="h-4 w-4" />Generate a theme right now</CardTitle>
          <p className="text-xs text-muted-foreground">Pick what merchants you're designing for. Each level narrows the AI brief.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Row 1 — Name & vibe */}
          <div className="grid md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Theme name</Label>
              <Input placeholder="e.g. Saffron, Caretrust, Mirror" value={adhocName} onChange={(e) => setAdhocName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Vibe / mood (optional)</Label>
              <Input placeholder="e.g. festive Indian ornate · calm clinical trust" value={adhocVibe} onChange={(e) => setAdhocVibe(e.target.value)} />
            </div>
          </div>

          {/* Row 2 — Hierarchical taxonomy */}
          <div className="grid md:grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">1 · Type</Label>
              <Select value={adhocKind} onValueChange={(v) => {
                const k = v as Kind; setAdhocKind(k);
                const firstV = Object.entries(VERTICAL_META).find(([slug, m]) => m.kind === k && briefs.some(b => b.vertical === slug))?.[0];
                if (firstV) {
                  setAdhocVertical(firstV);
                  setAdhocSub(briefs.find(b => b.vertical === firstV)?.subcategory ?? "general");
                }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale"><span className="inline-flex items-center gap-2"><Store className="h-3.5 w-3.5" /> Sale of Products</span></SelectItem>
                  <SelectItem value="service"><span className="inline-flex items-center gap-2"><Briefcase className="h-3.5 w-3.5" /> Service / Appointments</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">2 · Industry</Label>
              <Select value={adhocVertical} onValueChange={(v) => { setAdhocVertical(v); setAdhocSub(briefs.find(b => b.vertical === v)?.subcategory ?? "general"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from(new Set(briefs.map(b => b.vertical)))
                    .filter(v => (VERTICAL_META[v]?.kind ?? "sale") === adhocKind)
                    .map(v => (
                      <SelectItem key={v} value={v}>{VERTICAL_META[v]?.label ?? v}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                3 · {adhocKind === "service" ? "Profession" : "Merchant Type"}
              </Label>
              <Select value={adhocSub} onValueChange={setAdhocSub}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {briefs.filter(b => b.vertical === adhocVertical).map(b => (
                    <SelectItem key={b.subcategory} value={b.subcategory}>{b.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {VERTICAL_META[adhocVertical]?.group && (
                <p className="text-[10px] text-muted-foreground pl-0.5">{VERTICAL_META[adhocVertical].group}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">4 · Layout</Label>
              <Select value={adhocLayout} onValueChange={setAdhocLayout}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-pick (recommended)</SelectItem>
                  {layouts.map(l => <SelectItem key={l.slug} value={l.slug}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3 — Action */}
          <div className="flex justify-end pt-1">
            <Button onClick={generateAdhoc} disabled={busy === "adhoc"} size="lg">
              {busy === "adhoc" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Generate theme
            </Button>
          </div>

          {/* Presets */}
          <details className="pt-2 border-t">
            <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground">Quick-start presets ({9})</summary>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {[
                { name: "Heritage", vibe: "Indian heritage, handcrafted, earthy tones, premium editorial", kind: "sale" as Kind, v: "handicraft", s: "handloom" },
                { name: "Saffron",  vibe: "festive Indian, ornate, warm",                                    kind: "sale" as Kind, v: "gifts",      s: "diwali" },
                { name: "Atelier",  vibe: "minimal luxury, monochrome, generous whitespace",                 kind: "sale" as Kind, v: "jewellery",  s: "designer-couture" },
                { name: "Caretrust", vibe: "calm clinical trust, soft teal + white, prominent Book Appointment CTA", kind: "service" as Kind, v: "services", s: "doctor-clinic", label: "Caretrust (Doctor)" },
                { name: "Pulse24",   vibe: "24x7 multi-speciality nursing home, department grid, emergency line hero", kind: "service" as Kind, v: "services", s: "nursing-home", label: "Pulse 24 (Nursing Home)" },
                { name: "Mirror",    vibe: "editorial unisex salon, mirror reflections, stylist team, package menu", kind: "service" as Kind, v: "services", s: "unisex-salon", label: "Mirror (Salon)" },
                { name: "Fade",      vibe: "moody men's barber, leather + brass, beard sculpt portfolio",     kind: "service" as Kind, v: "services", s: "barber-shop", label: "Fade (Barber)" },
                { name: "Serenity",  vibe: "serene luxury spa, candle glow, couple suites, gift cards",       kind: "service" as Kind, v: "services", s: "spa-wellness", label: "Serenity (Spa)" },
                { name: "Doorstep",  vibe: "home-visit professional, pincode-first hero, travel-fee transparency, slot picker", kind: "service" as Kind, v: "services", s: "home-visit-pro", label: "Doorstep (Home Visit)" },
              ].map(p => (
                <Button key={p.name} size="sm" variant="outline" type="button" onClick={() => {
                  setAdhocName(p.name); setAdhocVibe(p.vibe); setAdhocKind(p.kind); setAdhocVertical(p.v); setAdhocSub(p.s);
                }}>{p.label ?? p.name}</Button>
              ))}
            </div>
          </details>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="library">Library ({versions.length})</TabsTrigger>
          <TabsTrigger value="calendar">Calendar ({calendar.length})</TabsTrigger>
          <TabsTrigger value="research">Research</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* LIBRARY */}
        <TabsContent value="library" className="mt-4 space-y-4">
          {/* Search & filter bar */}
          <Card>
            <CardContent className="py-3 flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={libQuery}
                  onChange={(e) => setLibQuery(e.target.value)}
                  placeholder="Search themes — try 'nursing', 'salon', 'cafe', 'jewellery'…"
                  className="pl-8"
                />
                {libQuery && (
                  <button onClick={() => setLibQuery("")} className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Select value={libKind} onValueChange={(v) => setLibKind(v as any)}>
                <SelectTrigger className="w-[180px]"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All themes</SelectItem>
                  <SelectItem value="sale">Sale of Products</SelectItem>
                  <SelectItem value="service">Service / Appointments</SelectItem>
                </SelectContent>
              </Select>
              {libQuery && (
                <p className="text-[11px] text-muted-foreground basis-full">
                  Synonyms matched: {expandQuery(libQuery).join(", ")}
                </p>
              )}
            </CardContent>
          </Card>

          {(() => {
            const tokens = libQuery.trim() ? expandQuery(libQuery) : [];
            const filtered = versions.filter((t) => {
              const dna = t.files_manifest?.dna ?? {};
              const vert = dna.category ?? dna.vertical ?? "";
              if (libKind !== "all" && (VERTICAL_META[vert]?.kind ?? "sale") !== libKind) return false;
              if (tokens.length === 0) return true;
              const hay = `${dna.name ?? ""} ${dna.vibe ?? ""} ${vert} ${dna.subcategory ?? ""} ${t.theme_id}`.toLowerCase();
              return tokens.some((tok) => hay.includes(tok));
            });
            if (versions.length === 0) {
              return <Card><CardContent className="py-12 text-center text-muted-foreground">No themes generated yet. Use "Generate a theme right now" above or plan a batch.</CardContent></Card>;
            }
            if (filtered.length === 0) {
              return <Card><CardContent className="py-12 text-center text-muted-foreground">No themes match your search. Try a broader keyword.</CardContent></Card>;
            }
            return (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((t) => {
                const m = metrics[t.theme_id];
                const dna = t.files_manifest?.dna ?? {};
                const palette = dna.palette ?? {};
                const isV2 = t.files_manifest?.version === 2;
                return (
                  <Card key={t.id} className="overflow-hidden">
                    <div className="relative bg-muted aspect-[4/3] overflow-hidden">
                      {isV2 ? (
                        <iframe src={`/admin/themes/preview/${t.theme_id}?embed=1`} title={dna.name} className="border-0 origin-top-left pointer-events-none" style={{ width: "1280px", height: "960px", transform: "scale(0.4)" }} loading="lazy" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">{dna.name || t.theme_id}</div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Badge variant="outline">v{t.version}</Badge>
                        <Badge variant={m?.shipped_to_pictocart ? "default" : "outline"}>{m?.shipped_to_pictocart ? "Shipped" : "Local"}</Badge>
                      </div>
                      <Link to={`/admin/themes/preview/${t.theme_id}`} className="absolute inset-0" aria-label="Open preview" />
                    </div>
                    <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center justify-between">
                      <span className="truncate">{dna.name || t.theme_id}</span>
                      <span className="text-xs text-muted-foreground font-normal">₹{Number(m?.total_cost_inr ?? 0).toFixed(2)}</span>
                    </CardTitle></CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {Object.keys(palette).length > 0 && (
                        <div className="flex gap-1.5">
                          {Object.entries(palette).slice(0, 8).map(([k, v]) => (
                            <div key={k} title={`${k}: ${v}`} className="h-7 w-7 rounded border border-border" style={{ background: v as string }} />
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline"><Link to={`/admin/themes/preview/${t.theme_id}`}><ExternalLink className="h-3 w-3 mr-1" />Preview</Link></Button>
                        <Button size="sm" variant="outline" onClick={() => regenerate(t.theme_id)} disabled={busy === t.theme_id}>
                          {busy === t.theme_id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}Regenerate
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setRefineFor(refineFor === t.theme_id ? null : t.theme_id); setRefineText(""); }}>
                          <Wand2 className="h-3 w-3 mr-1" />Refine
                        </Button>
                        <Button size="sm" onClick={() => ship(t.theme_id)} disabled={busy === t.theme_id}>
                          <Send className="h-3 w-3 mr-1" />{m?.shipped_to_pictocart ? "Re-ship" : "Ship"}
                        </Button>
                      </div>
                      {refineFor === t.theme_id && (
                        <div className="space-y-2 pt-2 border-t">
                          <Textarea value={refineText} onChange={(e) => setRefineText(e.target.value)} placeholder="What should change? e.g. 'Make it darker, swap fonts to serif, friendlier copy.'" rows={3} />
                          <Button size="sm" onClick={() => refine(t.theme_id)} disabled={busy === t.theme_id}>
                            {busy === t.theme_id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Apply refinement
                          </Button>
                        </div>
                      )}
                      {m?.pictocart_response && !m.shipped_to_pictocart && (
                        <details className="text-xs"><summary className="cursor-pointer text-destructive">Last ship error</summary>
                          <pre className="mt-1 overflow-auto bg-muted p-2 rounded">{JSON.stringify(m.pictocart_response, null, 2)}</pre>
                        </details>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            );
          })()}
        </TabsContent>

        {/* CALENDAR */}
        <TabsContent value="calendar" className="mt-4 space-y-2">
          {calendar.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No themes scheduled. Click "Plan next batch".</CardContent></Card>
          ) : (
            calendar.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex items-center justify-between py-3 gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{c.theme_brief?.name ?? "Untitled"}</div>
                    <div className="text-xs text-muted-foreground">{c.slot_date}{c.category ? ` · ${c.category}` : ""}{c.theme_brief?.vibe ? ` · ${c.theme_brief.vibe}` : ""}</div>
                  </div>
                  <Badge variant={c.status === "shipped" ? "default" : c.status === "skipped" ? "outline" : "secondary"}>{c.status}</Badge>
                  {(c.status === "planned" || c.status === "generated") && (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => generate(c.id)} disabled={busy === c.id}>
                        {busy === c.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}{c.status === "generated" ? "Re-run" : "Generate"}
                      </Button>
                      {c.status === "planned" && (
                        <Button size="sm" variant="ghost" onClick={() => skip(c.id)} disabled={busy === c.id}><SkipForward className="h-3 w-3" /></Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* RESEARCH */}
        <TabsContent value="research" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Discover & crawl theme galleries</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Input placeholder="Search query (optional). Leave empty to use curated picks." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 min-w-64" />
                <Button onClick={startResearch} disabled={busy === "research"}>
                  {busy === "research" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}Start research
                </Button>
              </div>
              {job && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Job · {job.status}</span>
                    <span className="text-muted-foreground">{job.completed} / {job.total || "?"}</span>
                  </div>
                  <Progress value={job.total ? (job.completed / job.total) * 100 : 5} />
                  {job.error && <div className="text-xs text-destructive">{job.error}</div>}
                  <details className="text-xs"><summary className="cursor-pointer text-muted-foreground">URLs ({job.found_urls?.length ?? 0})</summary>
                    <ul className="mt-1 space-y-1">{(job.found_urls ?? []).map((u) => {
                      const r = (job.results ?? []).find((x: any) => x.url === u);
                      return <li key={u} className="flex justify-between gap-2"><a href={u} target="_blank" rel="noreferrer" className="truncate hover:underline">{u}</a><span className={r?.status === "error" ? "text-destructive" : "text-muted-foreground"}>{r?.status ?? "queued"}</span></li>;
                    })}</ul>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Research history</CardTitle></CardHeader>
            <CardContent>
              {jobHistory.length === 0 ? (
                <div className="text-sm text-muted-foreground">No previous research runs.</div>
              ) : (
                <ul className="divide-y">
                  {jobHistory.map((j) => (
                    <li key={j.id} className="py-3 flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{j.query || <span className="text-muted-foreground italic">curated picks</span>}</div>
                        <div className="text-xs text-muted-foreground">{new Date(j.started_at).toLocaleString()} · {j.completed}/{j.total || 0} URLs</div>
                        {j.error && <div className="text-xs text-destructive mt-1">{j.error}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={j.status === "completed" ? "default" : j.status === "failed" ? "destructive" : "secondary"}>{j.status}</Badge>
                        <Button size="sm" variant="ghost" onClick={() => setJob(j)}>View</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETTINGS */}
        <TabsContent value="settings" className="mt-4">
          {!settings ? <Card><CardContent className="py-8 text-center text-muted-foreground">Loading…</CardContent></Card> : (
            <Card>
              <CardHeader><CardTitle className="text-base">Schedule & automation</CardTitle></CardHeader>
              <CardContent className="space-y-4 max-w-xl">
                <div className="flex items-center justify-between">
                  <div><Label>Auto-research</Label><p className="text-xs text-muted-foreground">Crawl new theme galleries on schedule</p></div>
                  <Switch checked={settings.auto_research} onCheckedChange={(v) => setSettings({ ...settings, auto_research: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <div><Label>Auto-generate</Label><p className="text-xs text-muted-foreground">Generate planned themes automatically</p></div>
                  <Switch checked={settings.auto_generate} onCheckedChange={(v) => setSettings({ ...settings, auto_generate: v })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cadence (days between themes)</Label>
                    <Input type="number" min={1} max={30} value={settings.cadence_days} onChange={(e) => setSettings({ ...settings, cadence_days: Number(e.target.value) })} />
                    <p className="text-xs text-muted-foreground mt-1">1 = daily · 7 = weekly · 30 = monthly</p>
                  </div>
                  <div>
                    <Label>Themes per batch</Label>
                    <Input type="number" min={1} max={12} value={settings.themes_per_batch} onChange={(e) => setSettings({ ...settings, themes_per_batch: Number(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <Label>Default research query</Label>
                  <Input value={settings.research_query} onChange={(e) => setSettings({ ...settings, research_query: e.target.value })} />
                </div>
                <div className="text-xs text-muted-foreground">
                  Last research: {settings.last_research_at ? new Date(settings.last_research_at).toLocaleString() : "never"} ·
                  Last generation: {settings.last_generation_at ? new Date(settings.last_generation_at).toLocaleString() : "never"}
                </div>
                <Button onClick={() => saveSettings(settings)} disabled={busy === "settings"}>
                  {busy === "settings" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save settings
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}