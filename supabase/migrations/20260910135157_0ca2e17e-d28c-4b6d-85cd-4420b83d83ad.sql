CREATE TYPE public.sentido_parada AS ENUM ('ida','volta');

CREATE TABLE public.paradas_onibus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  endereco text NOT NULL,
  sentido public.sentido_parada NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.paradas_onibus TO anon;
GRANT SELECT ON public.paradas_onibus TO authenticated;
GRANT ALL ON public.paradas_onibus TO service_role;

ALTER TABLE public.paradas_onibus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paradas visiveis para todos" ON public.paradas_onibus
FOR SELECT TO anon, authenticated USING (true);

CREATE TRIGGER set_paradas_onibus_updated_at
BEFORE UPDATE ON public.paradas_onibus
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.imoveis
  ADD COLUMN endereco text NOT NULL DEFAULT '',
  ADD COLUMN latitude numeric,
  ADD COLUMN longitude numeric,
  ADD COLUMN parada_ida_nome text,
  ADD COLUMN parada_ida_minutos integer,
  ADD COLUMN parada_volta_nome text,
  ADD COLUMN parada_volta_minutos integer,
  ADD COLUMN transporte_fonte text;

INSERT INTO public.paradas_onibus (nome, endereco, sentido, latitude, longitude, ordem) VALUES
  ('Combate', 'Rua Basílio Emiliano Pinto, 1290 — Combate', 'ida', -4.9717401, -39.0283695, 1),
  ('Planalto Universitário', 'Rua Basílio Emiliano Pinto, 958 — Planalto Universitário', 'ida', -4.9705978, -39.0252110, 2),
  ('Centro', 'Rua Basílio Emiliano Pinto, 420 — Centro', 'ida', -4.9711000, -39.0221000, 3),
  ('Rodoviária de Quixadá', 'Av. José Caetano Almeida — Terminal Rodoviário', 'ida', -4.9729219, -39.0164591, 4),
  ('Combate', 'Rua José de Freitas Queiroz — Combate', 'volta', -4.9750000, -39.0330000, 1),
  ('Cúria Diocesana', 'Cúria Diocesana de Quixadá', 'volta', -4.9725000, -39.0285000, 2),
  ('Av. José Caetano Almeida, 861', 'Av. José Caetano Almeida, 861', 'volta', -4.9725797, -39.0242439, 3),
  ('Av. José Caetano Almeida, 503', 'Av. José Caetano Almeida, 503', 'volta', -4.9725523, -39.0200454, 4),
  ('Rodoviária de Quixadá', 'Av. José Caetano Almeida — Terminal Rodoviário', 'volta', -4.9729219, -39.0164591, 5);