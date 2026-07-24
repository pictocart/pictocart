import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Search, BookOpen, ArrowLeft, Truck, RefreshCw, 
  CreditCard, Shield, User, HelpCircle, Mail, 
  MessageSquare, Phone, ChevronRight, LifeBuoy
} from 'lucide-react';
import { renderMarkdown } from '@/lib/markdown';
import TourReplayList from '@/components/TourReplayList';

interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  body_md: string;
  category: string;
  sort: number;
}

const DEFAULT_ARTICLES: HelpArticle[] = [
  {
    id: 'def-1',
    slug: 'how-to-track-order',
    title: 'How can I track my order?',
    category: 'Shipping & Delivery',
    sort: 1,
    body_md: 'Once your order is shipped, you will receive a tracking code via SMS and Email. You can also visit your **Account** page, go to **Order History**, and click on **Track Order** to see the real-time location of your delivery.'
  },
  {
    id: 'def-2',
    slug: 'return-policy',
    title: 'What is the return and refund policy?',
    category: 'Returns & Refunds',
    sort: 2,
    body_md: 'We offer a **7-day return policy** on most items. The product must be unused, in its original packaging, and with tags intact. Go to **Returns & Refunds** on your account page to submit a return request. Refunds are processed to the original payment mode within 5-7 business days.'
  },
  {
    id: 'def-3',
    slug: 'payment-modes',
    title: 'What payment methods do you support?',
    category: 'Payments & Checkout',
    sort: 3,
    body_md: 'We support all major payment modes including **Credit/Debit Cards**, **UPI (GPay, PhonePe, Paytm)**, **Net Banking**, and **Cash on Delivery (COD)**. COD might be disabled in certain regions or based on order value limits.'
  },
  {
    id: 'def-4',
    slug: 'change-address',
    title: 'Can I change my delivery address after placing an order?',
    category: 'Shipping & Delivery',
    sort: 4,
    body_md: 'Delivery addresses can be modified within **1 hour** of placing the order. Please contact our support team immediately via email or WhatsApp with your Order ID to request a change.'
  }
];

const Help = () => {
  const { slug } = useParams();
  const [q, setQ] = useState('');

  const { data: dbArticles = [] } = useQuery({
    queryKey: ['help-articles'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('help_articles')
        .select('id, slug, title, body_md, category, sort')
        .eq('is_published', true)
        .order('category')
        .order('sort');
      if (error) throw error;
      return data as HelpArticle[];
    },
  });

  // Combine database articles with our rich mock fallbacks if database is empty
  const articles = dbArticles.length > 0 ? dbArticles : DEFAULT_ARTICLES;

  const article = slug ? articles.find((a) => a.slug === slug) : null;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return articles;
    return articles.filter((a) => a.title.toLowerCase().includes(term) || a.body_md.toLowerCase().includes(term));
  }, [articles, q]);

  const grouped = filtered.reduce((acc, a) => {
    (acc[a.category] = acc[a.category] ?? []).push(a);
    return acc;
  }, {} as Record<string, HelpArticle[]>);

  // Match icon for categories
  const getCategoryIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('delivery') || c.includes('shipping')) return <Truck className="h-4 w-4 text-indigo-600" />;
    if (c.includes('return') || c.includes('refund')) return <RefreshCw className="h-4 w-4 text-green-600" />;
    if (c.includes('payment') || c.includes('card')) return <CreditCard className="h-4 w-4 text-amber-600" />;
    if (c.includes('account') || c.includes('profile')) return <User className="h-4 w-4 text-purple-600" />;
    return <HelpCircle className="h-4 w-4 text-slate-500" />;
  };

  if (article) {
    return (
      <div className="max-w-3xl mx-auto p-6 md:py-12 space-y-6">
        <Link to="/help" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition mb-2">
          <ArrowLeft className="h-4 w-4" /> Back to Help Center
        </Link>
        <Card className="p-6 md:p-8 rounded-2xl shadow-md border border-slate-100 bg-card">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            {getCategoryIcon(article.category)} {article.category}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-3 mb-6">{article.title}</h1>
          <div 
            className="prose prose-slate prose-sm max-w-none leading-relaxed prose-headings:font-bold prose-a:text-primary hover:prose-a:underline" 
            dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body_md) }} 
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:py-12 space-y-10">
      {/* Dynamic Support Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden py-12 px-6 text-center bg-slate-950 text-white shadow-2xl border border-slate-800">
        <div className="absolute inset-0 opacity-20 pointer-events-none animate-pulse-slow" style={{ backgroundImage: "radial-gradient(#6366f1 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full filter blur-3xl opacity-20 bg-indigo-500" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full filter blur-3xl opacity-20 bg-purple-500" />
        
        <div className="relative max-w-2xl mx-auto space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/30">
            <LifeBuoy className="h-6 w-6 text-indigo-400 animate-spin-slow" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Help & Customer Support</h1>
          <p className="text-sm text-slate-400">Search our knowledge base or browse support articles below.</p>
          
          <div className="relative max-w-md mx-auto pt-2">
            <Search className="h-4 w-4 absolute left-3.5 top-5 text-slate-400" />
            <Input 
              className="pl-10 h-11 bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl" 
              placeholder="Type your question or keyword..." 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
            />
          </div>
        </div>
      </div>

      <TourReplayList />

      {/* Grouped Articles categories list */}
      <div className="space-y-8">
        {Object.entries(grouped).map(([cat, list]) => (
          <div key={cat} className="space-y-3">
            <div className="flex items-center gap-2 border-b pb-2">
              {getCategoryIcon(cat)}
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{cat}</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {list.map((a) => (
                <Link key={a.id} to={`/help/${a.slug}`}>
                  <Card className="p-4 hover:border-primary/50 transition-all hover:-translate-y-0.5 hover:shadow-sm duration-200 h-full flex flex-col justify-between bg-card">
                    <div className="space-y-1">
                      <div className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors">{a.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{a.body_md.replace(/[#*`]/g, '')}</div>
                    </div>
                    <div className="flex items-center gap-0.5 text-[10px] text-primary font-bold mt-3 pt-2 border-t border-slate-50/50">
                      Read Guide <ChevronRight className="h-3 w-3" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 border rounded-2xl bg-muted/20 border-dashed">
            <HelpCircle className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
            <p className="text-sm text-muted-foreground font-medium">No articles match your search.</p>
          </div>
        )}
      </div>

      {/* Connect with Support Card Option */}
      <div className="pt-6 border-t space-y-4">
        <div>
          <h2 className="text-lg font-bold">Still need help?</h2>
          <p className="text-xs text-muted-foreground">Our support team is available to assist you with any inquiries.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-5 border rounded-2xl bg-card space-y-3 hover:shadow-sm transition">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Mail className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Email Support</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Response within 24 hours.</p>
            </div>
            <a href="mailto:support@storeontips.com" className="text-xs text-indigo-600 hover:underline font-bold inline-flex items-center gap-0.5 pt-1">
              Send Email →
            </a>
          </div>

          <div className="p-5 border rounded-2xl bg-card space-y-3 hover:shadow-sm transition">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
              <MessageSquare className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Chat via WhatsApp</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Instant message support.</p>
            </div>
            <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" className="text-xs text-green-600 hover:underline font-bold inline-flex items-center gap-0.5 pt-1">
              Start Chat →
            </a>
          </div>

          <div className="p-5 border rounded-2xl bg-card space-y-3 hover:shadow-sm transition">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Phone className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Call Support</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Mon-Sat: 10AM - 7PM.</p>
            </div>
            <a href="tel:+919876543210" className="text-xs text-amber-600 hover:underline font-bold inline-flex items-center gap-0.5 pt-1">
              Call Now →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
