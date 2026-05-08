import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import {
  Rocket, TrendingUp, Globe, Users, Sparkles, Target, IndianRupee,
  ShoppingBag, Brain, Zap, ChevronLeft, ChevronRight, Store, Award,
  BarChart3, PieChart, LineChart, Building2, Trophy, Coins, Clock,
  CheckCircle2, ArrowRight, Mail, Phone, Crown, Shield, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SEOHead from "@/components/storefront/SEOHead";
import PicToCartLogo from "@/components/PicToCartLogo";

/* ---------- Slide shell ---------- */
const Slide = ({
  children,
  bg = "bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950",
  pattern = true,
}: {
  children: React.ReactNode;
  bg?: string;
  pattern?: boolean;
}) => (
  <div className={`relative min-h-[680px] md:min-h-[720px] w-full overflow-hidden ${bg} text-white`}>
    {pattern && (
      <>
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-violet-500/30 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </>
    )}
    <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 py-12 md:py-16 h-full">
      {children}
    </div>
  </div>
);

const Stat = ({ value, label, icon: Icon, delay = 0 }: any) => (
  <div className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-5 hover:scale-105 hover:border-violet-400/50 transition-all duration-500"
       style={{ animation: `fade-up 0.6s ease-out ${delay}s both` }}>
    {Icon && <Icon className="h-6 w-6 text-violet-300 mb-2" />}
    <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent">{value}</div>
    <div className="text-xs md:text-sm text-white/60 mt-1">{label}</div>
  </div>
);

/* ---------- Slides ---------- */
const SlideCover = () => (
  <Slide bg="bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950">
    <div className="flex flex-col justify-center h-full min-h-[600px]">
      <Badge className="bg-violet-500/20 text-violet-200 border-violet-400/30 mb-6 w-fit animate-fade-in">
        <Sparkles className="h-3 w-3 mr-1" /> INVESTOR PITCH · SEED ROUND 2026
      </Badge>
      <div className="flex items-center gap-4 mb-6" style={{ animation: "fade-up 0.8s ease-out both" }}>
        <PicToCartLogo size={88} />
        <div>
          <h1 className="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight">Pic to Cart</h1>
          <p className="text-xs md:text-sm text-violet-300/80 mt-1 tracking-widest uppercase">Snap · Generate · Sell</p>
        </div>
      </div>
      <p className="text-2xl md:text-4xl font-light text-violet-200 mb-8 max-w-3xl"
         style={{ animation: "fade-up 0.8s ease-out 0.2s both" }}>
        India's <span className="font-bold text-white">AI-native (Artificial Intelligence-native)</span> e-commerce <span className="font-bold text-white">OS (Operating System)</span> for the next <span className="font-bold text-white">100 million</span> small sellers.
      </p>
      <div className="flex flex-wrap gap-3 mb-10" style={{ animation: "fade-up 0.8s ease-out 0.4s both" }}>
        {["Shopify-grade", "5-min Setup", "AI-Generated Stores", "Made in India"].map((t, i) => (
          <span key={i} className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm">{t}</span>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-auto" style={{ animation: "fade-up 0.8s ease-out 0.6s both" }}>
        <Stat value="₹3.5 Cr" label="Funding Ask (Crore)" icon={IndianRupee} />
        <Stat value="24 mo" label="To Global" icon={Globe} />
        <Stat value="1,800+" label="Hours Built" icon={Clock} />
        <Stat value="65+" label="Live Features" icon={Layers} />
      </div>
    </div>
  </Slide>
);

const SlideProblem = () => (
  <Slide bg="bg-gradient-to-br from-rose-950 via-slate-950 to-orange-950">
    <Badge className="bg-rose-500/20 text-rose-200 border-rose-400/30 mb-4">01 · THE PROBLEM</Badge>
    <h2 className="text-4xl md:text-6xl font-black mb-6">
      63 million Indian MSMEs (Micro, Small & Medium Enterprises).<br/>
      <span className="text-rose-300">Less than 5% sell online.</span>
    </h2>
    <p className="text-xl text-white/70 max-w-3xl mb-10">
      Existing platforms are too expensive, too complex, or too generic for the kirana, the karigar, the home-baker, the boutique owner.
    </p>
    <div className="grid md:grid-cols-3 gap-5">
      {[
        { t: "Shopify", p: "₹2,000+/mo · English-first · Built for global SMBs (Small & Medium Businesses), not Bharat", c: "from-emerald-500/20 to-emerald-700/10" },
        { t: "Marketplaces", p: "20-30% commission · No brand · No customer data", c: "from-amber-500/20 to-orange-700/10" },
        { t: "DIY (Do-It-Yourself) / WhatsApp", p: "No payments · No tracking · Lost orders · Zero analytics", c: "from-rose-500/20 to-pink-700/10" },
      ].map((x, i) => (
        <div key={i} className={`rounded-2xl p-6 bg-gradient-to-br ${x.c} border border-white/10 hover:scale-105 transition-transform`}
             style={{ animation: `fade-up 0.6s ease-out ${0.2 + i*0.1}s both` }}>
          <div className="text-2xl font-bold mb-2">{x.t}</div>
          <p className="text-sm text-white/70">{x.p}</p>
        </div>
      ))}
    </div>
    <div className="mt-10 p-6 rounded-2xl bg-white/5 border border-white/10">
      <p className="text-lg italic text-white/80">"I can take a photo of my product. I cannot write descriptions, design a website, or set up Razorpay." — every Indian small seller, ever.</p>
    </div>
  </Slide>
);

const SlideSolution = () => (
  <Slide bg="bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950">
    <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 mb-4">02 · THE SOLUTION</Badge>
    <h2 className="text-4xl md:text-6xl font-black mb-4">
      Snap a photo. <span className="text-emerald-300">Get a store.</span>
    </h2>
    <p className="text-xl text-white/70 max-w-3xl mb-10">
      Pic to Cart turns a single product photo into a fully-branded, SEO-ready, payment-enabled storefront — in under 5 minutes.
    </p>
    <div className="grid md:grid-cols-2 gap-6">
      {[
        { i: Brain, t: "AI Generates Everything", p: "Product descriptions, store policies, themes, SEO (Search Engine Optimization) meta, blog posts, email templates — all powered by Google Gemini 2.5." },
        { i: Zap, t: "5-min Onboarding", p: "4-step wizard. Pick category → upload photo → AI fills name, price, variants, ingredients, warranty. Done." },
        { i: ShoppingBag, t: "30-sec Checkout", p: "Razorpay + COD (Cash on Delivery), pincode-aware shipping (Delhivery), one-page checkout, persistent cart, customer accounts." },
        { i: Crown, t: "Premium Themes", p: "30+ AI-generated themes. Custom domains. White-label emails. Launch a brand, not a listing." },
      ].map((f, i) => (
        <div key={i} className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-6 hover:border-emerald-400/40 transition-all"
             style={{ animation: `fade-up 0.6s ease-out ${0.2 + i*0.1}s both` }}>
          <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
            <f.i className="h-6 w-6 text-emerald-300" />
          </div>
          <h3 className="text-xl font-bold mb-2">{f.t}</h3>
          <p className="text-white/70 text-sm">{f.p}</p>
        </div>
      ))}
    </div>
  </Slide>
);

const SlideTraction = () => (
  <Slide bg="bg-gradient-to-br from-indigo-950 via-slate-950 to-violet-950">
    <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30 mb-4">03 · WHAT WE'VE BUILT</Badge>
    <h2 className="text-4xl md:text-6xl font-black mb-4">A real product. Live. Today.</h2>
    <p className="text-xl text-white/70 max-w-3xl mb-10">
      Not a deck. Not a prototype. A production-grade SaaS shipped at <a href="https://pictocart.in" className="text-violet-300 underline">pictocart.in</a>.
    </p>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <Stat value="1,800+" label="Engineering Hours" icon={Clock} delay={0.1} />
      <Stat value="65+" label="Production Features" icon={Layers} delay={0.2} />
      <Stat value="30+" label="AI Themes Live" icon={Sparkles} delay={0.3} />
      <Stat value="₹18 L+" label="Capital Invested" icon={IndianRupee} delay={0.4} />
    </div>
    <div className="grid md:grid-cols-3 gap-5">
      {[
        { t: "Sprint A · Foundation", p: "Auth, multi-tenant stores, products, orders, payments, shipping, themes, customer storefront" },
        { t: "Sprint B · Operations", p: "Returns, reviews moderation, refunds, AWB shipping, Shiprocket integration, dispute panel" },
        { t: "Sprint C · Growth", p: "Advanced coupons (BOGO/tiered), JSON-LD SEO, dynamic sitemap, AI newsletter campaigns" },
        { t: "Sprint D · Engagement", p: "Web push, abandoned cart automation, WhatsApp notifications, loyalty wallet" },
        { t: "Admin Suite", p: "Plans editor, partner program, theme marketplace, cost matrix, security dashboard, health monitor" },
        { t: "AI Everywhere", p: "Product gen, descriptions, blog, themes, store policies, email templates, engagement scoring" },
      ].map((x, i) => (
        <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-5 hover:bg-white/10 transition-colors">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 mb-2" />
          <div className="font-bold mb-1">{x.t}</div>
          <div className="text-xs text-white/60">{x.p}</div>
        </div>
      ))}
    </div>
  </Slide>
);

const SlideMarket = () => (
  <Slide bg="bg-gradient-to-br from-amber-950 via-slate-950 to-orange-950">
    <Badge className="bg-amber-500/20 text-amber-200 border-amber-400/30 mb-4">04 · MARKET SIZE</Badge>
    <h2 className="text-4xl md:text-6xl font-black mb-10">A ₹2,00,000 Cr opportunity.</h2>
    <div className="grid md:grid-cols-3 gap-6 mb-10">
      {[
        { v: "$350B", l: "TAM (Total Addressable Market) · Indian e-commerce by 2030", c: "from-amber-500 to-orange-500" },
        { v: "$45B", l: "SAM (Serviceable Addressable Market) · SMB SaaS commerce in India", c: "from-orange-500 to-rose-500" },
        { v: "$2.4B", l: "SOM (Serviceable Obtainable Market) · Reachable in 24 months", c: "from-rose-500 to-pink-500" },
      ].map((x, i) => (
        <div key={i} className="rounded-2xl p-8 bg-white/5 border border-white/10 hover:scale-105 transition-transform"
             style={{ animation: `fade-up 0.6s ease-out ${0.2 + i*0.15}s both` }}>
          <div className={`text-5xl md:text-6xl font-black bg-gradient-to-r ${x.c} bg-clip-text text-transparent mb-2`}>{x.v}</div>
          <div className="text-white/70">{x.l}</div>
        </div>
      ))}
    </div>
    <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400/20 p-6">
      <h3 className="text-xl font-bold mb-3 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-amber-300" /> The wave we're riding</h3>
      <ul className="grid md:grid-cols-2 gap-2 text-sm text-white/80">
        <li>• 63M MSMEs (Micro, Small & Medium Enterprises) · Govt push for digital Bharat</li>
        <li>• UPI (Unified Payments Interface): 14B+ monthly transactions</li>
        <li>• Tier 2/3 e-commerce growing 4x faster than metro</li>
        <li>• ONDC (Open Network for Digital Commerce) unbundling marketplace monopolies</li>
        <li>• Gen-AI (Generative Artificial Intelligence) making custom software 100x cheaper</li>
        <li>• Vernacular smartphone users: 700M+</li>
      </ul>
    </div>
  </Slide>
);

const SlideRevenue = () => (
  <Slide bg="bg-gradient-to-br from-violet-950 via-slate-950 to-fuchsia-950">
    <Badge className="bg-violet-500/20 text-violet-200 border-violet-400/30 mb-4">05 · REVENUE STREAMS</Badge>
    <h2 className="text-4xl md:text-6xl font-black mb-4">7 ways we make money.</h2>
    <p className="text-xl text-white/70 mb-10">A SaaS base, marketplace economics, and AI credits — compounding ARPU.</p>
    <div className="grid md:grid-cols-2 gap-4">
      {[
        { t: "Subscriptions", p: "Free / Starter ₹499 / Growth ₹1,499 / Scale ₹4,999 per month", v: "₹500 ARPU (Average Revenue Per User)" },
        { t: "Platform Commission", p: "1-3% on every GMV (Gross Merchandise Value) transaction (tiered by plan)", v: "₹150/seller/mo" },
        { t: "Premium Themes", p: "₹500-2,000 one-time per AI-designed theme", v: "₹300/seller LTV (Lifetime Value)" },
        { t: "AI Credits Wallet", p: "Pay-per-use generation (descriptions, images, blogs, themes)", v: "₹200/seller/mo" },
        { t: "Custom Domains", p: "₹999/year domain + DNS (Domain Name System) management upsell", v: "₹999 ARR (Annual Recurring Revenue)" },
        { t: "Payments Float", p: "Razorpay revenue share + branded checkout fees", v: "0.3% GMV" },
        { t: "Shipping Margin", p: "Delhivery / Shiprocket aggregator markup", v: "₹15/order" },
        { t: "Partner Network", p: "Agency commissions, theme marketplace 30% cut", v: "₹50K/agency" },
      ].map((r, i) => (
        <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-5 flex items-center justify-between hover:bg-white/10 transition-colors"
             style={{ animation: `fade-up 0.5s ease-out ${0.1 + i*0.05}s both` }}>
          <div>
            <div className="font-bold">{r.t}</div>
            <div className="text-sm text-white/60">{r.p}</div>
          </div>
          <Badge className="bg-violet-500/20 text-violet-200 border-violet-400/30 ml-3 whitespace-nowrap">{r.v}</Badge>
        </div>
      ))}
    </div>
  </Slide>
);

const SlideAsk = () => (
  <Slide bg="bg-gradient-to-br from-emerald-950 via-slate-950 to-indigo-950">
    <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 mb-4">06 · THE ASK</Badge>
    <h2 className="text-4xl md:text-7xl font-black mb-4">
      <span className="bg-gradient-to-r from-emerald-300 to-indigo-300 bg-clip-text text-transparent">₹3.5 Crore</span> Seed
    </h2>
    <p className="text-xl text-white/70 mb-10">For 12% equity · 18-month runway · Path to Series A at ₹50 Cr (Crore) valuation</p>
    <div className="grid md:grid-cols-2 gap-6 mb-8">
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2"><PieChart className="h-6 w-6 text-emerald-300" /> Use of Funds</h3>
        <div className="space-y-3">
          {[
            { l: "Marketing & Performance Ads", v: 40, c: "bg-emerald-500" },
            { l: "Sales & Onboarding Team (12 hires)", v: 25, c: "bg-indigo-500" },
            { l: "Product & AI R&D (Research and Development)", v: 15, c: "bg-violet-500" },
            { l: "Infrastructure & AI Credits", v: 10, c: "bg-fuchsia-500" },
            { l: "Operations & Compliance", v: 10, c: "bg-amber-500" },
          ].map((x, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1"><span>{x.l}</span><span className="font-bold">{x.v}%</span></div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full ${x.c} rounded-full`} style={{ width: `${x.v}%`, animation: `slide-in-right 1s ease-out ${0.3 + i*0.1}s both` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2"><Target className="h-6 w-6 text-indigo-300" /> 18-mo Targets</h3>
        <div className="space-y-4">
          {[
            { l: "Active Sellers", v: "50,000" },
            { l: "Paid Sellers (15% conv)", v: "7,500" },
            { l: "MRR (Monthly Recurring Revenue)", v: "₹65 Lakh" },
            { l: "Annual GMV (Gross Merchandise Value)", v: "₹120 Cr" },
            { l: "Platform Revenue Run-rate", v: "₹12 Cr" },
            { l: "Gross Margin", v: "78%" },
          ].map((x, i) => (
            <div key={i} className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-white/70">{x.l}</span>
              <span className="font-black text-emerald-300">{x.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </Slide>
);

const SlideRoadmap = () => {
  return (
  <Slide bg="bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950">
    <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30 mb-4">07 · 24-MONTH ROADMAP</Badge>
    <h2 className="text-4xl md:text-6xl font-black mb-4">India today. <span className="text-blue-300">Global tomorrow.</span></h2>
    <p className="text-xl text-white/70 mb-8">From Tier-2 India to MENA (Middle East & North Africa), SEA (South-East Asia), and LATAM (Latin America) in 24 months.</p>
    <div className="space-y-4">
      {[
        { q: "Q1-Q2 2026", t: "Bharat Push", p: "Vernacular UI (User Interface) in Hindi, Tamil, Telugu, Marathi. 10K active sellers. Launch ONDC (Open Network for Digital Commerce) bridge.", c: "from-orange-500 to-amber-500" },
        { q: "Q3-Q4 2026", t: "Scale & Polish", p: "WhatsApp Commerce. Mobile app (PWA – Progressive Web App – → native). Loyalty + abandoned cart. 50K sellers, ₹65L MRR (Monthly Recurring Revenue).", c: "from-emerald-500 to-teal-500" },
        { q: "Q1-Q2 2027", t: "MENA & SEA", p: "Multi-currency, multi-language storefront. UAE, KSA (Kingdom of Saudi Arabia), Singapore, Indonesia launch. Stripe + local PG (Payment Gateway).", c: "from-violet-500 to-fuchsia-500" },
        { q: "Q3-Q4 2027", t: "Global SaaS (Software-as-a-Service)", p: "LATAM + Africa. Series A. 250K sellers globally. ₹6 Cr+ MRR. Path to IPO (Initial Public Offering).", c: "from-indigo-500 to-blue-500" },
      ].map((x, i) => (
        <div key={i} className="flex items-start gap-4 rounded-2xl bg-white/5 border border-white/10 p-5 hover:bg-white/10 transition-colors"
             style={{ animation: `slide-in-left 0.6s ease-out ${0.2 + i*0.15}s both` }}>
          <div className={`h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br ${x.c} flex items-center justify-center text-white font-black text-xs text-center px-1`}>
            {x.q.split(" ")[0]}
          </div>
          <div>
            <div className="text-xs text-white/50">{x.q}</div>
            <div className="text-xl font-bold mb-1">{x.t}</div>
            <div className="text-sm text-white/70">{x.p}</div>
          </div>
        </div>
      ))}
    </div>
  </Slide>
  );
};

const SlideCustomer = () => (
  <Slide bg="bg-gradient-to-br from-pink-950 via-slate-950 to-rose-950">
    <Badge className="bg-pink-500/20 text-pink-200 border-pink-400/30 mb-4">08 · CUSTOMER WINS</Badge>
    <h2 className="text-4xl md:text-6xl font-black mb-10">Why sellers will love us.</h2>
    <div className="grid md:grid-cols-3 gap-5">
      {[
        { i: Clock, t: "5x Faster Setup", p: "Setup in minutes, not weeks. AI fills every field." },
        { i: Coins, t: "10x Cheaper", p: "₹499/mo vs ₹2,500+ on Shopify. 0% commission on Scale plan." },
        { i: Brain, t: "AI Co-Pilot", p: "Descriptions, blog, marketing copy, SEO (Search Engine Optimization) — written for you." },
        { i: Shield, t: "Made for Bharat", p: "GST (Goods & Services Tax) invoices, COD (Cash on Delivery), Delhivery — out of the box." },
        { i: Crown, t: "Own Your Brand", p: "Custom domain. Branded emails. Full customer data." },
        { i: TrendingUp, t: "Built to Convert", p: "30+ themes, abandoned cart, coupons, reviews, loyalty." },
      ].map((x, i) => (
        <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:scale-105 hover:border-pink-400/40 transition-all"
             style={{ animation: `fade-up 0.6s ease-out ${0.1 + i*0.08}s both` }}>
          <div className="h-12 w-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-4">
            <x.i className="h-6 w-6 text-pink-300" />
          </div>
          <h3 className="text-lg font-bold mb-1">{x.t}</h3>
          <p className="text-sm text-white/70">{x.p}</p>
        </div>
      ))}
    </div>
  </Slide>
);

const SlideClose = () => (
  <Slide bg="bg-gradient-to-br from-violet-950 via-purple-950 to-indigo-950">
    <div className="flex flex-col justify-center items-center text-center h-full min-h-[600px]">
      <Trophy className="h-16 w-16 text-amber-300 mb-6 animate-bounce" />
      <h2 className="text-5xl md:text-8xl font-black mb-6 leading-[1.05]">
        Let's build the<br/>
        <span className="bg-gradient-to-r from-amber-300 via-pink-300 to-violet-300 bg-clip-text text-transparent">
          Shopify of Bharat.
        </span>
      </h2>
      <p className="text-xl md:text-2xl text-white/70 max-w-2xl mb-10">
        You bring the capital. We bring the product, the team, and the obsession.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 mb-10">
        <a href="mailto:antarikshautomations@gmail.com">
          <Button size="lg" className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90 text-white text-lg px-8 h-14">
            <Mail className="h-5 w-5 mr-2" /> antarikshautomations@gmail.com
          </Button>
        </a>
        <a href="https://pictocart.in" target="_blank" rel="noopener noreferrer">
          <Button size="lg" variant="outline" className="border-white/30 bg-white/5 hover:bg-white/10 text-white text-lg px-8 h-14">
            <Globe className="h-5 w-5 mr-2" /> Live at pictocart.in
          </Button>
        </a>
      </div>
      <p className="text-sm text-white/50 italic">"You take care of the pitch. I'll take care of the confidence."</p>
    </div>
  </Slide>
);

const SLIDES = [SlideCover, SlideProblem, SlideSolution, SlideTraction, SlideMarket, SlideRevenue, SlideAsk, SlideRoadmap, SlideCustomer, SlideClose];

const Investors = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, duration: 30 });
  const [selected, setSelected] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") scrollNext();
      if (e.key === "ArrowLeft") scrollPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scrollNext, scrollPrev]);

  return (
    <div className="min-h-screen bg-slate-950">
      <SEOHead
        title="Investor Pitch · Pic to Cart — AI E-commerce for Bharat"
        description="Pic to Cart is India's AI-native e-commerce OS for the next 100M small sellers. Seeking ₹3.5Cr seed."
      />

      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white">
            <PicToCartLogo size={28} />
            <span className="font-bold">Pic to Cart</span>
            <Badge className="bg-violet-500/20 text-violet-200 border-violet-400/30 ml-2 hidden sm:inline-flex">Investor Deck</Badge>
          </Link>
          <div className="text-xs text-white/50">{selected + 1} / {SLIDES.length}</div>
        </div>
      </header>

      {/* Carousel */}
      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {SLIDES.map((S, i) => (
              <div key={i} className="flex-[0_0_100%] min-w-0">
                <S />
              </div>
            ))}
          </div>
        </div>

        {/* Nav arrows */}
        <button onClick={scrollPrev} disabled={selected === 0}
                className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 disabled:opacity-30 transition-all z-20 flex items-center justify-center">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button onClick={scrollNext} disabled={selected === SLIDES.length - 1}
                className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 disabled:opacity-30 transition-all z-20 flex items-center justify-center">
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20 bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => scrollTo(i)}
                    className={`h-2 rounded-full transition-all ${i === selected ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/60"}`} />
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <section className="bg-slate-950 border-t border-white/10 py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to build the next ₹1,000 Cr commerce company?</h3>
          <p className="text-white/60 mb-6">Connect with our founder for the full data room, financial model, and product walkthrough.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="mailto:antarikshautomations@gmail.com">
              <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90"><Mail className="h-4 w-4 mr-2" />Email Founder</Button>
            </a>
            <Link to="/">
              <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">Back to Home <ArrowRight className="h-4 w-4 ml-2" /></Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Investors;
