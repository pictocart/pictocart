import { useMemo } from "react";
import { Truck, Shield, RefreshCw, Headphones, Lock, Tag, Gift, Sparkles, Star, Mail } from "lucide-react";

const ICONS: Record<string, any> = { truck: Truck, shield: Shield, refresh: RefreshCw, headphones: Headphones, lock: Lock, tag: Tag, gift: Gift, sparkles: Sparkles };

type Manifest = any;

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

export default function ThemeRenderer({ manifest, page = "home" }: { manifest: Manifest; page?: string }) {
  const dna = manifest?.dna ?? {};
  const palette = dna.palette ?? {};
  const fonts = dna.fonts ?? {};
  const radius = dna.radius ?? "8px";
  const headerStyle = manifest?.header_style ?? dna.layout?.header_style ?? "classic";

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

  return (
    <div style={style} className="min-h-screen">
      <Header dna={dna} variant={headerStyle} />
      {sections.map((s: any, i: number) => <Section key={i} s={s} dna={dna} />)}
      <Footer footer={manifest?.footer} dna={dna} variant={manifest?.footer_style} />
    </div>
  );
}

function Header({ dna, variant = "classic" }: any) {
  const links = ["Shop","Collections","About","Journal","Contact"];
  const wrap = "sticky top-0 z-10 border-b backdrop-blur";
  const bg = { background: `${dna.palette?.bg}ee`, borderColor: dna.palette?.border };
  const brandSize = variant === "bold_serif" ? 32 : variant === "minimal_thin" ? 16 : 22;
  if (variant === "centered_logo") {
    return (
      <header className={wrap} style={bg}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col items-center gap-2">
          <div style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700, fontSize: brandSize }}>{dna.name}</div>
          <nav className="flex gap-6 text-xs uppercase tracking-widest" style={{ color: dna.palette?.muted }}>{links.map(l => <a key={l}>{l}</a>)}</nav>
        </div>
      </header>
    );
  }
  return (
    <header className={wrap} style={bg}>
      <div className={`max-w-6xl mx-auto px-6 ${variant === "minimal_thin" ? "h-12" : "h-16"} flex items-center justify-between`}>
        <div style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700, fontSize: brandSize }}>{dna.name}</div>
        <nav className="hidden md:flex gap-6 text-sm" style={{ color: dna.palette?.muted }}>
          {links.map(l => <a key={l} style={{ opacity: 0.85 }}>{l}</a>)}
        </nav>
        <button className="text-sm px-4 py-2" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>Cart · 0</button>
      </div>
    </header>
  );
}

function Section({ s, dna }: any) {
  const p = s.props ?? {};
  switch (s.type) {
    case "hero": return <Hero p={p} dna={dna} />;
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
    case "product_grid": return <ProductBlock p={p} dna={dna} />;
    case "promo_banner": return <PromoBannerBlock p={p} dna={dna} />;
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
    case "product_detail": return (
      <section className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-12">
        <div className="aspect-square overflow-hidden" style={{ background: dna.palette?.surface, borderRadius: "var(--r)" }}>
          {p.image && <img src={p.image} className="w-full h-full object-cover" />}
        </div>
        <div>
          <h1 className="text-3xl mb-3" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.product?.name}</h1>
          <div className="text-2xl mb-6">₹{p.product?.price} <span className="text-base line-through ml-2" style={{ color: dna.palette?.muted }}>₹{p.product?.compare_at}</span></div>
          <p className="mb-6 text-sm leading-relaxed" style={{ color: dna.palette?.muted }}>Premium quality, handpicked for you. Ships across India in 3-5 days.</p>
          <button className="px-8 py-4 text-sm font-medium w-full" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>Add to cart</button>
        </div>
      </section>
    );
    case "contact_form": return (
      <section className="max-w-xl mx-auto px-6 py-12">
        <div className="space-y-4">
          <input placeholder="Your name" className="w-full px-4 py-3 text-sm border" style={{ background: dna.palette?.surface, borderColor: dna.palette?.border, borderRadius: "var(--r)" }} />
          <input placeholder="Email" className="w-full px-4 py-3 text-sm border" style={{ background: dna.palette?.surface, borderColor: dna.palette?.border, borderRadius: "var(--r)" }} />
          <textarea placeholder="Message" rows={5} className="w-full px-4 py-3 text-sm border" style={{ background: dna.palette?.surface, borderColor: dna.palette?.border, borderRadius: "var(--r)" }} />
          <button className="px-8 py-3 text-sm font-medium" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>Send</button>
          <div className="text-xs pt-4" style={{ color: dna.palette?.muted }}>{p.email} · {p.phone}</div>
        </div>
      </section>
    );
    default: return null;
  }
}

function Hero({ p, dna }: any) {
  const v = p.style ?? "centered";
  const headingFont = { fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 } as React.CSSProperties;
  const Btns = (
    <div className="mt-8 flex gap-3 flex-wrap">
      <button className="px-7 py-3 text-sm font-medium" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>{p.cta}</button>
      {p.cta_secondary && <button className="px-7 py-3 text-sm font-medium border" style={{ borderColor: "var(--bd)", color: "var(--fg)", borderRadius: "var(--r)" }}>{p.cta_secondary}</button>}
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
              <button className="px-7 py-3 text-sm" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>{p.cta}</button>
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
  // centered (default)
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
              <div className="w-32 h-32 rounded-full overflow-hidden border" style={{ borderColor: dna.palette?.border }}>{c.image && <img src={c.image} className="w-full h-full object-cover" />}</div>
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
  // grid_4 (default)
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

function ProductBlock({ p, dna }: any) {
  const v = p.style ?? "grid_clean";
  const fallbackItems = [
    {
      id: "dummy-1",
      name: "Classic Cotton Tee",
      price: 1299,
      compare_at: 1999,
      image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=60",
      category: "Category 1",
      badge: "Best Seller"
    },
    {
      id: "dummy-2",
      name: "Tailored Linen Blazer",
      price: 4999,
      compare_at: 6999,
      image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&auto=format&fit=crop&q=60",
      category: "Category 2",
      badge: "New Arrival"
    },
    {
      id: "dummy-3",
      name: "Vintage Denim Jacket",
      price: 2499,
      compare_at: 3499,
      image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&auto=format&fit=crop&q=60",
      category: "Category 3",
      badge: "Trending"
    },
    {
      id: "dummy-4",
      name: "Minimalist Leather Sneakers",
      price: 3499,
      compare_at: 4999,
      image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=60",
      category: "Category 4",
      badge: "Must Have"
    }
  ];
  const items = (p.items && p.items.length > 0) ? p.items : fallbackItems;
  const Title = p.title ? <h2 className="text-3xl mb-10" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h2> : null;
  if (v === "editorial_list") {
    return (
      <section className="max-w-5xl mx-auto px-6 py-20">
        {Title}
        <div className="divide-y" style={{ borderColor: dna.palette?.border }}>
          {items.map((pr: any, i: number) => (
            <div key={i} className="grid grid-cols-[80px,1fr,auto] gap-6 py-6 items-center" style={{ borderColor: dna.palette?.border }}>
              <div className="text-5xl tabular-nums" style={{ color: dna.palette?.muted, fontFamily: "var(--hf)" }}>{String(i+1).padStart(2,"0")}</div>
              <div>
                <div className="text-xl" style={{ fontFamily: "var(--hf)" }}>{pr.name}</div>
                {pr.badge && <div className="text-xs mt-1" style={{ color: dna.palette?.accent }}>{pr.badge}</div>}
              </div>
              <div className="text-right">
                <div className="text-lg">₹{pr.price}</div>
                {pr.compare_at > pr.price && <div className="text-xs line-through" style={{ color: dna.palette?.muted }}>₹{pr.compare_at}</div>}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }
  if (v === "cards_shadow") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-20">
        {Title}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {items.map((pr: any, i: number) => (
            <div key={i} className="overflow-hidden" style={{ background: dna.palette?.surface, borderRadius: "var(--r)", boxShadow: "0 20px 50px -20px rgba(0,0,0,0.25)" }}>
              <div className="aspect-square relative" style={{ background: dna.palette?.bg }}>
                {pr.badge && <span className="absolute top-3 left-3 text-[10px] px-2 py-1 uppercase z-10" style={{ background: dna.palette?.accent, color: dna.palette?.bg }}>{pr.badge}</span>}
              </div>
              <div className="p-4">
                <div className="text-sm font-medium">{pr.name}</div>
                <div className="mt-1 text-sm">₹{pr.price}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }
  if (v === "mosaic") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-20">
        {Title}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ gridAutoRows: "180px" }}>
          {items.map((pr: any, i: number) => (
            <div key={i} className="relative overflow-hidden p-4 flex flex-col justify-end" style={{ background: dna.palette?.surface, borderRadius: "var(--r)", gridRow: i % 5 === 0 ? "span 2" : undefined, gridColumn: i % 7 === 0 ? "span 2" : undefined }}>
              <div className="text-sm font-medium">{pr.name}</div>
              <div className="text-xs" style={{ color: dna.palette?.muted }}>₹{pr.price}</div>
            </div>
          ))}
        </div>
      </section>
    );
  }
  // grid_clean / grid_minimal
  const cols = v === "grid_minimal" ? "md:grid-cols-3" : "md:grid-cols-4";
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      {Title}
      <div className={`grid grid-cols-2 ${cols} gap-6`}>
        {items.map((pr: any, i: number) => (
          <div key={i}>
            <div className="aspect-square mb-3 overflow-hidden relative" style={{ background: dna.palette?.surface, borderRadius: "var(--r)" }}>
              {pr.badge && <span className="absolute top-2 left-2 text-[10px] px-2 py-1 uppercase tracking-wider z-10" style={{ background: dna.palette?.accent, color: dna.palette?.bg, borderRadius: "var(--r)" }}>{pr.badge}</span>}
            </div>
            <div className="text-sm font-medium">{pr.name}</div>
            <div className="mt-1 text-sm flex gap-2">
              <span>₹{pr.price}</span>
              {pr.compare_at > pr.price && <span className="line-through" style={{ color: dna.palette?.muted }}>₹{pr.compare_at}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer({ footer, dna, variant }: any) {
  if (!footer) return null;
  const brandName = dna.name || "Store";
  const tagline = footer.tagline || "";
  const v = variant ?? "classic";
  const columns = footer.columns || [];

  const SocialLinks = () => (
    <div className="flex gap-4 text-xs mt-3" style={{ color: dna.palette?.muted }}>
      <span className="opacity-75">Instagram</span>
      <span className="opacity-75">Facebook</span>
      <span className="opacity-75">Twitter</span>
    </div>
  );

  const PoweredBy = () => (
    <div className="text-[11px] text-center md:text-right" style={{ color: dna.palette?.muted }}>
      Powered by <span className="hover:underline font-semibold">Pic to Cart</span>
    </div>
  );

  const Copyright = () => (
    <div className="text-[11px]" style={{ color: dna.palette?.muted }}>
      © {new Date().getFullYear()} {brandName}. All rights reserved.
    </div>
  );

  if (v === "minimal_center") {
    return (
      <footer className="border-t py-12" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="text-2xl font-black tracking-tight" style={{ fontFamily: "var(--hf)" }}>{brandName}</div>
          {tagline && <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: dna.palette?.muted }}>{tagline}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm font-medium">
            {columns.flatMap((c: any) => c.links ?? []).map((l: any, idx: number) => (
              <span key={idx} style={{ opacity: 0.75 }}>{typeof l === "string" ? l : l.label}</span>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <SocialLinks />
          </div>
          <div className="mt-8 border-t pt-6 flex flex-col items-center justify-between sm:flex-row gap-4" style={{ borderColor: dna.palette?.border }}>
            <Copyright />
            <PoweredBy />
          </div>
        </div>
      </footer>
    );
  }

  if (v === "newsletter_integrated") {
    return (
      <footer className="border-t py-16" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="text-xl font-bold" style={{ fontFamily: "var(--hf)" }}>{brandName}</div>
            <p className="mt-2 text-sm mb-6" style={{ color: dna.palette?.muted }}>Subscribe to receive updates, access to exclusive deals, and more.</p>
            <div className="flex gap-2 max-w-md">
              <input placeholder="Enter your email" className="flex-1 px-4 py-2.5 text-xs border" style={{ background: dna.palette?.bg, borderColor: dna.palette?.border, borderRadius: "var(--r)" }} readOnly />
              <button className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white" style={{ background: dna.palette?.primary, borderRadius: "var(--r)" }}>Join</button>
            </div>
            <SocialLinks />
          </div>
          <div className="lg:col-span-7 grid grid-cols-3 gap-8">
            {columns.map((c: any, i: number) => (
              <div key={i}>
                <div className="font-semibold text-xs uppercase tracking-wider mb-4">{c.title}</div>
                <ul className="space-y-2.5 text-sm flex flex-col" style={{ color: dna.palette?.muted }}>
                  {(c.links ?? []).map((l: any, j: number) => <li key={j} style={{ opacity: 0.75 }}>{typeof l === "string" ? l : l.label}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 border-t mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderColor: dna.palette?.border }}>
          <Copyright />
          <PoweredBy />
        </div>
      </footer>
    );
  }

  if (v === "dark_editorial") {
    return (
      <footer className="py-20 text-white bg-neutral-900 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-12 gap-12">
          <div className="md:col-span-4 flex flex-col justify-between">
            <div>
              <div className="text-3xl font-serif font-black uppercase tracking-widest">{brandName}</div>
              {tagline && <p className="mt-4 text-xs text-neutral-400 font-serif leading-relaxed italic">{tagline}</p>}
            </div>
            <div className="mt-8">
              <SocialLinks />
            </div>
          </div>
          <div className="md:col-span-8 grid grid-cols-3 gap-8">
            {columns.map((c: any, i: number) => (
              <div key={i}>
                <div className="font-serif text-sm border-b border-neutral-800 pb-3 mb-4 uppercase tracking-widest text-neutral-300">{c.title}</div>
                <ul className="space-y-2 text-xs flex flex-col text-neutral-400">
                  {(c.links ?? []).map((l: any, j: number) => <li key={j} style={{ opacity: 0.75 }}>{typeof l === "string" ? l : l.label}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 border-t border-neutral-800 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-neutral-500" style={{ fontFamily: "Georgia, serif" }}>
          <span>© {new Date().getFullYear()} {brandName}. Editorial Edition.</span>
          <PoweredBy />
        </div>
      </footer>
    );
  }

  if (v === "badge_social") {
    return (
      <footer className="border-t py-16" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="flex-1 grid grid-cols-3 gap-8 w-full">
            {columns.map((c: any, i: number) => (
              <div key={i}>
                <div className="font-bold text-sm mb-4 text-slate-800">{c.title}</div>
                <ul className="space-y-2 text-sm flex flex-col" style={{ color: dna.palette?.muted }}>
                  {(c.links ?? []).map((l: any, j: number) => <li key={j} style={{ opacity: 0.75 }}>{typeof l === "string" ? l : l.label}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="shrink-0 flex flex-col items-center md:items-end w-full md:w-auto">
            <div className="w-24 h-24 rounded-full border-4 border-dashed flex items-center justify-center text-center p-3 text-xs font-bold leading-tight select-none rotate-6" style={{ borderColor: dna.palette?.accent, color: dna.palette?.accent }}>
              {brandName.toUpperCase()} EST
            </div>
            <div className="mt-6">
              <SocialLinks />
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 border-t mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderColor: dna.palette?.border }}>
          <Copyright />
          <PoweredBy />
        </div>
      </footer>
    );
  }

  if (v === "two_column_split") {
    return (
      <footer className="border-t py-16" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12">
          <div className="pr-6">
            <div className="text-3xl font-extrabold" style={{ fontFamily: "var(--hf)", color: dna.palette?.primary }}>{brandName}</div>
            <p className="mt-4 text-sm max-w-sm leading-relaxed" style={{ color: dna.palette?.muted }}>{tagline || "We build premium products that stand out from the crowd with elegant structural design standards."}</p>
            <div className="mt-6">
              <SocialLinks />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {columns.map((c: any, i: number) => (
              <div key={i}>
                <div className="font-semibold text-xs tracking-wider uppercase mb-4">{c.title}</div>
                <ul className="space-y-2.5 text-sm flex flex-col" style={{ color: dna.palette?.muted }}>
                  {(c.links ?? []).map((l: any, j: number) => <li key={j} style={{ opacity: 0.75 }}>{typeof l === "string" ? l : l.label}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 border-t mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderColor: dna.palette?.border }}>
          <Copyright />
          <PoweredBy />
        </div>
      </footer>
    );
  }

  if (v === "minimalist_strip") {
    return (
      <footer className="border-t py-8 text-xs" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold">{brandName}</span>
            <span className="opacity-50">|</span>
            <Copyright />
          </div>
          <div className="flex flex-wrap gap-4 text-slate-505 justify-center">
            {columns.flatMap((c: any) => c.links ?? []).slice(0, 5).map((l: any, idx: number) => (
              <span key={idx} style={{ opacity: 0.75 }}>{typeof l === "string" ? l : l.label}</span>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <SocialLinks />
            <PoweredBy />
          </div>
        </div>
      </footer>
    );
  }

  if (v === "accent_banner") {
    return (
      <footer className="py-16 text-center text-white" style={{ background: dna.palette?.primary }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-3xl font-bold uppercase tracking-widest">{brandName}</div>
          {tagline && <p className="mt-3 text-sm opacity-80 max-w-md mx-auto">{tagline}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-8 text-sm font-semibold text-white/90">
            {columns.flatMap((c: any) => c.links ?? []).map((l: any, idx: number) => (
              <span key={idx} className="hover:text-white underline-offset-4 hover:underline">{typeof l === "string" ? l : l.label}</span>
            ))}
          </div>
          <div className="mt-8 flex justify-center text-white/80">
            <SocialLinks />
          </div>
          <div className="mt-12 border-t border-white/20 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-white/60">
            <span>© {new Date().getFullYear()} {brandName}. Built with pride.</span>
            <PoweredBy />
          </div>
        </div>
      </footer>
    );
  }

  if (v === "masonry_categories") {
    return (
      <footer className="border-t py-16" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-6">
          {columns.map((c: any, i: number) => (
            <div key={i} className="p-6 border border-dashed rounded-2xl" style={{ borderColor: dna.palette?.border }}>
              <div className="font-bold text-sm tracking-wider uppercase mb-4 text-slate-800">{c.title}</div>
              <ul className="space-y-3 text-sm flex flex-col" style={{ color: dna.palette?.muted }}>
                {(c.links ?? []).map((l: any, j: number) => <li key={j} className="hover:translate-x-1 transition-transform" style={{ opacity: 0.75 }}>{typeof l === "string" ? l : l.label}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto px-6 border-t mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderColor: dna.palette?.border }}>
          <Copyright />
          <PoweredBy />
        </div>
      </footer>
    );
  }

  if (v === "three_row_editorial") {
    return (
      <footer className="border-t py-12" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col gap-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b" style={{ borderColor: dna.palette?.border }}>
            <div>
              <div className="text-2xl font-bold uppercase tracking-tight">{brandName}</div>
              {tagline && <p className="text-xs mt-1" style={{ color: dna.palette?.muted }}>{tagline}</p>}
            </div>
            <SocialLinks />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {columns.map((c: any, i: number) => (
              <div key={i}>
                <div className="font-semibold text-xs tracking-wider uppercase mb-3">{c.title}</div>
                <ul className="space-y-2 text-sm flex flex-col" style={{ color: dna.palette?.muted }}>
                  {(c.links ?? []).map((l: any, j: number) => <li key={j} style={{ opacity: 0.75 }}>{typeof l === "string" ? l : l.label}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs" style={{ borderColor: dna.palette?.border }}>
            <Copyright />
            <PoweredBy />
          </div>
        </div>
      </footer>
    );
  }

  if (v === "floating_pills") {
    return (
      <footer className="border-t py-16" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
        <div className="max-w-4xl mx-auto px-6 text-center flex flex-col items-center">
          <div className="text-xl font-bold mb-4">{brandName}</div>
          <div className="flex flex-wrap justify-center gap-3">
            {columns.flatMap((c: any) => c.links ?? []).map((l: any, idx: number) => (
              <div key={idx} className="px-4 py-2 border text-xs tracking-wider font-semibold rounded-full hover:bg-slate-50 transition" style={{ borderColor: dna.palette?.border }}>
                <span style={{ opacity: 0.75 }}>{typeof l === "string" ? l : l.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <SocialLinks />
          </div>
          <div className="mt-12 border-t pt-6 flex justify-between items-center w-full" style={{ borderColor: dna.palette?.border }}>
            <Copyright />
            <PoweredBy />
          </div>
        </div>
      </footer>
    );
  }

  if (v === "bordered_cards") {
    return (
      <footer className="border-t py-16" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-y" style={{ borderColor: dna.palette?.border }}>
          {columns.map((c: any, i: number) => (
            <div key={i} className="p-8 flex flex-col justify-start">
              <div className="font-bold text-xs uppercase tracking-widest mb-4 text-slate-800">{c.title}</div>
              <ul className="space-y-2 text-sm flex flex-col" style={{ color: dna.palette?.muted }}>
                {(c.links ?? []).map((l: any, j: number) => <li key={j} style={{ opacity: 0.75 }}>{typeof l === "string" ? l : l.label}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto px-6 mt-12 flex flex-col sm:flex-row justify-between items-center gap-4">
          <Copyright />
          <PoweredBy />
        </div>
      </footer>
    );
  }

  if (v === "big_tagline") {
    return (
      <footer className="border-t py-16" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col gap-12">
          <div>
            <h2 className="text-4xl md:text-5xl font-black leading-none text-slate-800" style={{ fontFamily: "var(--hf)" }}>{brandName}</h2>
            <p className="mt-4 text-xl md:text-2xl font-light text-slate-500 max-w-xl">{tagline || "Providing quality designs, handcrafted precision, and bespoke style elements."}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 border-t pt-10" style={{ borderColor: dna.palette?.border }}>
            {columns.map((c: any, i: number) => (
              <div key={i}>
                <div className="font-semibold text-xs tracking-wider uppercase mb-3">{c.title}</div>
                <ul className="space-y-2 text-sm flex flex-col" style={{ color: dna.palette?.muted }}>
                  {(c.links ?? []).map((l: any, j: number) => <li key={j} style={{ opacity: 0.75 }}>{typeof l === "string" ? l : l.label}</li>)}
                </ul>
              </div>
            ))}
            <div className="flex flex-col justify-start">
              <div className="font-semibold text-xs tracking-wider uppercase mb-3">Connect</div>
              <SocialLinks />
            </div>
          </div>
          <div className="border-t pt-6 flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderColor: dna.palette?.border }}>
            <Copyright />
            <PoweredBy />
          </div>
        </div>
      </footer>
    );
  }

  if (v === "modern_tabs") {
    return (
      <footer className="border-t py-12" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-2xl font-black uppercase tracking-tight">{brandName}</div>
            <SocialLinks />
          </div>
          <div className="flex flex-wrap gap-2 justify-center py-4 border-y" style={{ borderColor: dna.palette?.border }}>
            {columns.flatMap((c: any) => c.links ?? []).map((l: any, idx: number) => (
              <span key={idx} className="px-4 py-1.5 text-xs font-semibold rounded-md hover:bg-slate-100 transition" style={{ opacity: 0.75 }}>
                {typeof l === "string" ? l : l.label}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <Copyright />
            <PoweredBy />
          </div>
        </div>
      </footer>
    );
  }

  if (v === "vintage_dashed") {
    return (
      <footer className="py-16 bg-stone-100 border-t-2 border-dashed border-stone-300">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-4 gap-8">
          <div>
            <div className="text-xl font-serif font-bold tracking-widest text-stone-900">{brandName}</div>
            <p className="mt-2 text-xs italic font-serif text-stone-500 leading-relaxed">{tagline}</p>
            <div className="mt-4">
              <SocialLinks />
            </div>
          </div>
          {columns.map((c: any, i: number) => (
            <div key={i} className="border-l border-dashed border-stone-300 pl-6">
              <div className="font-serif font-bold text-xs uppercase tracking-widest text-stone-700 mb-3">{c.title}</div>
              <ul className="space-y-2 text-xs flex flex-col text-stone-505 font-serif">
                {(c.links ?? []).map((l: any, j: number) => <li key={j} style={{ opacity: 0.75 }}>{typeof l === "string" ? l : l.label}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto px-6 border-t border-dashed border-stone-300 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs font-serif text-stone-400">
          <span>© {new Date().getFullYear()} {brandName}. Vintage Collection.</span>
          <PoweredBy />
        </div>
      </footer>
    );
  }

  if (v === "clean_columns_social_top") {
    return (
      <footer className="border-t py-16" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col gap-12">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pb-8 border-b" style={{ borderColor: dna.palette?.border }}>
            <div className="text-xl font-black">{brandName}</div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 mr-2">FOLLOW US:</span>
              <SocialLinks />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            {columns.map((c: any, i: number) => (
              <div key={i}>
                <div className="font-bold text-xs uppercase tracking-widest mb-4 text-slate-800">{c.title}</div>
                <ul className="space-y-2.5 text-sm flex flex-col" style={{ color: dna.palette?.muted }}>
                  {(c.links ?? []).map((l: any, j: number) => <li key={j} style={{ opacity: 0.75 }}>{typeof l === "string" ? l : l.label}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t pt-6 flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderColor: dna.palette?.border }}>
            <Copyright />
            <PoweredBy />
          </div>
        </div>
      </footer>
    );
  }

  if (v === "asymmetric_left") {
    return (
      <footer className="border-t py-16" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-12 gap-12">
          <div className="md:col-span-7 flex flex-col gap-4">
            <div className="text-2xl font-bold uppercase">{brandName}</div>
            <p className="text-sm max-w-md leading-relaxed" style={{ color: dna.palette?.muted }}>{tagline || "We build premium products that stand out from the crowd with elegant structural design standards."}</p>
            <div className="mt-4 p-4 border rounded-2xl flex items-center justify-between" style={{ borderColor: dna.palette?.border }}>
              <div className="text-xs">
                <div className="font-bold">Exclusive Club Membership</div>
                <div style={{ color: dna.palette?.muted }}>Get 10% off on your first order.</div>
              </div>
              <span className="text-xs font-bold px-4 py-2 text-white" style={{ background: dna.palette?.primary, borderRadius: "var(--r)" }}>Join Now</span>
            </div>
          </div>
          <div className="md:col-span-5 grid grid-cols-2 gap-8">
            {columns.slice(0, 2).map((c: any, i: number) => (
              <div key={i}>
                <div className="font-bold text-xs uppercase tracking-wider mb-4">{c.title}</div>
                <ul className="space-y-2.5 text-sm flex flex-col" style={{ color: dna.palette?.muted }}>
                  {(c.links ?? []).map((l: any, j: number) => <li key={j} style={{ opacity: 0.75 }}>{typeof l === "string" ? l : l.label}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 border-t mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderColor: dna.palette?.border }}>
          <Copyright />
          <PoweredBy />
        </div>
      </footer>
    );
  }

  if (v === "geometric_blocks") {
    return (
      <footer className="border-t py-16" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-6">
          {columns.map((c: any, i: number) => (
            <div key={i} className="p-8 rounded-3xl" style={{ background: i % 2 === 0 ? "rgba(0,0,0,0.02)" : "rgba(0,0,0,0.04)" }}>
              <div className="font-black text-xs uppercase tracking-wider mb-4 text-slate-800">{c.title}</div>
              <ul className="space-y-2.5 text-sm flex flex-col" style={{ color: dna.palette?.muted }}>
                {(c.links ?? []).map((l: any, j: number) => <li key={j} style={{ opacity: 0.75 }}>{typeof l === "string" ? l : l.label}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto px-6 mt-12 flex flex-col sm:flex-row justify-between items-center gap-4">
          <Copyright />
          <PoweredBy />
        </div>
      </footer>
    );
  }

  if (v === "glassmorphism_blur") {
    return (
      <footer className="border-t py-16 relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute top-0 left-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: dna.palette?.accent }} />
        <div className="relative z-10 max-w-6xl mx-auto px-6 grid md:grid-cols-4 gap-8">
          <div>
            <div className="text-xl font-bold uppercase tracking-widest">{brandName}</div>
            <p className="mt-2 text-xs opacity-75 leading-relaxed">{tagline}</p>
            <div className="mt-4">
              <SocialLinks />
            </div>
          </div>
          {columns.map((c: any, i: number) => (
            <div key={i} className="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
              <div className="font-bold text-xs uppercase tracking-widest text-white/95 mb-3">{c.title}</div>
              <ul className="space-y-2 text-xs flex flex-col text-white/70">
                {(c.links ?? []).map((l: any, j: number) => <li key={j} style={{ opacity: 0.75 }}>{typeof l === "string" ? l : l.label}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-6 border-t border-white/10 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs opacity-60">
          <span>© {new Date().getFullYear()} {brandName}. Custom Glass Series.</span>
          <PoweredBy />
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t mt-12" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="text-lg mb-2" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{brandName}</div>
          {tagline && <p style={{ color: dna.palette?.muted }}>{tagline}</p>}
          <SocialLinks />
        </div>
        {columns.map((c: any, i: number) => (
          <div key={i}>
            <div className="font-medium mb-3">{c.title}</div>
            <ul className="space-y-2 flex flex-col" style={{ color: dna.palette?.muted }}>
              {(c.links ?? []).map((l: any, j: number) => <li key={j} style={{ opacity: 0.75 }}>{typeof l === "string" ? l : l.label}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t" style={{ borderColor: dna.palette?.border }}>
        <div className="max-w-6xl mx-auto px-6 py-4 text-[11px] flex flex-wrap justify-between gap-2" style={{ color: dna.palette?.muted }}>
          <Copyright />
          <PoweredBy />
        </div>
      </div>
    </footer>
  );
}

function PromoBannerBlock({ p, dna }: any) {
  const v = p.style ?? "classic_split";
  const title = p.title ?? "Exclusive Summer Sale";
  const sub = p.subtitle ?? "Get up to 50% off on premium curated collections. Limited time only.";
  const cta = p.cta ?? "Explore Sale";
  const ctaHref = "#products";
  const image = p.image ?? "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&fit=crop&q=80";
  const code = p.promo_code ?? "SUMMER50";

  if (v === "classic_split") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 items-center gap-12 p-8 md:p-12 animate-fade-in" style={{ background: dna.palette?.surface, borderRadius: "var(--r)", border: `1px solid ${dna.palette?.border}` }}>
          <div>
            <span className="text-xs uppercase tracking-widest font-bold" style={{ color: dna.palette?.primary }}>Limited Offer</span>
            <h2 className="text-4xl md:text-5xl font-black mt-3 leading-tight">{title}</h2>
            <p className="mt-4 text-base" style={{ color: dna.palette?.muted }}>{sub}</p>
            <div className="mt-8">
              <a href={ctaHref} className="px-8 py-3.5 text-sm font-bold tracking-wide uppercase transition hover:opacity-90 inline-block" style={{ background: dna.palette?.primary, color: dna.palette?.primary_fg, borderRadius: "var(--r)" }}>{cta}</a>
            </div>
          </div>
          <div className="aspect-[4/3] overflow-hidden" style={{ borderRadius: "var(--r)" }}>
            <img src={image} className="w-full h-full object-cover" />
          </div>
        </div>
      </section>
    );
  }

  if (v === "fullscreen_bg") {
    return (
      <section className="relative py-32 md:py-48 text-center text-white overflow-hidden my-12 bg-black">
        <img src={image} className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/60" />
        <div className="relative max-w-2xl mx-auto px-6 z-10">
          <span className="text-xs uppercase tracking-widest font-semibold text-emerald-400">Special Promotion</span>
          <h2 className="text-4xl md:text-6xl font-black mt-4 leading-none uppercase tracking-tight">{title}</h2>
          <p className="mt-6 text-lg opacity-90">{sub}</p>
          <div className="mt-8 flex justify-center gap-4">
            <a href={ctaHref} className="px-8 py-4 bg-white text-black text-sm font-bold uppercase tracking-wider hover:bg-slate-100 transition" style={{ borderRadius: "var(--r)" }}>{cta}</a>
          </div>
        </div>
      </section>
    );
  }

  if (v === "minimalist_strip") {
    return (
      <section className="py-6 border-y" style={{ background: dna.palette?.surface, borderColor: dna.palette?.border }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-widest text-white" style={{ background: dna.palette?.primary }}>Code: {code}</span>
            <span className="text-sm font-semibold">{title} — {sub}</span>
          </div>
          <a href={ctaHref} className="text-xs font-bold uppercase tracking-widest hover:underline" style={{ color: dna.palette?.primary }}>{cta} →</a>
        </div>
      </section>
    );
  }

  if (v === "gradient_accent") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="p-8 md:p-16 text-center text-white relative overflow-hidden flex flex-col items-center" style={{ background: `linear-gradient(135deg, ${dna.palette?.primary} 0%, ${dna.palette?.accent} 100%)`, borderRadius: "var(--r)" }}>
          <div className="relative z-10 max-w-xl">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">{title}</h2>
            <p className="mt-4 text-base opacity-90">{sub}</p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
              <span className="text-sm border-2 border-dashed border-white/60 px-5 py-2 font-mono tracking-widest bg-white/10 uppercase">USE CODE: {code}</span>
              <a href={ctaHref} className="px-8 py-3.5 bg-white text-black hover:bg-slate-100 text-sm font-bold tracking-wide uppercase transition" style={{ borderRadius: "var(--r)" }}>{cta}</a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (v === "floating_glass") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="relative h-[450px] overflow-hidden flex items-center p-6 md:p-12 bg-slate-900" style={{ borderRadius: "var(--r)" }}>
          <img src={image} className="absolute inset-0 w-full h-full object-cover opacity-60" />
          <div className="relative z-10 max-w-md p-8 md:p-10 bg-white/10 backdrop-blur-xl border border-white/20 text-white flex flex-col" style={{ borderRadius: "var(--r)" }}>
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">{title}</h2>
            <p className="mt-3 text-sm opacity-90">{sub}</p>
            <div className="mt-6">
              <a href={ctaHref} className="px-6 py-3 bg-white text-slate-900 text-xs font-bold uppercase tracking-widest hover:opacity-90 inline-block" style={{ borderRadius: "var(--r)" }}>{cta}</a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (v === "split_diagonal") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 overflow-hidden border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", background: dna.palette?.surface }}>
          <div className="p-8 md:p-16 flex flex-col justify-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h2>
            <p className="mt-4 text-sm" style={{ color: dna.palette?.muted }}>{sub}</p>
            <div className="mt-8">
              <a href={ctaHref} className="px-8 py-3 text-xs font-bold uppercase tracking-widest text-white animate-pulse" style={{ background: dna.palette?.primary, borderRadius: "var(--r)" }}>{cta}</a>
            </div>
          </div>
          <div className="aspect-square md:aspect-auto h-[350px] md:h-full relative overflow-hidden" style={{ clipPath: "polygon(12% 0, 100% 0, 100% 100%, 0% 100%)" }}>
            <img src={image} className="absolute inset-0 w-full h-full object-cover" />
          </div>
        </div>
      </section>
    );
  }

  if (v === "video_mock") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="relative aspect-video rounded-3xl overflow-hidden shadow-lg group bg-slate-900">
            <img src={image} className="w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center text-slate-800 shadow-xl group-hover:scale-110 transition duration-300 cursor-pointer">
                <span className="text-xl translate-x-0.5">▶</span>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
            <p className="mt-4 text-sm" style={{ color: dna.palette?.muted }}>{sub}</p>
            <div className="mt-6">
              <a href={ctaHref} className="px-6 py-3 border border-black hover:bg-black hover:text-white transition-all text-xs font-bold uppercase tracking-widest inline-block" style={{ borderRadius: "var(--r)" }}>{cta}</a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (v === "countdown_timer") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="p-8 md:p-12 rounded-3xl text-center border-2 border-dashed flex flex-col items-center" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
          <span className="text-xs uppercase tracking-widest font-black" style={{ color: dna.palette?.accent }}>Closing Soon</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2">{title}</h2>
          <p className="mt-2 text-sm max-w-md" style={{ color: dna.palette?.muted }}>{sub}</p>
          <div className="flex gap-4 my-8">
            {["12", "08", "45", "18"].map((num, idx) => {
              const label = ["Days", "Hours", "Mins", "Secs"][idx];
              return (
                <div key={idx} className="flex flex-col items-center p-3 px-4 bg-white border rounded-xl shadow-xs" style={{ borderColor: dna.palette?.border }}>
                  <span className="text-xl md:text-2xl font-black">{num}</span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 mt-1 font-semibold">{label}</span>
                </div>
              );
            })}
          </div>
          <a href={ctaHref} className="px-8 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-md hover:shadow-lg transition" style={{ background: dna.palette?.primary, borderRadius: "var(--r)" }}>{cta}</a>
        </div>
      </section>
    );
  }

  if (v === "newspaper_ad") {
    return (
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="border-4 p-8 md:p-12 text-center relative" style={{ borderColor: "#1c1917" }}>
          <div className="absolute top-2 inset-x-2 border border-stone-300 h-[calc(100%-16px)] pointer-events-none" />
          <span className="text-xs uppercase tracking-widest font-bold tracking-[0.3em] font-serif block">★★ Gazette Special Advertisement ★★</span>
          <h2 className="text-4xl md:text-5xl my-4 uppercase tracking-tighter text-stone-900" style={{ fontFamily: "Georgia, serif", fontWeight: 900 }}>{title}</h2>
          <p className="text-stone-700 italic max-w-lg mx-auto font-serif">{sub}</p>
          <div className="mt-8 border-t-2 pt-6 inline-flex flex-col items-center">
            <span className="font-serif text-sm tracking-widest uppercase">Promo Code: {code}</span>
            <a href={ctaHref} className="mt-3 px-8 py-2.5 bg-stone-900 hover:bg-stone-850 text-white text-xs uppercase tracking-widest font-serif">{cta}</a>
          </div>
        </div>
      </section>
    );
  }

  if (v === "three_column_promo") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { tag: "OFFER 1", t: "Free Shipping", d: "On all orders above ₹999 automatically.", c: "bg-orange-50 border-orange-100 text-orange-850" },
            { tag: "OFFER 2", t: "Flat 20% Off", d: `Use code ${code} at the checkout screen.`, c: "bg-emerald-50 border-emerald-100 text-emerald-850" },
            { tag: "OFFER 3", t: "Hassle-Free Returns", d: "7-day money back guarantee policy.", c: "bg-indigo-50 border-indigo-100 text-indigo-850" }
          ].map((item, idx) => (
            <div key={idx} className={`p-6 border rounded-2xl flex flex-col justify-between ${item.c}`}>
              <div>
                <span className="text-[9px] uppercase tracking-widest font-black block mb-3 opacity-80">{item.tag}</span>
                <h3 className="text-xl font-bold">{item.t}</h3>
                <p className="text-xs mt-2 opacity-90 leading-relaxed">{item.d}</p>
              </div>
              <a href={ctaHref} className="text-xs font-bold uppercase tracking-wider mt-6 hover:underline inline-block">Shop Now →</a>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (v === "left_bordered_hero") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="flex gap-8 items-center justify-between p-8 border-l-8" style={{ borderLeftColor: dna.palette?.primary, background: dna.palette?.surface }}>
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800">{title}</h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">{sub}</p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a href={ctaHref} className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:opacity-90" style={{ background: dna.palette?.primary, borderRadius: "var(--r)" }}>{cta}</a>
              <span className="text-xs font-semibold text-slate-400">Coupon code: <strong className="text-slate-700">{code}</strong></span>
            </div>
          </div>
          <div className="hidden md:block w-48 h-48 rounded-2xl overflow-hidden shrink-0 border" style={{ borderColor: dna.palette?.border }}>
            <img src={image} className="w-full h-full object-cover" />
          </div>
        </div>
      </section>
    );
  }

  if (v === "ticker_tape") {
    return (
      <section className="py-4 border-y overflow-hidden whitespace-nowrap" style={{ background: dna.palette?.primary, color: dna.palette?.primary_fg, borderColor: dna.palette?.border }}>
        <div className="inline-flex gap-16 animate-[marquee_20s_linear_infinite]">
          {[...Array(6)].map((_, i) => (
            <span key={i} className="text-sm font-black uppercase tracking-wider">
              💥 {title} — USE CODE: {code} (FLAT 50% OFF) ⚡ SHOP NOW ⚡
            </span>
          ))}
        </div>
      </section>
    );
  }

  if (v === "duo_cards") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-8">
          {[
            { t: "Summer Collection", d: "Vibrant designs crafted for hot sunny afternoons.", img: image, label: "50% OFF" },
            { t: "Minimalist Essentials", d: "Timeless clothing basics to match any style code.", img: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80", label: "NEW IN" }
          ].map((item, idx) => (
            <div key={idx} className="group relative aspect-[16/10] overflow-hidden flex items-end p-8 text-white" style={{ borderRadius: "var(--r)" }}>
              <img src={item.img} className="absolute inset-0 w-full h-full object-cover group-hover:scale-103 transition duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="relative z-10 max-w-xs">
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-black bg-white text-black inline-block mb-3">{item.label}</span>
                <h3 className="text-2xl font-bold">{item.t}</h3>
                <p className="text-xs mt-1 opacity-95 leading-relaxed">{item.d}</p>
                <a href={ctaHref} className="mt-4 text-xs font-bold uppercase tracking-wider block hover:underline">Explore →</a>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (v === "retro_badge") {
    return (
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="p-8 md:p-12 rounded-3xl border-4 border-double flex flex-col md:flex-row gap-6 items-center justify-between bg-stone-50 border-stone-800">
          <div>
            <span className="px-2.5 py-1 text-[9px] uppercase tracking-widest font-black rounded bg-stone-800 text-stone-50 inline-block mb-3">Voucher Offer</span>
            <h2 className="text-3xl font-extrabold uppercase font-serif text-stone-900 leading-none">{title}</h2>
            <p className="mt-2 text-sm italic text-stone-600 font-serif">{sub}</p>
          </div>
          <div className="border-t-2 md:border-t-0 md:border-l-2 border-dashed border-stone-300 pt-6 md:pt-0 md:pl-8 flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-stone-400">Coupon Value</span>
            <span className="text-5xl font-black font-mono my-1 tracking-tight text-stone-900">₹999</span>
            <span className="text-[9px] border px-2 py-0.5 font-mono uppercase bg-white border-stone-300">CODE: {code}</span>
            <a href={ctaHref} className="mt-4 text-xs font-bold uppercase underline tracking-widest text-stone-850 block hover:text-black">{cta}</a>
          </div>
        </div>
      </section>
    );
  }

  if (v === "dark_mode_neon") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="p-8 md:p-12 bg-slate-950 text-white rounded-3xl shadow-xl flex flex-col items-center text-center relative overflow-hidden" style={{ boxShadow: `0 20px 40px -15px ${dna.palette?.primary}30`, border: `1px solid ${dna.palette?.primary}30` }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20" style={{ background: dna.palette?.primary }} />
          <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-400">Midnight Exclusive Drop</span>
          <h2 className="text-4xl md:text-5xl font-black mt-3 uppercase tracking-wide">{title}</h2>
          <p className="mt-3 text-sm max-w-md opacity-80">{sub}</p>
          <div className="mt-8 flex gap-4">
            <a href={ctaHref} className="px-8 py-3.5 text-xs font-black uppercase tracking-widest hover:opacity-90 text-slate-900" style={{ background: dna.palette?.primary, borderRadius: "var(--r)" }}>{cta}</a>
          </div>
        </div>
      </section>
    );
  }

  if (v === "asymmetric_overlapping") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="relative grid md:grid-cols-12 gap-0 items-center">
          <div className="md:col-span-8 aspect-[16/10] overflow-hidden rounded-3xl z-0">
            <img src={image} className="w-full h-full object-cover" />
          </div>
          <div className="md:col-span-5 md:absolute right-6 p-8 md:p-10 bg-white border shadow-xl flex flex-col" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)" }}>
            <span className="text-[10px] uppercase tracking-widest font-black" style={{ color: dna.palette?.accent }}>New Showcase</span>
            <h2 className="text-3xl font-extrabold text-slate-800 mt-2 leading-tight">{title}</h2>
            <p className="mt-3 text-xs text-slate-500 leading-relaxed">{sub}</p>
            <div className="mt-6">
              <a href={ctaHref} className="px-6 py-3 text-xs font-bold uppercase text-white hover:opacity-90 inline-block" style={{ background: dna.palette?.primary, borderRadius: "var(--r)" }}>{cta}</a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (v === "minimal_center") {
    return (
      <section className="max-w-4xl mx-auto px-6 py-20 text-center flex flex-col items-center">
        <span className="text-xs uppercase tracking-widest font-bold" style={{ color: dna.palette?.primary }}>Seasonal Editorial</span>
        <h2 className="text-4xl md:text-5xl font-light tracking-tight my-4 leading-none text-slate-800">{title}</h2>
        <p className="text-base leading-relaxed text-slate-500 max-w-lg mb-8">{sub}</p>
        <a href={ctaHref} className="px-8 py-3.5 border hover:bg-slate-50 transition text-xs font-bold uppercase tracking-widest text-slate-800" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)" }}>{cta}</a>
      </section>
    );
  }

  if (v === "slanted_slats") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-20 overflow-hidden">
        <div className="p-8 md:p-12 relative overflow-hidden bg-slate-900 text-white rounded-3xl" style={{ transform: "rotate(-0.5deg)" }}>
          <div className="absolute inset-0 w-full h-full opacity-40 bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} />
          <div className="relative z-10 max-w-md">
            <h2 className="text-4xl font-extrabold uppercase leading-none">{title}</h2>
            <p className="mt-3 text-sm opacity-90">{sub}</p>
            <a href={ctaHref} className="mt-8 px-6 py-3 bg-white text-slate-950 font-bold uppercase text-xs tracking-wider inline-block hover:bg-slate-100" style={{ borderRadius: "var(--r)" }}>{cta}</a>
          </div>
        </div>
      </section>
    );
  }

  if (v === "animated_marquee_banner") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="p-8 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-6" style={{ background: dna.palette?.surface, borderColor: dna.palette?.border }}>
          <div className="max-w-lg">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800">{title}</h2>
            <p className="mt-2 text-sm text-slate-600">{sub}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <a href={ctaHref} className="px-8 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:opacity-90 text-center w-full" style={{ background: dna.palette?.primary, borderRadius: "var(--r)" }}>{cta}</a>
            <span className="text-[10px] text-slate-400 font-semibold">Copy Code: <strong className="text-slate-600">{code}</strong></span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <div className="grid md:grid-cols-2 items-center gap-12 p-8 md:p-12" style={{ background: dna.palette?.surface, borderRadius: "var(--r)", border: `1px solid ${dna.palette?.border}` }}>
        <div>
          <span className="text-xs uppercase tracking-widest font-bold" style={{ color: dna.palette?.primary }}>Limited Offer</span>
          <h2 className="text-4xl md:text-5xl font-black mt-3 leading-tight">{title}</h2>
          <p className="mt-4 text-base" style={{ color: dna.palette?.muted }}>{sub}</p>
          <div className="mt-8">
            <a href={ctaHref} className="px-8 py-3.5 text-sm font-bold tracking-wide uppercase transition hover:opacity-90 inline-block" style={{ background: dna.palette?.primary, color: dna.palette?.primary_fg, borderRadius: "var(--r)" }}>{cta}</a>
          </div>
        </div>
        <div className="aspect-[4/3] overflow-hidden" style={{ borderRadius: "var(--r)" }}>
          <img src={image} className="w-full h-full object-cover" />
        </div>
      </div>
    </section>
  );
}