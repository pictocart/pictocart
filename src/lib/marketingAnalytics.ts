/**
 * Lightweight marketing analytics. Pushes events to:
 *   - window.dataLayer (GTM/gtag friendly)
 *   - window.plausible / window.posthog if present
 *   - console.debug (always, for diagnostics)
 *
 * Does NOT touch the analytics_events table (which is store-scoped).
 */
export interface MarketingEvent {
  event: string;
  section?: string;
  label?: string;
  value?: number | string;
  [k: string]: unknown;
}

export const trackMarketing = (e: MarketingEvent) => {
  if (typeof window === 'undefined') return;
  try {
    const w = window as any;
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ ...e, ts: Date.now() });
    if (typeof w.plausible === 'function') w.plausible(e.event, { props: e });
    if (w.posthog?.capture) w.posthog.capture(e.event, e);
    // eslint-disable-next-line no-console
    console.debug('[mkt]', e.event, e);
  } catch {
    /* never break UX */
  }
};

/**
 * Hook-free scroll-depth tracker for a section element. Fires once per
 * threshold (25/50/75/100). Returns a cleanup function.
 */
export const observeScrollDepth = (
  el: HTMLElement,
  section: string,
  fire: (e: MarketingEvent) => void = trackMarketing
) => {
  const fired = new Set<number>();
  const onScroll = () => {
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const total = rect.height + vh;
    const seen = Math.min(Math.max(vh - rect.top, 0), total);
    const pct = Math.round((seen / total) * 100);
    [25, 50, 75, 100].forEach((t) => {
      if (pct >= t && !fired.has(t)) {
        fired.add(t);
        fire({ event: 'section_scroll_depth', section, value: t });
      }
    });
    if (fired.size === 4) cleanup();
  };
  const cleanup = () => window.removeEventListener('scroll', onScroll);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  return cleanup;
};
