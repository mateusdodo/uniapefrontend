ALTER TABLE public.chamados_moradores ADD COLUMN IF NOT EXISTS aprovado boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE OR REPLACE FUNCTION public.proteger_aprovacao_chamado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.aprovado := false;
    ELSIF NEW.aprovado IS DISTINCT FROM OLD.aprovado
      AND NOT EXISTS (SELECT 1 FROM imoveis i WHERE i.id = NEW.imovel_id AND i.proprietario_id = auth.uid()) THEN
      NEW.aprovado := OLD.aprovado;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.proteger_aprovacao_chamado() FROM anon, authenticated, public;
DROP TRIGGER IF EXISTS trg_proteger_aprovacao_chamado ON public.chamados_moradores;
CREATE TRIGGER trg_proteger_aprovacao_chamado BEFORE INSERT OR UPDATE ON public.chamados_moradores
FOR EACH ROW EXECUTE FUNCTION public.proteger_aprovacao_chamado();

DROP POLICY IF EXISTS "Chamados visiveis para todos" ON public.chamados_moradores;
CREATE POLICY "Chamados aprovados sao publicos" ON public.chamados_moradores FOR SELECT TO anon, authenticated USING (aprovado AND ativo);
CREATE POLICY "Autor e dono veem chamados" ON public.chamados_moradores FOR SELECT TO authenticated
USING (auth.uid() = autor_id OR EXISTS (SELECT 1 FROM public.imoveis i WHERE i.id = imovel_id AND i.proprietario_id = auth.uid()));
CREATE POLICY "Dono aprova chamados" ON public.chamados_moradores FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.imoveis i WHERE i.id = imovel_id AND i.proprietario_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.imoveis i WHERE i.id = imovel_id AND i.proprietario_id = auth.uid()));

CREATE POLICY "Usuario envia o proprio documento" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Usuario ve o proprio documento" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Usuario troca o proprio documento" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);