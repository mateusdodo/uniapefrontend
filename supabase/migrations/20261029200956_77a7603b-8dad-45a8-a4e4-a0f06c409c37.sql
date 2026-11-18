CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tipo public.tipo_conta := CASE WHEN new.raw_user_meta_data ->> 'tipo_conta' = 'proprietario' THEN 'proprietario'::public.tipo_conta ELSE 'comum'::public.tipo_conta END;
BEGIN
  INSERT INTO public.profiles (id, nome, telefone, tipo_conta, proprietario_declarado_em)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'telefone', ''), new.phone),
    _tipo,
    CASE WHEN _tipo = 'proprietario' THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;

-- Só o morador principal (responsável) divulga a casa
CREATE OR REPLACE FUNCTION public.pode_recrutar(_moradia_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.moradias m
    JOIN public.imoveis i ON i.id = m.imovel_id
    WHERE m.id = _moradia_id AND m.status <> 'encerrada'
      AND i.moradores_podem_recrutar AND m.responsavel_id = _user_id
  )
$$;

-- Uma divulgação ativa por imóvel
UPDATE public.chamados_moradores c SET ativo = false
WHERE ativo AND EXISTS (SELECT 1 FROM public.chamados_moradores c2 WHERE c2.imovel_id = c.imovel_id AND c2.ativo AND c2.created_at > c.created_at);
CREATE UNIQUE INDEX IF NOT EXISTS chamados_um_ativo_por_imovel ON public.chamados_moradores (imovel_id) WHERE ativo;

-- Fotos de perfil (bucket público "avatars")
CREATE POLICY "Avatares publicos" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Usuario envia avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Usuario troca avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Usuario remove avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);