import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft, Star, ChevronLeft, ChevronRight, ArrowUp, X, Mail, Phone, MapPin, Clock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll';

/* ── Animated wrapper ── */
const AnimSection = ({ animation, children, className = '' }: { animation?: string; children: React.ReactNode; className?: string }) => {
  const { ref, style, className: animCls } = useAnimateOnScroll(animation || 'none');
  return <div ref={ref} style={style} className={`${className} ${animCls}`.trim()}>{children}</div>;
};

/* ── Countdown Timer ── */
const CountdownTimer = ({ targetDate, colors, fonts }: { targetDate: string; colors: any; fonts: any }) => {
  const [diff, setDiff] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const ms = new Date(targetDate).getTime() - Date.now();
      if (ms <= 0) return;
      setDiff({ d: Math.floor(ms / 86400000), h: Math.floor((ms % 86400000) / 3600000), m: Math.floor((ms % 3600000) / 60000), s: Math.floor((ms % 60000) / 1000) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return (
    <div className="flex gap-4 justify-center">
      {[['d', 'Days'], ['h', 'Hrs'], ['m', 'Min'], ['s', 'Sec']].map(([k, label]) => (
        <div key={k} className="flex flex-col items-center">
          <div className="text-3xl md:text-4xl font-bold px-4 py-3 rounded-lg" style={{ backgroundColor: colors.card, fontFamily: fonts.heading, color: colors.primary }}>
            {String((diff as any)[k]).padStart(2, '0')}
          </div>
          <span className="text-xs mt-1 opacity-60">{label}</span>
        </div>
      ))}
    </div>
  );
};

/* ── Testimonial Carousel ── */
const TestimonialCarousel = ({ testimonials, colors, fonts, borderRadius }: { testimonials: any[]; colors: any; fonts: any; borderRadius: number }) => {
  const [idx, setIdx] = useState(0);
  const items = testimonials?.length ? testimonials : [
    { name: 'Sarah M.', rating: 5, quote: 'Absolutely love the quality! Will definitely order again.', avatar: '👩' },
    { name: 'Raj K.', rating: 5, quote: 'Fast delivery and great customer service. Highly recommended!', avatar: '👨' },
    { name: 'Priya S.', rating: 4, quote: 'Beautiful products and amazing packaging. Very impressed!', avatar: '👩‍💼' },
  ];

  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % items.length), 4000);
    return () => clearInterval(id);
  }, [items.length]);

  return (
    <div className="relative overflow-hidden">
      <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${idx * 100}%)` }}>
        {items.map((t, i) => (
          <div key={i} className="w-full shrink-0 px-4">
            <div className="max-w-lg mx-auto text-center p-6 rounded-xl" style={{ backgroundColor: colors.card, borderRadius: `${borderRadius}px` }}>
              <span className="text-3xl">{t.avatar || '👤'}</span>
              <div className="flex justify-center gap-0.5 my-2">
                {Array(5).fill(0).map((_, si) => (
                  <Star key={si} className="h-4 w-4" style={{ fill: si < (t.rating || 5) ? '#facc15' : 'transparent', color: si < (t.rating || 5) ? '#facc15' : colors.text + '30' }} />
                ))}
              </div>
              <p className="text-sm italic opacity-80 mb-3" style={{ fontFamily: fonts.body }}>"{t.quote}"</p>
              <p className="text-xs font-semibold" style={{ fontFamily: fonts.heading }}>{t.name}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1.5 mt-4">
        {items.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} className="rounded-full transition-all" style={{ width: i === idx ? 20 : 8, height: 8, backgroundColor: i === idx ? colors.primary : colors.text + '30' }} />
        ))}
      </div>
    </div>
  );
};

/* ── FAQ Accordion ── */
const FAQAccordion = ({ items, colors, fonts, borderRadius }: { items: any[]; colors: any; fonts: any; borderRadius: number }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <div className="space-y-2">
      {items.map((item: any, i: number) => (
        <div key={i} className="border overflow-hidden" style={{ borderColor: colors.secondary, borderRadius: `${borderRadius / 2}px` }}>
          <button
            className="w-full flex items-center justify-between p-4 text-left text-sm font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: openIdx === i ? colors.secondary : 'transparent' }}
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
          >
            <span style={{ fontFamily: fonts.heading }}>{item.q}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openIdx === i ? 'rotate-180' : ''}`} />
          </button>
          <div
            className="overflow-hidden transition-all duration-300"
            style={{ maxHeight: openIdx === i ? '200px' : '0px', opacity: openIdx === i ? 1 : 0 }}
          >
            <p className="p-4 pt-0 text-sm opacity-70 leading-relaxed" style={{ fontFamily: fonts.body }}>{item.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Page navigation ── */
const PAGE_TABS = [
  { key: 'home', label: 'Home' },
  { key: 'shop', label: 'Shop' },
  { key: 'about', label: 'About' },
  { key: 'contact', label: 'Contact' },
  { key: 'faq', label: 'FAQ' },
  { key: 'privacy_policy', label: 'Privacy' },
  { key: 'return_policy', label: 'Returns' },
  { key: 'terms', label: 'Terms' },
  { key: 'shipping_policy', label: 'Shipping' },
];

/* ── Footer links constant ── */
const FOOTER_COLUMNS = [
  { title: 'Quick Links', links: ['Shop', 'New Arrivals', 'Best Sellers', 'About Us'] },
  { title: 'Customer Support', links: ['Contact Us', 'FAQ', 'Shipping Info', 'Track Order'] },
  { title: 'Legal', links: ['Privacy Policy', 'Return Policy', 'Terms of Service', 'Shipping Policy'] },
];

const ThemePreview = () => {
  const [searchParams] = useSearchParams();
  const themeId = searchParams.get('theme');
  const [pack, setPack] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    if (!themeId) return;
    supabase.from('theme_packs').select('*').eq('id', themeId).single().then(({ data }) => { setPack(data); setLoading(false); });
  }, [themeId]);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!pack) return <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4"><h1 className="text-2xl font-bold">Theme not found</h1><Link to="/" className="text-primary hover:underline">Go home</Link></div>;

  const config = pack.theme_config || {};
  const colors = config.colors || {};
  const fonts = config.fonts || {};
  const pages = pack.pages || {};
  const homeSections = pages.home || [];
  const borderRadius = config.borderRadius || 12;
  const footerConfig = config.footer || {};

  const fontLink = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fonts.heading || 'Inter')}:wght@400;500;600;700&family=${encodeURIComponent(fonts.body || 'Inter')}:wght@400;500;600&display=swap`;

  const switchPage = (page: string) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderSection = (section: any, i: number) => {
    const anim = section.animation || 'fade-in';
    const cardEffect = section.cardEffect || '';

    switch (section.type) {
      case 'announcement_bar':
        if (announcementDismissed) return null;
        return (
          <div key={i} className="relative py-2.5 px-4 text-center text-sm font-medium" style={{ backgroundColor: colors.primary, color: '#fff' }}>
            {section.announcementText || section.title || '🎉 Free shipping on orders above ₹999!'}
            <button onClick={() => setAnnouncementDismissed(true)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button>
          </div>
        );

      case 'hero':
        return (
          <AnimSection key={i} animation={anim}>
            <div className={`relative overflow-hidden`} style={{ backgroundColor: colors.primary, minHeight: section.height === 'large' ? 550 : section.height === 'small' ? 280 : 420 }}>
              {section.image && <img src={section.image} alt="" className={`absolute inset-0 w-full h-full object-cover ${anim === 'ken-burns' ? 'animate-ken-burns' : ''}`} />}
              <div className="absolute inset-0 bg-black/40" />
              <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6 py-20" style={{ minHeight: section.height === 'large' ? 550 : section.height === 'small' ? 280 : 420 }}>
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-4" style={{ fontFamily: fonts.heading }}>{section.title || 'Welcome to Our Store'}</h1>
                {section.subtitle && <p className="text-lg text-white/80 mb-8 max-w-xl">{section.subtitle}</p>}
                <button className="px-10 py-3.5 text-sm font-bold text-white hover:scale-105 transition-transform" style={{ backgroundColor: colors.primary, borderRadius: `${borderRadius}px` }}>
                  Shop Now
                </button>
              </div>
            </div>
          </AnimSection>
        );

      case 'featured_products':
        return (
          <AnimSection key={i} animation={anim}>
            <div className="py-16 px-6 max-w-6xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center" style={{ fontFamily: fonts.heading }}>{section.title || 'Featured Products'}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className={`overflow-hidden group cursor-pointer ${cardEffect}`} style={{ backgroundColor: colors.card, borderRadius: `${borderRadius}px`, border: `1px solid ${colors.secondary}` }}>
                    <div className="aspect-square overflow-hidden" style={{ backgroundColor: colors.secondary }}>
                      <div className={`w-full h-full ${cardEffect === 'hover-zoom-image' ? 'zoom-target' : ''}`} style={{ backgroundColor: colors.secondary }} />
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="h-4 rounded" style={{ backgroundColor: colors.secondary, width: '75%' }} />
                      <div className="h-3 rounded" style={{ backgroundColor: colors.primary + '40', width: '35%' }} />
                      <div className="h-3 rounded" style={{ backgroundColor: colors.text + '15', width: '50%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimSection>
        );

      case 'testimonials':
        return (
          <AnimSection key={i} animation={anim}>
            <div className="py-16 px-6" style={{ backgroundColor: colors.secondary }}>
              <h2 className="text-2xl font-bold mb-8 text-center" style={{ fontFamily: fonts.heading }}>{section.title || 'What Our Customers Say'}</h2>
              <TestimonialCarousel testimonials={section.testimonials || []} colors={colors} fonts={fonts} borderRadius={borderRadius} />
            </div>
          </AnimSection>
        );

      case 'countdown_timer':
        return (
          <AnimSection key={i} animation={anim}>
            <div className="py-16 px-6 text-center" style={{ background: config.gradientBackground || `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}30)` }}>
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: fonts.heading }}>{section.title || '⚡ Flash Sale Ending Soon!'}</h2>
              {section.subtitle && <p className="text-sm opacity-60 mb-6">{section.subtitle}</p>}
              <CountdownTimer targetDate={section.countdownDate || new Date(Date.now() + 86400000 * 3).toISOString()} colors={colors} fonts={fonts} />
            </div>
          </AnimSection>
        );

      case 'trust_badges':
        const badges = section.trustBadges?.length ? section.trustBadges : [
          { icon: '🚚', label: 'Free Shipping' }, { icon: '🔒', label: 'Secure Payment' },
          { icon: '↩️', label: 'Easy Returns' }, { icon: '💬', label: '24/7 Support' },
        ];
        return (
          <AnimSection key={i} animation={anim}>
            <div className="py-10 px-6">
              <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-8">
                {badges.map((b: any, bi: number) => (
                  <div key={bi} className="flex flex-col items-center gap-2 min-w-[100px]">
                    <span className="text-3xl">{b.icon}</span>
                    <span className="text-xs font-semibold text-center" style={{ fontFamily: fonts.body }}>{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnimSection>
        );

      case 'brand_marquee':
        const brands = section.brands?.length ? section.brands : ['Brand A', 'Brand B', 'Brand C', 'Brand D', 'Brand E', 'Brand F'];
        return (
          <AnimSection key={i} animation={anim}>
            <div className="py-8 overflow-hidden" style={{ backgroundColor: colors.secondary }}>
              <div className="animate-marquee flex gap-12 whitespace-nowrap">
                {[...brands, ...brands].map((b: string, bi: number) => (
                  <span key={bi} className="text-lg font-bold opacity-30 select-none" style={{ fontFamily: fonts.heading }}>{b}</span>
                ))}
              </div>
            </div>
          </AnimSection>
        );

      case 'image_with_text':
        return (
          <AnimSection key={i} animation={anim}>
            <div className="py-16 px-6 max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 gap-10 items-center">
                <div className="h-72 rounded-xl overflow-hidden" style={{ backgroundColor: colors.secondary, borderRadius: `${borderRadius}px` }}>
                  {section.image && <img src={section.image} alt="" className="w-full h-full object-cover" />}
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ fontFamily: fonts.heading }}>{section.title || 'Our Story'}</h2>
                  <p className="opacity-70 mb-6 leading-relaxed" style={{ fontFamily: fonts.body }}>{section.subtitle || 'Crafted with passion and purpose. Every product tells a story of quality and care.'}</p>
                  <button className="px-8 py-3 text-sm font-semibold text-white hover:scale-105 transition-transform" style={{ backgroundColor: colors.primary, borderRadius: `${borderRadius}px` }}>
                    Learn More
                  </button>
                </div>
              </div>
            </div>
          </AnimSection>
        );

      case 'collection_showcase':
        return (
          <AnimSection key={i} animation={anim}>
            <div className="py-16 px-6 max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold mb-8 text-center" style={{ fontFamily: fonts.heading }}>{section.title || 'Shop by Collection'}</h2>
              <div className="grid md:grid-cols-3 gap-5">
                {['New Arrivals', 'Best Sellers', 'Sale'].map((col, ci) => (
                  <div key={ci} className={`relative h-64 rounded-xl overflow-hidden cursor-pointer group ${cardEffect}`} style={{ backgroundColor: colors.secondary, borderRadius: `${borderRadius}px` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-lg font-bold text-white" style={{ fontFamily: fonts.heading }}>{col}</h3>
                      <p className="text-xs text-white/70 mt-1">Explore →</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimSection>
        );

      case 'instagram_feed':
        return (
          <AnimSection key={i} animation={anim}>
            <div className="py-16 px-6 max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold mb-2 text-center" style={{ fontFamily: fonts.heading }}>{section.title || '📸 Follow Us on Instagram'}</h2>
              <p className="text-sm text-center opacity-50 mb-8">@storename</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array(4).fill(0).map((_, idx) => (
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity" style={{ backgroundColor: colors.secondary, borderRadius: `${borderRadius / 2}px` }} />
                ))}
              </div>
            </div>
          </AnimSection>
        );

      case 'text_block':
        return (
          <AnimSection key={i} animation={anim}>
            <div className="py-16 px-6 text-center max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ fontFamily: fonts.heading }}>{section.title}</h2>
              {section.subtitle && <p className="opacity-60 leading-relaxed" style={{ fontFamily: fonts.body }}>{section.subtitle}</p>}
            </div>
          </AnimSection>
        );

      case 'newsletter':
        return (
          <AnimSection key={i} animation={anim}>
            <div className="py-16 px-6 text-center" style={{ backgroundColor: colors.secondary }}>
              <h2 className="text-xl md:text-2xl font-bold mb-3" style={{ fontFamily: fonts.heading }}>{section.title || 'Stay Updated'}</h2>
              {section.subtitle && <p className="text-sm opacity-60 mb-6">{section.subtitle}</p>}
              <div className="flex gap-2 max-w-md mx-auto">
                <input className="flex-1 px-4 py-3 text-sm border" placeholder="Enter your email" style={{ borderColor: colors.text + '20', backgroundColor: colors.card, borderRadius: `${borderRadius / 2}px` }} readOnly />
                <button className="px-8 py-3 text-sm font-semibold text-white" style={{ backgroundColor: colors.primary, borderRadius: `${borderRadius / 2}px` }}>Subscribe</button>
              </div>
            </div>
          </AnimSection>
        );

      case 'category_grid':
        return (
          <AnimSection key={i} animation={anim}>
            <div className="py-16 px-6 max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold mb-8 text-center" style={{ fontFamily: fonts.heading }}>{section.title || 'Shop by Category'}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Category 1', 'Category 2', 'Category 3', 'Category 4'].map((cat, ci) => (
                  <div key={ci} className={`p-6 text-center rounded-xl cursor-pointer transition-all hover:scale-105 ${cardEffect}`} style={{ backgroundColor: colors.card, borderRadius: `${borderRadius}px`, border: `1px solid ${colors.secondary}` }}>
                    <span className="text-xs font-semibold">{cat}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnimSection>
        );

      default:
        return (
          <AnimSection key={i} animation={anim}>
            <div className="py-8 px-6 text-center opacity-40">
              <p className="text-sm capitalize">[{section.type?.replace(/_/g, ' ')}]</p>
            </div>
          </AnimSection>
        );
    }
  };

  /* ── Render non-home pages ── */
  const renderShopPage = () => (
    <div className="py-12 px-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: fonts.heading }}>All Products</h1>
      <p className="text-sm opacity-60 mb-8">Browse our complete collection</p>
      <div className="flex flex-wrap gap-2 mb-8">
        {(pages.shop?.filters || ['Category', 'Price', 'Rating']).map((f: string) => (
          <span key={f} className="px-4 py-2 text-xs font-medium rounded-full border cursor-pointer hover:opacity-80" style={{ borderColor: colors.secondary, backgroundColor: colors.card }}>{f}</span>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {Array(8).fill(0).map((_, n) => (
          <div key={n} className="overflow-hidden group cursor-pointer hover-lift" style={{ backgroundColor: colors.card, borderRadius: `${borderRadius}px`, border: `1px solid ${colors.secondary}` }}>
            <div className="aspect-square" style={{ backgroundColor: colors.secondary }} />
            <div className="p-4 space-y-2">
              <div className="h-4 rounded" style={{ backgroundColor: colors.secondary, width: '75%' }} />
              <div className="h-3 rounded" style={{ backgroundColor: colors.primary + '40', width: '35%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAboutPage = () => {
    const about = pages.about || {};
    const sections = about.sections || [];
    return (
      <div>
        {sections.map((s: any, i: number) => {
          switch (s.type) {
            case 'hero_banner':
              return (
                <div key={i} className="py-20 px-6 text-center" style={{ background: config.gradientBackground || `linear-gradient(135deg, ${colors.primary}20, ${colors.accent}30)` }}>
                  <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: fonts.heading }}>{s.title}</h1>
                  <p className="text-lg opacity-70 max-w-xl mx-auto">{s.subtitle}</p>
                </div>
              );
            case 'story':
            case 'mission':
              return (
                <div key={i} className="py-12 px-6 max-w-3xl mx-auto">
                  <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: fonts.heading }}>{s.title}</h2>
                  <p className="opacity-70 leading-relaxed whitespace-pre-line" style={{ fontFamily: fonts.body }}>{s.content}</p>
                </div>
              );
            case 'values':
              return (
                <div key={i} className="py-12 px-6" style={{ backgroundColor: colors.secondary }}>
                  <h2 className="text-2xl font-bold mb-8 text-center" style={{ fontFamily: fonts.heading }}>{s.title}</h2>
                  <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
                    {(s.values || []).map((v: any, vi: number) => (
                      <div key={vi} className="text-center p-6 rounded-xl" style={{ backgroundColor: colors.card, borderRadius: `${borderRadius}px` }}>
                        <span className="text-3xl">{v.icon}</span>
                        <h3 className="font-semibold text-sm mt-3 mb-2" style={{ fontFamily: fonts.heading }}>{v.title}</h3>
                        <p className="text-xs opacity-60">{v.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            case 'team':
              return (
                <div key={i} className="py-12 px-6 max-w-4xl mx-auto text-center">
                  <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: fonts.heading }}>{s.title}</h2>
                  <p className="text-sm opacity-60 mb-8">{s.subtitle}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {['Founder', 'Designer', 'Developer', 'Marketing'].map((role, ri) => (
                      <div key={ri}>
                        <div className="w-20 h-20 rounded-full mx-auto mb-3" style={{ backgroundColor: colors.secondary }} />
                        <p className="text-sm font-semibold">{role}</p>
                        <p className="text-xs opacity-50">Team Member</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            default:
              return null;
          }
        })}
      </div>
    );
  };

  const renderContactPage = () => {
    const contact = pages.contact || {};
    return (
      <div className="py-16 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: fonts.heading }}>{contact.title || 'Get In Touch'}</h1>
          <p className="opacity-60">{contact.subtitle || 'We\'d love to hear from you.'}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-4">
            {(contact.fields || ['Name', 'Email', 'Subject', 'Message']).map((field: string) => (
              <div key={field}>
                <label className="text-xs font-semibold block mb-1.5">{field}</label>
                {field === 'Message' ? (
                  <div className="h-32 border rounded-lg" style={{ borderColor: colors.secondary, backgroundColor: colors.card, borderRadius: `${borderRadius / 2}px` }} />
                ) : (
                  <div className="h-11 border rounded-lg" style={{ borderColor: colors.secondary, backgroundColor: colors.card, borderRadius: `${borderRadius / 2}px` }} />
                )}
              </div>
            ))}
            <button className="w-full py-3 text-sm font-semibold text-white" style={{ backgroundColor: colors.primary, borderRadius: `${borderRadius}px` }}>Send Message</button>
          </div>
          <div className="space-y-6">
            {(contact.info || []).map((info: any, i: number) => (
              <div key={i} className="flex items-start gap-4">
                <span className="text-2xl">{info.icon}</span>
                <div>
                  <p className="text-sm font-semibold">{info.label}</p>
                  <p className="text-sm opacity-60">{info.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderFAQPage = () => {
    const faq = pages.faq || {};
    return (
      <div className="py-16 px-6 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: fonts.heading }}>{faq.title || 'FAQ'}</h1>
          <p className="opacity-60">{faq.subtitle || 'Find answers to common questions.'}</p>
        </div>
        <FAQAccordion items={faq.items || []} colors={colors} fonts={fonts} borderRadius={borderRadius} />
      </div>
    );
  };

  const renderLegalPage = (pageKey: string) => {
    const data = pages[pageKey] || {};
    return (
      <div className="py-16 px-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: fonts.heading }}>{data.title || pageKey.replace(/_/g, ' ')}</h1>
        {data.lastUpdated && <p className="text-xs opacity-50 mb-8">Last updated: {data.lastUpdated}</p>}
        <div className="space-y-8">
          {(data.sections || []).map((s: any, i: number) => (
            <div key={i}>
              <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: fonts.heading }}>{s.heading}</h2>
              <p className="text-sm opacity-70 leading-relaxed whitespace-pre-line" style={{ fontFamily: fonts.body }}>{s.content}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home': return <>{homeSections.map(renderSection)}</>;
      case 'shop': return renderShopPage();
      case 'about': return renderAboutPage();
      case 'contact': return renderContactPage();
      case 'faq': return renderFAQPage();
      case 'privacy_policy':
      case 'return_policy':
      case 'terms':
      case 'shipping_policy':
        return renderLegalPage(currentPage);
      default: return <>{homeSections.map(renderSection)}</>;
    }
  };

  // Build nav items from available pages
  const availablePages = PAGE_TABS.filter(p => p.key === 'home' || pages[p.key]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.background, color: colors.text }}>
      <link rel="stylesheet" href={fontLink} />

      {/* Admin bar */}
      <div className="sticky top-0 z-50 bg-background border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <span className="text-sm font-semibold">{pack.name}</span>
          <span className="text-xs text-muted-foreground capitalize">— {pack.category} theme · {availablePages.length} pages</span>
        </div>
        <span className="text-xs text-muted-foreground">Preview Mode · ₹{pack.price}</span>
      </div>

      {/* Store Header with real navigation */}
      <header className="px-6 py-4 flex items-center justify-between border-b sticky top-[49px] z-40 backdrop-blur-sm" style={{ backgroundColor: colors.card + 'ee', borderColor: colors.secondary }}>
        <span className="text-lg font-bold" style={{ fontFamily: fonts.heading }}>{pack.name} Store</span>
        <nav className="hidden md:flex gap-6 text-sm" style={{ fontFamily: fonts.body }}>
          {availablePages.slice(0, 6).map(item => (
            <button
              key={item.key}
              onClick={() => switchPage(item.key)}
              className="transition-opacity cursor-pointer"
              style={{ opacity: currentPage === item.key ? 1 : 0.6, fontWeight: currentPage === item.key ? 600 : 400, borderBottom: currentPage === item.key ? `2px solid ${colors.primary}` : '2px solid transparent', paddingBottom: '4px' }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: colors.secondary }}>🔍</div>
          <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs relative" style={{ backgroundColor: colors.secondary }}>
            🛒
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: colors.primary }}>2</span>
          </div>
        </div>
      </header>

      {/* Page Content */}
      {renderCurrentPage()}

      {/* Industry-Standard Footer */}
      <footer className="py-12 px-6 border-t" style={{ backgroundColor: colors.card, borderColor: colors.secondary }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-bold mb-3" style={{ fontFamily: fonts.heading }}>{pack.name} Store</h4>
            <p className="text-xs opacity-50 leading-relaxed">Premium quality products curated for you. Shop with confidence.</p>
            {footerConfig.social_links && (
              <div className="flex gap-3 mt-4">
                {Object.entries(footerConfig.social_links || {}).filter(([, url]) => url).map(([platform]) => (
                  <span key={platform} className="text-sm opacity-50 hover:opacity-100 cursor-pointer capitalize">{platform}</span>
                ))}
              </div>
            )}
          </div>
          {(footerConfig.columns || FOOTER_COLUMNS).map((col: any) => (
            <div key={col.title}>
              <h4 className="font-semibold text-sm mb-3">{col.title}</h4>
              <div className="space-y-2">
                {(col.links || []).map((link: any) => {
                  const label = typeof link === 'string' ? link : link.label;
                  const pageKey = typeof link === 'string'
                    ? label.toLowerCase().replace(/\s+/g, '_').replace('&', 'and')
                    : null;
                  return (
                    <button
                      key={label}
                      onClick={() => {
                        // Map footer links to pages
                        const linkMap: Record<string, string> = {
                          'Shop': 'shop', 'New Arrivals': 'shop', 'Best Sellers': 'shop', 'About Us': 'about',
                          'Contact Us': 'contact', 'FAQ': 'faq', 'Shipping Info': 'shipping_policy', 'Track Order': 'shop',
                          'Privacy Policy': 'privacy_policy', 'Return Policy': 'return_policy', 'Terms of Service': 'terms', 'Shipping Policy': 'shipping_policy',
                        };
                        const target = linkMap[label] || 'home';
                        switchPage(target);
                      }}
                      className="block text-xs opacity-50 hover:opacity-80 cursor-pointer transition-opacity"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t text-center text-xs opacity-40" style={{ borderColor: colors.secondary }}>
          {footerConfig.copyright || `© ${new Date().getFullYear()} ${pack.name} Store. All rights reserved.`}
        </div>
      </footer>

      {/* Back to top */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 h-10 w-10 rounded-full flex items-center justify-center shadow-lg back-to-top"
          style={{ backgroundColor: colors.primary, color: '#fff' }}
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default ThemePreview;
