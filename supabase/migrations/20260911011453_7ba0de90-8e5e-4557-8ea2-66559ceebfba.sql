CREATE OR REPLACE FUNCTION public.pode_ver_conversa(_contrato_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.contratos c
    JOIN public.imoveis i ON i.id = c.imovel_id
    WHERE c.id = _contrato_id
      AND (
        i.proprietario_id = _user_id
        OR c.inquilino_id = _user_id
        OR EXISTS (
          SELECT 1 FROM public.grupo_membros gm
          WHERE gm.grupo_id = c.grupo_id AND gm.usuario_id = _user_id
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.pode_falar_conversa(_contrato_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.contratos c
    JOIN public.imoveis i ON i.id = c.imovel_id
    WHERE c.id = _contrato_id
      AND (
        i.proprietario_id = _user_id
        OR c.inquilino_id = _user_id
        OR EXISTS (
          SELECT 1 FROM public.grupos g
          WHERE g.id = c.grupo_id AND g.lider_id = _user_id
        )
      )
  )
$$;

CREATE TABLE public.mensagens_contrato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conteudo text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX mensagens_contrato_contrato_idx ON public.mensagens_contrato (contrato_id, created_at);

GRANT SELECT, INSERT ON public.mensagens_contrato TO authenticated;
GRANT ALL ON public.mensagens_contrato TO service_role;

ALTER TABLE public.mensagens_contrato ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participantes leem a conversa"
ON public.mensagens_contrato FOR SELECT TO authenticated
USING (public.pode_ver_conversa(contrato_id, auth.uid()));

CREATE POLICY "Somente admins escrevem"
ON public.mensagens_contrato FOR INSERT TO authenticated
WITH CHECK (auth.uid() = autor_id AND public.pode_falar_conversa(contrato_id, auth.uid()));

CREATE TRIGGER set_mensagens_contrato_updated_at
BEFORE UPDATE ON public.mensagens_contrato
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens_contrato;