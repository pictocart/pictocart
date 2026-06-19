import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/hooks/useStore';
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
  const { store, loading: storeLoading } = useStore();
  const location = useLocation();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [completedLoaded, setCompletedLoaded] = useState(false);
  const driverRef = useRef<Driver | null>(null);
  const runningRef = useRef<string | null>(null);

  // Load progress when the user is known. Until this resolves we MUST NOT
  // auto-start any tour, otherwise users who've already seen a tooltip see it
  // again on every login (race between empty initial state and async fetch).
  useEffect(() => {
    let cancelled = false;
    setCompletedLoaded(false);
    if (!user?.id) { setCompleted(new Set()); setCompletedLoaded(true); return; }
    // Seed from localStorage synchronously so a returning user on the same
    // device never sees a flash of the tour while the DB round-trip is in
    // flight.
    const seed = new Set<string>();
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith(`pic2cart:tour:${user.id}:`)) {
          seed.add(k.split(':').pop()!);
        }
      }
    } catch { /* noop */ }
    setCompleted(seed);
    (async () => {
      const { data } = await supabase
        .from('tour_progress')
        .select('tour_key')
        .eq('user_id', user.id);
      if (cancelled) return;
      const merged = new Set(seed);
      for (const r of (data ?? []) as any[]) merged.add(r.tour_key as string);
      // Backfill localStorage so future loads are instant.
      try {
        for (const k of merged) localStorage.setItem(lsKey(user.id, k), '1');
      } catch { /* noop */ }
      setCompleted(merged);
      setCompletedLoaded(true);
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
    if (!user?.id || !completedLoaded || storeLoading) return;
    // Don't start any tour while onboarding is incomplete — otherwise a brief
    // /dashboard render before the redirect to /onboarding spawns a tooltip
    // that hangs over the onboarding screen.
    const onboardingDone = !store || (store.onboarding_step !== null && store.onboarding_step >= 4);
    if (!onboardingDone) return;
    const def = findTourForPath(location.pathname);
    if (!def || completed.has(def.key) || runningRef.current === def.key) return;
    // Wait for the page to render its anchors
    let attempts = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      attempts++;
      const ready = def.steps.some((s) => document.querySelector(s.element));
      if (ready) { startTour(def.key); return; }
      if (attempts < 25) setTimeout(tick, 200);
    };
    const id = setTimeout(tick, 400);
    return () => {
      cancelled = true;
      clearTimeout(id);
      // Kill any tour overlay left behind by a route change so a tooltip
      // can never linger over the next page.
      if (driverRef.current) {
        try { driverRef.current.destroy(); } catch { /* noop */ }
        driverRef.current = null;
        runningRef.current = null;
      }
    };
  }, [location.pathname, user?.id, completed, completedLoaded, startTour, store, storeLoading]);

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
