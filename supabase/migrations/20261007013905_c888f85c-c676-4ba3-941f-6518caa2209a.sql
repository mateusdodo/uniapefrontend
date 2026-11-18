CREATE OR REPLACE FUNCTION public.proteger_campos_perfil()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.verificado := OLD.verificado;
    NEW.media_estrelas := OLD.media_estrelas;
    NEW.total_avaliacoes := OLD.total_avaliacoes;
    NEW.tipo_conta := OLD.tipo_conta;
    NEW.proprietario_declarado_em := OLD.proprietario_declarado_em;
  END IF;
  RETURN NEW;
END $$;