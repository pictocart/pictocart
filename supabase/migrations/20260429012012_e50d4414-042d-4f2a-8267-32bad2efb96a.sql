REVOKE ALL ON FUNCTION public.cleanup_domain_health_log(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_domain_health_log(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.cleanup_domain_health_log(integer) TO service_role;