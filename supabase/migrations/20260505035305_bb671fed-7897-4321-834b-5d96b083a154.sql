DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'provision-runner-tick') THEN
    PERFORM cron.unschedule('provision-runner-tick');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cloudflare-agent-5min') THEN
    PERFORM cron.unschedule('cloudflare-agent-5min');
  END IF;
END $$;
