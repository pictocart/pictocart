import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Truck, Shield, RefreshCw, Headphones, Lock, Tag, Gift, Sparkles, Star, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/useCart";

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
type Overrides = { sections?: Record<string | number, any>; brand_name?: string } | undefined;

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
  /** Real catalog products to splice into product_grid sections. */
  products?: Array<{ id: string; title: string; price: number; compare_at_price?: number | null; images?: string[] | null }>;
}

export default function MasterThemeRenderer({ manifest, page = "home", overrides, storeSlug, products }: Props) {
  const dna = manifest?.dna ?? {};
  const palette = dna.palette ?? {};
  const fonts = dna.fonts ?? {};
  const radius = dna.radius ?? "8px";
  const headerStyle = manifest?.header_style ?? dna.layout?.header_style ?? "classic";
  const brandName = overrides?.brand_name || dna.name;

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

  const sections = manifest?.pages?.[page]?.sections ?? [];
  // New shape: overrides.pages[page].sections[idx]. Legacy: overrides.sections[idx] (home-only).
  const sectionOverrides: Record<string, any> =
    (overrides as any)?.pages?.[page]?.sections ??
    (page === "home" ? (overrides as any)?.sections ?? {} : {});

  // Inject real products into the first product/trending section if products were supplied.
  const productItemsForOverride = products && products.length > 0
    ? products.slice(0, 8).map((p) => ({
        id: p.id, name: p.title, price: p.price, compare_at: p.compare_at_price,
        image: p.images?.[0],
      }))
    : null;
  let productSectionInjected = false;

  return (
    <div style={style} className="min-h-screen">
      <Header dna={dna} brandName={brandName} variant={headerStyle} storeSlug={storeSlug} />
      {sections.map((s: any, i: number) => {
        // Merge overrides on top of manifest props.
        const ov = sectionOverrides[i] ?? sectionOverrides[String(i)] ?? {};
        const mergedProps = { ...(s.props ?? {}), ...ov };
        // First product/trending section gets real products if available.
        if (productItemsForOverride && !productSectionInjected && (s.type === "product_grid" || s.type === "trending")) {
          mergedProps.items = productItemsForOverride;
          productSectionInjected = true;
        }
        const anchorMap: Record<string, string> = {
          product_grid: "products", trending: "products",
          category_grid: "categories",
          story: "about",
          newsletter: "contact",
        };
        const anchorId = anchorMap[s.type];
        return (
          <div key={i} id={anchorId} style={{ scrollMarginTop: 80 }}>
            <Section s={{ ...s, props: mergedProps }} dna={dna} storeSlug={storeSlug} />
          </div>
        );
      })}
      <Footer footer={manifest?.footer} dna={dna} brandName={brandName} />
    </div>
  );
}

function Header({ dna, brandName, variant = "classic", storeSlug }: any) {
  const base = storeSlug ? `/store/${storeSlug}` : "";
  const links: Array<{ label: string; to: string }> = [
    { label: "Shop", to: `${base}/shop` },
    { label: "Collections", to: `${base}/collections` },
    { label: "About", to: `${base}/about` },
    { label: "Journal", to: `${base}/blog` },
    { label: "Contact", to: `${base}/contact` },
  ];
  const { totalItems } = useCart(storeSlug || "");
  const wrap = "sticky top-0 z-10 border-b backdrop-blur";
  const bg = { background: `${dna.palette?.bg}ee`, borderColor: dna.palette?.border };
  const brandSize = variant === "bold_serif" ? 32 : variant === "minimal_thin" ? 16 : 22;
  const Brand = storeSlug
    ? <Link to={`/store/${storeSlug}`} style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700, fontSize: brandSize, color: dna.palette?.fg }}>{brandName}</Link>
    : <div style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700, fontSize: brandSize }}>{brandName}</div>;
  const CartBtn = storeSlug ? (
    <Link to={`/store/${storeSlug}/cart`} className="text-sm px-4 py-2 inline-flex items-center gap-2" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>
      <ShoppingBag className="h-4 w-4" /> Cart · {totalItems}
    </Link>
  ) : (
    <button className="text-sm px-4 py-2" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>Cart · 0</button>
  );
  const renderLink = (l: { label: string; to: string }, cls: string) =>
    storeSlug
      ? <Link key={l.label} to={l.to} className={cls} style={{ opacity: 0.85 }}>{l.label}</Link>
      : <span key={l.label} className={cls} style={{ opacity: 0.85 }}>{l.label}</span>;

  if (variant === "centered_logo") {
    return (
      <header className={wrap} style={bg}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col items-center gap-2">
          {Brand}
          <nav className="flex gap-6 text-xs uppercase tracking-widest" style={{ color: dna.palette?.muted }}>
            {links.map(l => renderLink(l, "hover:opacity-100 transition"))}
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
        {CartBtn}
      </div>
    </header>
  );
}

function Section({ s, dna, storeSlug }: any) {
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
    case "category_grid": return <CategoryBlock p={p} dna={dna} />;
    case "trending":
    case "product_grid": return <ProductBlock p={p} dna={dna} storeSlug={storeSlug} />;
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
    case "testimonials": return (
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {(p.items ?? []).map((t: any, i: number) => (
            <div key={i} className="p-6" style={{ background: dna.palette?.surface, borderRadius: "var(--r)", border: `1px solid ${dna.palette?.border}` }}>
              <div className="flex gap-1 mb-3">{[...Array(5)].map((_, k) => <Star key={k} className="h-4 w-4 fill-current" style={{ color: dna.palette?.accent }} />)}</div>
              <p className="text-sm mb-4 leading-relaxed">"{t.quote}"</p>
              <div className="text-xs" style={{ color: dna.palette?.muted }}>— {t.author}, {t.location}</div>
            </div>
          ))}
        </div>
      </section>
    );
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
    default: return null;
  }
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

function Hero({ p, dna, storeSlug }: any) {
  const v = p.style ?? "centered";
  const headingFont = { fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 } as React.CSSProperties;
  const shopHref = storeSlug ? `/store/${storeSlug}/shop` : "#products";
  const Btns = (
    <div className="mt-8 flex gap-3 flex-wrap">
      <a href={shopHref} className="px-7 py-3 text-sm font-medium inline-block" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>{p.cta}</a>
      {p.cta_secondary && <a href={shopHref} className="px-7 py-3 text-sm font-medium border inline-block" style={{ borderColor: "var(--bd)", color: "var(--fg)", borderRadius: "var(--r)" }}>{p.cta_secondary}</a>}
    </div>
  );
  if (v === "split") {
    return (
      <section className="grid md:grid-cols-2" style={{ background: dna.palette?.surface }}>
        <div className="px-6 md:px-12 py-20 md:py-32 flex flex-col justify-center">
          {p.kicker && <div className="text-xs uppercase tracking-[0.3em] mb-4" style={{ color: dna.palette?.accent }}>{p.kicker}</div>}
          <h1 className="text-5xl md:text-6xl leading-tight" style={headingFont}>{p.title}</h1>
          {p.sub && <p className="mt-5 text-lg" style={{ color: dna.palette?.muted }}>{p.sub}</p>}
          {Btns}
        </div>
        <div className="min-h-[400px]">{p.image && <img src={p.image} className="w-full h-full object-cover" />}</div>
      </section>
    );
  }
  if (v === "magazine" || v === "editorial_serif") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-24">
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
        {p.image && <img src={p.image} className="mt-12 w-full aspect-[21/9] object-cover" style={{ borderRadius: "var(--r)" }} />}
      </section>
    );
  }
  if (v === "fullscreen_image") {
    return (
      <section className="relative h-[80vh] min-h-[500px] overflow-hidden">
        {p.image && <img src={p.image} className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />
        <div className="relative h-full flex items-center justify-center text-center px-6">
          <div style={{ color: "#fff" }}>
            {p.kicker && <div className="text-xs uppercase tracking-[0.4em] mb-4 opacity-80">{p.kicker}</div>}
            <h1 className="text-5xl md:text-7xl max-w-4xl mx-auto" style={headingFont}>{p.title}</h1>
            {p.sub && <p className="mt-5 max-w-xl mx-auto opacity-90">{p.sub}</p>}
            <div className="mt-8 flex gap-3 justify-center">
              <a href={shopHref} className="px-7 py-3 text-sm inline-block" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>{p.cta}</a>
            </div>
          </div>
        </div>
      </section>
    );
  }
  if (v === "minimal_left") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-32">
        {p.kicker && <div className="text-xs uppercase tracking-[0.3em] mb-6" style={{ color: dna.palette?.accent }}>{p.kicker}</div>}
        <h1 className="text-5xl md:text-7xl max-w-2xl" style={headingFont}>{p.title}</h1>
        {p.sub && <p className="mt-6 text-lg max-w-md" style={{ color: dna.palette?.muted }}>{p.sub}</p>}
        {Btns}
      </section>
    );
  }
  if (v === "asymmetric") {
    return (
      <section className="relative overflow-hidden" style={{ background: dna.palette?.surface }}>
        <div className="absolute -right-20 -top-10 w-2/3 h-full">{p.image && <img src={p.image} className="w-full h-full object-cover" style={{ clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0% 100%)" }} />}</div>
        <div className="relative max-w-6xl mx-auto px-6 py-32 md:py-40">
          {p.kicker && <div className="text-xs uppercase tracking-[0.3em] mb-4" style={{ color: dna.palette?.accent }}>{p.kicker}</div>}
          <h1 className="text-5xl md:text-7xl max-w-xl" style={headingFont}>{p.title}</h1>
          {p.sub && <p className="mt-5 max-w-sm" style={{ color: dna.palette?.muted }}>{p.sub}</p>}
          {Btns}
        </div>
      </section>
    );
  }
  return (
    <section className="relative overflow-hidden" style={{ background: dna.palette?.surface }}>
      {p.image && <img src={p.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
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

function CategoryBlock({ p, dna }: any) {
  const v = p.style ?? "grid_4";
  const items = p.items ?? [];
  const Title = <h2 className="text-3xl mb-10" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h2>;
  if (v === "carousel_strip") {
    return (
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">{Title}</div>
        <div className="flex gap-4 overflow-x-auto px-6 pb-2 snap-x">
          {items.map((c: any, i: number) => (
            <a key={i} className="snap-start shrink-0 w-72 aspect-[4/5] relative overflow-hidden" style={{ borderRadius: "var(--r)" }}>
              {c.image && <img src={c.image} className="w-full h-full object-cover" />}
              <div className="absolute bottom-0 inset-x-0 p-4 text-white" style={{ background: "linear-gradient(180deg,transparent,rgba(0,0,0,0.7))" }}>{c.name}</div>
            </a>
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
            <a key={i} className="flex flex-col items-center gap-3">
              <div className="w-32 h-32 rounded-full overflow-hidden border" style={{ borderColor: dna.palette?.border }}>
                {c.image && <img src={c.image} className="w-full h-full object-cover" />}
              </div>
              <span className="text-sm">{c.name}</span>
            </a>
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
          <a className="relative aspect-[4/5] md:aspect-auto overflow-hidden" style={{ borderRadius: "var(--r)" }}>
            {first.image && <img src={first.image} className="w-full h-full object-cover" />}
            <div className="absolute bottom-6 left-6 right-6 text-white"><div className="text-2xl" style={{ fontFamily: "var(--hf)" }}>{first.name}</div></div>
          </a>
        )}
        <div className="grid grid-cols-2 gap-4">
          {rest.slice(0, 3).map((c: any, i: number) => (
            <a key={i} className="relative aspect-square overflow-hidden" style={{ borderRadius: "var(--r)" }}>
              {c.image && <img src={c.image} className="w-full h-full object-cover" />}
              <div className="absolute bottom-3 left-3 text-white text-sm">{c.name}</div>
            </a>
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
              <a key={i} className="relative overflow-hidden" style={{ borderRadius: "var(--r)", gridRow: tall ? "span 2" : undefined, aspectRatio: tall ? "3/5" : "1/1" }}>
                {c.image && <img src={c.image} className="w-full h-full object-cover" />}
                <div className="absolute bottom-3 left-3 text-white text-sm">{c.name}</div>
              </a>
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
          <a key={i} className="group block aspect-[3/4] relative overflow-hidden" style={{ borderRadius: "var(--r)" }}>
            {c.image ? <img src={c.image} className="w-full h-full object-cover transition-transform group-hover:scale-105" /> : <div className="w-full h-full" style={{ background: dna.palette?.surface }} />}
            <div className="absolute inset-0 flex items-end p-4" style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.7))" }}>
              <span className="text-white font-medium" style={{ fontFamily: "var(--hf)" }}>{c.name}</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function ProductBlock({ p, dna, storeSlug }: any) {
  const v = p.style ?? "grid_clean";
  const items = p.items ?? [];
  const linkFor = (pr: any) => (storeSlug && pr.id ? `/store/${storeSlug}/product/${pr.id}` : "#");
  const Title = p.title ? <h2 className="text-3xl mb-10" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h2> : null;
  if (v === "editorial_list") {
    return (
      <section className="max-w-5xl mx-auto px-6 py-20">
        {Title}
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

function Footer({ footer, dna, brandName }: any) {
  if (!footer) return null;
  return (
    <footer className="border-t mt-12" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="text-lg mb-2" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{brandName}</div>
          <p style={{ color: dna.palette?.muted }}>{footer.tagline}</p>
        </div>
        {(footer.columns ?? []).map((c: any, i: number) => (
          <div key={i}>
            <div className="font-medium mb-3">{c.title}</div>
            <ul className="space-y-2" style={{ color: dna.palette?.muted }}>
              {(c.links ?? []).map((l: string, j: number) => <li key={j}>{l}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
