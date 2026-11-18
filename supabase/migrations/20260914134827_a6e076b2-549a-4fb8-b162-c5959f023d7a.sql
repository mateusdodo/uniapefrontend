REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_medias() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.revelar_avaliacoes(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.processar_moradias() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.pode_ver_moradia(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.pode_recrutar(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pode_ver_moradia(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_recrutar(uuid, uuid) TO authenticated;