import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Truck, Shield, RefreshCw, Headphones, Lock, Tag, Gift, Sparkles, Star, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Manifest-driven theme renderer. Single source of truth for both the
 * /admin/themes/preview page and the live /store/:slug page.
 *
 * Section content comes from `manifest.pages[page].sections[].props`.
 * Per-section edits made in Customise are stored in
 * `store.settings.theme_overrides.sections[index]` and shallow-merged on top.
 *
 * Override conventions:
 *   - { image: "https://..." } replaces the image
 *   - { image: "" } explicitly clears the image (user deleted it)
 *   - any other prop key overrides the manifest prop of the same name
 */

const ICONS: Record<string, any> = {
  truck: Truck, shield: Shield, refresh: RefreshCw, headphones: Headphones,
  lock: Lock, tag: Tag, gift: Gift, sparkles: Sparkles,
};

type Manifest = any;
type HeaderOv = {
  logo_url?: string;
  show_name?: boolean;
  brand_name?: string;
  nav_links?: Array<{ label: string; page: string }>;
};
type FooterOv = {
  tagline?: string;
  show_powered_by?: boolean;
  social?: { instagram?: string; facebook?: string; twitter?: string; youtube?: string };
  columns?: Array<{ title: string; links: Array<{ label: string; href: string; page?: string }> }>;
};
type Overrides = {
  sections?: Record<string | number, any>;
  brand_name?: string;
  header?: HeaderOv;
  footer?: FooterOv;
  pages?: Record<string, { sections?: Record<string | number, any> }>;
} | undefined;

function loadFont(family: string) {
  if (!family) return;
  const id = `font-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
}

interface Props {
  manifest: Manifest;
  page?: string;
  overrides?: Overrides;
  storeSlug?: string;
  /** When set (preview mode), in-theme menu clicks call this instead of routing. */
  onNavigate?: (page: string) => void;
  /** Real catalog products to splice into product_grid sections. */
  products?: Array<{ id: string; title: string; price: number; compare_at_price?: number | null; images?: string[] | null; category?: string | null }>;
  /** Seller-defined categories (with optional image / description / subs) to splice into category_grid and collections_grid sections. */
  sellerCategories?: Array<{ id?: string; name: string; image_url?: string | null; description?: string | null; subs?: Array<{ id?: string; name: string; image_url?: string | null }> }>;
}

export default function MasterThemeRenderer({ manifest, page = "home", overrides, storeSlug, onNavigate, products, sellerCategories }: Props) {
  const baseDna = manifest?.dna ?? {};
  // Merge global palette overrides into dna so every Section/Header/Footer picks them up.
  const palette = { ...(baseDna.palette ?? {}), ...((overrides as any)?.palette ?? {}) };
  const dna = { ...baseDna, palette };
  const fonts = dna.fonts ?? {};
  const radius = dna.radius ?? "8px";
  const headerStyle = manifest?.header_style ?? dna.layout?.header_style ?? "classic";
  const brandName = overrides?.brand_name || dna.name;
  const headerOv = {
    logo_url: (overrides as any)?.logo_url || "",
    brand_name: (overrides as any)?.brand_name || "",
    ...((overrides as any)?.header || {}),
  };

  useMemo(() => { loadFont(fonts.heading); loadFont(fonts.body); }, [fonts.heading, fonts.body]);

  const style: React.CSSProperties = {
    background: palette.bg,
    color: palette.fg,
    fontFamily: `${fonts.body}, system-ui, sans-serif`,
    ["--p" as any]: palette.primary,
    ["--pf" as any]: palette.primary_fg,
    ["--ac" as any]: palette.accent,
    ["--bg" as any]: palette.bg,
    ["--sf" as any]: palette.surface,
    ["--fg" as any]: palette.fg,
    ["--mu" as any]: palette.muted,
    ["--bd" as any]: palette.border,
    ["--r" as any]: radius,
    ["--hf" as any]: `${fonts.heading}, serif`,
  };

  // (built-in collections synthesized below as renderedSections)
  // New shape: overrides.pages[page].sections[idx]. Legacy: overrides.sections[idx] (home-only).
  const sectionOverrides: Record<string, any> =
    (overrides as any)?.pages?.[page]?.sections ??
    (page === "home" ? (overrides as any)?.sections ?? {} : {});

  // Inject real products into the first product/trending section if products were supplied.
  // On the shop page we pass ALL products (no slice) so category filtering works on the full catalog.
  const productItemsForOverride = products && products.length > 0
    ? (page === "shop" ? products : products.slice(0, 8)).map((p: any) => ({
        id: p.id, name: p.title, price: p.price, compare_at: p.compare_at_price,
        image: p.images?.[0], category: p.category,
      }))
    : null;
  let productSectionInjected = false;

  // Seller-defined categories override the theme's stock category tiles when present.
  const sellerCategoryItems = sellerCategories && sellerCategories.length > 0
    ? sellerCategories.map((c) => ({ id: c.id, name: c.name, image: c.image_url || undefined, description: c.description || undefined, subs: c.subs || [] }))
    : null;

  // Synthesize a built-in Collections page if the manifest doesn't define one.
  const collectionsItems = sellerCategoryItems ?? [];
  const renderedSections: any[] = page === "collections" && (!manifest?.pages?.collections?.sections?.length)
    ? [{ type: "page_title", props: { title: "Collections" } }, { type: "collections_grid", props: { items: collectionsItems } }]
    : page === "collection_detail" && (!manifest?.pages?.collection_detail?.sections?.length)
      ? [{ type: "collection_detail", props: { items: collectionsItems } }]
      : (manifest?.pages?.[page]?.sections ?? []);

  return (
    <div style={style} className="min-h-screen">
      <div data-section-anchor="header" style={{ scrollMarginTop: 80 }}>
        <Header dna={dna} brandName={brandName} variant={headerStyle} storeSlug={storeSlug} onNavigate={onNavigate} headerOv={headerOv} />
      </div>
      {renderedSections.map((s: any, i: number) => {
        // Merge overrides on top of manifest props.
        const ov = sectionOverrides[i] ?? sectionOverrides[String(i)] ?? {};
        const mergedProps = { ...(s.props ?? {}), ...ov };
        // First product/trending section gets real products if available.
        if (productItemsForOverride && !productSectionInjected && (s.type === "product_grid" || s.type === "trending")) {
          mergedProps.items = productItemsForOverride;
          productSectionInjected = true;
        }
        // Pass seller catalog categories into product sections so shop-page chips use them.
        if (sellerCategoryItems && (s.type === "product_grid" || s.type === "trending")) {
          mergedProps.sellerCategories = sellerCategoryItems;
        }
        // category_grid: replace items with seller's real categories if they've defined any.
        if (sellerCategoryItems && s.type === "category_grid") {
          mergedProps.items = sellerCategoryItems;
        }
        const anchorMap: Record<string, string> = {
          product_grid: "products", trending: "products",
          category_grid: "categories",
          story: "about",
          newsletter: "contact",
        };
        const anchorId = anchorMap[s.type];
        // Per-section color override: ov.colors = { primary, accent, bg, surface, fg, muted, border, primary_fg }
        const secColors = (mergedProps.colors ?? ov.colors) as Record<string, string> | undefined;
        const sectionDna = secColors ? { ...dna, palette: { ...dna.palette, ...secColors } } : dna;
        const sectionStyle: React.CSSProperties = secColors
          ? {
              ["--p" as any]: sectionDna.palette.primary,
              ["--pf" as any]: sectionDna.palette.primary_fg,
              ["--ac" as any]: sectionDna.palette.accent,
              ["--bg" as any]: sectionDna.palette.bg,
              ["--sf" as any]: sectionDna.palette.surface,
              ["--fg" as any]: sectionDna.palette.fg,
              ["--mu" as any]: sectionDna.palette.muted,
              ["--bd" as any]: sectionDna.palette.border,
              color: sectionDna.palette.fg,
            }
          : {};
        return (
          <div
            key={i}
            id={anchorId}
            data-section-index={i}
            data-section-anchor={`s-${i}`}
            style={{ scrollMarginTop: 80, ...sectionStyle }}
          >
            <Section s={{ ...s, props: mergedProps }} dna={sectionDna} storeSlug={storeSlug} page={page} />
          </div>
        );
      })}
      <div data-section-anchor="footer" style={{ scrollMarginTop: 80 }}>
        <Footer footer={manifest?.footer} dna={dna} brandName={brandName} storeSlug={storeSlug} onNavigate={onNavigate} footerOv={overrides?.footer} hasPolicies={!!(overrides as any)?.has_policies} />
      </div>
    </div>
  );
}

function Header({ dna, brandName, variant = "classic", storeSlug, onNavigate, headerOv }: any) {
  const base = storeSlug ? `/store/${storeSlug}` : "";
  const ov: HeaderOv = headerOv || {};
  const effectiveBrand = ov.brand_name || brandName;
  const showName = ov.show_name !== false; // default true
  const logoUrl = ov.logo_url || "";
  const defaultLinks: Array<{ label: string; page: string }> = [
    { label: "Shop", page: "shop" },
    { label: "Collections", page: "collections" },
    { label: "About", page: "about" },
    { label: "Journal", page: "journal" },
    { label: "Contact", page: "contact" },
  ];
  const pageToPath: Record<string, string> = {
    home: "", shop: "/shop", collections: "/collections", about: "/about", contact: "/contact",
    journal: "/blog", blog: "/blog", account: "/account", cart: "/cart",
  };
  const links = (ov.nav_links && ov.nav_links.length > 0 ? ov.nav_links : defaultLinks)
    .map((l) => ({ label: l.label, page: l.page, to: `${base}${pageToPath[l.page] ?? `/${l.page}`}` }));

  const { totalItems } = useCart(storeSlug || "");
  const { user } = useCustomerAuth(storeSlug || "");
  const customerName = user?.user_metadata?.full_name || user?.user_metadata?.customer_email?.split("@")[0] || "Account";
  const wrap = "sticky top-0 z-10 border-b backdrop-blur";
  const bg = { background: `${dna.palette?.bg}ee`, borderColor: dna.palette?.border };
  const brandSize = variant === "bold_serif" ? 32 : variant === "minimal_thin" ? 16 : 22;
  const brandStyle: React.CSSProperties = { fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700, fontSize: brandSize, color: dna.palette?.fg, cursor: (storeSlug || onNavigate) ? "pointer" : "default" };
  const logoSize = Math.max(20, Math.min(160, Number((ov as any).logo_size) || (brandSize + 8)));
  const logoFit: "contain" | "cover" | "fill" = ((ov as any).logo_fit as any) || "contain";
  const fitToHeader = !!(ov as any).logo_fit_header;
  const headerH = variant === "minimal_thin" ? 48 : 64;
  const logoStyle: React.CSSProperties = fitToHeader
    ? { height: headerH, maxHeight: headerH, width: "auto", objectFit: logoFit }
    : { height: logoSize, width: logoFit === "fill" ? logoSize : "auto", maxHeight: 160, objectFit: logoFit };
  const BrandInner = (
    <span className="inline-flex items-center gap-2">
      {logoUrl && <img src={logoUrl} alt={effectiveBrand} style={logoStyle} />}
      {showName && <span style={brandStyle}>{effectiveBrand}</span>}
      {!showName && !logoUrl && <span style={brandStyle}>{effectiveBrand}</span>}
    </span>
  );
  const Brand = storeSlug
    ? <Link to={`/store/${storeSlug}`}>{BrandInner}</Link>
    : onNavigate
      ? <button onClick={() => onNavigate("home")} style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}>{BrandInner}</button>
      : <div>{BrandInner}</div>;
  const CartBtn = storeSlug ? (
    <Link to={`/store/${storeSlug}/cart`} className="text-sm px-4 py-2 inline-flex items-center gap-2" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>
      <ShoppingBag className="h-4 w-4" /> Cart · {totalItems}
    </Link>
  ) : (
    <button
      onClick={() => onNavigate?.("cart")}
      className="text-sm px-4 py-2 inline-flex items-center gap-2"
      style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}
    >
      <ShoppingBag className="h-4 w-4" /> Cart · 0
    </button>
  );
  const AccountBtn = storeSlug ? (
    <Link to={user ? `/store/${storeSlug}/account` : `/store/${storeSlug}/account/auth`} className="hidden md:inline-flex text-sm px-4 py-2 items-center gap-2 border" style={{ borderColor: "var(--p)", color: "var(--p)", borderRadius: "var(--r)" }}>
      <User className="h-4 w-4" /> <span className="max-w-28 truncate">{user ? customerName : "Sign in"}</span>
    </Link>
  ) : null;
  const renderLink = (l: { label: string; to: string; page: string }, cls: string) =>
    storeSlug
      ? <Link key={l.label} to={l.to} className={cls} style={{ opacity: 0.85 }}>{l.label}</Link>
      : onNavigate
        ? <button key={l.label} onClick={() => onNavigate(l.page)} className={cls} style={{ opacity: 0.85, background: "transparent", border: 0, cursor: "pointer", color: "inherit" }}>{l.label}</button>
        : <span key={l.label} className={cls} style={{ opacity: 0.85 }}>{l.label}</span>;


  if (variant === "centered_logo") {
    return (
      <header className={wrap} style={bg}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col items-center gap-2">
          {Brand}
          <nav className="flex flex-wrap items-center justify-center gap-4 text-xs uppercase tracking-widest" style={{ color: dna.palette?.muted }}>
            {links.map(l => renderLink(l, "hover:opacity-100 transition"))}
            {AccountBtn}
            {CartBtn}
          </nav>
        </div>
      </header>
    );
  }
  return (
    <header className={wrap} style={bg}>
      <div className={`max-w-6xl mx-auto px-6 ${variant === "minimal_thin" ? "h-12" : "h-16"} flex items-center justify-between`}>
        {Brand}
        <nav className="hidden md:flex gap-6 text-sm" style={{ color: dna.palette?.muted }}>
          {links.map(l => renderLink(l, "hover:opacity-100 transition"))}
        </nav>
        <div className="flex items-center gap-3">
          {AccountBtn}
          {CartBtn}
        </div>
      </div>
    </header>
  );
}

function Section({ s, dna, storeSlug, page }: any) {
  const p = s.props ?? {};
  // If image was explicitly cleared via override (image === ""), do not render image.
  switch (s.type) {
    case "hero": return <Hero p={p} dna={dna} storeSlug={storeSlug} />;
    case "usp_strip": return (
      <section className="border-y" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {(p.items ?? []).map((u: any, i: number) => { const Ico = ICONS[u.icon] ?? Sparkles; return (
            <div key={i} className="flex items-start gap-3">
              <Ico className="h-5 w-5 mt-0.5" style={{ color: dna.palette?.accent }} />
              <div>
                <div className="text-sm font-medium">{u.title}</div>
                <div className="text-xs" style={{ color: dna.palette?.muted }}>{u.sub}</div>
              </div>
            </div>
          ); })}
        </div>
      </section>
    );
    case "category_grid": return <CategoryBlock p={p} dna={dna} storeSlug={storeSlug} />;
    case "collections_grid": return <CollectionsBlock p={p} dna={dna} storeSlug={storeSlug} />;
    case "collection_detail": return <CollectionDetailBlock p={p} dna={dna} storeSlug={storeSlug} />;
    case "trending":
    case "product_grid": return <ProductBlock p={p} dna={dna} storeSlug={storeSlug} page={page} />;

    case "story": return (
      <section className="py-20" style={{ background: dna.palette?.surface }}>
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl mb-6" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h2>
            <p className="leading-relaxed" style={{ color: dna.palette?.muted }}>{p.body}</p>
          </div>
          {p.image && <img src={p.image} className="aspect-[4/5] object-cover" style={{ borderRadius: "var(--r)" }} />}
        </div>
      </section>
    );
    case "testimonials": return <TestimonialsBlock p={p} dna={dna} storeSlug={storeSlug} />;
    case "google_reviews": return <GoogleReviewsBlock p={p} dna={dna} storeSlug={storeSlug} />
    case "newsletter": return (
      <section className="py-20 text-center" style={{ background: dna.palette?.primary, color: dna.palette?.primary_fg }}>
        <div className="max-w-xl mx-auto px-6">
          <h2 className="text-3xl mb-3" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h2>
          <p className="mb-6 opacity-80">{p.sub}</p>
          <form className="flex gap-2 max-w-md mx-auto">
            <input placeholder="you@example.com" className="flex-1 px-4 py-3 text-sm" style={{ background: dna.palette?.bg, color: dna.palette?.fg, borderRadius: "var(--r)" }} />
            <button className="px-5 py-3 text-sm font-medium" style={{ background: dna.palette?.accent, color: dna.palette?.bg, borderRadius: "var(--r)" }}>{p.cta}</button>
          </form>
        </div>
      </section>
    );
    case "page_title": return (
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-8">
        <h1 className="text-5xl" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h1>
      </section>
    );
    case "values": return (
      <section className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-6">
        {(p.items ?? []).map((v: string, i: number) => (
          <div key={i} className="p-6" style={{ background: dna.palette?.surface, borderRadius: "var(--r)" }}>
            <Sparkles className="h-5 w-5 mb-2" style={{ color: dna.palette?.accent }} />
            <div className="text-sm">{v}</div>
          </div>
        ))}
      </section>
    );
    case "signup":
    case "signin":
    case "forgot_password":
    case "reset_password": return <AuthForm p={p} dna={dna} variant={s.type} storeSlug={storeSlug} />;
    case "line_items":     return <LineItems dna={dna} storeSlug={storeSlug} />;
    case "cart_summary":   return <CartSummary p={p} dna={dna} storeSlug={storeSlug} />;
    case "checkout_stepper": return <CheckoutStepper p={p} dna={dna} />;
    case "journal_strip":  return <JournalStrip p={p} dna={dna} storeSlug={storeSlug} />;
    case "journal_list":   return <JournalList p={p} dna={dna} storeSlug={storeSlug} />;
    case "account_panel":  return <AccountPanel p={p} dna={dna} storeSlug={storeSlug} />;
    case "contact_form":   return <ContactForm p={p} dna={dna} />;
    case "product_detail": return <ProductDetailStub p={p} dna={dna} />;
    // --- Service industry (doctor / salon / clinic) sections -------------
    case "provider_team":      return <ProviderTeamBlock p={p} dna={dna} storeSlug={storeSlug} />;
    case "service_menu":       return <ServiceMenuBlock p={p} dna={dna} storeSlug={storeSlug} />;
    case "booking_widget":     return <BookingWidgetBlock p={p} dna={dna} storeSlug={storeSlug} />;
    case "clinic_hours":       return <ClinicHoursBlock p={p} dna={dna} />;
    case "service_packages":   return <ServicePackagesBlock p={p} dna={dna} storeSlug={storeSlug} />;
    case "faqs":               return <FaqsBlock p={p} dna={dna} />;
    case "service_detail":     return <ServiceDetailBlock p={p} dna={dna} storeSlug={storeSlug} />;
    case "appointments_panel": return <AppointmentsPanelBlock p={p} dna={dna} storeSlug={storeSlug} />;
    default: return null;
  }
}

// =============================================================================
// SERVICE INDUSTRY BLOCKS (doctor / clinic / salon / spa / home-visit)
// Renders provider profiles, service menus, slot booking, clinic hours,
// packages, FAQs, and a customer appointment history panel.
// =============================================================================
function ProviderTeamBlock({ p, dna, storeSlug }: any) {
  const items: any[] = p.items ?? [];
  return (
    <section className="py-20" style={{ background: dna.palette?.bg }}>
      <div className="max-w-6xl mx-auto px-6">
        {p.title && <h2 className="text-4xl mb-2" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h2>}
        {p.subtitle && <p className="mb-10" style={{ color: dna.palette?.muted }}>{p.subtitle}</p>}
        <div className="grid md:grid-cols-3 gap-8">
          {items.map((m: any, i: number) => (
            <article key={i} className="overflow-hidden border" style={{ background: dna.palette?.surface, borderColor: dna.palette?.border, borderRadius: "var(--r)" }}>
              {m.image && <img src={m.image} alt={m.name} className="w-full aspect-[4/5] object-cover" />}
              <div className="p-5">
                <div className="text-lg font-medium" style={{ fontFamily: "var(--hf)" }}>{m.name}</div>
                <div className="text-xs uppercase tracking-wider mt-1" style={{ color: dna.palette?.accent }}>{m.role}{m.qualifications ? ` · ${m.qualifications}` : ""}</div>
                {m.experience && <div className="text-xs mt-2" style={{ color: dna.palette?.muted }}>{m.experience}</div>}
                {m.bio && <p className="text-sm mt-3 leading-relaxed" style={{ color: dna.palette?.muted }}>{m.bio}</p>}
                {m.specialties && Array.isArray(m.specialties) && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {m.specialties.slice(0, 4).map((s: string, j: number) => (
                      <span key={j} className="text-[10px] px-2 py-0.5 uppercase tracking-wider" style={{ background: dna.palette?.bg, color: dna.palette?.fg, borderRadius: "var(--r)" }}>{s}</span>
                    ))}
                  </div>
                )}
                {storeSlug && (
                  <Link to={`/store/${storeSlug}/book?provider=${encodeURIComponent(m.name)}`} className="inline-block mt-4 text-sm px-4 py-2" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>Book {m.role?.split(" ")[0] ?? "now"}</Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceMenuBlock({ p, dna, storeSlug }: any) {
  const groups: any[] = p.groups ?? [{ name: p.title ?? "Services", items: p.items ?? [] }];
  return (
    <section className="py-20" style={{ background: dna.palette?.surface }}>
      <div className="max-w-5xl mx-auto px-6">
        {p.title && <h2 className="text-4xl mb-2" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h2>}
        {p.subtitle && <p className="mb-10" style={{ color: dna.palette?.muted }}>{p.subtitle}</p>}
        <div className="space-y-10">
          {groups.map((g: any, gi: number) => (
            <div key={gi}>
              {groups.length > 1 && <h3 className="text-xl mb-4 pb-2 border-b" style={{ fontFamily: "var(--hf)", borderColor: dna.palette?.border, color: dna.palette?.accent }}>{g.name}</h3>}
              <ul className="divide-y" style={{ borderColor: dna.palette?.border }}>
                {(g.items ?? []).map((s: any, i: number) => (
                  <li key={i} className="py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <span className="text-base font-medium">{s.name}</span>
                        {s.duration_min && <span className="text-xs" style={{ color: dna.palette?.muted }}>{s.duration_min} min</span>}
                        {s.badge && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5" style={{ background: dna.palette?.accent, color: dna.palette?.bg, borderRadius: "var(--r)" }}>{s.badge}</span>}
                      </div>
                      {s.description && <p className="text-sm mt-1" style={{ color: dna.palette?.muted }}>{s.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-semibold">₹{s.price}</div>
                      {storeSlug && <Link to={`/store/${storeSlug}/book?service=${encodeURIComponent(s.name)}`} className="inline-block mt-1 text-xs px-3 py-1.5" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>Book</Link>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BookingWidgetBlock({ p, dna, storeSlug }: any) {
  return (
    <section className="py-16" style={{ background: dna.palette?.bg }}>
      <div className="max-w-3xl mx-auto px-6 p-8 text-center border" style={{ background: dna.palette?.surface, borderColor: dna.palette?.border, borderRadius: "var(--r)" }}>
        <h2 className="text-3xl mb-3" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title ?? "Book your appointment"}</h2>
        <p className="mb-6" style={{ color: dna.palette?.muted }}>{p.subtitle ?? "Choose a service, pick a provider and a slot — confirmation is instant."}</p>
        <div className="grid sm:grid-cols-3 gap-3 mb-6 text-left text-sm">
          {(p.steps ?? ["Pick a service", "Pick a provider & slot", "Confirm details"]).map((st: string, i: number) => (
            <div key={i} className="p-3 border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)" }}>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: dna.palette?.accent }}>Step {i + 1}</div>
              <div>{st}</div>
            </div>
          ))}
        </div>
        {storeSlug
          ? <Link to={`/store/${storeSlug}/book`} className="inline-block px-6 py-3 text-sm" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>{p.cta ?? "Book appointment"}</Link>
          : <button className="px-6 py-3 text-sm" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>{p.cta ?? "Book appointment"}</button>}
      </div>
    </section>
  );
}

function ClinicHoursBlock({ p, dna }: any) {
  const hours: any[] = p.hours ?? [];
  return (
    <section className="py-16" style={{ background: dna.palette?.surface }}>
      <div className="max-w-4xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-start">
        <div>
          <h2 className="text-3xl mb-3" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title ?? "Visit us"}</h2>
          {p.address && <p className="text-sm mb-2" style={{ color: dna.palette?.muted }}>{p.address}</p>}
          {p.phone && <p className="text-sm" style={{ color: dna.palette?.muted }}>Call: {p.phone}</p>}
          {p.note && <p className="text-sm mt-4" style={{ color: dna.palette?.accent }}>{p.note}</p>}
        </div>
        <ul className="divide-y" style={{ borderColor: dna.palette?.border }}>
          {hours.map((h: any, i: number) => (
            <li key={i} className="py-2 flex items-center justify-between text-sm">
              <span className="font-medium">{h.day}</span>
              <span style={{ color: dna.palette?.muted }}>{h.closed ? "Closed" : `${h.open} — ${h.close}`}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ServicePackagesBlock({ p, dna, storeSlug }: any) {
  const items: any[] = p.items ?? [];
  return (
    <section className="py-20" style={{ background: dna.palette?.bg }}>
      <div className="max-w-6xl mx-auto px-6">
        {p.title && <h2 className="text-4xl mb-2" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h2>}
        {p.subtitle && <p className="mb-10" style={{ color: dna.palette?.muted }}>{p.subtitle}</p>}
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((pk: any, i: number) => (
            <div key={i} className="p-6 border flex flex-col" style={{ background: dna.palette?.surface, borderColor: dna.palette?.border, borderRadius: "var(--r)" }}>
              {pk.badge && <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: dna.palette?.accent }}>{pk.badge}</div>}
              <div className="text-xl font-medium mb-1" style={{ fontFamily: "var(--hf)" }}>{pk.name}</div>
              <div className="text-2xl font-semibold mb-1">₹{pk.price}</div>
              <div className="text-xs mb-4" style={{ color: dna.palette?.muted }}>{pk.total_visits ? `${pk.total_visits} visits · ` : ""}{pk.validity_days ? `Valid ${pk.validity_days} days` : ""}</div>
              <ul className="text-sm space-y-1 mb-5 flex-1">
                {(pk.includes ?? []).map((it: string, j: number) => (
                  <li key={j} className="flex gap-2"><span style={{ color: dna.palette?.accent }}>✓</span><span style={{ color: dna.palette?.muted }}>{it}</span></li>
                ))}
              </ul>
              {storeSlug && <Link to={`/store/${storeSlug}/book?package=${encodeURIComponent(pk.name)}`} className="text-center px-4 py-2 text-sm" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>Buy package</Link>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqsBlock({ p, dna }: any) {
  const items: any[] = p.items ?? [];
  return (
    <section className="py-20" style={{ background: dna.palette?.surface }}>
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl mb-8" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title ?? "Frequently asked"}</h2>
        <div className="space-y-4">
          {items.map((f: any, i: number) => (
            <details key={i} className="p-4 border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)" }}>
              <summary className="cursor-pointer text-sm font-medium">{f.q}</summary>
              <p className="text-sm mt-2" style={{ color: dna.palette?.muted }}>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceDetailBlock({ p, dna, storeSlug }: any) {
  const s = p.service ?? {};
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12">
      <div className="aspect-square overflow-hidden" style={{ background: dna.palette?.surface, borderRadius: "var(--r)" }}>
        {(p.image || s.image) && <img src={p.image || s.image} className="w-full h-full object-cover" />}
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider mb-2" style={{ color: dna.palette?.accent }}>{s.category ?? "Service"}</div>
        <h1 className="text-4xl mb-3" style={{ fontFamily: "var(--hf)" }}>{s.name}</h1>
        <div className="flex items-baseline gap-4 mb-4">
          <div className="text-2xl font-semibold">₹{s.price}</div>
          {s.duration_min && <div className="text-sm" style={{ color: dna.palette?.muted }}>{s.duration_min} minutes</div>}
        </div>
        <p className="mb-6 text-sm leading-relaxed" style={{ color: dna.palette?.muted }}>{s.description ?? "Detailed service information renders here."}</p>
        {Array.isArray(s.includes) && s.includes.length > 0 && (
          <ul className="text-sm space-y-1 mb-6">
            {s.includes.map((it: string, i: number) => (<li key={i} className="flex gap-2"><span style={{ color: dna.palette?.accent }}>✓</span>{it}</li>))}
          </ul>
        )}
        {storeSlug
          ? <Link to={`/store/${storeSlug}/book?service=${encodeURIComponent(s.name ?? "")}`} className="inline-block px-6 py-3 text-sm" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>Book appointment</Link>
          : <button className="px-6 py-3 text-sm" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>Book appointment</button>}
      </div>
    </section>
  );
}

function AppointmentsPanelBlock({ p, dna, storeSlug }: any) {
  return (
    <section className="max-w-5xl mx-auto px-6 py-12">
      <h2 className="text-2xl mb-2" style={{ fontFamily: "var(--hf)" }}>{p.title ?? "My appointments"}</h2>
      <p className="mb-6 text-sm" style={{ color: dna.palette?.muted }}>{p.subtitle ?? "Upcoming, past visits and prescriptions all in one place."}</p>
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {(p.metrics ?? [
          { label: "Upcoming", value: "—" },
          { label: "Visits this year", value: "—" },
          { label: "Active packages", value: "—" },
        ]).map((m: any, i: number) => (
          <div key={i} className="p-4 border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", background: dna.palette?.surface }}>
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: dna.palette?.muted }}>{m.label}</div>
            <div className="text-2xl font-semibold">{m.value}</div>
          </div>
        ))}
      </div>
      <div className="p-6 border text-sm" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", color: dna.palette?.muted }}>
        Your appointment history, prescriptions and family member visits will appear here once you sign in.
        {storeSlug && <Link to={`/store/${storeSlug}/book`} className="ml-3 inline-block px-4 py-2 text-xs" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>Book a new visit</Link>}
      </div>
    </section>
  );
}

function pad(cls = "max-w-3xl mx-auto px-6 py-16") { return cls; }

function AuthForm({ p, dna, variant, storeSlug }: any) {
  const links: Record<string, { label: string; to: string }[]> = {
    signin:   [{ label: "Forgot password?", to: storeSlug ? `/store/${storeSlug}/auth/forgot` : "#" }, { label: "Create account", to: storeSlug ? `/store/${storeSlug}/auth/signup` : "#" }],
    signup:   [{ label: "Already have an account? Sign in", to: storeSlug ? `/store/${storeSlug}/auth/signin` : "#" }],
    forgot_password: [{ label: "Back to sign in", to: storeSlug ? `/store/${storeSlug}/auth/signin` : "#" }],
    reset_password:  [],
  };
  return (
    <section className={pad()}>
      <h1 className="text-3xl mb-6" style={{ fontFamily: "var(--hf)" }}>{p.title}</h1>
      <form className="space-y-3">
        {variant !== "reset_password" && <input type="email" placeholder="Email" className="w-full px-4 py-3 text-sm border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", background: dna.palette?.bg }} />}
        {(variant === "signin" || variant === "signup" || variant === "reset_password") && <input type="password" placeholder={variant === "reset_password" ? "New password" : "Password"} className="w-full px-4 py-3 text-sm border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", background: dna.palette?.bg }} />}
        {variant === "signup" && <input placeholder="Full name" className="w-full px-4 py-3 text-sm border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", background: dna.palette?.bg }} />}
        <button type="button" className="w-full px-5 py-3 text-sm" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>{p.cta}</button>
      </form>
      <div className="mt-5 flex flex-col gap-2 text-sm">
        {(links[variant] ?? []).map((l, i) => <Link key={i} to={l.to} style={{ color: dna.palette?.accent }}>{l.label}</Link>)}
      </div>
    </section>
  );
}

function LineItems({ dna, storeSlug }: any) {
  const { items } = useCart(storeSlug || "");
  if (!items?.length) return <section className={pad()}><p style={{ color: dna.palette?.muted }}>Your cart is empty.</p></section>;
  return (
    <section className="max-w-3xl mx-auto px-6 py-12">
      <ul className="divide-y" style={{ borderColor: dna.palette?.border }}>
        {items.map((it: any, i: number) => (
          <li key={i} className="flex gap-4 py-4 items-center">
            {it.image && <img src={it.image} className="w-16 h-16 object-cover" style={{ borderRadius: "var(--r)" }} />}
            <div className="flex-1">
              <div className="text-sm font-medium">{it.title}</div>
              <div className="text-xs" style={{ color: dna.palette?.muted }}>Qty {it.quantity}</div>
            </div>
            <div className="text-sm">₹{(it.price * it.quantity).toLocaleString("en-IN")}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CartSummary({ p, dna, storeSlug }: any) {
  const { totalPrice, totalItems } = useCart(storeSlug || "");
  return (
    <section className="max-w-3xl mx-auto px-6 pb-16">
      <div className="p-6 border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", background: dna.palette?.surface }}>
        <div className="flex justify-between text-sm mb-2"><span>Items</span><span>{totalItems}</span></div>
        <div className="flex justify-between text-base font-medium mb-4"><span>Total</span><span>₹{totalPrice.toLocaleString("en-IN")}</span></div>
        <Link to={storeSlug ? `/store/${storeSlug}/checkout` : "#"} className="block text-center w-full px-5 py-3 text-sm" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>{p.cta || "Checkout"}</Link>
      </div>
    </section>
  );
}

function CheckoutStepper({ p, dna }: any) {
  const steps: string[] = p.steps ?? ["address", "shipping", "payment", "review"];
  return (
    <section className="max-w-3xl mx-auto px-6 py-12">
      <ol className="flex gap-2 mb-8">
        {steps.map((st, i) => (
          <li key={i} className="flex-1 text-center text-xs uppercase tracking-wider py-2 border-b-2" style={{ borderColor: i === 0 ? dna.palette?.accent : dna.palette?.border, color: i === 0 ? dna.palette?.fg : dna.palette?.muted }}>{st}</li>
        ))}
      </ol>
      <p style={{ color: dna.palette?.muted }} className="text-sm">Checkout content is wired to your existing checkout flow.</p>
    </section>
  );
}

function JournalStrip({ p, dna, storeSlug }: any) {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <div className="flex items-end justify-between mb-8">
        <h2 className="text-3xl" style={{ fontFamily: "var(--hf)" }}>{p.title || "Journal"}</h2>
        {storeSlug && <Link to={`/store/${storeSlug}/journal`} className="text-sm" style={{ color: dna.palette?.accent }}>Read all →</Link>}
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {Array.from({ length: p.limit || 3 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] flex items-end p-4" style={{ background: dna.palette?.surface, borderRadius: "var(--r)" }}>
            <span className="text-xs" style={{ color: dna.palette?.muted }}>Post placeholder</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function JournalList({ p, dna, storeSlug }: any) {
  return (
    <section className="max-w-5xl mx-auto px-6 py-12">
      <div className="grid md:grid-cols-2 gap-6">
        {Array.from({ length: p.limit || 6 }).map((_, i) => (
          <Link key={i} to={storeSlug ? `/store/${storeSlug}/journal/post-${i}` : "#"} className="block p-6 border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)" }}>
            <div className="text-xs uppercase tracking-wider mb-2" style={{ color: dna.palette?.accent }}>Story</div>
            <div className="text-lg" style={{ fontFamily: "var(--hf)" }}>Journal post placeholder</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function AccountPanel({ p, dna, storeSlug }: any) {
  const tabs: string[] = p.tabs ?? ["orders", "addresses", "wishlist", "profile"];
  return (
    <section className="max-w-5xl mx-auto px-6 py-12 grid md:grid-cols-[200px,1fr] gap-8">
      <nav className="space-y-2 text-sm">
        {tabs.map((t, i) => (
          <Link key={t} to={storeSlug ? `/store/${storeSlug}/account/${t}` : "#"} className="block px-3 py-2 capitalize" style={{ background: i === 0 ? dna.palette?.surface : "transparent", borderRadius: "var(--r)" }}>{t}</Link>
        ))}
      </nav>
      <div className="p-6 border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)" }}>
        <p style={{ color: dna.palette?.muted }}>Account content connects to your customer profile data.</p>
      </div>
    </section>
  );
}

function ContactForm({ p, dna }: any) {
  return (
    <section className={pad()}>
      <div className="text-sm mb-6" style={{ color: dna.palette?.muted }}>{p.email} · {p.phone}</div>
      <form className="space-y-3">
        <input placeholder="Your name" className="w-full px-4 py-3 text-sm border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", background: dna.palette?.bg }} />
        <input type="email" placeholder="Email" className="w-full px-4 py-3 text-sm border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", background: dna.palette?.bg }} />
        <textarea rows={5} placeholder="Message" className="w-full px-4 py-3 text-sm border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", background: dna.palette?.bg }} />
        <button type="button" className="px-5 py-3 text-sm" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>Send message</button>
      </form>
    </section>
  );
}

function ProductDetailStub({ p, dna }: any) {
  const pr = p.product ?? {};
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12">
      <div className="aspect-square overflow-hidden" style={{ background: dna.palette?.surface, borderRadius: "var(--r)" }}>
        {p.image && <img src={p.image} className="w-full h-full object-cover" />}
      </div>
      <div>
        <h1 className="text-4xl mb-4" style={{ fontFamily: "var(--hf)" }}>{pr.name}</h1>
        <div className="text-2xl mb-6">₹{pr.price}</div>
        <p className="mb-8 text-sm leading-relaxed" style={{ color: dna.palette?.muted }}>{pr.description || "Product details render here when wired to your catalog."}</p>
        <button className="px-6 py-3 text-sm" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>Add to cart</button>
      </div>
    </section>
  );
}

// =============================================================================
// HERO — Shopify/WordPress-grade flexibility
// Styles: slider | fixed | half_banner | split | fullscreen_image | video |
//         magazine | editorial_serif | minimal_left | asymmetric | gradient | centered
// =============================================================================
function heightClass(h?: string) {
  switch (h) {
    case "short":  return "min-h-[40vh]";
    case "medium": return "min-h-[60vh]";
    case "tall":   return "min-h-[80vh]";
    case "full":   return "min-h-screen";
    case "auto":   return "";
    default:       return "";
  }
}

function alignClass(pos?: string) {
  // 9-point grid like "top-left", "center-center", "bottom-right"
  const [v = "center", h = "center"] = (pos ?? "center-center").split("-");
  const vMap: Record<string, string> = { top: "items-start", center: "items-center", bottom: "items-end" };
  const hMap: Record<string, string> = { left: "justify-start text-left", center: "justify-center text-center", right: "justify-end text-right" };
  return `${vMap[v] ?? "items-center"} ${hMap[h] ?? "justify-center text-center"}`;
}

function Overlay({ overlay }: { overlay?: any }) {
  if (!overlay) return <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(0,0,0,0.35)" }} />;
  const opacity = typeof overlay.opacity === "number" ? overlay.opacity : 0.45;
  const color = overlay.color || "#000000";
  const grad = overlay.gradient;
  let bg = `${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
  let style: React.CSSProperties = { background: bg };
  if (grad === "bottom") style = { background: `linear-gradient(180deg, transparent 0%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")} 100%)` };
  else if (grad === "top") style = { background: `linear-gradient(0deg, transparent 0%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")} 100%)` };
  else if (grad === "radial") style = { background: `radial-gradient(ellipse at center, transparent 30%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")} 100%)` };
  return <div className="absolute inset-0 pointer-events-none" style={style} />;
}

function parseYouTube(url: string): string | null {
  const m = url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}
function parseVimeo(url: string): string | null {
  const m = url?.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

function HeroVideo({ video }: { video: any }) {
  const src = video?.src || "";
  const yt = parseYouTube(src);
  const vm = parseVimeo(src);
  if (yt) {
    return (
      <iframe
        className="absolute inset-0 w-full h-full pointer-events-none"
        src={`https://www.youtube.com/embed/${yt}?autoplay=1&mute=1&loop=1&playlist=${yt}&controls=0&showinfo=0&modestbranding=1&rel=0&playsinline=1`}
        allow="autoplay; encrypted-media; picture-in-picture"
        style={{ border: 0, transform: "scale(1.4)" }}
      />
    );
  }
  if (vm) {
    return (
      <iframe
        className="absolute inset-0 w-full h-full pointer-events-none"
        src={`https://player.vimeo.com/video/${vm}?background=1&autoplay=1&loop=1&muted=1`}
        allow="autoplay; fullscreen"
        style={{ border: 0 }}
      />
    );
  }
  if (!src) return null;
  return (
    <video
      className="absolute inset-0 w-full h-full object-cover"
      src={src}
      poster={video?.poster}
      autoPlay
      muted={video?.muted !== false}
      loop={video?.loop !== false}
      playsInline
    />
  );
}

function HeroSlider({ slides, slider, dna, shopHref, height, contentAlign, overlay, kenBurns, buttons }: any) {
  const list = (slides ?? []).filter((s: any) => s);
  const [idx, setIdx] = useState(0);
  const autoplay = slider?.autoplay !== false;
  const interval = Math.max(2000, slider?.interval ?? 5000);
  const arrows = slider?.arrows !== false;
  const dots = slider?.dots !== false;
  const transition = slider?.transition === "slide" ? "slide" : "fade";

  useEffect(() => {
    if (!autoplay || list.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % list.length), interval);
    return () => clearInterval(t);
  }, [autoplay, interval, list.length]);

  if (list.length === 0) return null;
  const headingFont = { fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 } as React.CSSProperties;

  return (
    <section className={`relative overflow-hidden ${heightClass(height) || "min-h-[70vh]"}`} style={{ background: dna.palette?.surface }}>
      {list.map((s: any, i: number) => {
        const active = i === idx;
        const style: React.CSSProperties = transition === "fade"
          ? { opacity: active ? 1 : 0, transition: "opacity 700ms ease" }
          : { transform: `translateX(${(i - idx) * 100}%)`, transition: "transform 700ms ease" };
        return (
          <div key={i} className="absolute inset-0" style={style}>
            {s.image && (
              <img
                src={s.image}
                alt={s.title ?? ""}
                className={`absolute inset-0 w-full h-full object-cover ${kenBurns && active ? "animate-[ken-burns_18s_ease-out_infinite]" : ""}`}
                style={{ objectPosition: s.focal || "50% 50%" }}
              />
            )}
            <Overlay overlay={overlay} />
            <div className={`relative h-full w-full flex ${alignClass(contentAlign)} px-6`}>
              <div className="max-w-3xl" style={{ color: "#fff" }}>
                {s.kicker && <div className="text-xs uppercase tracking-[0.3em] mb-3 opacity-90">{s.kicker}</div>}
                {s.title && <h1 className="text-4xl md:text-6xl leading-[1.05]" style={headingFont}>{s.title}</h1>}
                {s.sub && <p className="mt-4 text-base md:text-lg opacity-90 max-w-xl">{s.sub}</p>}
                {(s.cta || s.cta_secondary) && (
                  <div className="mt-7 flex gap-3 flex-wrap" style={{ justifyContent: (contentAlign?.endsWith("-center") || !contentAlign) ? "center" : (contentAlign?.endsWith("-right") ? "flex-end" : "flex-start") }}>
                    {s.cta && <HeroBtn kind="primary" label={s.cta} href={s.cta_href || shopHref} cfg={buttons?.primary} />}
                    {s.cta_secondary && <HeroBtn kind="secondary" label={s.cta_secondary} href={s.cta_secondary_href || shopHref} cfg={buttons?.secondary} />}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {arrows && list.length > 1 && (
        <>
          <button aria-label="Previous slide" onClick={() => setIdx((i) => (i - 1 + list.length) % list.length)} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition">‹</button>
          <button aria-label="Next slide"     onClick={() => setIdx((i) => (i + 1) % list.length)}                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition">›</button>
        </>
      )}
      {dots && list.length > 1 && (
        <div className="absolute bottom-5 left-0 right-0 z-10 flex justify-center gap-1.5">
          {list.map((_: any, i: number) => (
            <button key={i} aria-label={`Slide ${i+1}`} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-8 bg-white" : "w-1.5 bg-white/60"}`} />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------- Hero button styling helpers ----------
const HBTN_SIZES: Record<string, string> = {
  sm: "px-4 py-2 text-xs",
  md: "px-7 py-3 text-sm",
  lg: "px-9 py-4 text-base",
  xl: "px-12 py-5 text-lg",
};
const HBTN_SHADOWS: Record<string, string> = {
  none: "none",
  soft: "0 4px 14px rgba(0,0,0,0.15)",
  medium: "0 10px 25px rgba(0,0,0,0.25)",
  hard: "6px 6px 0 rgba(0,0,0,0.85)",
  glow: "0 0 28px rgba(255,255,255,0.55)",
  inset: "inset 0 -3px 0 rgba(0,0,0,0.2)",
};
const HBTN_ANIMS: Record<string, string> = {
  none: "",
  pulse: "animate-pulse",
  bounce: "animate-bounce",
  shine: "hbtn-shine",
  float: "hbtn-float",
  wobble: "hbtn-wobble",
};
const HBTN_HOVERS: Record<string, string> = {
  none: "hover:opacity-90",
  lift: "hover:-translate-y-0.5 hover:shadow-2xl",
  scale: "hover:scale-105",
  glow: "hover:brightness-110 hover:shadow-[0_0_30px_rgba(255,255,255,0.6)]",
  invert: "hover:bg-white hover:text-black",
};

function HeroBtnStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes hbtn-shine-kf { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      .hbtn-shine { position: relative; overflow: hidden; }
      .hbtn-shine::after { content: ""; position: absolute; inset: 0; background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%); background-size: 200% 100%; animation: hbtn-shine-kf 2.4s linear infinite; pointer-events: none; }
      @keyframes hbtn-float-kf { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      .hbtn-float { animation: hbtn-float-kf 2.6s ease-in-out infinite; }
      @keyframes hbtn-wobble-kf { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-2deg); } 75% { transform: rotate(2deg); } }
      .hbtn-wobble { animation: hbtn-wobble-kf 1.8s ease-in-out infinite; }
    `}} />
  );
}

function HeroBtn({ kind, label, href, cfg, freePos }: { kind: "primary" | "secondary"; label: string; href: string; cfg?: any; freePos?: boolean }) {
  const b = cfg || {};
  const isPrimary = kind === "primary";
  const size = HBTN_SIZES[b.size as string] || HBTN_SIZES.md;
  const radius = b.radius != null ? `${b.radius}px` : "var(--r)";
  const shadow = HBTN_SHADOWS[b.shadow as string] ?? (isPrimary ? HBTN_SHADOWS.soft : HBTN_SHADOWS.none);
  const anim = HBTN_ANIMS[b.animation as string] || "";
  const hover = HBTN_HOVERS[b.hover as string] || "hover:opacity-90";
  const bg = b.bg || (isPrimary ? "var(--p)" : "transparent");
  const color = b.color || (isPrimary ? "var(--pf)" : "#fff");
  const borderColor = b.border_color || (isPrimary ? "transparent" : "rgba(255,255,255,0.65)");
  const borderWidth = b.border_width != null ? Number(b.border_width) : (isPrimary ? 0 : 1);
  const style: React.CSSProperties = {
    background: bg, color, borderColor, borderWidth,
    borderStyle: borderWidth ? "solid" : "none",
    borderRadius: radius, boxShadow: shadow,
    transition: "all 250ms ease",
    letterSpacing: b.tracking != null ? `${b.tracking}em` : undefined,
    textTransform: b.uppercase ? "uppercase" : undefined,
    fontWeight: b.weight || 500,
  };
  if (freePos) {
    const defX = isPrimary ? 35 : 65;
    const defY = 78;
    Object.assign(style, {
      position: "absolute",
      left: `${b.x ?? defX}%`,
      top: `${b.y ?? defY}%`,
      transform: "translate(-50%, -50%)",
      zIndex: 5,
      pointerEvents: "auto",
    } as React.CSSProperties);
  }
  return (
    <a href={href} className={`${size} inline-block ${hover} ${anim}`} style={style}>{label}</a>
  );
}

function Hero({ p, dna, storeSlug }: any) {
  const v = p.style ?? "centered";
  const headingFont = { fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 } as React.CSSProperties;
  const shopHref = storeSlug ? `/store/${storeSlug}/shop` : "#products";
  const overlay = p.overlay;
  const effects = p.effects || {};
  const height = p.height;
  const contentAlign = p.content_align;
  const parallax = effects.parallax;
  const kenBurns = effects.ken_burns;
  const buttons = p.buttons || {};
  const freePos = !!buttons.free_position && v !== "slider";

  const Btns = freePos ? null : (
    <div className="mt-8 flex gap-3 flex-wrap">
      {p.cta && <HeroBtn kind="primary" label={p.cta} href={p.cta_href || shopHref} cfg={buttons.primary} />}
      {p.cta_secondary && <HeroBtn kind="secondary" label={p.cta_secondary} href={p.cta_secondary_href || shopHref} cfg={buttons.secondary} />}
    </div>
  );

  const FreeLayer = freePos ? (
    <div className="absolute inset-0 pointer-events-none z-20">
      {p.cta && <HeroBtn kind="primary" label={p.cta} href={p.cta_href || shopHref} cfg={buttons.primary} freePos />}
      {p.cta_secondary && <HeroBtn kind="secondary" label={p.cta_secondary} href={p.cta_secondary_href || shopHref} cfg={buttons.secondary} freePos />}
    </div>
  ) : null;

  const wrap = (node: JSX.Element) => (
    <>
      <HeroBtnStyles />
      {freePos ? (<div className="relative">{node}{FreeLayer}</div>) : node}
    </>
  );

  // --- SLIDER ---------------------------------------------------------------
  if (v === "slider") {
    const slides = (p.slides && p.slides.length > 0)
      ? p.slides
      : [{ image: p.image, title: p.title, sub: p.sub, kicker: p.kicker, cta: p.cta, cta_href: p.cta_href, cta_secondary: p.cta_secondary, cta_secondary_href: p.cta_secondary_href }];
    return (<><HeroBtnStyles /><HeroSlider slides={slides} slider={p.slider} dna={dna} shopHref={shopHref} height={height} contentAlign={contentAlign} overlay={overlay} kenBurns={kenBurns} buttons={buttons} /></>);
  }

  // --- VIDEO BACKGROUND -----------------------------------------------------
  if (v === "video") {
    return wrap(
      <section className={`relative overflow-hidden ${heightClass(height) || "min-h-[80vh]"}`} style={{ background: "#000" }}>
        <HeroVideo video={p.video} />
        <Overlay overlay={overlay} />
        <div className={`relative h-full w-full flex ${alignClass(contentAlign)} px-6 py-24`} style={{ color: "#fff" }}>
          <div className="max-w-3xl">
            {p.kicker && <div className="text-xs uppercase tracking-[0.3em] mb-3 opacity-90">{p.kicker}</div>}
            {p.title && <h1 className="text-5xl md:text-7xl leading-[1.05]" style={headingFont}>{p.title}</h1>}
            {p.sub && <p className="mt-5 text-lg opacity-90 max-w-xl">{p.sub}</p>}
            {Btns}
          </div>
        </div>
      </section>
    );
  }

  // --- HALF BANNER ----------------------------------------------------------
  if (v === "half_banner") {
    return wrap(
      <section className="grid md:grid-cols-2 relative" style={{ background: dna.palette?.surface, minHeight: "40vh" }}>
        <div className="px-6 md:px-12 py-12 md:py-16 flex flex-col justify-center">
          {p.kicker && <div className="text-xs uppercase tracking-[0.3em] mb-3" style={{ color: dna.palette?.accent }}>{p.kicker}</div>}
          <h1 className="text-3xl md:text-5xl leading-tight" style={headingFont}>{p.title}</h1>
          {p.sub && <p className="mt-3 text-base" style={{ color: dna.palette?.muted }}>{p.sub}</p>}
          {Btns}
        </div>
        <div className="min-h-[260px]">{p.image && <img src={p.image} className="w-full h-full object-cover" style={{ objectPosition: p.focal || "50% 50%" }} />}</div>
      </section>
    );
  }

  // --- GRADIENT (no image) --------------------------------------------------
  if (v === "gradient") {
    return wrap(
      <section className={`relative overflow-hidden ${heightClass(height) || "min-h-[60vh]"}`} style={{ background: `linear-gradient(135deg, ${dna.palette?.primary} 0%, ${dna.palette?.accent} 100%)`, color: dna.palette?.primary_fg || "#fff" }}>
        <div className={`relative h-full w-full flex ${alignClass(contentAlign)} px-6 py-24`}>
          <div className="max-w-3xl">
            {p.kicker && <div className="text-xs uppercase tracking-[0.3em] mb-3 opacity-90">{p.kicker}</div>}
            {p.title && <h1 className="text-5xl md:text-7xl leading-[1.05]" style={headingFont}>{p.title}</h1>}
            {p.sub && <p className="mt-5 text-lg opacity-90 max-w-xl">{p.sub}</p>}
            {Btns}
          </div>
        </div>
      </section>
    );
  }

  if (v === "split") {
    return wrap(
      <section className="grid md:grid-cols-2 relative" style={{ background: dna.palette?.surface }}>
        <div className="px-6 md:px-12 py-20 md:py-32 flex flex-col justify-center">
          {p.kicker && <div className="text-xs uppercase tracking-[0.3em] mb-4" style={{ color: dna.palette?.accent }}>{p.kicker}</div>}
          <h1 className="text-5xl md:text-6xl leading-tight" style={headingFont}>{p.title}</h1>
          {p.sub && <p className="mt-5 text-lg" style={{ color: dna.palette?.muted }}>{p.sub}</p>}
          {Btns}
        </div>
        <div className="min-h-[400px]">{p.image && <img src={p.image} className="w-full h-full object-cover" style={{ objectPosition: p.focal || "50% 50%" }} />}</div>
      </section>
    );
  }
  if (v === "magazine" || v === "editorial_serif") {
    return wrap(
      <section className="max-w-6xl mx-auto px-6 py-24 relative">
        <div className="grid md:grid-cols-12 gap-8 items-end">
          <div className="md:col-span-7">
            {p.kicker && <div className="text-xs uppercase tracking-[0.4em] mb-6 border-b pb-2 inline-block" style={{ color: dna.palette?.accent, borderColor: dna.palette?.border }}>{p.kicker}</div>}
            <h1 className="text-6xl md:text-8xl leading-[0.95] italic" style={{ ...headingFont, fontStyle: v === "editorial_serif" ? "italic" : "normal" }}>{p.title}</h1>
          </div>
          <div className="md:col-span-5 md:pl-8 md:border-l" style={{ borderColor: dna.palette?.border }}>
            {p.sub && <p className="text-base leading-relaxed" style={{ color: dna.palette?.muted }}>{p.sub}</p>}
            {Btns}
          </div>
        </div>
        {p.image && <img src={p.image} className="mt-12 w-full aspect-[21/9] object-cover" style={{ borderRadius: "var(--r)", objectPosition: p.focal || "50% 50%" }} />}
      </section>
    );
  }
  if (v === "fullscreen_image" || v === "fixed") {
    const h = heightClass(height) || (v === "fixed" ? "min-h-[60vh]" : "min-h-[80vh]");
    return wrap(
      <section className={`relative overflow-hidden ${h}`}>
        {p.image && (
          <div className={`absolute inset-0 ${parallax ? "bg-fixed" : ""}`}>
            <img
              src={p.image}
              className={`absolute inset-0 w-full h-full object-cover ${kenBurns ? "animate-[ken-burns_18s_ease-out_infinite]" : ""}`}
              style={{ objectPosition: p.focal || "50% 50%" }}
            />
          </div>
        )}
        <Overlay overlay={overlay} />
        <div className={`relative h-full w-full flex ${alignClass(contentAlign || "center-center")} px-6 py-24`} style={{ color: "#fff" }}>
          <div className="max-w-3xl">
            {p.kicker && <div className="text-xs uppercase tracking-[0.4em] mb-4 opacity-80">{p.kicker}</div>}
            <h1 className="text-5xl md:text-7xl" style={headingFont}>{p.title}</h1>
            {p.sub && <p className="mt-5 opacity-90 max-w-xl">{p.sub}</p>}
            {Btns}
          </div>
        </div>
      </section>
    );
  }
  if (v === "minimal_left") {
    return wrap(
      <section className="max-w-6xl mx-auto px-6 py-32 relative">
        {p.kicker && <div className="text-xs uppercase tracking-[0.3em] mb-6" style={{ color: dna.palette?.accent }}>{p.kicker}</div>}
        <h1 className="text-5xl md:text-7xl max-w-2xl" style={headingFont}>{p.title}</h1>
        {p.sub && <p className="mt-6 text-lg max-w-md" style={{ color: dna.palette?.muted }}>{p.sub}</p>}
        {Btns}
      </section>
    );
  }
  if (v === "asymmetric") {
    return wrap(
      <section className="relative overflow-hidden" style={{ background: dna.palette?.surface }}>
        <div className="absolute -right-20 -top-10 w-2/3 h-full">{p.image && <img src={p.image} className="w-full h-full object-cover" style={{ clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0% 100%)", objectPosition: p.focal || "50% 50%" }} />}</div>
        <div className="relative max-w-6xl mx-auto px-6 py-32 md:py-40">
          {p.kicker && <div className="text-xs uppercase tracking-[0.3em] mb-4" style={{ color: dna.palette?.accent }}>{p.kicker}</div>}
          <h1 className="text-5xl md:text-7xl max-w-xl" style={headingFont}>{p.title}</h1>
          {p.sub && <p className="mt-5 max-w-sm" style={{ color: dna.palette?.muted }}>{p.sub}</p>}
          {Btns}
        </div>
      </section>
    );
  }
  // centered (default)
  return wrap(
    <section className={`relative overflow-hidden ${heightClass(height)}`} style={{ background: dna.palette?.surface }}>
      {p.image && <img src={p.image} alt="" className={`absolute inset-0 w-full h-full object-cover opacity-60 ${kenBurns ? "animate-[ken-burns_18s_ease-out_infinite]" : ""}`} style={{ objectPosition: p.focal || "50% 50%" }} />}
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${dna.palette?.bg}00, ${dna.palette?.bg}cc)` }} />
      <div className="relative max-w-6xl mx-auto px-6 py-32 md:py-40">
        {p.kicker && <div className="text-xs uppercase tracking-[0.3em] mb-4" style={{ color: dna.palette?.accent }}>{p.kicker}</div>}
        <h1 className="text-5xl md:text-7xl leading-[1.05] max-w-3xl" style={headingFont}>{p.title}</h1>
        {p.sub && <p className="mt-6 text-lg max-w-xl" style={{ color: dna.palette?.muted }}>{p.sub}</p>}
        {Btns}
      </div>
    </section>
  );
}

function CategoryBlock({ p, dna, storeSlug }: any) {
  const v = p.style ?? "grid_4";
  const items = p.items ?? [];
  // Each tile links to the shop page filtered by that category name. Falls back to #products
  // when there is no slug (admin theme preview).
  const hrefFor = (name: string) =>
    storeSlug ? `/store/${storeSlug}/shop?category=${encodeURIComponent(name || "")}` : "#products";
  const Title = <h2 className="text-3xl mb-10" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h2>;
  if (v === "carousel_strip") {
    return (
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">{Title}</div>
        <div className="flex gap-4 overflow-x-auto px-6 pb-2 snap-x">
          {items.map((c: any, i: number) => (
            <Link to={hrefFor(c.name)} key={i} className="snap-start shrink-0 w-72 aspect-[4/5] relative overflow-hidden hover:opacity-90 transition" style={{ borderRadius: "var(--r)" }}>
              {c.image && <img src={c.image} className="w-full h-full object-cover" />}
              <div className="absolute bottom-0 inset-x-0 p-4 text-white" style={{ background: "linear-gradient(180deg,transparent,rgba(0,0,0,0.7))" }}>{c.name}</div>
            </Link>
          ))}
        </div>
      </section>
    );
  }
  if (v === "circles") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        {Title}
        <div className="flex flex-wrap justify-center gap-10">
          {items.map((c: any, i: number) => (
            <Link to={hrefFor(c.name)} key={i} className="flex flex-col items-center gap-3 hover:opacity-80 transition">
              <div className="w-32 h-32 rounded-full overflow-hidden border" style={{ borderColor: dna.palette?.border }}>
                {c.image && <img src={c.image} className="w-full h-full object-cover" />}
              </div>
              <span className="text-sm">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>
    );
  }
  if (v === "big_feature") {
    const [first, ...rest] = items;
    return (
      <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-4">
        {first && (
          <Link to={hrefFor(first.name)} className="relative aspect-[4/5] md:aspect-auto overflow-hidden hover:opacity-95 transition" style={{ borderRadius: "var(--r)" }}>
            {first.image && <img src={first.image} className="w-full h-full object-cover" />}
            <div className="absolute bottom-6 left-6 right-6 text-white"><div className="text-2xl" style={{ fontFamily: "var(--hf)" }}>{first.name}</div></div>
          </Link>
        )}
        <div className="grid grid-cols-2 gap-4">
          {rest.slice(0, 3).map((c: any, i: number) => (
            <Link to={hrefFor(c.name)} key={i} className="relative aspect-square overflow-hidden hover:opacity-95 transition" style={{ borderRadius: "var(--r)" }}>
              {c.image && <img src={c.image} className="w-full h-full object-cover" />}
              <div className="absolute bottom-3 left-3 text-white text-sm">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>
    );
  }
  if (v === "masonry" || v === "mosaic_2x2") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-16">
        {Title}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {items.map((c: any, i: number) => {
            const tall = v === "masonry" && i % 3 === 0;
            return (
              <Link to={hrefFor(c.name)} key={i} className="relative overflow-hidden hover:opacity-95 transition" style={{ borderRadius: "var(--r)", gridRow: tall ? "span 2" : undefined, aspectRatio: tall ? "3/5" : "1/1" }}>
                {c.image && <img src={c.image} className="w-full h-full object-cover" />}
                <div className="absolute bottom-3 left-3 text-white text-sm">{c.name}</div>
              </Link>
            );
          })}
        </div>
      </section>
    );
  }
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      {Title}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((c: any, i: number) => (
          <Link to={hrefFor(c.name)} key={i} className="group block aspect-[3/4] relative overflow-hidden" style={{ borderRadius: "var(--r)" }}>
            {c.image ? <img src={c.image} className="w-full h-full object-cover transition-transform group-hover:scale-105" /> : <div className="w-full h-full" style={{ background: dna.palette?.surface }} />}
            <div className="absolute inset-0 flex items-end p-4" style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.7))" }}>
              <span className="text-white font-medium" style={{ fontFamily: "var(--hf)" }}>{c.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// Industry-standard collections page: list every parent category with its image,
// description, and a chip-row of its subcategories (drilling into the shop with that filter).
function CollectionsBlock({ p, dna, storeSlug }: any) {
  const items: any[] = p.items ?? [];
  const collHref = (c: any) => storeSlug
    ? (c.id ? `/store/${storeSlug}/collections/${c.id}` : `/store/${storeSlug}/shop?category=${encodeURIComponent(c.name || "")}`)
    : "#";
  const shopHref = (catName: string) => storeSlug ? `/store/${storeSlug}/shop?category=${encodeURIComponent(catName || "")}` : "#";
  if (!items.length) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p style={{ color: dna.palette?.muted }}>No collections yet. Add categories from your dashboard to populate this page.</p>
      </section>
    );
  }
  return (
    <section className="max-w-6xl mx-auto px-6 pb-20">
      <div className="grid md:grid-cols-2 gap-8">
        {items.map((c: any, i: number) => (
          <article key={i} className="group flex flex-col" style={{ background: dna.palette?.surface, borderRadius: "var(--r)", overflow: "hidden", border: `1px solid ${dna.palette?.border}` }}>
            <Link to={collHref(c)} className="block aspect-[16/10] overflow-hidden" style={{ background: dna.palette?.bg }}>
              {c.image
                ? <img src={c.image} alt={c.name} className="w-full h-full object-cover transition-transform group-hover:scale-[1.03]" />
                : <div className="w-full h-full" />}
            </Link>
            <div className="p-5 flex-1 flex flex-col">
              <Link to={collHref(c)}>
                <h3 className="text-2xl mb-2" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{c.name}</h3>
              </Link>
              {c.description && (
                <p className="text-sm leading-relaxed mb-4" style={{ color: dna.palette?.muted }}>{c.description}</p>
              )}
              {Array.isArray(c.subs) && c.subs.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-auto pt-2">
                  {c.subs.map((s: any, si: number) => (
                    <Link
                      key={si}
                      to={shopHref(s.name)}
                      className="text-xs px-3 py-1.5 border transition hover:opacity-80"
                      style={{ borderColor: dna.palette?.border, borderRadius: "999px", color: dna.palette?.fg }}
                    >
                      {s.name}
                    </Link>
                  ))}
                </div>
              )}
              <Link
                to={collHref(c)}
                className="mt-4 inline-flex items-center text-sm self-start"
                style={{ color: dna.palette?.accent }}
              >
                Shop {c.name} →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// Single-collection page: header (image+description) then subcategory tiles, or
// fall back to product list filtered by category if no subs.
function CollectionDetailBlock({ p, dna, storeSlug }: any) {
  const items: any[] = p.items ?? [];
  // Path is /collections/:categoryId — pull from window since useParams is hard to reach here.
  const segments = typeof window !== "undefined" ? window.location.pathname.split("/") : [];
  const categoryId = segments[segments.indexOf("collections") + 1] || "";
  const cat = items.find((c: any) => c.id === categoryId) || null;
  if (!cat) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h1 className="text-3xl mb-3" style={{ fontFamily: "var(--hf)" }}>Collection not found</h1>
        {storeSlug && <Link to={`/store/${storeSlug}/collections`} className="text-sm" style={{ color: dna.palette?.accent }}>← Back to all collections</Link>}
      </section>
    );
  }
  const shopHref = (name: string) => storeSlug ? `/store/${storeSlug}/shop?category=${encodeURIComponent(name)}` : "#";
  return (
    <>
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-6">
        {storeSlug && <Link to={`/store/${storeSlug}/collections`} className="text-xs uppercase tracking-widest" style={{ color: dna.palette?.muted }}>← All collections</Link>}
        <div className="mt-4 grid md:grid-cols-[1.2fr_1fr] gap-8 items-center">
          <div>
            <h1 className="text-5xl mb-4" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{cat.name}</h1>
            {cat.description && <p className="text-base leading-relaxed" style={{ color: dna.palette?.muted }}>{cat.description}</p>}
            <Link to={shopHref(cat.name)} className="inline-block mt-6 px-5 py-2.5 text-sm" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>
              Shop all {cat.name.toLowerCase()}
            </Link>
          </div>
          {cat.image && (
            <img src={cat.image} alt={cat.name} className="w-full aspect-[4/3] object-cover" style={{ borderRadius: "var(--r)" }} />
          )}
        </div>
      </section>
      {Array.isArray(cat.subs) && cat.subs.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <h2 className="text-xl mb-5" style={{ fontFamily: "var(--hf)" }}>Browse by type</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cat.subs.map((s: any, i: number) => (
              <Link
                key={i}
                to={shopHref(s.name)}
                className="group relative aspect-square overflow-hidden border"
                style={{ borderRadius: "var(--r)", borderColor: dna.palette?.border, background: dna.palette?.surface }}
              >
                {s.image_url && <img src={s.image_url} alt={s.name} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" />}
                <div className="absolute inset-0 flex items-end p-3" style={{ background: s.image_url ? "linear-gradient(180deg,transparent,rgba(0,0,0,0.65))" : "transparent" }}>
                  <span className="text-sm font-medium" style={{ color: s.image_url ? "#fff" : dna.palette?.fg }}>{s.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}





function ProductBlock({ p, dna, storeSlug, page }: any) {
  const v = p.style ?? "grid_clean";
  const allItems: any[] = p.items ?? [];
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = page === "shop" ? (searchParams.get("category") || "") : "";

  // Categories shown as chips = union of seller's catalog categories + any
  // category strings actually present on products (so legacy/free-text product
  // categories still appear even if the seller hasn't added them to the catalog).
  const categories = useMemo(() => {
    const seen = new Map<string, string>(); // lower -> display
    (p.sellerCategories ?? []).forEach((c: any) => {
      const name = (c?.name || "").trim();
      if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
    });
    allItems.forEach((it) => {
      const c = (it.category || "").trim();
      if (c && !seen.has(c.toLowerCase())) seen.set(c.toLowerCase(), c);
    });
    return Array.from(seen.values());
  }, [allItems, p.sellerCategories]);

  const items = selectedCategory
    ? allItems.filter((it) => (it.category || "").toLowerCase() === selectedCategory.toLowerCase())
    : allItems;

  const setCategory = (next: string) => {
    const sp = new URLSearchParams(searchParams);
    if (next) sp.set("category", next); else sp.delete("category");
    setSearchParams(sp, { replace: true });
  };

  const linkFor = (pr: any) => (storeSlug && pr.id ? `/store/${storeSlug}/product/${pr.id}` : "#");
  const Title = p.title ? <h2 className="text-3xl mb-6" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h2> : null;

  const Chips = page === "shop" && categories.length > 0 ? (
    <div className="flex flex-wrap gap-2 mb-8">
      <button
        type="button"
        onClick={() => setCategory("")}
        className="text-xs px-3 py-1.5 border transition"
        style={{
          borderColor: dna.palette?.border,
          borderRadius: "var(--r)",
          background: !selectedCategory ? dna.palette?.primary : "transparent",
          color: !selectedCategory ? dna.palette?.primary_fg : dna.palette?.fg,
        }}
      >
        All ({allItems.length})
      </button>
      {categories.map((cat) => {
        const active = selectedCategory.toLowerCase() === cat.toLowerCase();
        const count = allItems.filter((it) => (it.category || "").toLowerCase() === cat.toLowerCase()).length;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className="text-xs px-3 py-1.5 border transition"
            style={{
              borderColor: dna.palette?.border,
              borderRadius: "var(--r)",
              background: active ? dna.palette?.primary : "transparent",
              color: active ? dna.palette?.primary_fg : dna.palette?.fg,
            }}
          >
            {cat} ({count})
          </button>
        );
      })}
    </div>
  ) : null;

  const Empty = page === "shop" && items.length === 0 ? (
    <div className="py-16 text-center text-sm" style={{ color: dna.palette?.muted }}>
      No products in this category yet.
    </div>
  ) : null;

  if (v === "editorial_list") {
    return (
      <section className="max-w-5xl mx-auto px-6 py-20">
        {Title}
        {Chips}
        {Empty}
        <div className="divide-y" style={{ borderColor: dna.palette?.border }}>
          {items.map((pr: any, i: number) => (
            <Link to={linkFor(pr)} key={i} className="grid grid-cols-[80px,1fr,auto] gap-6 py-6 items-center" style={{ borderColor: dna.palette?.border }}>
              <div className="text-5xl tabular-nums" style={{ color: dna.palette?.muted, fontFamily: "var(--hf)" }}>{String(i + 1).padStart(2, "0")}</div>
              <div>
                <div className="text-xl" style={{ fontFamily: "var(--hf)" }}>{pr.name}</div>
                {pr.badge && <div className="text-xs mt-1" style={{ color: dna.palette?.accent }}>{pr.badge}</div>}
              </div>
              <div className="text-right">
                <div className="text-lg">₹{pr.price}</div>
                {pr.compare_at > pr.price && <div className="text-xs line-through" style={{ color: dna.palette?.muted }}>₹{pr.compare_at}</div>}
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  }
  const cols = v === "grid_minimal" ? "md:grid-cols-3" : "md:grid-cols-4";
  return (
    <section id="products" className="max-w-6xl mx-auto px-6 py-20">
      {Title}
      {Chips}
      {Empty}
      <div className={`grid grid-cols-2 ${cols} gap-6`}>
        {items.map((pr: any, i: number) => (
          <Link to={linkFor(pr)} key={i} className="group">
            <div className="aspect-square mb-3 overflow-hidden relative" style={{ background: dna.palette?.surface, borderRadius: "var(--r)" }}>
              {pr.image && <img src={pr.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
              {pr.badge && <span className="absolute top-2 left-2 text-[10px] px-2 py-1 uppercase tracking-wider z-10" style={{ background: dna.palette?.accent, color: dna.palette?.bg, borderRadius: "var(--r)" }}>{pr.badge}</span>}
            </div>
            <div className="text-sm font-medium">{pr.name}</div>
            <div className="mt-1 text-sm flex gap-2">
              <span>₹{pr.price}</span>
              {pr.compare_at > pr.price && <span className="line-through" style={{ color: dna.palette?.muted }}>₹{pr.compare_at}</span>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}


function Footer({ footer, dna, brandName, storeSlug, onNavigate, footerOv }: any) {
  const ov: FooterOv = footerOv || {};
  const base = storeSlug ? `/store/${storeSlug}` : "";
  const pageToPath: Record<string, string> = {
    home: "", shop: "/shop", collections: "/collections", about: "/about", contact: "/contact",
    journal: "/blog", blog: "/blog", account: "/account", cart: "/cart",
    privacy: "/privacy-policy", terms: "/terms", refund: "/refund-policy",
    return: "/return-policy", shipping: "/shipping-policy",
  };

  // Build merged columns: footerOv.columns overrides; else manifest footer.columns (legacy
  // shape: links as string[] — convert to {label, href}); else sensible defaults.
  const defaultColumns: FooterOv["columns"] = [
    { title: "Shop", links: [
      { label: "All products", href: "", page: "shop" },
      { label: "Cart",         href: "", page: "cart" },
      { label: "My account",   href: "", page: "account" },
    ]},
    { title: "About", links: [
      { label: "About us",     href: "", page: "about" },
      { label: "Journal",      href: "", page: "blog" },
      { label: "Contact",      href: "", page: "contact" },
    ]},
    { title: "Policies", links: [
      { label: "Privacy Policy",  href: "", page: "privacy" },
      { label: "Terms of Service", href: "", page: "terms" },
      { label: "Refund Policy",   href: "", page: "refund" },
      { label: "Shipping Policy", href: "", page: "shipping" },
    ]},
  ];

  let columns = ov.columns;
  if (!columns || columns.length === 0) {
    if (footer?.columns?.length) {
      columns = footer.columns.map((c: any) => ({
        title: c.title,
        links: (c.links ?? []).map((l: any) =>
          typeof l === "string"
            ? { label: l, href: "", page: guessPage(l) }
            : { label: l.label ?? String(l), href: l.href ?? "", page: l.page ?? guessPage(l.label ?? "") }
        ),
      }));
    } else {
      columns = defaultColumns;
    }
  }

  const tagline = ov.tagline ?? footer?.tagline ?? "";
  const renderLink = (l: { label: string; href: string; page?: string }, idx: number) => {
    const to = l.href || (l.page ? `${base}${pageToPath[l.page] ?? `/${l.page}`}` : "");
    const cls = "hover:opacity-100 transition";
    const style = { opacity: 0.75 } as React.CSSProperties;
    if (storeSlug && to) return <Link key={idx} to={to} className={cls} style={style}>{l.label}</Link>;
    if (onNavigate && l.page) return <button key={idx} onClick={() => onNavigate!(l.page!)} className={cls} style={{ ...style, background: "transparent", border: 0, padding: 0, cursor: "pointer", color: "inherit", textAlign: "left" }}>{l.label}</button>;
    return <span key={idx} className={cls} style={style}>{l.label}</span>;
  };

  const social = ov.social || {};
  const showPoweredBy = ov.show_powered_by !== false;

  return (
    <footer className="border-t mt-12" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="text-lg mb-2" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{brandName}</div>
          {tagline && <p style={{ color: dna.palette?.muted }}>{tagline}</p>}
          {(social.instagram || social.facebook || social.twitter || social.youtube) && (
            <div className="mt-3 flex gap-3 text-xs" style={{ color: dna.palette?.muted }}>
              {social.instagram && <a href={social.instagram} target="_blank" rel="noreferrer" className="hover:underline">Instagram</a>}
              {social.facebook  && <a href={social.facebook}  target="_blank" rel="noreferrer" className="hover:underline">Facebook</a>}
              {social.twitter   && <a href={social.twitter}   target="_blank" rel="noreferrer" className="hover:underline">Twitter</a>}
              {social.youtube   && <a href={social.youtube}   target="_blank" rel="noreferrer" className="hover:underline">YouTube</a>}
            </div>
          )}
        </div>
        {columns.map((c, i) => (
          <div key={i}>
            <div className="font-medium mb-3">{c.title}</div>
            <ul className="space-y-2 flex flex-col" style={{ color: dna.palette?.muted }}>
              {(c.links ?? []).map((l, j) => <li key={j}>{renderLink(l, j)}</li>)}
            </ul>
          </div>
        ))}
      </div>
      {showPoweredBy && (
        <div className="border-t" style={{ borderColor: dna.palette?.border }}>
          <div className="max-w-6xl mx-auto px-6 py-4 text-[11px] flex flex-wrap justify-between gap-2" style={{ color: dna.palette?.muted }}>
            <span>© {new Date().getFullYear()} {brandName}. All rights reserved.</span>
            <span>Powered by <a href="https://pictocart.in" target="_blank" rel="noreferrer" className="hover:underline">Pic to Cart</a></span>
          </div>
        </div>
      )}
    </footer>
  );
}

function guessPage(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("privacy"))  return "privacy";
  if (l.includes("term"))     return "terms";
  if (l.includes("refund") || l.includes("return")) return "refund";
  if (l.includes("ship"))     return "shipping";
  if (l.includes("about"))    return "about";
  if (l.includes("contact"))  return "contact";
  if (l.includes("blog") || l.includes("journal")) return "blog";
  if (l.includes("shop") || l.includes("product")) return "shop";
  if (l.includes("cart"))     return "cart";
  if (l.includes("account"))  return "account";
  return "home";
}

/**
 * Testimonials block — uses props.items if provided (manifest/overrides),
 * otherwise auto-loads merchant-managed testimonials from store_testimonials.
 */
function TestimonialsBlock({ p, dna, storeSlug }: any) {
  const [dbItems, setDbItems] = useState<any[]>([]);
  useEffect(() => {
    if (!storeSlug || (p.items && p.items.length)) return;
    (async () => {
      const { data: store } = await supabase.from("stores").select("id").eq("slug", storeSlug).maybeSingle();
      if (!store?.id) return;
      const { data } = await supabase
        .from("store_testimonials")
        .select("customer_name, customer_role, content, rating, photo_url")
        .eq("store_id", store.id)
        .order("display_order", { ascending: true });
      setDbItems(data || []);
    })();
  }, [storeSlug, p.items]);

  const items =
    (p.items && p.items.length ? p.items : dbItems).map((t: any) => ({
      quote: t.quote ?? t.content,
      author: t.author ?? t.customer_name,
      location: t.location ?? t.customer_role ?? "",
      photo: t.photo_url,
      rating: t.rating ?? 5,
    }));

  if (!items.length) return null;

  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      {p.title && <h2 className="text-3xl mb-8 text-center" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h2>}
      <div className="grid md:grid-cols-3 gap-6">
        {items.map((t: any, i: number) => (
          <div key={i} className="p-6" style={{ background: dna.palette?.surface, borderRadius: "var(--r)", border: `1px solid ${dna.palette?.border}` }}>
            <div className="flex gap-1 mb-3">
              {[...Array(t.rating || 5)].map((_, k) => <Star key={k} className="h-4 w-4 fill-current" style={{ color: dna.palette?.accent }} />)}
            </div>
            <p className="text-sm mb-4 leading-relaxed">"{t.quote}"</p>
            <div className="flex items-center gap-3">
              {t.photo && <img src={t.photo} className="h-9 w-9 rounded-full object-cover" />}
              <div className="text-xs" style={{ color: dna.palette?.muted }}>
                <div className="font-medium" style={{ color: dna.palette?.fg }}>{t.author}</div>
                {t.location && <div>{t.location}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Google Reviews block — only renders if store has an active paid connection.
 */
function GoogleReviewsBlock({ p, dna, storeSlug }: any) {
  const [data, setData] = useState<{ conn: any; reviews: any[] } | null>(null);
  useEffect(() => {
    if (!storeSlug) return;
    (async () => {
      const { data: store } = await supabase.from("stores").select("id").eq("slug", storeSlug).maybeSingle();
      if (!store?.id) return;
      const { data: conn } = await supabase
        .from("store_google_reviews_connections")
        .select("*").eq("store_id", store.id).eq("is_active", true).eq("is_paid", true).maybeSingle();
      if (!conn) return;
      const { data: reviews } = await supabase
        .from("store_google_reviews_cache")
        .select("*").eq("store_id", store.id).order("time_unix", { ascending: false }).limit(6);
      setData({ conn, reviews: reviews || [] });
    })();
  }, [storeSlug]);

  if (!data) return null;
  const { conn, reviews } = data;
  if (!reviews.length) return null;

  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <div className="flex items-center justify-center gap-3 mb-3">
        <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9c-.3 1.4-1 2.6-2.2 3.4v2.8h3.6c2.1-2 3.3-4.9 3.3-8.2z"/><path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.8c-1 .7-2.3 1.1-3.7 1.1-2.8 0-5.3-1.9-6.1-4.5H2v2.8C3.9 20.5 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.9 14.2c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2V7H2c-.8 1.5-1.2 3.2-1.2 5s.4 3.5 1.2 5l3.9-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1C17.4 2.1 14.9 1 12 1 7.7 1 3.9 3.5 2 7l3.9 2.8C6.7 7.3 9.2 5.4 12 5.4z"/></svg>
        <span className="text-sm font-semibold" style={{ color: dna.palette?.muted }}>From Google Reviews</span>
      </div>
      <div className="text-center mb-8">
        <h2 className="text-3xl" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title || "What our customers say"}</h2>
        {conn.average_rating != null && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-2xl font-bold">{Number(conn.average_rating).toFixed(1)}</span>
            <div className="flex">{[...Array(5)].map((_, k) => <Star key={k} className={`h-4 w-4 ${k < Math.round(conn.average_rating) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />)}</div>
            <span className="text-sm" style={{ color: dna.palette?.muted }}>({conn.total_reviews} reviews)</span>
          </div>
        )}
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {reviews.map((r) => (
          <div key={r.id} className="p-6" style={{ background: dna.palette?.surface, borderRadius: "var(--r)", border: `1px solid ${dna.palette?.border}` }}>
            <div className="flex items-center gap-3 mb-3">
              {r.author_photo_url ? (
                <img src={r.author_photo_url} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full flex items-center justify-center font-semibold" style={{ background: dna.palette?.bg }}>{r.author_name?.charAt(0)}</div>
              )}
              <div>
                <div className="text-sm font-medium">{r.author_name}</div>
                <div className="text-xs" style={{ color: dna.palette?.muted }}>{r.relative_time}</div>
              </div>
            </div>
            <div className="flex mb-2">{[...Array(r.rating || 5)].map((_, k) => <Star key={k} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}</div>
            <p className="text-sm leading-relaxed line-clamp-5">{r.text}</p>
          </div>
        ))}
      </div>
      {conn.business_url && (
        <div className="text-center mt-6">
          <a href={conn.business_url} target="_blank" rel="noreferrer" className="text-sm underline" style={{ color: dna.palette?.muted }}>
            See all reviews on Google
          </a>
        </div>
      )}
    </section>
  );
}
