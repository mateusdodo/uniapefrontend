INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imoveis',
  'imoveis',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Fotos de imóveis são públicas"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'imoveis');

CREATE POLICY "Proprietário envia fotos do próprio anúncio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'imoveis'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Proprietário remove fotos do próprio anúncio"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'imoveis'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE OR REPLACE FUNCTION public.bloquear_alteracao_imovel_apos_aceite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (
    OLD.titulo,
    OLD.descricao,
    OLD.tipo,
    OLD.preco_mensal,
    OLD.quartos,
    OLD.vagas_total,
    OLD.vagas_disponiveis,
    OLD.aceita_solicitacoes,
    OLD.moradores_podem_recrutar,
    OLD.bairro,
    OLD.endereco,
    OLD.proximidade,
    OLD.latitude,
    OLD.longitude,
    OLD.parada_ida_nome,
    OLD.parada_ida_minutos,
    OLD.parada_volta_nome,
    OLD.parada_volta_minutos,
    OLD.transporte_fonte,
    OLD.comodidades,
    OLD.fotos,
    OLD.whatsapp_grupo_url,
    OLD.contato_whatsapp
  ) IS DISTINCT FROM (
    NEW.titulo,
    NEW.descricao,
    NEW.tipo,
    NEW.preco_mensal,
    NEW.quartos,
    NEW.vagas_total,
    NEW.vagas_disponiveis,
    NEW.aceita_solicitacoes,
    NEW.moradores_podem_recrutar,
    NEW.bairro,
    NEW.endereco,
    NEW.proximidade,
    NEW.latitude,
    NEW.longitude,
    NEW.parada_ida_nome,
    NEW.parada_ida_minutos,
    NEW.parada_volta_nome,
    NEW.parada_volta_minutos,
    NEW.transporte_fonte,
    NEW.comodidades,
    NEW.fotos,
    NEW.whatsapp_grupo_url,
    NEW.contato_whatsapp
  ) AND EXISTS (
    SELECT 1
    FROM public.solicitacoes s
    WHERE s.imovel_id = OLD.id
      AND s.status = 'aceita'
  ) THEN
    RAISE EXCEPTION 'Este anúncio não pode ser alterado porque já existe uma solicitação aceita.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bloquear_alteracao_imovel_apos_aceite
BEFORE UPDATE ON public.imoveis
FOR EACH ROW
EXECUTE FUNCTION public.bloquear_alteracao_imovel_apos_aceite();
REVOKE ALL ON FUNCTION public.bloquear_alteracao_imovel_apos_aceite() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bloquear_exclusao_imovel_apos_aceite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.solicitacoes s
    WHERE s.imovel_id = OLD.id
      AND s.status = 'aceita'
  ) THEN
    RAISE EXCEPTION 'Este anúncio não pode ser excluído porque já existe uma solicitação aceita.';
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER bloquear_exclusao_imovel_apos_aceite
BEFORE DELETE ON public.imoveis
FOR EACH ROW
EXECUTE FUNCTION public.bloquear_exclusao_imovel_apos_aceite();
REVOKE ALL ON FUNCTION public.bloquear_exclusao_imovel_apos_aceite() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bloquear_aceite_de_imovel_removido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'aceita' AND (
    TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status
  ) THEN
    PERFORM 1
    FROM public.imoveis i
    WHERE i.id = NEW.imovel_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Este anúncio não está mais disponível para aceite.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bloquear_aceite_de_imovel_removido
BEFORE INSERT OR UPDATE ON public.solicitacoes
FOR EACH ROW
EXECUTE FUNCTION public.bloquear_aceite_de_imovel_removido();
REVOKE ALL ON FUNCTION public.bloquear_aceite_de_imovel_removido() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.excluir_imovel_sem_visitas_aceitas(p_imovel_id uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proprietario_id uuid;
  v_fotos text[];
BEGIN
  SELECT i.proprietario_id, i.fotos
  INTO v_proprietario_id, v_fotos
  FROM public.imoveis i
  WHERE i.id = p_imovel_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Anúncio não encontrado.';
  END IF;

  IF v_proprietario_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Só o proprietário pode excluir este anúncio.'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.solicitacoes s
    WHERE s.imovel_id = p_imovel_id
      AND s.status = 'aceita'
  ) THEN
    RAISE EXCEPTION 'Este anúncio não pode ser excluído porque já existe uma solicitação aceita.';
  END IF;

  DELETE FROM public.imoveis WHERE id = p_imovel_id;
  RETURN COALESCE(v_fotos, ARRAY[]::text[]);
END;
$$;

REVOKE ALL ON FUNCTION public.excluir_imovel_sem_visitas_aceitas(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.excluir_imovel_sem_visitas_aceitas(uuid) TO authenticated;
