import { supabase } from '@/integrations/supabase/client';

let installed = false;
let queue: Array<Record<string, unknown>> = [];
let flushTimer: number | null = null;

const flush = async () => {
  if (!queue.length) return;
  const batch = queue.splice(0, queue.length);
  try {
    await supabase.from('client_error_logs').insert(batch as any);
  } catch {
    // swallow — never let error reporting cause more errors
  }
};

const enqueue = (entry: Record<string, unknown>) => {
  // Deduplicate burst of identical errors within 5s
  const key = `${entry.message}|${entry.path}`;
  const seenKey = `__err_${key}`;
  const now = Date.now();
  const last = (window as any)[seenKey] as number | undefined;
  if (last && now - last < 5_000) return;
  (window as any)[seenKey] = now;

  queue.push(entry);
  if (flushTimer) window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(flush, 1500);
};

export const reportError = async (
  err: unknown,
  context: { path?: string; level?: 'error' | 'warn'; metadata?: Record<string, unknown> } = {},
) => {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack ?? null : null;
  const { data: { session } } = await supabase.auth.getSession();
  enqueue({
    user_id: session?.user?.id ?? null,
    path: context.path ?? window.location.pathname,
    url: window.location.href,
    user_agent: navigator.userAgent,
    message: message.slice(0, 1000),
    stack: stack ? stack.slice(0, 4000) : null,
    level: context.level ?? 'error',
    metadata: context.metadata ?? {},
  });
};

export const installErrorReporter = () => {
  if (installed) return;
  installed = true;

  window.addEventListener('error', (e) => {
    reportError(e.error ?? e.message, { metadata: { source: 'window.error', filename: e.filename, lineno: e.lineno } });
  });
  window.addEventListener('unhandledrejection', (e) => {
    reportError(e.reason, { metadata: { source: 'unhandledrejection' } });
  });
  window.addEventListener('beforeunload', () => { void flush(); });
};
