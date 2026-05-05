
ALTER TABLE public.provision_requests
  ADD COLUMN IF NOT EXISTS requested_domain TEXT;

-- Drop dependent functions first
DROP FUNCTION IF EXISTS public.get_domain_health_summary(timestamp with time zone);
DROP FUNCTION IF EXISTS public.cleanup_domain_health_log(integer);

-- Drop CF-related tables (no longer used)
DROP TABLE IF EXISTS public.domain_health_log CASCADE;
DROP TABLE IF EXISTS public.agent_incidents CASCADE;
DROP TABLE IF EXISTS public.agent_admin_messages CASCADE;

-- Drop CF-related columns from stores
ALTER TABLE public.stores
  DROP COLUMN IF EXISTS cloudflare_hostname_id,
  DROP COLUMN IF EXISTS ssl_status,
  DROP COLUMN IF EXISTS ssl_last_checked_at,
  DROP COLUMN IF EXISTS ssl_validation_name,
  DROP COLUMN IF EXISTS ssl_validation_value,
  DROP COLUMN IF EXISTS domain_state,
  DROP COLUMN IF EXISTS domain_strategy,
  DROP COLUMN IF EXISTS ns_provider,
  DROP COLUMN IF EXISTS consecutive_failures,
  DROP COLUMN IF EXISTS downtime_started_at,
  DROP COLUMN IF EXISTS last_health_check_at,
  DROP COLUMN IF EXISTS state_entered_at;
