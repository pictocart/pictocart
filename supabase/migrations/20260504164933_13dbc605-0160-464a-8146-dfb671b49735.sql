
REVOKE EXECUTE ON FUNCTION public.consume_credits(uuid, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_wallet(uuid, integer, public.credit_txn_type, numeric, text, text, text, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credits(uuid, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_wallet(uuid, integer, public.credit_txn_type, numeric, text, text, text, uuid, text, jsonb) TO service_role;
