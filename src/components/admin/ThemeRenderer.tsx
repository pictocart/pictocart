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
      <Footer footer={manifest?.footer} dna={dna} />
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
  const items = p.items ?? [];
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

function Footer({ footer, dna }: any) {
  if (!footer) return null;
  return (
    <footer className="border-t mt-12" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="text-lg mb-2" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{dna.name}</div>
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