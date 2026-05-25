import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, X } from 'lucide-react';

export interface PromoTickerConfig {
  enabled?: boolean;
  messages?: string[];
  bg_color?: string;
  text_color?: string;
  link_url?: string;
  link_label?: string;
  dismissible?: boolean;
  speed?: number; // seconds for one loop
}

interface Props {
  storeSlug: string;
  config?: PromoTickerConfig;
}

/**
 * Customer-facing promotional ticker shown above the storefront header.
 * Marquees one or more messages to create urgency and lift conversions.
 */
const PromoTicker = ({ storeSlug, config }: Props) => {
  const messages = (config?.messages || []).map((m) => m.trim()).filter(Boolean);
  const enabled = config?.enabled !== false && messages.length > 0;
  const dismissKey = `promo_ticker_dismissed_${storeSlug}`;
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (config?.dismissible && typeof window !== 'undefined') {
      try {
        if (sessionStorage.getItem(dismissKey) === '1') setHidden(true);
      } catch {}
    }
  }, [config?.dismissible, dismissKey]);

  if (!enabled || hidden) return null;

  const bg = config?.bg_color || '#111827';
  const fg = config?.text_color || '#ffffff';
  const speed = Math.max(10, Math.min(120, config?.speed || 30));

  // Duplicate the strip so the marquee loops seamlessly.
  const items = [...messages, ...messages];
  const linkHref = config?.link_url
    ? (config.link_url.startsWith('http') || config.link_url.startsWith('/')
        ? config.link_url
        : `/store/${storeSlug}/${config.link_url}`)
    : null;

  return (
    <div className="relative overflow-hidden text-xs sm:text-sm font-medium" style={{ backgroundColor: bg, color: fg }}>
      <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 py-1.5">
        <Megaphone className="h-3.5 w-3.5 shrink-0 opacity-80" />
        <div className="flex-1 overflow-hidden">
          <div
            className="flex whitespace-nowrap will-change-transform"
            style={{ animation: `pt-marquee ${speed}s linear infinite`, gap: '3rem' }}
          >
            {items.map((m, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                <span className="opacity-60">•</span>
                <span>{m}</span>
              </span>
            ))}
          </div>
        </div>
        {linkHref && config?.link_label && (
          linkHref.startsWith('http') ? (
            <a href={linkHref} target="_blank" rel="noopener noreferrer" className="shrink-0 underline underline-offset-2 hover:opacity-80 text-[11px] sm:text-xs font-semibold">
              {config.link_label}
            </a>
          ) : (
            <Link to={linkHref} className="shrink-0 underline underline-offset-2 hover:opacity-80 text-[11px] sm:text-xs font-semibold">
              {config.link_label}
            </Link>
          )
        )}
        {config?.dismissible && (
          <button
            onClick={() => {
              setHidden(true);
              try { sessionStorage.setItem(dismissKey, '1'); } catch {}
            }}
            className="shrink-0 p-0.5 rounded hover:bg-white/10 transition"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <style>{`
        @keyframes pt-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default PromoTicker;
