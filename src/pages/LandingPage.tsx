import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Camera, Sparkles, Rocket, Store, BarChart3, Search, CreditCard, Palette,
  ShoppingCart, Globe, Star, ChevronRight, ArrowRight, Check, Zap, Shield,
  Smartphone, TrendingUp, Users, Package, Mail, Instagram, Twitter, Facebook,
  Youtube, Truck, FileText, BookOpen, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import themeFashion from '@/assets/theme-fashion.jpg';
import themeFood from '@/assets/theme-food.jpg';
import themeElectronics from '@/assets/theme-electronics.jpg';
import themeBeauty from '@/assets/theme-beauty.jpg';
import themeHandcraft from '@/assets/theme-handcraft.jpg';
import themeBooks from '@/assets/theme-books.jpg';
import SEOHead from '@/components/storefront/SEOHead';

/* ─── Intersection Observer hook for scroll animations ─── */
const useScrollReveal = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
};

/* ─── Animated counter ─── */
const Counter = ({ end, suffix = '', duration = 2000 }: { end: number; suffix?: string; duration?: number }) => {
  const { ref, visible } = useScrollReveal();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => { start = Math.min(start + step, end); setCount(start); if (start >= end) clearInterval(timer); }, 16);
    return () => clearInterval(timer);
  }, [visible, end, duration]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

/* ─── Merchant types paired with real theme previews (synced shuffle) ─── */
const merchantShowcase = [
  { label: 'Fashion Brands',     image: themeFashion,     accent: 'from-rose-500 to-pink-400' },
  { label: 'Home Bakers',        image: themeFood,        accent: 'from-amber-500 to-orange-400' },
  { label: 'Electronics Stores', image: themeElectronics, accent: 'from-sky-500 to-indigo-400' },
  { label: 'Beauty Studios',     image: themeBeauty,      accent: 'from-fuchsia-500 to-violet-400' },
  { label: 'Handicraft Sellers', image: themeHandcraft,   accent: 'from-emerald-500 to-teal-400' },
  { label: 'Book Stores',        image: themeBooks,       accent: 'from-indigo-500 to-purple-400' },
];

/* ─── Typewriter (driven by external index for sync) ─── */
const Typewriter = ({ idx }: { idx: number }) => {
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const word = merchantShowcase[idx].label;

  // reset on idx change
  useEffect(() => { setDeleting(false); setText(''); }, [idx]);

  useEffect(() => {
    const timeout = deleting ? 28 : 55;
    if (!deleting && text === word) return; // hold; parent advances idx
    if (deleting && text === '') return;
    const timer = setTimeout(() => {
      setText(deleting ? word.slice(0, text.length - 1) : word.slice(0, text.length + 1));
    }, timeout);
    return () => clearTimeout(timer);
  }, [text, deleting, word]);

  return (
    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
      {text}<span className="border-r-2 border-emerald-400 animate-typewriter-cursor ml-0.5">&nbsp;</span>
    </span>
  );
};

/* ─── Shuffling website card deck — synced to merchant type ─── */
const ShowcaseDeck = ({ idx }: { idx: number }) => {
  const len = merchantShowcase.length;
  // Build z-ordered stack: front card = idx, then idx+1, idx+2, idx+3 behind
  const stack = Array.from({ length: 4 }, (_, i) => (idx + i) % len);

  return (
    <div className="relative w-full max-w-[560px] aspect-[4/3] mx-auto" style={{ perspective: '1800px' }}>
      {/* ambient glow behind deck */}
      <div className={`absolute inset-0 -z-10 blur-3xl opacity-40 rounded-[3rem] bg-gradient-to-br ${merchantShowcase[idx].accent} transition-all duration-700`} />

      {stack.map((cardIdx, pos) => {
        const item = merchantShowcase[cardIdx];
        // pos 0 = front, 3 = deepest back
        const translateY = pos * 22;
        const translateX = pos * -14;
        const scale = 1 - pos * 0.06;
        const rotate = -4 + pos * 2;
        const opacity = pos === 0 ? 1 : 0.55 - pos * 0.1;
        const blur = pos === 0 ? 0 : pos * 1.2;
        const z = 40 - pos;

        return (
          <div
            key={`${cardIdx}-${pos}`}
            className="absolute inset-0 transition-all duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale}) rotateY(${rotate}deg) rotateX(${pos * 1.5}deg)`,
              opacity,
              filter: `blur(${blur}px)`,
              zIndex: z,
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Browser-window card */}
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-900 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7),0_25px_50px_-25px_rgba(99,102,241,0.5)] ring-1 ring-white/10">
              {/* Browser chrome */}
              <div className="h-8 bg-gradient-to-b from-slate-800 to-slate-900 border-b border-white/5 flex items-center px-3 gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <div className="ml-3 flex-1 h-4 rounded bg-white/5 max-w-[180px]" />
              </div>
              {/* Screenshot */}
              <div className="relative w-full h-[calc(100%-2rem)] overflow-hidden">
                <img
                  src={item.image}
                  alt={`${item.label} store theme preview`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                {/* Glare sweep — only on front card */}
                {pos === 0 && (
                  <div
                    key={`glare-${cardIdx}`}
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)',
                      transform: 'translateX(-100%)',
                      animation: 'deck-glare 1.4s ease-out 0.25s 1 forwards',
                    }}
                  />
                )}
                {/* Category tag — front card only */}
                {pos === 0 && (
                  <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-semibold text-white/90 border border-white/10">
                    {item.label}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Floating accent badges (kept, but pinned to deck) */}
      <div className="absolute -left-6 top-6 bg-white rounded-xl shadow-2xl p-3 flex items-center gap-2 z-50 animate-fade-up">
        <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center"><Camera className="h-4 w-4 text-emerald-600" /></div>
        <div>
          <div className="text-xs font-bold text-slate-800">Photo Uploaded</div>
          <div className="text-[10px] text-slate-400">AI processing…</div>
        </div>
      </div>
      <div className="absolute -right-4 bottom-10 bg-white rounded-xl shadow-2xl p-3 flex items-center gap-2 z-50 animate-fade-up" style={{ animationDelay: '0.4s' }}>
        <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center"><Sparkles className="h-4 w-4 text-violet-600" /></div>
        <div>
          <div className="text-xs font-bold text-slate-800">AI Generated</div>
          <div className="text-[10px] text-slate-400">Title, price, SEO ✓</div>
        </div>
      </div>
    </div>
  );
};

/* ─── Category pills ─── */
const categories = ['Fashion', 'Food & Bakery', 'Electronics', 'Beauty', 'Handcraft', 'Books', 'Fitness', 'Home Décor', 'Jewelry', 'Services', 'Pet Supplies', 'Art & Design', 'Organic', 'Toys', 'Stationery'];

/* ─── Testimonials ─── */
const testimonials = [
  { name: 'Priya Sharma', store: 'Priya\'s Boutique', category: 'Fashion', quote: 'I set up my store in literally 5 minutes. The AI wrote better product descriptions than I ever could!', stars: 5, growth: '300% sales in 2 months' },
  { name: 'Ravi Kumar', store: 'Ravi\'s Organic Farm', category: 'Organic Food', quote: 'As a farmer, I just take photos of my produce. Pic to Cart handles everything else. My online orders have tripled.', stars: 5, growth: '₹2L monthly revenue' },
  { name: 'Meera Jain', store: 'Sparkle Jewelry', category: 'Jewelry', quote: 'The premium themes are gorgeous. My customers think I hired a professional web designer. Worth every rupee!', stars: 5, growth: '500+ orders in first month' },
];

/* ─── Section wrapper with reveal ─── */
const RevealSection = ({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

/* ━━━━━━━━━━━━━━━━━━ LANDING PAGE ━━━━━━━━━━━━━━━━━━ */
const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showcaseIdx, setShowcaseIdx] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const t = setInterval(() => setTestimonialIdx(i => (i + 1) % testimonials.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Sync: shuffle the website deck + drive typewriter on the same beat
  useEffect(() => {
    const t = setInterval(() => setShowcaseIdx(i => (i + 1) % merchantShowcase.length), 2800);
    return () => clearInterval(t);
  }, []);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <SEOHead
        title="Pic to Cart — Launch Your Online Store in 5 Minutes"
        description="Create your online store instantly. Just snap a photo — AI generates product titles, descriptions, pricing & SEO. Free forever. 50+ premium themes."
        url="https://pictocart.in"
        type="website"
      />

      {/* ─── NAVBAR ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 glass-nav shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Store className="h-5 w-5 text-white" />
              </div>
              <span className={`font-extrabold text-lg tracking-tight ${scrolled ? 'text-slate-900' : 'text-white'}`}>
                Pic to Cart
              </span>
            </div>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-8">
              {['features', 'how-it-works', 'pricing', 'themes'].map(id => (
                <button key={id} onClick={() => scrollTo(id)} className={`text-sm font-medium capitalize transition-colors hover:text-indigo-500 ${scrolled ? 'text-slate-600' : 'text-white/80 hover:text-white'}`}>
                  {id.replace('-', ' ')}
                </button>
              ))}
            </div>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" className={`font-medium ${scrolled ? 'text-slate-700 hover:text-indigo-600' : 'text-white/90 hover:text-white hover:bg-white/10'}`}>
                  Login
                </Button>
              </Link>
              <Link to="/auth">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/25 animate-pulse-glow">
                  Start Free <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Mobile menu toggle */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2">
              <div className={`space-y-1.5 transition-all ${mobileMenuOpen ? 'rotate-45' : ''}`}>
                <span className={`block w-6 h-0.5 transition-all ${scrolled ? 'bg-slate-800' : 'bg-white'} ${mobileMenuOpen ? 'rotate-90 translate-y-2' : ''}`} />
                <span className={`block w-6 h-0.5 transition-all ${scrolled ? 'bg-slate-800' : 'bg-white'} ${mobileMenuOpen ? 'opacity-0' : ''}`} />
                <span className={`block w-6 h-0.5 transition-all ${scrolled ? 'bg-slate-800' : 'bg-white'} ${mobileMenuOpen ? '-rotate-90 -translate-y-2' : ''}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 shadow-lg">
            <div className="px-4 py-4 space-y-2">
              {['features', 'how-it-works', 'pricing', 'themes'].map(id => (
                <button key={id} onClick={() => scrollTo(id)} className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg capitalize">
                  {id.replace('-', ' ')}
                </button>
              ))}
              <div className="pt-2 border-t border-slate-100 flex gap-2">
                <Link to="/auth" className="flex-1"><Button variant="outline" className="w-full">Login</Button></Link>
                <Link to="/auth" className="flex-1"><Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">Start Free</Button></Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 gradient-mesh opacity-60" />
        {/* Floating orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-500/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left - Copy */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-sm text-white/80 mb-6 backdrop-blur-sm">
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
                <span>AI-Powered Store Builder</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
                Launch Your Store<br />
                for <Typewriter idx={showcaseIdx} />
              </h1>

              <p className="text-lg sm:text-xl text-white/70 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                Just snap a photo. <span className="text-white font-medium">AI does the rest.</span> Product titles, descriptions, pricing, SEO — all generated in seconds.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mb-10">
                <Link to="/auth">
                  <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-lg px-8 py-6 shadow-2xl shadow-emerald-500/30 animate-pulse-glow">
                    Create Your Free Store <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <button onClick={() => scrollTo('how-it-works')} className="text-white/60 hover:text-white text-sm font-medium flex items-center gap-1.5 transition-colors">
                  See how it works <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-6 sm:gap-8 justify-center lg:justify-start text-white/60 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-400" />
                  <span><span className="text-white font-bold"><Counter end={10000} suffix="+" /></span> Stores</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-violet-400" />
                  <span><span className="text-white font-bold"><Counter end={50} suffix="+" /></span> Categories</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-400" />
                  <span className="text-white font-bold">₹0 Setup</span>
                </div>
              </div>
            </div>

            {/* Right - Shuffling Website Deck */}
            <div className="relative flex justify-center lg:justify-end">
              <ShowcaseDeck idx={showcaseIdx} />
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 50L60 42C120 34 240 18 360 14C480 10 600 18 720 30C840 42 960 58 1080 62C1200 66 1320 58 1380 54L1440 50V100H1380C1320 100 1200 100 1080 100C960 100 840 100 720 100C600 100 480 100 360 100C240 100 120 100 60 100H0V50Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* ─── SOCIAL PROOF MARQUEE ─── */}
      <section className="py-10 bg-white border-b border-slate-100">
        <p className="text-center text-sm font-medium text-slate-400 mb-6 tracking-widest uppercase">Trusted by merchants across India</p>
        <div className="overflow-hidden relative">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...categories, ...categories].map((cat, i) => (
              <span key={i} className="mx-4 px-5 py-2 rounded-full bg-slate-50 border border-slate-100 text-sm font-medium text-slate-500 shrink-0">
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-semibold mb-4">Simple as 1-2-3</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">
                How It Works
              </h2>
              <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                From photo to online store in under 5 minutes. No technical skills needed.
              </p>
            </div>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              { icon: Camera, color: 'from-emerald-500 to-emerald-600', bgColor: 'bg-emerald-50', title: 'Snap a Photo', desc: 'Take a photo of your product. That\'s it. Our AI takes over from here.', step: '01' },
              { icon: Sparkles, color: 'from-violet-500 to-indigo-600', bgColor: 'bg-violet-50', title: 'AI Creates Everything', desc: 'Product title, description, pricing suggestions, SEO tags — all generated instantly.', step: '02' },
              { icon: Rocket, color: 'from-indigo-500 to-blue-600', bgColor: 'bg-indigo-50', title: 'Go Live Instantly', desc: 'Your store is live. Share the link on WhatsApp, Instagram, anywhere. Start selling!', step: '03' },
            ].map((item, i) => (
              <RevealSection key={i} delay={i * 150}>
                <div className="group relative bg-white rounded-2xl p-8 border border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all duration-300 text-center">
                  <div className="text-6xl font-black text-slate-50 absolute top-4 right-6 group-hover:text-slate-100 transition-colors">{item.step}</div>
                  <div className={`inline-flex h-16 w-16 rounded-2xl ${item.bgColor} items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className={`h-8 w-8 bg-gradient-to-br ${item.color} bg-clip-text`} style={{ color: 'transparent', WebkitBackgroundClip: 'text', backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-from), var(--tw-gradient-to))` }} />
                    <item.icon className={`h-8 w-8 text-${item.color.includes('emerald') ? 'emerald' : item.color.includes('violet') ? 'violet' : 'indigo'}-600 absolute`} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES BENTO GRID ─── */}
      <section id="features" className="py-20 sm:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1 rounded-full bg-violet-50 text-violet-600 text-sm font-semibold mb-4">Powerful Features</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">
                Everything You Need to Sell Online
              </h2>
              <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                From AI-powered product creation to analytics — we've built every tool a modern merchant needs.
              </p>
            </div>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-4 lg:gap-6">
            {/* Large card */}
            <RevealSection className="md:col-span-2 md:row-span-2" delay={0}>
              <div className="h-full bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl p-8 lg:p-10 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                <div className="relative z-10">
                  <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-bold mb-3">AI Product Generation</h3>
                  <p className="text-white/80 text-lg leading-relaxed max-w-md mb-6">
                    Upload a photo and our AI instantly creates professional product listings with titles, descriptions, pricing suggestions, and SEO-optimized tags.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Auto Titles', 'Smart Pricing', 'SEO Tags', 'Descriptions'].map(t => (
                      <span key={t} className="px-3 py-1 rounded-full bg-white/15 text-sm font-medium">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </RevealSection>

            {/* Small cards */}
            {[
              { icon: Palette, title: 'Theme Marketplace', desc: '50+ AI-generated premium themes', bg: 'bg-white' },
              { icon: BarChart3, title: 'Real-time Analytics', desc: 'Track visitors, sales & revenue', bg: 'bg-white' },
              { icon: ShoppingCart, title: 'Order Management', desc: 'Track, ship & manage orders', bg: 'bg-white' },
              { icon: CreditCard, title: 'Payment Integration', desc: 'Razorpay, UPI & COD support', bg: 'bg-white' },
            ].map((item, i) => (
              <RevealSection key={i} delay={(i + 1) * 100}>
                <div className={`${item.bg} rounded-2xl p-6 border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300 group h-full`}>
                  <div className="h-11 w-11 rounded-xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <item.icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>

          {/* Second row features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6 mt-4 lg:mt-6">
            {[
              { icon: Search, title: 'SEO Tools' },
              { icon: Truck, title: 'Shipping' },
              { icon: Globe, title: 'Custom Domain' },
              { icon: Smartphone, title: 'Mobile First' },
            ].map((item, i) => (
              <RevealSection key={i} delay={i * 80}>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all duration-300 text-center group">
                  <item.icon className="h-6 w-6 text-indigo-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-semibold text-slate-700">{item.title}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── THEME SHOWCASE ─── */}
      <section id="themes" className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full bg-emerald-50 text-emerald-600 text-sm font-semibold mb-4">Theme Marketplace</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">
                50+ Stunning AI-Generated Themes
              </h2>
              <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                Browse premium themes crafted by AI for every business category. Each one fully customizable.
              </p>
            </div>
          </RevealSection>

          {/* Horizontal scroll */}
          <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide cursor-grab">
            <div className="flex gap-6 min-w-max">
              {[
                { name: 'Luxe Fashion', cat: 'Fashion', img: themeFashion },
                { name: 'Fresh Market', cat: 'Food', img: themeFood },
                { name: 'Tech Hub', cat: 'Electronics', img: themeElectronics },
                { name: 'Glow Beauty', cat: 'Beauty', img: themeBeauty },
                { name: 'Artisan Craft', cat: 'Handcraft', img: themeHandcraft },
                { name: 'Book Nook', cat: 'Books', img: themeBooks },
              ].map((theme, i) => (
                <RevealSection key={i} delay={i * 100}>
                  <div className="w-72 rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300 group">
                    <div className="h-44 relative overflow-hidden">
                      <img src={theme.img} alt={`${theme.name} theme preview`} loading="lazy" className="w-full object-cover object-top transition-all duration-[3s] ease-in-out group-hover:object-bottom" style={{ height: '200%', minHeight: '200%' }} />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                      <div className="absolute bottom-3 left-3 z-10">
                        <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">{theme.cat}</span>
                      </div>
                    </div>
                    <div className="p-4 bg-white">
                      <h3 className="font-bold text-slate-900">{theme.name}</h3>
                      <p className="text-sm text-slate-400 mt-1">5 pages • Full customization</p>
                    </div>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CATEGORIES ─── */}
      <section className="py-20 sm:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">
                One Platform. Every Business.
              </h2>
              <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                Whether you sell fashion, food, or handcraft — we've got the perfect tools and themes for you.
              </p>
            </div>
          </RevealSection>

          <RevealSection delay={200}>
            <div className="flex flex-wrap justify-center gap-3">
              {categories.map((cat, i) => (
                <Link
                  key={cat}
                  to="/auth"
                  className="px-5 py-2.5 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {cat}
                </Link>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-semibold mb-4">Pricing</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">
                Start Free. Scale as You Grow.
              </h2>
              <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                No hidden fees. No credit card required. Upgrade when you need more power.
              </p>
            </div>
          </RevealSection>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free */}
            <RevealSection delay={0}>
              <div className="rounded-3xl border border-slate-200 p-8 bg-white hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Free</h3>
                <p className="text-slate-400 text-sm mb-6">Everything you need to start selling</p>
                <div className="mb-8">
                  <span className="text-5xl font-extrabold text-slate-900">₹0</span>
                  <span className="text-slate-400 ml-2">/forever</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Unlimited products', 'AI product generation', 'Basic themes', 'Order management', 'WhatsApp sharing', 'COD & UPI payments'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-slate-600">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className="block">
                  <Button variant="outline" className="w-full py-5 font-semibold border-slate-200 hover:border-indigo-300">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </RevealSection>

            {/* Premium */}
            <RevealSection delay={150}>
              <div className="rounded-3xl border-2 border-indigo-500 p-8 bg-gradient-to-b from-indigo-50/50 to-white relative hover:shadow-xl transition-shadow">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold">
                  Most Popular
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">Premium</h3>
                <p className="text-slate-400 text-sm mb-6">For serious sellers who want to grow fast</p>
                <div className="mb-8">
                  <span className="text-5xl font-extrabold text-slate-900">₹499</span>
                  <span className="text-slate-400 ml-2">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Everything in Free', 'Custom domain', 'Premium AI themes', 'Advanced analytics', 'Priority support', 'Blog & SEO tools', 'Shipping integration', 'Coupon management'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-slate-600">
                      <Check className="h-4 w-4 text-indigo-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className="block">
                  <Button className="w-full py-5 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25">
                    Start Premium Trial <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-20 sm:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full bg-amber-50 text-amber-600 text-sm font-semibold mb-4">Testimonials</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">
                Loved by Merchants
              </h2>
            </div>
          </RevealSection>

          <div className="max-w-3xl mx-auto">
            <RevealSection>
              <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-sm border border-slate-100 relative">
                <div className="absolute top-6 right-8 text-6xl text-indigo-100 font-serif">"</div>
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: testimonials[testimonialIdx].stars }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-lg lg:text-xl text-slate-700 leading-relaxed mb-6 relative z-10">
                  "{testimonials[testimonialIdx].quote}"
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{testimonials[testimonialIdx].name}</div>
                    <div className="text-sm text-slate-500">{testimonials[testimonialIdx].store} • {testimonials[testimonialIdx].category}</div>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-sm font-semibold">
                    {testimonials[testimonialIdx].growth}
                  </div>
                </div>
                {/* Dots */}
                <div className="flex items-center justify-center gap-2 mt-8">
                  {testimonials.map((_, i) => (
                    <button key={i} onClick={() => setTestimonialIdx(i)} className={`h-2 rounded-full transition-all duration-300 ${i === testimonialIdx ? 'w-6 bg-indigo-600' : 'w-2 bg-slate-200 hover:bg-slate-300'}`} />
                  ))}
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6bTAtMzBWMkgydjJoMzR6TTIgMjZ2MmgzNHYtMkgyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <RevealSection>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4">
              Your Store is One Click Away
            </h2>
            <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto">
              Join 10,000+ merchants who've launched their online business with Pic to Cart. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center max-w-md mx-auto">
              <Link to="/auth" className="w-full sm:w-auto">
                <Button size="lg" className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-lg px-10 py-6 shadow-2xl shadow-emerald-500/30">
                  Create Your Free Store <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <p className="text-white/50 text-sm mt-4">No credit card required • Setup in 5 minutes • Free forever</p>
          </RevealSection>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-slate-950 text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="font-bold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => scrollTo('features')} className="hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => scrollTo('pricing')} className="hover:text-white transition-colors">Pricing</button></li>
                <li><button onClick={() => scrollTo('themes')} className="hover:text-white transition-colors">Themes</button></li>
                <li><Link to="/auth" className="hover:text-white transition-colors">Get Started</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><a href="mailto:support@pictocart.in" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => scrollTo('features')} className="hover:text-white transition-colors">Help Center</button></li>
                <li><button onClick={() => scrollTo('pricing')} className="hover:text-white transition-colors">Pricing</button></li>
                <li><button onClick={() => scrollTo('themes')} className="hover:text-white transition-colors">Themes</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/refund-policy" className="hover:text-white transition-colors">Refund Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                <Store className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-white">Pic to Cart</span>
            </div>
            <p className="text-sm">© {new Date().getFullYear()} Pic to Cart. All rights reserved.</p>
            <div className="flex items-center gap-4">
              {[Instagram, Twitter, Facebook, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="hover:text-white transition-colors"><Icon className="h-5 w-5" /></a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Pic to Cart",
            "description": "AI-powered online store builder for merchants. Create your store in 5 minutes.",
            "url": "https://pictocart.in",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "INR"
            },
            "creator": {
              "@type": "Organization",
              "name": "Pic to Cart",
              "url": "https://pictocart.in"
            }
          })
        }}
      />
    </div>
  );
};

export default LandingPage;
