CREATE OR REPLACE FUNCTION public.get_domain_health_summary(_since timestamp with time zone)
RETURNS TABLE(store_id uuid, up bigint, total bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    d.store_id,
    COUNT(*) FILTER (WHERE d.status = 'up' AND d.http_code >= 200 AND d.http_code < 400) AS up,
    COUNT(*) AS total
  FROM public.domain_health_log d
  WHERE d.checked_at >= _since
  GROUP BY d.store_id;
$$;

REVOKE ALL ON FUNCTION public.get_domain_health_summary(timestamp with time zone) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_domain_health_summary(timestamp with time zone) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_domain_health_summary(timestamp with time zone) TO authenticated;