REVOKE EXECUTE ON FUNCTION public.pode_ver_conversa(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.pode_falar_conversa(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.pode_ver_conversa(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pode_falar_conversa(uuid, uuid) TO authenticated, service_role;