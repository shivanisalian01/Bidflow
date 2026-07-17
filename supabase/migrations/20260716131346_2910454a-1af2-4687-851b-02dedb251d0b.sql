
REVOKE EXECUTE ON FUNCTION public.current_business_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
-- policies still work because RLS evaluates as table owner (postgres)
GRANT EXECUTE ON FUNCTION public.current_business_id() TO postgres;
