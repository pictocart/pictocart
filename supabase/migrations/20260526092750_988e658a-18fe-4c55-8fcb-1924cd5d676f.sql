
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  cats text[] := ARRAY['beauty','home','fashion','kitchen','festive','tech','toys','wellness'];
  k text;
  i int := 0;
BEGIN
  FOREACH k IN ARRAY cats LOOP
    PERFORM cron.unschedule('sourcing_prewarm_' || k) WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'sourcing_prewarm_' || k
    );
    PERFORM cron.schedule(
      'sourcing_prewarm_' || k,
      (i || ' 2 * * *'),
      format($cmd$
        SELECT net.http_post(
          url:='https://qxeyndsvkfsmkilkzmuc.supabase.co/functions/v1/sourcing-prewarm',
          headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4ZXluZHN2a2ZzbWtpbGt6bXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjc1MzQsImV4cCI6MjA5MDY0MzUzNH0.Pq6YLc_cyp886zdGBQjYcpZluNf3s5H6frYY9UQEkjI"}'::jsonb,
          body:='{"category_key":"%s"}'::jsonb
        );
      $cmd$, k)
    );
    i := i + 1;
  END LOOP;
END $$;
