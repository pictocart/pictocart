import { useParams, Link } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import SEOHead from '@/components/storefront/SEOHead';
import { Loader2, ChevronLeft } from 'lucide-react';

// Map URL slugs -> the seller-managed policy key in store.settings.policies
const SLUG_TO_KEY: Record<string, { key: 'privacy' | 'terms' | 'refund' | 'shipping' | 'about' | 'contact'; title: string }> = {
  'privacy-policy':    { key: 'privacy',  title: 'Privacy Policy' },
  'terms':             { key: 'terms',    title: 'Terms of Service' },
  'terms-of-service':  { key: 'terms',    title: 'Terms of Service' },
  'refund-policy':     { key: 'refund',   title: 'Refund Policy' },
  'return-policy':     { key: 'refund',   title: 'Return & Refund Policy' },
  'shipping-policy':   { key: 'shipping', title: 'Shipping Policy' },
  'about':             { key: 'about',    title: 'About Us' },
  'about-us':          { key: 'about',    title: 'About Us' },
  'contact':           { key: 'contact',  title: 'Contact Us' },
  'contact-us':        { key: 'contact',  title: 'Contact Us' },
};

// Fallback boilerplate when the seller hasn't filled the policy yet.
const FALLBACK: Record<string, string> = {
  privacy:  '## Privacy Policy\n\nThe store owner has not yet published a privacy policy. Please contact the store directly for any questions about how your data is handled.',
  terms:    '## Terms of Service\n\nThe store owner has not yet published terms of service. By using this store you agree to standard Indian consumer e-commerce terms.',
  refund:   '## Returns & Refunds\n\n- 7-day return window from delivery for unused items in original packaging.\n- Refunds processed within 5–7 business days to the original payment method.\n- Contact the store directly to initiate a return.',
  shipping: '## Shipping\n\n- Orders processed within 1–2 business days.\n- Standard delivery 3–7 business days across India.\n- Tracking details shared via email/SMS once shipped.',
  about:    '## About this store\n\nThe store owner has not yet added an about page.',
  contact:  '## Contact\n\nUse the contact form on the storefront or reach out via the email shown in the footer.',
};

// Minimal markdown → HTML (## headings, bullets, bold, paragraphs). Safe by escaping first.
function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function md(src: string): string {
  const esc = escapeHtml(src);
  const lines = esc.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  const flushList = () => { if (inList) { out.push('</ul>'); inList = false; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushList(); out.push(''); continue; }
    if (line.startsWith('### ')) { flushList(); out.push(`<h3>${line.slice(4)}</h3>`); continue; }
    if (line.startsWith('## '))  { flushList(); out.push(`<h2>${line.slice(3)}</h2>`); continue; }
    if (line.startsWith('# '))   { flushList(); out.push(`<h2>${line.slice(2)}</h2>`); continue; }
    if (/^[-*]\s+/.test(line))   {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${line.replace(/^[-*]\s+/, '')}</li>`);
      continue;
    }
    flushList();
    out.push(`<p>${line}</p>`);
  }
  flushList();
  return out.join('\n')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="underline" target="_blank" rel="noreferrer">$1</a>');
}

const StorefrontPolicy = () => {
  const { slug, policyType } = useParams<{ slug: string; policyType: string }>();
  const { store, loading } = useStorefront(slug || '');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Store not found</h1>
      </div>
    );
  }

  const meta = SLUG_TO_KEY[policyType || ''];
  if (!meta) {
    return (
      <StorefrontLayout store={store}>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-2">Page not found</h1>
          <Link to={`/store/${slug}`} className="text-sm underline">Back to store</Link>
        </div>
      </StorefrontLayout>
    );
  }

  const theme = resolveTheme(store.theme);
  const { colors, fonts } = theme;
  const settings = (store as any).settings || {};
  const storeInfo = settings.store_info || settings.business_info || {};
  const sellerContent: string | undefined = settings.policies?.[meta.key];
  const content = sellerContent?.trim() ? sellerContent : FALLBACK[meta.key];
  const html = md(content);

  return (
    <StorefrontLayout store={store}>
      <SEOHead
        title={`${meta.title} | ${store.name}`}
        description={`${meta.title} for ${store.name}`}
        url={`${window.location.origin}/store/${slug}/${policyType}`}
      />
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <Link to={`/store/${slug}`} className="inline-flex items-center gap-1 text-sm opacity-60 hover:opacity-100 mb-6">
          <ChevronLeft className="h-4 w-4" /> Back to store
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: fonts.heading }}>{meta.title}</h1>
        <p className="text-xs opacity-40 mb-8">
          Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <article
          className="policy-md text-sm leading-relaxed space-y-3 opacity-80"
          style={{ fontFamily: fonts.body }}
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {meta.key === 'contact' && (
          <div className="mt-8 p-6 rounded-lg" style={{ backgroundColor: colors.secondary }}>
            <h3 className="font-semibold mb-3" style={{ fontFamily: fonts.heading }}>Store details</h3>
            <div className="space-y-2 text-sm opacity-70">
              <p><strong>Store:</strong> {store.name}</p>
              {storeInfo.email && <p><strong>Email:</strong> {storeInfo.email}</p>}
              {storeInfo.phone && <p><strong>Phone:</strong> {storeInfo.phone}</p>}
              {storeInfo.address && <p><strong>Address:</strong> {storeInfo.address}</p>}
            </div>
          </div>
        )}

        <style>{`
          .policy-md h2 { font-family: ${fonts.heading}; font-size: 1.1rem; font-weight: 600; margin-top: 1.25rem; opacity: 1; }
          .policy-md h3 { font-family: ${fonts.heading}; font-size: 1rem;   font-weight: 600; margin-top: 1rem;    opacity: 1; }
          .policy-md ul { list-style: disc; padding-left: 1.25rem; }
          .policy-md a  { color: inherit; }
        `}</style>
      </div>
    </StorefrontLayout>
  );
};

export default StorefrontPolicy;
