import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { findTourForPath, TOURS } from './registry';
import type { TourDefinition } from './types';

interface TourCtx {
  startTour: (key: string) => void;
  resetTour: (key: string) => Promise<void>;
  completedKeys: Set<string>;
  allTours: TourDefinition[];
}

const Ctx = createContext<TourCtx | null>(null);

const lsKey = (uid: string, key: string) => `pic2cart:tour:${uid}:${key}`;

export const TourProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const driverRef = useRef<Driver | null>(null);
  const runningRef = useRef<string | null>(null);

  // Load progress when the user is known
  useEffect(() => {
    let cancelled = false;
    if (!user?.id) { setCompleted(new Set()); return; }
    (async () => {
      const { data } = await supabase
        .from('tour_progress')
        .select('tour_key')
        .eq('user_id', user.id);
      if (cancelled) return;
      const fromDb = new Set((data ?? []).map((r: any) => r.tour_key as string));
      // Merge in localStorage cache
      try {
        for (const k of Object.keys(localStorage)) {
          if (k.startsWith(`pic2cart:tour:${user.id}:`)) {
            fromDb.add(k.split(':').pop()!);
          }
        }
      } catch { /* noop */ }
      setCompleted(fromDb);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const markCompleted = useCallback(async (key: string, skipped = false) => {
    if (!user?.id) return;
    setCompleted((prev) => new Set(prev).add(key));
    try { localStorage.setItem(lsKey(user.id, key), '1'); } catch { /* noop */ }
    await supabase.from('tour_progress').upsert({ user_id: user.id, tour_key: key, skipped }, { onConflict: 'user_id,tour_key' });
  }, [user?.id]);

  const startTour = useCallback((key: string) => {
    const def = TOURS.find((t) => t.key === key);
    if (!def) return;
    // Filter steps to elements actually present in the DOM
    const stepsLive = def.steps.filter((s) => document.querySelector(s.element));
    if (stepsLive.length === 0) return;

    if (driverRef.current) {
      try { driverRef.current.destroy(); } catch { /* noop */ }
    }
    runningRef.current = key;
    const d = driver({
      showProgress: true,
      allowClose: true,
      animate: true,
      smoothScroll: true,
      stagePadding: 6,
      stageRadius: 10,
      overlayOpacity: 0.55,
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Got it',
      steps: stepsLive.map((s) => ({
        element: s.element,
        popover: {
          title: s.title,
          description: s.description,
          side: s.side,
          align: s.align,
        },
      })),
      onDestroyStarted: () => {
        const isDone = d.isLastStep();
        markCompleted(key, !isDone);
        d.destroy();
        runningRef.current = null;
      },
    });
    driverRef.current = d;
    // Wait a tick so layouts settle (avoids arrow drift on first paint)
    requestAnimationFrame(() => requestAnimationFrame(() => d.drive()));
  }, [markCompleted]);

  // Auto-start the tour for the current route once
  useEffect(() => {
    if (!user?.id) return;
    const def = findTourForPath(location.pathname);
    if (!def || completed.has(def.key) || runningRef.current === def.key) return;
    // Wait for the page to render its anchors
    let attempts = 0;
    const tick = () => {
      attempts++;
      const ready = def.steps.some((s) => document.querySelector(s.element));
      if (ready) { startTour(def.key); return; }
      if (attempts < 25) setTimeout(tick, 200);
    };
    const id = setTimeout(tick, 400);
    return () => clearTimeout(id);
  }, [location.pathname, user?.id, completed, startTour]);

  const resetTour = useCallback(async (key: string) => {
    if (!user?.id) return;
    try { localStorage.removeItem(lsKey(user.id, key)); } catch { /* noop */ }
    await supabase.from('tour_progress').delete().eq('user_id', user.id).eq('tour_key', key);
    setCompleted((prev) => {
      const n = new Set(prev); n.delete(key); return n;
    });
  }, [user?.id]);

  const value = useMemo<TourCtx>(() => ({
    startTour, resetTour, completedKeys: completed, allTours: TOURS,
  }), [startTour, resetTour, completed]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useTour = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTour must be used inside <TourProvider>');
  return ctx;
};
