-- ============ ENUMS ============
create type public.tipo_usuario as enum ('estudante', 'trabalhador', 'proprietario');
create type public.tipo_imovel as enum ('quarto', 'republica', 'kitnet', 'apartamento');
create type public.status_imovel as enum ('disponivel', 'esgotado', 'inativo');
create type public.tipo_solicitante as enum ('individual', 'grupo');
create type public.status_solicitacao as enum ('pendente', 'aceita', 'recusada', 'cancelada');
create type public.status_contrato as enum ('ativo', 'encerrado', 'cancelado');
create type public.status_pagamento as enum ('pago', 'pendente', 'atrasado');

-- ============ PROFILES (Usuario) ============
create table public.profiles (
  id uuid primary key,
  nome text not null,
  telefone text,
  tipo public.tipo_usuario not null default 'estudante',
  status_moradia text,
  media_estrelas numeric(3,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.imoveis (
  id uuid primary key default gen_random_uuid(),
  proprietario_id uuid not null references public.profiles(id) on delete cascade,
  titulo text not null,
  descricao text not null default '',
  tipo public.tipo_imovel not null default 'quarto',
  preco_mensal numeric(10,2) not null,
  vagas_disponiveis integer not null default 1,
  vagas_total integer not null default 1,
  bairro text not null,
  proximidade text,
  comodidades text[] not null default '{}',
  fotos text[] not null default '{}',
  status public.status_imovel not null default 'disponivel',
  media_estrelas numeric(3,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  nome_grupo text not null,
  lider_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.grupo_membros (
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (grupo_id, usuario_id)
);

create table public.solicitacoes (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references public.imoveis(id) on delete cascade,
  solicitante_id uuid not null references public.profiles(id) on delete cascade,
  tipo_solicitante public.tipo_solicitante not null default 'individual',
  grupo_id uuid references public.grupos(id) on delete set null,
  mensagem text not null default '',
  status public.status_solicitacao not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references public.imoveis(id) on delete cascade,
  inquilino_id uuid not null references public.profiles(id) on delete cascade,
  grupo_id uuid references public.grupos(id) on delete set null,
  inicio date not null default current_date,
  fim date,
  valor_mensal numeric(10,2) not null,
  status public.status_contrato not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos(id) on delete cascade,
  mes_referencia date not null,
  valor numeric(10,2) not null,
  status_pagamento public.status_pagamento not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references public.imoveis(id) on delete cascade,
  contrato_id uuid references public.contratos(id) on delete set null,
  avaliador_id uuid not null references public.profiles(id) on delete cascade,
  avaliado_id uuid not null references public.profiles(id) on delete cascade,
  estrelas integer not null check (estrelas between 1 and 5),
  comentario text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ GRANTS ============
grant select on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated;
grant select on public.imoveis to anon, authenticated;
grant insert, update, delete on public.imoveis to authenticated;
grant select on public.grupos to authenticated;
grant insert, update, delete on public.grupos to authenticated;
grant select, insert, delete on public.grupo_membros to authenticated;
grant select on public.solicitacoes to authenticated;
grant insert, update, delete on public.solicitacoes to authenticated;
grant select on public.contratos to authenticated;
grant insert, update, delete on public.contratos to authenticated;
grant select on public.pagamentos to authenticated;
grant insert, update, delete on public.pagamentos to authenticated;
grant select on public.avaliacoes to anon, authenticated;
grant insert on public.avaliacoes to authenticated;
grant all on public.profiles, public.imoveis, public.grupos, public.grupo_membros, public.solicitacoes, public.contratos, public.pagamentos, public.avaliacoes to service_role;

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.imoveis enable row level security;
alter table public.grupos enable row level security;
alter table public.grupo_membros enable row level security;
alter table public.solicitacoes enable row level security;
alter table public.contratos enable row level security;
alter table public.pagamentos enable row level security;
alter table public.avaliacoes enable row level security;

-- profiles
create policy "Perfis visiveis para todos" on public.profiles for select to anon, authenticated using (true);
create policy "Usuario edita o proprio perfil" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- imoveis
create policy "Imoveis visiveis para todos" on public.imoveis for select to anon, authenticated using (true);
create policy "Proprietario cria imoveis" on public.imoveis for insert to authenticated with check (auth.uid() = proprietario_id);
create policy "Proprietario edita seus imoveis" on public.imoveis for update to authenticated using (auth.uid() = proprietario_id) with check (auth.uid() = proprietario_id);
create policy "Proprietario remove seus imoveis" on public.imoveis for delete to authenticated using (auth.uid() = proprietario_id);

-- grupos
create policy "Membros veem o grupo" on public.grupos for select to authenticated using (auth.uid() = lider_id or exists (select 1 from public.grupo_membros gm where gm.grupo_id = id and gm.usuario_id = auth.uid()));
create policy "Usuario cria grupo como lider" on public.grupos for insert to authenticated with check (auth.uid() = lider_id);
create policy "Lider edita o grupo" on public.grupos for update to authenticated using (auth.uid() = lider_id) with check (auth.uid() = lider_id);
create policy "Lider remove o grupo" on public.grupos for delete to authenticated using (auth.uid() = lider_id);

-- grupo_membros
create policy "Membros veem o grupo_membros" on public.grupo_membros for select to authenticated using (true);
create policy "Usuario entra em grupo" on public.grupo_membros for insert to authenticated with check (auth.uid() = usuario_id);
create policy "Usuario sai do grupo" on public.grupo_membros for delete to authenticated using (auth.uid() = usuario_id);

-- solicitacoes
create policy "Solicitante ve suas solicitacoes" on public.solicitacoes for select to authenticated using (auth.uid() = solicitante_id or auth.uid() in (select i.proprietario_id from public.imoveis i where i.id = imovel_id));
create policy "Usuario envia solicitacao" on public.solicitacoes for insert to authenticated with check (auth.uid() = solicitante_id);
create policy "Solicitante cancela" on public.solicitacoes for update to authenticated using (auth.uid() = solicitante_id) with check (auth.uid() = solicitante_id);
create policy "Solicitante remove" on public.solicitacoes for delete to authenticated using (auth.uid() = solicitante_id);

-- contratos
create policy "Partes veem o contrato" on public.contratos for select to authenticated using (auth.uid() = inquilino_id or auth.uid() in (select i.proprietario_id from public.imoveis i where i.id = imovel_id));
create policy "Proprietario cria contrato" on public.contratos for insert to authenticated with check (auth.uid() in (select i.proprietario_id from public.imoveis i where i.id = imovel_id));
create policy "Partes editam contrato" on public.contratos for update to authenticated using (auth.uid() = inquilino_id or auth.uid() in (select i.proprietario_id from public.imoveis i where i.id = imovel_id)) with check (auth.uid() = inquilino_id or auth.uid() in (select i.proprietario_id from public.imoveis i where i.id = imovel_id));

-- pagamentos
create policy "Partes veem o pagamento" on public.pagamentos for select to authenticated using (exists (select 1 from public.contratos c where c.id = contrato_id and (c.inquilino_id = auth.uid() or c.imovel_id in (select i.id from public.imoveis i where i.proprietario_id = auth.uid()))));
create policy "Proprietario registra pagamento" on public.pagamentos for insert to authenticated with check (exists (select 1 from public.contratos c join public.imoveis i on i.id = c.imovel_id where c.id = contrato_id and i.proprietario_id = auth.uid()));
create policy "Proprietario edita pagamento" on public.pagamentos for update to authenticated using (exists (select 1 from public.contratos c join public.imoveis i on i.id = c.imovel_id where c.id = contrato_id and i.proprietario_id = auth.uid())) with check (exists (select 1 from public.contratos c join public.imoveis i on i.id = c.imovel_id where c.id = contrato_id and i.proprietario_id = auth.uid()));

-- avaliacoes
create policy "Avaliacoes visiveis para todos" on public.avaliacoes for select to anon, authenticated using (true);
create policy "Usuario avalia" on public.avaliacoes for insert to authenticated with check (auth.uid() = avaliador_id);

-- ============ TRIGGERS ============
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end $$;

create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_imoveis_updated_at before update on public.imoveis for each row execute function public.set_updated_at();
create trigger set_grupos_updated_at before update on public.grupos for each row execute function public.set_updated_at();
create trigger set_solicitacoes_updated_at before update on public.solicitacoes for each row execute function public.set_updated_at();
create trigger set_contratos_updated_at before update on public.contratos for each row execute function public.set_updated_at();
create trigger set_pagamentos_updated_at before update on public.pagamentos for each row execute function public.set_updated_at();
create trigger set_avaliacoes_updated_at before update on public.avaliacoes for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome, telefone)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)), new.phone)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.recalc_imovel_media() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.imoveis
  set media_estrelas = coalesce((select round(avg(estrelas)::numeric, 1) from public.avaliacoes where imovel_id = new.imovel_id), 0)
  where id = new.imovel_id;
  return new;
end $$;

create trigger recalc_imovel_media_insert after insert on public.avaliacoes for each row execute function public.recalc_imovel_media();
create trigger recalc_imovel_media_delete after delete on public.avaliacoes for each row execute function public.recalc_imovel_media();

-- ============ SEED (dados de exemplo) ============
insert into public.profiles (id, nome, telefone, tipo) values
  ('11111111-1111-4111-8111-111111111101', 'Dona Cleide', '(88) 99999-1001', 'proprietario'),
  ('11111111-1111-4111-8111-111111111102', 'Seu Zé do Cedro', '(88) 99999-1002', 'proprietario'),
  ('11111111-1111-4111-8111-111111111103', 'Mariana Silva', '(88) 99999-1003', 'estudante'),
  ('11111111-1111-4111-8111-111111111104', 'Rafael Mendes', '(88) 99999-1004', 'estudante'),
  ('11111111-1111-4111-8111-111111111105', 'Camila Rocha', '(88) 99999-1005', 'estudante');

insert into public.imoveis (proprietario_id, titulo, descricao, tipo, preco_mensal, vagas_disponiveis, vagas_total, bairro, proximidade, comodidades, fotos, status, media_estrelas) values
  ('11111111-1111-4111-8111-111111111101', 'República Arretada', 'Casa ampla no Planalto com sala, cozinha compartilhada e área de churrasco. Ambiente focado em estudos, silêncio após as 22h.', 'republica', 550, 2, 4, 'Planalto Universitário', '400m do campus da UFC', ARRAY['Wifi 500mb','Ar-condicionado','Lavanderia','Área de churrasco'], ARRAY['/images/imovel-1.jpg'], 'disponivel', 4.9),
  ('11111111-1111-4111-8111-111111111102', 'Kitnet Solar do Cedro', 'Kitnet nova e mobiliada com cama, armário, mesa de estudos e banheiro privativo. Conta de água e internet inclusas.', 'kitnet', 720, 1, 1, 'Cedro', 'Próximo à Unicatólica', ARRAY['Mobiliado','Luz inclusa','Wifi'], ARRAY['/images/imovel-2.jpg'], 'disponivel', 4.7),
  ('11111111-1111-4111-8111-111111111101', 'Casa da Galera', 'Quarto individual em casa universitária no Centro, a uma quadra da praça principal. Ambiente misto e descontraído.', 'quarto', 480, 1, 3, 'Centro', 'Rua do Comércio', ARRAY['Wifi','Cozinha compartilhada','Lavanderia'], ARRAY['/images/imovel-3.jpg'], 'disponivel', 5.0),
  ('11111111-1111-4111-8111-111111111102', 'República Pedra da Galinha', 'República tradicional, vista para os monólitos, com rede no quintal e internet fibra. Duas vagas em quarto compartilhado.', 'republica', 450, 2, 2, 'Cedro', '10 min do campus da UFC', ARRAY['Wifi fibra','Rede no quintal','Cozinha'], ARRAY['/images/imovel-4.jpg'], 'disponivel', 4.8),
  ('11111111-1111-4111-8111-111111111101', 'Quarto Casa da Praça', 'Quarto simples e limpo em casa de família, ideal para quem busca tranquilidade para estudar.', 'quarto', 520, 1, 2, 'Centro', 'Perto da Unicatólica', ARRAY['Wifi','Água inclusa'], ARRAY['/images/imovel-5.jpg'], 'disponivel', 4.6),
  ('11111111-1111-4111-8111-111111111102', 'Kitnet Universitária II', 'Kitnet no coração do Planalto Universitário, 5 minutos a pé do IFCE. Vaga única, esgotada rapidamente!', 'kitnet', 680, 0, 1, 'Planalto Universitário', '5 min do IFCE', ARRAY['Mobiliado','Ar-condicionado'], ARRAY['/images/imovel-6.jpg'], 'esgotado', 4.5);

insert into public.avaliacoes (imovel_id, contrato_id, avaliador_id, avaliado_id, estrelas, comentario) values
  ((select id from public.imoveis where titulo = 'República Arretada'), null, '11111111-1111-4111-8111-111111111103', '11111111-1111-4111-8111-111111111101', 5, 'Morei dois anos e é a melhor república que já vi em Quixadá. Silêncio de verdade e internet ótima.'),
  ((select id from public.imoveis where titulo = 'República Arretada'), null, '11111111-1111-4111-8111-111111111104', '11111111-1111-4111-8111-111111111101', 5, 'Dona Cleide é super atenciosa, responde tudo rapidinho no WhatsApp.'),
  ((select id from public.imoveis where titulo = 'República Arretada'), null, '11111111-1111-4111-8111-111111111105', '11111111-1111-4111-8111-111111111101', 4, 'Ótimo lugar, só senti falta de uma chuveiro elétrico mais forte.'),
  ((select id from public.imoveis where titulo = 'Kitnet Solar do Cedro'), null, '11111111-1111-4111-8111-111111111103', '11111111-1111-4111-8111-111111111102', 5, 'Kitnet nova, tudo funcionando. Cheguei de Fortaleza e me instalei no mesmo dia.'),
  ((select id from public.imoveis where titulo = 'República Pedra da Galinha'), null, '11111111-1111-4111-8111-111111111104', '11111111-1111-4111-8111-111111111102', 5, 'A vista dos monólitos da janela não tem preço. Melhor custo-benefício do Cedro.'),
  ((select id from public.imoveis where titulo = 'Casa da Galera'), null, '11111111-1111-4111-8111-111111111105', '11111111-1111-4111-8111-111111111101', 5, 'Galera animada e respeitosa, localização imbatível no Centro.');

update public.imoveis i set media_estrelas = coalesce((select round(avg(a.estrelas)::numeric, 1) from public.avaliacoes a where a.imovel_id = i.id), 0);

alter publication supabase_realtime add table public.solicitacoes;