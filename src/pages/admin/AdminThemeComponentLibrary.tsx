import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import MasterThemeRenderer from "@/components/theme/MasterThemeRenderer";
import { DEFAULT_HEADER } from "@/components/store-design/HeaderEditor";
import { useThemeManifest } from "@/hooks/useThemeManifest";

const HEADER_VARIANTS = [
  { value: "classic", label: "Classic", desc: "Logo left, nav center, actions right (default)" },
  { value: "centered_logo", label: "Centered Logo", desc: "Logo centered, nav below" },
  { value: "minimal_thin", label: "Minimal Thin", desc: "Ultra-slim 48px header" },
  { value: "glassmorphic_sticky", label: "Glassmorphic Sticky", desc: "Floating glass pill with blur" },
  { value: "split_menu", label: "Split Menu", desc: "Logo center, nav split left/right" },
  { value: "left_align_all", label: "Left Align All", desc: "Everything left-aligned" },
  { value: "double_deck", label: "Double Deck", desc: "Two rows: brand+search / nav" },
  { value: "dark_mode_inverted", label: "Dark Inverted", desc: "Dark theme variant" },
  { value: "minimal_icons_only", label: "Minimal Icons Only", desc: "Hamburger drawer menu" },
  { value: "bordered_links", label: "Bordered Links", desc: "Vertical separators between nav links" },
  { value: "sidebar_drawer", label: "Sidebar Drawer (Right)", desc: "Right slide-out drawer" },
  { value: "sidebar_split_double", label: "Sidebar Split Double", desc: "Wide split sidebar" },
  { value: "sidebar_full_overlay", label: "Sidebar Full Overlay", desc: "Full-screen overlay menu" },
  { value: "sidebar_accent_panel", label: "Sidebar Accent Panel", desc: "Primary-colored sidebar" },
  { value: "floating_pill", label: "Floating Pill", desc: "Rounded floating header" },
  { value: "sidebar_glass_left", label: "Sidebar Glass Left", desc: "Left glassmorphism drawer" },
  { value: "sidebar_minimal_dark", label: "Sidebar Minimal Dark", desc: "Dark minimal sidebar" },
];

const FOOTER_VARIANTS = [
  { value: "classic", label: "Classic 4-Column", desc: "Standard 4-column grid layout" },
  { value: "minimal_center", label: "Minimal Centered", desc: "Centered brand + links" },
  { value: "newsletter_integrated", label: "Newsletter Integrated", desc: "Email signup + columns" },
  { value: "dark_editorial", label: "Dark Editorial", desc: "Dark theme, serif typography" },
  { value: "badge_social", label: "Badge Social", desc: "Circular badge + social focus" },
  { value: "two_column_split", label: "Two Column Split", desc: "Brand left, links right" },
  { value: "minimalist_strip", label: "Minimalist Strip", desc: "Ultra-minimal single line" },
  { value: "accent_banner", label: "Accent Banner", desc: "Primary color background" },
  { value: "masonry_categories", label: "Masonry Categories", desc: "Dashed card grid" },
  { value: "three_row_editorial", label: "Three Row Editorial", desc: "Brand / links / copyright rows" },
  { value: "floating_pills", label: "Floating Pills", desc: "Pill-style link buttons" },
  { value: "bordered_cards", label: "Bordered Cards", desc: "Vertical card dividers" },
  { value: "big_tagline", label: "Big Tagline", desc: "Large brand + tagline focus" },
  { value: "modern_tabs", label: "Modern Tabs", desc: "Tab-style navigation pills" },
  { value: "vintage_dashed", label: "Vintage Dashed", desc: "Dashed borders, serif fonts" },
  { value: "clean_columns_social_top", label: "Clean Columns Social Top", desc: "Social bar above columns" },
  { value: "asymmetric_left", label: "Asymmetric Left", desc: "Wide brand area + columns" },
];

// Mock manifest for preview (minimal)
const MOCK_MANIFEST = {
  dna: {
    palette: {
      bg: "#ffffff",
      fg: "#111111",
      primary: "#10b981",
      primary_fg: "#ffffff",
      accent: "#f59e0b",
      surface: "#f9fafb",
      muted: "#6b7280",
      border: "#e5e7eb",
    },
    fonts: { heading: "Inter", body: "Inter" },
    radius: "8px",
  },
  header_style: "classic",
  header_settings: {
    nav_links: [
      { label: "Shop", page: "shop" },
      { label: "Collections", page: "collections" },
      { label: "About", page: "about" },
      { label: "Journal", page: "blog" },
      { label: "Contact", page: "contact" },
    ],
    show_announcement: true,
    announcement_text: "✨ Free shipping on orders over ₹999!",
    show_language_switcher: true,
    show_currency_switcher: true,
    show_wishlist: true,
  },
  footer: {
    tagline: "Crafted with care, delivered with love.",
    columns: [
      { title: "Shop", links: [{ label: "All Products", page: "shop" }, { label: "New Arrivals", page: "shop" }, { label: "Best Sellers", page: "shop" }, { label: "Gift Cards", page: "shop" }] },
      { title: "Company", links: [{ label: "About Us", page: "about" }, { label: "Careers", page: "about" }, { label: "Press", page: "about" }, { label: "Blog", page: "blog" }] },
      { title: "Support", links: [{ label: "Contact", page: "contact" }, { label: "FAQs", page: "contact" }, { label: "Shipping", page: "shipping" }, { label: "Returns", page: "return" }] },
      { title: "Legal", links: [{ label: "Privacy", page: "privacy" }, { label: "Terms", page: "terms" }, { label: "Refund Policy", page: "refund" }] },
    ],
    social: { instagram: "https://instagram.com", twitter: "https://twitter.com" },
  },
  footer_style: "classic",
  pages: {
    home: { sections: [] },
  },
};

function HeaderPreview({ variant, overrides }: { variant: string; overrides?: any }) {
  const [key, setKey] = useState(0);

  return (
    <div style={{ minHeight: 120 }}>
      <MasterThemeRenderer
        key={key}
        manifest={MOCK_MANIFEST}
        page="home"
        overrides={{
          header: {
            ...DEFAULT_HEADER,
            ...overrides,
          },
        }}
        storeSlug="demo-store"
      />
    </div>
  );
}

function FooterPreview({ variant, overrides }: { variant: string; overrides?: any }) {
  const [key, setKey] = useState(0);

  return (
    <div style={{ minHeight: 200 }}>
      <MasterThemeRenderer
        key={key}
        manifest={MOCK_MANIFEST}
        page="home"
        overrides={{
          footer: {
            style: variant,
            ...overrides,
          },
        }}
        storeSlug="demo-store"
      />
    </div>
  );
}

function VariantCard({ variant, label, desc, preview, isHeader }: { variant: string; label: string; desc: string; preview: React.ReactNode; isHeader: boolean }) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {label}
              <Badge variant="secondary" className="text-[10px]">{variant}</Badge>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">{desc}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="border rounded-lg overflow-hidden bg-background flex-1 relative">
          {preview}
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{isHeader ? "Header" : "Footer"} Variant</span>
          <Button variant="ghost" size="sm" className="px-2 py-1 text-[10px]">
            Copy Variant ID
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminThemeComponentLibrary() {
  const [selectedHeader, setSelectedHeader] = useState("classic");
  const [selectedFooter, setSelectedFooter] = useState("classic");
  const [headerOverrides, setHeaderOverrides] = useState({
    show_announcement: true,
    announcement_text: "✨ Free shipping on orders over ₹999! ✨",
    show_language_switcher: true,
    show_currency_switcher: true,
    show_wishlist: true,
  });
  const [footerOverrides, setFooterOverrides] = useState({
    tagline: "Crafted with care, delivered with love.",
  });
  const [viewMode, setViewMode] = useState<"grid" | "single">("grid");
  const [searchHeader, setSearchHeader] = useState("");
  const [searchFooter, setSearchFooter] = useState("");

  const filteredHeaders = useMemo(() =>
    HEADER_VARIANTS.filter(v =>
      v.label.toLowerCase().includes(searchHeader.toLowerCase()) ||
      v.value.toLowerCase().includes(searchHeader.toLowerCase()) ||
      v.desc.toLowerCase().includes(searchHeader.toLowerCase())
    ), [searchHeader]);

  const filteredFooters = useMemo(() =>
    FOOTER_VARIANTS.filter(v =>
      v.label.toLowerCase().includes(searchFooter.toLowerCase()) ||
      v.value.toLowerCase().includes(searchFooter.toLowerCase()) ||
      v.desc.toLowerCase().includes(searchFooter.toLowerCase())
    ), [searchFooter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Theme Component Library</h1>
          <p className="text-sm text-muted-foreground">
            Browse and preview all Header & Footer variants available in the Master Theme System
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Grid View</SelectItem>
              <SelectItem value="single">Single Preview</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="headers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="headers">Headers ({HEADER_VARIANTS.length})</TabsTrigger>
          <TabsTrigger value="footers">Footers ({FOOTER_VARIANTS.length})</TabsTrigger>
        </TabsList>

        {/* HEADERS TAB */}
        <TabsContent value="headers" className="space-y-6">
          {/* Controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex-1 max-w-md">
                  <label className="sr-only">Search headers</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search headers..."
                      value={searchHeader}
                      onChange={(e) => setSearchHeader(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={headerOverrides.show_announcement ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHeaderOverrides({ ...headerOverrides, show_announcement: !headerOverrides.show_announcement })}
                  >
                    Announcement Bar
                  </Button>
                  <Button
                    variant={headerOverrides.show_language_switcher ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHeaderOverrides({ ...headerOverrides, show_language_switcher: !headerOverrides.show_language_switcher })}
                  >
                    Language
                  </Button>
                  <Button
                    variant={headerOverrides.show_currency_switcher ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHeaderOverrides({ ...headerOverrides, show_currency_switcher: !headerOverrides.show_currency_switcher })}
                  >
                    Currency
                  </Button>
                  <Button
                    variant={headerOverrides.show_wishlist ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHeaderOverrides({ ...headerOverrides, show_wishlist: !headerOverrides.show_wishlist })}
                  >
                    Wishlist
                  </Button>
                </div>
              </div>

              {/* Announcement text input */}
              {headerOverrides.show_announcement && (
                <div className="mt-4">
                  <input
                    type="text"
                    placeholder="Announcement text"
                    value={headerOverrides.announcement_text}
                    onChange={(e) => setHeaderOverrides({ ...headerOverrides, announcement_text: e.target.value })}
                    className="w-full max-w-xl px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          {viewMode === "single" ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Live Preview: {HEADER_VARIANTS.find(v => v.value === selectedHeader)?.label}
                  <Select value={selectedHeader} onValueChange={setSelectedHeader} className="w-[250px]">
                    <SelectContent>
                      {HEADER_VARIANTS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HeaderPreview variant={selectedHeader} overrides={headerOverrides} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredHeaders.map((variant) => (
                <VariantCard
                  key={variant.value}
                  variant={variant.value}
                  label={variant.label}
                  desc={variant.desc}
                  preview={<HeaderPreview variant={variant.value} overrides={headerOverrides} />}
                  isHeader
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* FOOTERS TAB */}
        <TabsContent value="footers" className="space-y-6">
          {/* Controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex-1 max-w-md">
                  <label className="sr-only">Search footers</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search footers..."
                      value={searchFooter}
                      onChange={(e) => setSearchFooter(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    placeholder="Tagline"
                    value={footerOverrides.tagline}
                    onChange={(e) => setFooterOverrides({ ...footerOverrides, tagline: e.target.value })}
                    className="w-[200px] px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {viewMode === "single" ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Live Preview: {FOOTER_VARIANTS.find(v => v.value === selectedFooter)?.label}
                  <Select value={selectedFooter} onValueChange={setSelectedFooter} className="w-[250px]">
                    <SelectContent>
                      {FOOTER_VARIANTS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FooterPreview variant={selectedFooter} overrides={footerOverrides} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFooters.map((variant) => (
                <VariantCard
                  key={variant.value}
                  variant={variant.value}
                  label={variant.label}
                  desc={variant.desc}
                  preview={<FooterPreview variant={variant.value} overrides={footerOverrides} />}
                  isHeader={false}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Reference</CardTitle>
          <CardDescription>
            Variant IDs to use in theme manifest or overrides
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 text-sm">Header Variants</h4>
              <div className="flex flex-wrap gap-2">
                {HEADER_VARIANTS.map(v => (
                  <Badge key={v.value} variant="outline" className="text-[10px] hover:bg-accent cursor-default">{v.value}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3 text-sm">Footer Variants</h4>
              <div className="flex flex-wrap gap-2">
                {FOOTER_VARIANTS.map(v => (
                  <Badge key={v.value} variant="outline" className="text-[10px] hover:bg-accent cursor-default">{v.value}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}