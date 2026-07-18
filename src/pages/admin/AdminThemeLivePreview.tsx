import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, ShoppingCart, Heart, Search, ShoppingBag,
  ChevronDown, Truck, RotateCcw, Shield, Star, ZoomIn,
} from "lucide-react";
import MasterThemeRenderer from "@/components/theme/MasterThemeRenderer";

/* ─────────────────────────────────────────────────────────────────────────
   Layout1 theme metadata
───────────────────────────────────────────────────────────────────────── */
const IMG = "https://wuqznkpaldtvpfpdtllp.supabase.co/storage/v1/object/public/theme-previews/layout-themes";
const heroUrl = (id: string) => `${IMG}/hero/${id}.svg`;
const prodUrl = (id: string, n: number) => `${IMG}/products/${id}-${n}.svg`;

const PRODS = [
  { name: "Silk Midi Dress",   price: "2,499", badge: "NEW",  stars: 5 },
  { name: "Linen Blazer",      price: "3,899", badge: "SALE", stars: 4 },
  { name: "Wide Leg Trousers", price: "1,799", badge: "",     stars: 5 },
  { name: "Knit Cardigan",     price: "2,199", badge: "HOT",  stars: 4 },
];

interface T11 {
  accent: string; bg: string; surface: string;
  textPrimary: string; textMuted: string; border: string;
  imgId: string;
}
interface T12 {
  accent: string; bg: string; surface: string;
  textPrimary: string; textMuted: string; border: string;
  imgId: string;
}

const L1_THEMES: Record<string, { sub: "1.1" | "1.2"; label: string; t11?: T11; t12?: T12 }> = {
  "layout1-noir-atelier": {
    sub: "1.1", label: "Noir Atelier",
    t11: { accent: "#c9a96e", bg: "#0d0d0d", surface: "#1a1a1a", textPrimary: "#f5f0eb", textMuted: "#888", border: "#2a2a2a", imgId: "noir-atelier" },
  },
  "layout1-ivory-luxe": {
    sub: "1.1", label: "Ivory Luxe",
    t11: { accent: "#8b6914", bg: "#faf8f4", surface: "#f0ece4", textPrimary: "#1a1612", textMuted: "#8a7f72", border: "#e8e0d4", imgId: "ivory-luxe" },
  },
  "layout1-neon-drip": {
    sub: "1.2", label: "Neon Drip",
    t12: { accent: "#ff3d6b", bg: "#0f0f1a", surface: "#1a1a2e", textPrimary: "#f8fafc", textMuted: "#94a3b8", border: "#1e1e35", imgId: "neon-drip" },
  },
  "layout1-blush-street": {
    sub: "1.2", label: "Blush Street",
    t12: { accent: "#e91e8c", bg: "#fff5f8", surface: "#ffeef4", textPrimary: "#1a0a12", textMuted: "#9b6e80", border: "#fad4e4", imgId: "blush-street" },
  },
};

/* ─────────────────────────────────────────────────────────────────────────
   Layout 1.1 — Classic Boutique full-page preview
───────────────────────────────────────────────────────────────────────── */
function Preview11({ t }: { t: T11 }) {
  const dk = t.bg === "#0d0d0d";
  const bdg = (b: string) => b === "SALE" ? "#ef4444" : b === "HOT" ? "#f97316" : t.accent;
  const cats = ["All", "Dresses", "Blazers", "Trousers", "Knitwear", "Accessories"];
  return (
    <div style={{ backgroundColor: t.bg, color: t.textPrimary, minHeight: "100vh", fontFamily: "system-ui" }}>
      {/* Announcement */}
      <div style={{ backgroundColor: t.accent, color: "#fff", textAlign: "center", padding: "8px", fontSize: 12, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase" }}>
        Free Shipping on orders above ₹999 &nbsp;|&nbsp; New Summer Collection Now Live
      </div>
      {/* Navbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 32px", borderBottom: `1px solid ${t.border}`, backgroundColor: t.surface }}>
        <span style={{ fontFamily: "Georgia,serif", fontWeight: 900, fontSize: 18, letterSpacing: "0.25em", textTransform: "uppercase" }}>MAISON</span>
        <div style={{ display: "flex", gap: 28 }}>
          {["New In", "Women", "Men", "Sale"].map((l, i) => (
            <span key={l} style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: i === 0 ? t.accent : t.textMuted, borderBottom: i === 0 ? `2px solid ${t.accent}` : "none", paddingBottom: 2 }}>{l}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Search size={16} color={t.textMuted} />
          <div style={{ position: "relative" }}>
            <Heart size={16} color={t.textMuted} />
            <span style={{ position: "absolute", top: -8, right: -8, backgroundColor: t.accent, color: "#fff", borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700 }}>3</span>
          </div>
          <div style={{ position: "relative" }}>
            <ShoppingBag size={16} color={t.textPrimary} />
            <span style={{ position: "absolute", top: -8, right: -8, backgroundColor: t.accent, color: "#fff", borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700 }}>2</span>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: t.textMuted }}>A</div>
        </div>
      </div>

      {/* Body: Sidebar + Content */}
      <div style={{ display: "flex" }}>
        {/* LEFT SIDEBAR */}
        <div style={{ width: 200, flexShrink: 0, borderRight: `1px solid ${t.border}`, backgroundColor: t.surface, padding: "20px 14px", display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.2em", color: t.textMuted, marginBottom: 10 }}>Categories</p>
            {cats.map((c, i) => (
              <div key={c} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 8px", borderRadius: 8, backgroundColor: i === 0 ? t.accent + "18" : "transparent", color: i === 0 ? t.accent : t.textMuted, fontSize: 11, fontWeight: 500, marginBottom: 2 }}>
                <span>{c}</span>
                {i === 0 && <span style={{ backgroundColor: t.accent, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 9, fontWeight: 700 }}>12</span>}
              </div>
            ))}
          </div>
          <div>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.2em", color: t.textMuted, marginBottom: 10 }}>Price</p>
            {["Under ₹999", "₹999–₹2499", "₹2499–₹4999", "Above ₹4999"].map((p, i) => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: t.textMuted, marginBottom: 6 }}>
                <span style={{ width: 14, height: 14, border: `1.5px solid ${i === 1 ? t.accent : t.border}`, backgroundColor: i === 1 ? t.accent : "transparent", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {i === 1 && <span style={{ color: "#fff", fontSize: 9 }}>✓</span>}
                </span>
                {p}
              </div>
            ))}
          </div>
          <div>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.2em", color: t.textMuted, marginBottom: 10 }}>Size</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4 }}>
              {["XS","S","M","L","XL","XXL"].map((s, i) => (
                <span key={s} style={{ height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, border: `1.5px solid ${i === 1 || i === 2 ? t.accent : t.border}`, borderRadius: 4, color: i === 1 || i === 2 ? t.accent : t.textMuted, backgroundColor: i === 1 || i === 2 ? t.accent + "15" : "transparent" }}>{s}</span>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.2em", color: t.textMuted, marginBottom: 10 }}>Colour</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["#1a1a1a","#ffffff","#c9a96e","#8b6914","#e8d5b7","#6b7280"].map((c, i) => (
                <span key={c} style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: c, border: `2px solid ${i === 0 ? t.accent : dk ? "#444" : "#ddd"}` }} />
              ))}
            </div>
          </div>
          <button style={{ width: "100%", padding: "9px 0", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", backgroundColor: t.accent, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Apply Filters</button>
        </div>

        {/* RIGHT CONTENT */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {/* Hero */}
          <div style={{ position: "relative", height: 280, overflow: "hidden" }}>
            <img src={heroUrl(t.imgId)} alt="hero" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: dk ? "linear-gradient(to right,rgba(13,13,13,.9) 35%,transparent 70%)" : "linear-gradient(to right,rgba(250,248,244,.95) 35%,transparent 70%)" }} />
            <div style={{ position: "absolute", left: 40, top: "50%", transform: "translateY(-50%)" }}>
              <p style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 600, color: t.accent, marginBottom: 8 }}>Summer 2025</p>
              <p style={{ fontFamily: "Georgia,serif", fontSize: 36, fontWeight: 900, lineHeight: 1.15, color: t.textPrimary, marginBottom: 16 }}>The New<br/>Classics.</p>
              <button style={{ padding: "10px 24px", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", backgroundColor: t.accent, color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", marginRight: 10 }}>Shop Now</button>
              <button style={{ padding: "10px 24px", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", backgroundColor: "transparent", color: t.accent, border: `1.5px solid ${t.accent}`, borderRadius: 3, cursor: "pointer" }}>Lookbook</button>
            </div>
          </div>

          {/* Sort bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}` }}>
            <span style={{ fontSize: 11, color: t.textMuted }}>24 Products</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: t.textMuted }}>Sort:</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", border: `1px solid ${t.border}`, borderRadius: 6, fontSize: 11, color: t.textPrimary, cursor: "pointer" }}>
                Newest <ChevronDown size={12} />
              </div>
            </div>
          </div>

          {/* 4-col UNIFORM grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, padding: 16 }}>
            {PRODS.map((p, i) => (
              <div key={i} style={{ borderRadius: 10, overflow: "hidden", backgroundColor: t.surface, border: `1px solid ${t.border}` }}>
                <div style={{ position: "relative", height: 180 }}>
                  <img src={prodUrl(t.imgId, i + 1)} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {p.badge && <span style={{ position: "absolute", top: 8, left: 8, backgroundColor: bdg(p.badge), color: "#fff", padding: "2px 7px", fontSize: 9, fontWeight: 800, borderRadius: 2 }}>{p.badge}</span>}
                  <button style={{ position: "absolute", top: 8, right: 8, background: t.surface + "ee", border: "none", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Heart size={12} color={t.accent} />
                  </button>
                </div>
                <div style={{ padding: "10px 10px 12px" }}>
                  <p style={{ fontFamily: "Georgia,serif", fontSize: 11, fontWeight: 600, color: t.textPrimary, marginBottom: 4 }}>{p.name}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: t.accent }}>₹{p.price}</p>
                    <div style={{ display: "flex", gap: 1 }}>{[1,2,3,4,5].map(s => <Star key={s} size={9} style={{ fill: s <= p.stars ? "#f59e0b" : "transparent", color: "#f59e0b" }} />)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 3 }}>
                    {["S","M","L"].map((sz, si) => (
                      <span key={sz} style={{ width: 22, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, border: `1px solid ${si===1 ? t.accent : t.border}`, color: si===1 ? t.accent : t.textMuted, borderRadius: 2 }}>{sz}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Newsletter */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", borderTop: `1px solid ${t.border}`, backgroundColor: t.accent + "10" }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginBottom: 2 }}>Get 10% off your first order</p>
              <p style={{ fontSize: 10, color: t.textMuted }}>Subscribe to our newsletter</p>
            </div>
            <div style={{ display: "flex", marginLeft: "auto" }}>
              <input placeholder="your@email.com" style={{ height: 32, padding: "0 10px", fontSize: 11, border: `1px solid ${t.border}`, borderRight: "none", borderRadius: "4px 0 0 4px", backgroundColor: t.surface, color: t.textPrimary, width: 180, outline: "none" }} />
              <button style={{ height: 32, padding: "0 14px", fontSize: 10, fontWeight: 700, backgroundColor: t.accent, color: "#fff", border: "none", borderRadius: "0 4px 4px 0", cursor: "pointer" }}>Subscribe</button>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-col Footer */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24, padding: "28px 32px 16px", borderTop: `1px solid ${t.border}`, backgroundColor: t.surface }}>
        {[{ title: "MAISON", items: ["Our Story","Sustainability","Press"] }, { title: "Help", items: ["Track Order","Returns","Sizing Guide"] }, { title: "Shop", items: ["New Arrivals","Sale","Gift Cards"] }, { title: "Follow", items: ["Instagram","Pinterest","YouTube"] }].map(col => (
          <div key={col.title}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.2em", color: t.textPrimary, marginBottom: 10 }}>{col.title}</p>
            {col.items.map(item => <p key={item} style={{ fontSize: 11, color: t.textMuted, marginBottom: 5 }}>{item}</p>)}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 32px 16px", borderTop: `1px solid ${t.border}`, backgroundColor: t.surface }}>
        <p style={{ fontSize: 10, color: t.textMuted }}>© 2025 Maison. All rights reserved.</p>
        <div style={{ display: "flex", gap: 8 }}>
          {["Visa","Mastercard","UPI","Razorpay"].map(p => <span key={p} style={{ fontSize: 9, padding: "2px 7px", border: `1px solid ${t.border}`, borderRadius: 3, color: t.textMuted }}>{p}</span>)}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Layout 1.2 — Street Style Hub full-page preview
───────────────────────────────────────────────────────────────────────── */
function Preview12({ t }: { t: T12 }) {
  const dk = t.bg === "#0f0f1a";
  const bdg = (b: string) => b === "SALE" ? "#ef4444" : b === "HOT" ? "#f97316" : t.accent;
  const cats = ["All Drops","Oversized","Cargo","Hoodies","Sneakers","Caps"];
  return (
    <div style={{ backgroundColor: t.bg, color: t.textPrimary, minHeight: "100vh", fontFamily: "system-ui" }}>
      {/* Navbar: hamburger + search bar + brand + cart */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: `1px solid ${t.border}`, backgroundColor: t.bg }}>
        <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ display: "block", height: 2, width: 20, borderRadius: 2, backgroundColor: t.textPrimary }} />
          <span style={{ display: "block", height: 2, width: 14, borderRadius: 2, backgroundColor: t.textPrimary }} />
          <span style={{ display: "block", height: 2, width: 20, borderRadius: 2, backgroundColor: t.textPrimary }} />
        </button>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, border: `1px solid ${t.border}`, backgroundColor: dk ? "#ffffff0a" : "#00000008" }}>
          <Search size={13} color={t.textMuted} />
          <span style={{ fontSize: 12, color: t.textMuted }}>Search drops, brands, styles…</span>
        </div>
        <span style={{ fontSize: 16, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em", flexShrink: 0 }}>
          DRIP<span style={{ color: t.accent }}>.</span>
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 999, backgroundColor: t.accent, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
          <ShoppingCart size={13} /> 3 items
        </div>
      </div>

      {/* Category pills — horizontal scroll */}
      <div style={{ display: "flex", gap: 8, padding: "10px 20px", borderBottom: `1px solid ${t.border}`, overflowX: "auto" }}>
        {cats.map((c, i) => (
          <span key={c} style={{ flexShrink: 0, padding: "7px 16px", borderRadius: 999, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", border: `1px solid ${i === 0 ? t.accent : t.border}`, backgroundColor: i === 0 ? t.accent : "transparent", color: i === 0 ? "#fff" : t.textMuted, cursor: "pointer" }}>{c}</span>
        ))}
      </div>

      {/* Hero: 50/50 split */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: 320 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 40px", gap: 14, backgroundColor: dk ? t.surface : t.accent + "0c" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, border: `1px solid ${t.accent}40`, backgroundColor: t.accent + "20", width: "fit-content" }}>
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: t.accent }}>⚡ Limited Drop</span>
          </div>
          <p style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.1, color: t.textPrimary }}>Street<br/><span style={{ color: t.accent }}>Essentials</span></p>
          <p style={{ fontSize: 13, color: t.textMuted }}>Fresh drops every Friday.</p>
          <div style={{ display: "flex", gap: 6 }}>
            {[["02","HR"],["34","MIN"],["11","SEC"]].map(([v, l]) => (
              <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 10px", borderRadius: 6, backgroundColor: t.accent, minWidth: 36 }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{v}</span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", textTransform: "uppercase" }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: "relative", overflow: "hidden" }}>
          <img src={heroUrl(t.imgId)} alt="hero" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to left,transparent 60%,${t.bg}30)` }} />
          <span style={{ position: "absolute", top: 12, right: 12, backgroundColor: "#ef4444", color: "#fff", padding: "4px 10px", borderRadius: 999, fontSize: 10, fontWeight: 800, transform: "rotate(12deg)", display: "inline-block" }}>SALE</span>
        </div>
      </div>

      {/* Sort bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}` }}>
        <span style={{ fontSize: 11, color: t.textMuted }}>48 results</span>
        <div style={{ display: "flex", gap: 6 }}>
          {["Latest","Popular","Price"].map((f, i) => (
            <span key={f} style={{ fontSize: 10, fontWeight: 700, padding: "5px 12px", borderRadius: 999, border: `1px solid ${i === 0 ? t.accent : t.border}`, backgroundColor: i === 0 ? t.accent : "transparent", color: i === 0 ? "#fff" : t.textMuted, cursor: "pointer" }}>{f}</span>
          ))}
        </div>
      </div>

      {/* Masonry 2-col */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[{ n: 1, h: 280, p: PRODS[0] }, { n: 3, h: 220, p: PRODS[2] }].map(({ n, h, p }) => (
            <div key={n} style={{ borderRadius: 14, overflow: "hidden", backgroundColor: t.surface, border: `1px solid ${t.border}` }}>
              <div style={{ position: "relative", height: h }}>
                <img src={prodUrl(t.imgId, n)} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {p.badge && <span style={{ position: "absolute", top: 10, left: 10, backgroundColor: bdg(p.badge), color: "#fff", padding: "3px 9px", borderRadius: 999, fontSize: 9, fontWeight: 800 }}>{p.badge}</span>}
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>{p.name}</p>
                  <Heart size={14} color={t.textMuted} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 900, color: t.accent, marginTop: 4 }}>₹{p.price}</p>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {["#1a1a1a","#f5f0eb","#c9a96e"].map(c => <span key={c} style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: c, border: `1px solid ${dk ? "#444" : "#ddd"}` }} />)}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[{ n: 2, h: 220, p: PRODS[1] }, { n: 4, h: 280, p: PRODS[3] }].map(({ n, h, p }) => (
            <div key={n} style={{ borderRadius: 14, overflow: "hidden", backgroundColor: t.surface, border: `1px solid ${t.border}` }}>
              <div style={{ position: "relative", height: h }}>
                <img src={prodUrl(t.imgId, n)} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {p.badge && <span style={{ position: "absolute", top: 10, left: 10, backgroundColor: bdg(p.badge), color: "#fff", padding: "3px 9px", borderRadius: 999, fontSize: 9, fontWeight: 800 }}>{p.badge}</span>}
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>{p.name}</p>
                  <Heart size={14} color={t.textMuted} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 900, color: t.accent, marginTop: 4 }}>₹{p.price}</p>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {["#0f0f1a","#ff3d6b","#e91e8c"].map(c => <span key={c} style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: c, border: `1px solid ${dk ? "#444" : "#ddd"}` }} />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky cart bottom bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: `1px solid ${t.border}`, background: dk ? `linear-gradient(to right,${t.surface},${t.bg})` : `linear-gradient(to right,${t.accent}10,${t.surface})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ShoppingCart size={18} color={t.accent} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary }}>3 items in cart</p>
            <p style={{ fontSize: 11, color: t.textMuted }}>₹6,897 total</p>
          </div>
        </div>
        <button style={{ padding: "10px 24px", borderRadius: 12, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#fff", border: "none", cursor: "pointer", background: `linear-gradient(135deg,${t.accent},${t.accent}cc)` }}>
          Checkout →
        </button>
      </div>

      {/* Minimal single-row footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: `1px solid ${t.border}`, backgroundColor: t.surface }}>
        <span style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          DRIP<span style={{ color: t.accent }}>.</span>
        </span>
        <div style={{ display: "flex", gap: 20 }}>
          {["About","Privacy","Returns","Contact"].map(l => <span key={l} style={{ fontSize: 11, color: t.textMuted, cursor: "pointer" }}>{l}</span>)}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["IG","YT","TW"].map(s => <span key={s} style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: t.accent + "20", color: t.accent, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{s}</span>)}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Layout1InlinePreview — picks correct skeleton by theme ID
───────────────────────────────────────────────────────────────────────── */
function Layout1InlinePreview({ themeId }: { themeId: string }) {
  const meta = L1_THEMES[themeId];
  if (!meta) return <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Theme not found.</div>;
  if (meta.sub === "1.1" && meta.t11) return <Preview11 t={meta.t11} />;
  if (meta.sub === "1.2" && meta.t12) return <Preview12 t={meta.t12} />;
  return null;
}

/* ─────────────────────────────────────────────────────────────────────────
   Main export — handles both Layout1 themes and master theme previews
───────────────────────────────────────────────────────────────────────── */
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

  // Only fetch manifest for non-layout1 themes
  const isLayout1 = themeId?.startsWith("layout1-");

  useEffect(() => {
    if (isLayout1) { setLoading(false); return; }
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
  }, [themeId, isLayout1]);

  useEffect(() => {
    if (!storeSlug || isLayout1) return;
    (async () => {
      const { data: store } = await supabase
        .from("stores")
        .select("id, name, settings, logo_url")
        .eq("slug", storeSlug)
        .maybeSingle();
      if (!store) return;
      const savedOv = ((store.settings as any)?.theme_overrides || {}) as any;
      const headerLogo = savedOv?.header?.logo_url ?? savedOv?.logo_url ?? store.logo_url ?? "";
      setOverrides((cur: any) => Object.keys(cur || {}).length ? cur : {
        ...savedOv,
        brand_name: savedOv?.brand_name || store.name,
        header: { ...(savedOv?.header || {}), logo_url: headerLogo },
      });
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
            id: p.id, name: p.name, image_url: p.image_url, description: p.description,
            subs: allCats.filter((c) => c.parent_id === p.id).map((c) => ({ id: c.id, name: c.name, image_url: c.image_url })),
          }))
      );
    })();
  }, [storeSlug, isLayout1]);

  useEffect(() => {
    if (isLayout1) return;
    const handler = (ev: MessageEvent) => {
      const msg = ev.data;
      if (!msg) return;
      if (msg.type === "customiser:update") {
        if (msg.overrides !== undefined) setOverrides(msg.overrides ?? {});
        if (msg.page !== undefined) setPage(msg.page);
        return;
      }
      if (msg.type === "customiser:scroll") {
        requestAnimationFrame(() => {
          const sel = msg.anchor ? `[data-section-anchor="${msg.anchor}"]` : null;
          const el = sel ? document.querySelector(sel) as HTMLElement | null : null;
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isLayout1]);

  const pages = useMemo(() => {
    const all = manifest?.pages ? Object.keys(manifest.pages) : [];
    const order = ["home","shop","product","cart","checkout","journal","about","contact","account","auth"];
    return [...order.filter((p) => all.includes(p)), ...all.filter((p) => !order.includes(p))];
  }, [manifest]);

  const setActive = (p: string) => {
    setPage(p);
    const next = new URLSearchParams(params);
    next.set("page", p);
    setParams(next, { replace: true });
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  // Layout1 — render inline preview
  if (isLayout1) {
    return <Layout1InlinePreview themeId={themeId!} />;
  }

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
            <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">{themeId}</span>
          </div>
        </div>
      )}
      <MasterThemeRenderer manifest={manifest} page={page} overrides={overrides} storeSlug={storeSlug} onNavigate={setActive} products={products} sellerCategories={sellerCategories} />
    </div>
  );
}
