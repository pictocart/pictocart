import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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

interface Props {
  description?: string | null;
  highlights?: string[];
  metadata?: Record<string, string>;
  colors: any;
  fonts: any;
  refundPolicy?: string | null;
}

const ProductAccordion = ({ description, highlights, metadata, colors, fonts, refundPolicy }: Props) => {
  // Separate fssai_license from other metadata so we can render it with a special badge
  const fssaiLicense = metadata?.fssai_license || null;
  const metaEntries = metadata
    ? Object.entries(metadata).filter(([k, v]) => v && k !== 'fssai_license')
    : [];

  return (
    <Accordion type="multiple" defaultValue={['description']} className="w-full">
      {description && (
        <AccordionItem value="description" style={{ borderColor: colors.secondary }}>
          <AccordionTrigger className="text-sm font-semibold hover:no-underline" style={{ fontFamily: fonts.heading }}>
            Description
          </AccordionTrigger>
          <AccordionContent>
            {highlights && highlights.length > 0 && (
              <ul className="space-y-2 mb-4">
                {highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.primary }} />
                    <span className="opacity-80">{h}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="text-sm opacity-70 whitespace-pre-wrap">{description}</div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Additional info (excluding fssai_license — shown separately below) */}
      {metaEntries.length > 0 && (
        <AccordionItem value="additional" style={{ borderColor: colors.secondary }}>
          <AccordionTrigger className="text-sm font-semibold hover:no-underline" style={{ fontFamily: fonts.heading }}>
            Additional Information
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {metaEntries.map(([key, value]) => (
                <div key={key} className="text-sm">
                  <span className="font-medium capitalize">{key.replace(/_/g, ' ')}: </span>
                  <span className="opacity-70">{value}</span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* FSSAI License — shown as a trust badge when active */}
      {fssaiLicense && (
        <AccordionItem value="fssai" style={{ borderColor: colors.secondary }}>
          <AccordionTrigger className="text-sm font-semibold hover:no-underline" style={{ fontFamily: fonts.heading }}>
            FSSAI License
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex items-start gap-3 rounded-lg p-3" style={{ backgroundColor: '#fefce8', border: '1px solid #fde68a' }}>
              {/* FSSAI Logo placeholder */}
              <div className="shrink-0 h-10 w-10 rounded-md bg-amber-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4" />
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">FSSAI Licensed</p>
                <p className="text-sm font-mono font-bold text-amber-900 mt-0.5">{fssaiLicense}</p>
                <p className="text-[11px] text-amber-600 mt-1">
                  Food Safety and Standards Authority of India
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {refundPolicy && (
        <AccordionItem value="refund" style={{ borderColor: colors.secondary }}>
          <AccordionTrigger className="text-sm font-semibold hover:no-underline" style={{ fontFamily: fonts.heading }}>
            Return & Refund Policy
          </AccordionTrigger>
          <AccordionContent>
            <div 
              className="text-sm opacity-75 space-y-2 policy-md text-left" 
              dangerouslySetInnerHTML={{ __html: md(refundPolicy) }}
            />
            <style>{`
              .policy-md h2 { font-size: 0.95rem; font-weight: 600; margin-top: 0.75rem; }
              .policy-md h3 { font-size: 0.9rem; font-weight: 600; margin-top: 0.5rem; }
              .policy-md ul { list-style: disc; padding-left: 1.25rem; }
            `}</style>
          </AccordionContent>
        </AccordionItem>
      )}

      <AccordionItem value="shipping" style={{ borderColor: colors.secondary }}>
        <AccordionTrigger className="text-sm font-semibold hover:no-underline" style={{ fontFamily: fonts.heading }}>
          Shipping & Returns
        </AccordionTrigger>
        <AccordionContent>
          <div className="text-sm opacity-70 space-y-2 text-left">
            <p>• Free shipping on orders above ₹499</p>
            <p>• Standard delivery: 5-7 business days</p>
            <p>• Express delivery available at checkout</p>
            <p>• Easy 7-day return & exchange policy</p>
            <p>• Cash on Delivery available for eligible pincodes</p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default ProductAccordion;
