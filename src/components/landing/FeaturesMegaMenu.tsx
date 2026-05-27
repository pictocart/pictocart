import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { PILLARS, byPillar } from '@/lib/featureCatalog';

interface Props {
  /** Whether the navbar is on the dark hero (false) or scrolled to white (true) */
  scrolled: boolean;
}

/** Stylish 6-column features dropdown — opens on hover (desktop) / click (mobile). */
const FeaturesMegaMenu = ({ scrolled }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 160);
  };
  const cancelClose = () => {
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
  };

  return (
    <div ref={ref} className="relative" onMouseLeave={scheduleClose}>
      <button
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => { cancelClose(); setOpen(true); }}
        className={`text-sm font-medium inline-flex items-center gap-1 transition-colors ${
          scrolled ? 'text-slate-600 hover:text-indigo-500' : 'text-white/80 hover:text-white'
        }`}
        aria-expanded={open}
      >
        Features
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          onMouseEnter={cancelClose}
          className="fixed left-1/2 -translate-x-1/2 top-[64px] md:top-[80px] z-50 w-[min(96vw,1080px)] max-h-[80vh] overflow-y-auto"
        >
          <div className="rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {PILLARS.map((pillar) => (
                <div key={pillar.id} className="p-4 md:p-5">
                  <div className="mb-3">
                    <h4 className="text-[11px] font-bold tracking-widest uppercase text-indigo-600">
                      {pillar.label}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{pillar.copy}</p>
                  </div>
                  <ul className="space-y-1">
                    {byPillar(pillar.id).map((f) => (
                      <li key={f.slug}>
                        <Link
                          to={`/features/${f.slug}`}
                          onClick={() => setOpen(false)}
                          className="group flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-indigo-50 transition-colors"
                        >
                          <f.icon className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold text-slate-800 group-hover:text-indigo-700 leading-tight">
                              {f.name}
                            </div>
                            <div className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                              {f.short}
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 bg-gradient-to-r from-indigo-50 via-violet-50 to-emerald-50 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-slate-600">
                <span className="font-bold text-slate-900">Every solution</span> for what to sell, where to sell — and how to grow.
              </p>
              <Link
                to="/marketplace"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Browse the theme marketplace <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeaturesMegaMenu;
