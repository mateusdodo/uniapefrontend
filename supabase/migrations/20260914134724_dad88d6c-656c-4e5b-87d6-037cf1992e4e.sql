-- ============ Limpeza do escopo antigo ============
DROP TABLE IF EXISTS public.mensagens_contrato CASCADE;
DROP TABLE IF EXISTS public.pagamentos CASCADE;
DROP FUNCTION IF EXISTS public.pode_ver_conversa(uuid, uuid);
DROP FUNCTION IF EXISTS public.pode_falar_conversa(uuid, uuid);

ALTER TABLE public.avaliacoes DROP COLUMN IF EXISTS contrato_id;
DROP TABLE IF EXISTS public.contratos CASCADE;

-- ============ Tipos ============
DO $$ BEGIN
  CREATE TYPE public.tipo_conta AS ENUM ('comum','proprietario');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_moradia_reg AS ENUM ('ativa','encerramento_solicitado','encerrada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ Perfis ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tipo_conta public.tipo_conta NOT NULL DEFAULT 'comum',
  ADD COLUMN IF NOT EXISTS verificado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS proprietario_declarado_em timestamptz,
  ADD COLUMN IF NOT EXISTS documento_url text,
  ADD COLUMN IF NOT EXISTS total_avaliacoes integer NOT NULL DEFAULT 0;

-- ============ Imóveis ============
ALTER TABLE public.imoveis
  ADD COLUMN IF NOT EXISTS quartos integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS aceita_solicitacoes boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS moradores_podem_recrutar boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_grupo_url text,
  ADD COLUMN IF NOT EXISTS contato_whatsapp text,
  ADD COLUMN IF NOT EXISTS ocupado boolean NOT NULL DEFAULT false;

UPDATE public.imoveis SET quartos = GREATEST(1, vagas_total);

-- ============ Moradias ============
CREATE TABLE IF NOT EXISTS public.moradias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imovel_id uuid NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
  grupo_id uuid REFERENCES public.grupos(id) ON DELETE SET NULL,
  responsavel_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  proprietario_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  inicio date NOT NULL DEFAULT CURRENT_DATE,
  fim date,
  status public.status_moradia_reg NOT NULL DEFAULT 'ativa',
  encerramento_pedido_por uuid REFERENCES public.profiles(id),
  encerramento_pedido_em timestamptz,
  avaliacao_janela_fim timestamptz,
  whatsapp_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.moradia_moradores (
  moradia_id uuid NOT NULL REFERENCES public.moradias(id) ON DELETE CASCADE,
  morador_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (moradia_id, morador_id)
);

GRANT SELECT ON public.moradias TO authenticated;
GRANT ALL ON public.moradias TO service_role;
GRANT SELECT ON public.moradia_moradores TO authenticated;
GRANT ALL ON public.moradia_moradores TO service_role;

ALTER TABLE public.moradias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moradia_moradores ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.pode_ver_moradia(_moradia_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.moradias m
    WHERE m.id = _moradia_id
      AND (m.proprietario_id = _user_id
           OR m.responsavel_id = _user_id
           OR EXISTS (SELECT 1 FROM public.moradia_moradores mm
                      WHERE mm.moradia_id = m.id AND mm.morador_id = _user_id))
  )
$$;

CREATE POLICY "Participantes veem a moradia" ON public.moradias
  FOR SELECT TO authenticated USING (public.pode_ver_moradia(id, auth.uid()));

CREATE POLICY "Participantes veem os moradores" ON public.moradia_moradores
  FOR SELECT TO authenticated USING (public.pode_ver_moradia(moradia_id, auth.uid()));

CREATE TRIGGER set_moradias_updated_at BEFORE UPDATE ON public.moradias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Chamados de moradores ============
CREATE TABLE IF NOT EXISTS public.chamados_moradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imovel_id uuid NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
  moradia_id uuid NOT NULL REFERENCES public.moradias(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mensagem text NOT NULL DEFAULT '',
  vagas_procuradas integer NOT NULL DEFAULT 1,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.chamados_moradores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chamados_moradores TO authenticated;
GRANT ALL ON public.chamados_moradores TO service_role;

ALTER TABLE public.chamados_moradores ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.pode_recrutar(_moradia_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.moradias m
    JOIN public.imoveis i ON i.id = m.imovel_id
    WHERE m.id = _moradia_id
      AND m.status <> 'encerrada'
      AND i.moradores_podem_recrutar
      AND (m.responsavel_id = _user_id
           OR EXISTS (SELECT 1 FROM public.moradia_moradores mm
                      WHERE mm.moradia_id = m.id AND mm.morador_id = _user_id))
  )
$$;

CREATE POLICY "Chamados visiveis para todos" ON public.chamados_moradores
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Morador autorizado publica chamado" ON public.chamados_moradores
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = autor_id AND public.pode_recrutar(moradia_id, auth.uid()));
CREATE POLICY "Autor edita chamado" ON public.chamados_moradores
  FOR UPDATE TO authenticated USING (auth.uid() = autor_id) WITH CHECK (auth.uid() = autor_id);
CREATE POLICY "Autor remove chamado" ON public.chamados_moradores
  FOR DELETE TO authenticated USING (auth.uid() = autor_id);

CREATE TRIGGER set_chamados_updated_at BEFORE UPDATE ON public.chamados_moradores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Avaliações às cegas ============
ALTER TABLE public.avaliacoes
  ADD COLUMN IF NOT EXISTS moradia_id uuid REFERENCES public.moradias(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS revelada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS janela_fim timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS avaliacoes_unica_por_moradia
  ON public.avaliacoes (moradia_id, avaliador_id, avaliado_id)
  WHERE moradia_id IS NOT NULL;

DROP POLICY IF EXISTS "Avaliacoes visiveis para todos" ON public.avaliacoes;
DROP POLICY IF EXISTS "Usuario avalia" ON public.avaliacoes;

CREATE POLICY "Avaliacoes reveladas sao publicas" ON public.avaliacoes
  FOR SELECT TO anon, authenticated USING (revelada);
CREATE POLICY "Autor ve a propria avaliacao" ON public.avaliacoes
  FOR SELECT TO authenticated USING (auth.uid() = avaliador_id);
CREATE POLICY "Usuario avalia" ON public.avaliacoes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = avaliador_id);

-- médias só contam avaliações reveladas
CREATE OR REPLACE FUNCTION public.recalc_medias()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _imovel uuid := COALESCE(NEW.imovel_id, OLD.imovel_id);
  _avaliado uuid := COALESCE(NEW.avaliado_id, OLD.avaliado_id);
BEGIN
  UPDATE public.imoveis SET media_estrelas = COALESCE((
    SELECT ROUND(AVG(estrelas)::numeric, 1) FROM public.avaliacoes
    WHERE imovel_id = _imovel AND revelada
  ), 0) WHERE id = _imovel;

  UPDATE public.profiles p SET
    media_estrelas = COALESCE((
      SELECT ROUND(AVG(a.estrelas)::numeric, 1) FROM public.avaliacoes a
      WHERE a.avaliado_id = _avaliado AND a.revelada), 0),
    total_avaliacoes = (
      SELECT COUNT(*) FROM public.avaliacoes a
      WHERE a.avaliado_id = _avaliado AND a.revelada)
  WHERE p.id = _avaliado;

  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS recalc_imovel_media_insert ON public.avaliacoes;
DROP TRIGGER IF EXISTS recalc_imovel_media_delete ON public.avaliacoes;
DROP FUNCTION IF EXISTS public.recalc_imovel_media();

CREATE TRIGGER recalc_medias_aiud
  AFTER INSERT OR UPDATE OR DELETE ON public.avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.recalc_medias();

-- revela avaliações de uma moradia (reciprocidade ou fim da janela)
CREATE OR REPLACE FUNCTION public.revelar_avaliacoes(_moradia_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.avaliacoes a
  SET revelada = true
  WHERE a.moradia_id = _moradia_id
    AND NOT a.revelada
    AND (
      a.janela_fim IS NOT NULL AND a.janela_fim < now()
      OR EXISTS (
        SELECT 1 FROM public.avaliacoes b
        WHERE b.moradia_id = a.moradia_id
          AND b.avaliador_id = a.avaliado_id
          AND b.avaliado_id = a.avaliador_id
      )
    );
$$;

-- encerra automaticamente pedidos sem resposta há mais de 7 dias e revela janelas vencidas
CREATE OR REPLACE FUNCTION public.processar_moradias()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  UPDATE public.moradias
  SET status = 'encerrada',
      fim = CURRENT_DATE,
      avaliacao_janela_fim = now() + interval '14 days'
  WHERE status = 'encerramento_solicitado'
    AND encerramento_pedido_em < now() - interval '7 days';

  UPDATE public.imoveis i SET ocupado = false
  WHERE i.ocupado AND NOT EXISTS (
    SELECT 1 FROM public.moradias m WHERE m.imovel_id = i.id AND m.status <> 'encerrada');

  UPDATE public.profiles p SET status_moradia = 'procurando'
  WHERE p.status_moradia = 'morando' AND NOT EXISTS (
    SELECT 1 FROM public.moradia_moradores mm
    JOIN public.moradias m ON m.id = mm.moradia_id
    WHERE mm.morador_id = p.id AND m.status <> 'encerrada');

  FOR r IN SELECT DISTINCT moradia_id FROM public.avaliacoes
           WHERE NOT revelada AND moradia_id IS NOT NULL LOOP
    PERFORM public.revelar_avaliacoes(r.moradia_id);
  END LOOP;
END $$;
