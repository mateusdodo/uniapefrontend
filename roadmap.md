# Roadmap — Moradia Quixadá

Plataforma web estilo Airbnb para estudantes/trabalhadores encontrarem repúblicas, quartos e imóveis em Quixadá.

## Tasks
- [x] Corrigir erro de build (instalar @supabase/supabase-js e @supabase/ssr)
- [x] Gerar direções de design e usuário escolher uma
- [x] Criar schema no Supabase conforme diagrama relacional (Usuario, Imovel, Grupo, Solicitacao, Contrato, Pagamento, Avaliacao) com RLS e GRANTs
- [x] Implementar autenticação com página /auth (entrar/criar conta) + trigger handle_new_user cria profile
- [x] Página inicial: mural + listagem de imóveis com filtros hiperlocais
- [x] Página de detalhe do imóvel + solicitação de moradia (individual ou em grupo)
- [x] Fluxo de anfitrião: publicar imóvel (/anunciar, rota protegida)
- [x] Grupos de moradia (líder + membros, busca de pessoas)
- [x] Solicitações: painel do dono (aceitar/recusar com estrelas) e do inquilino
- [x] Contratos e pagamentos (registro mensal + marcar pago)
- [x] Avaliações mútuas (5 estrelas + comentário, liberadas após pagamento)
- [x] Paradas de ônibus (ida e volta) com minutos a pé calculados por rota real (OSRM) e estimativa como plano B
- [x] Conversa da casa: canal por contrato entre proprietário e líder do grupo (só eles escrevem), com os demais integrantes acompanhando em tempo real
- [x] Simplificação: contratos/pagamentos/conversa removidos; aceite libera grupo de WhatsApp ou contato
- [x] Quartos como sugestão, anúncio aberto/fechado, moradores podem procurar novas pessoas (chamados)
- [x] Tipo de conta (comum/proprietário com declaração) — página Conta
- [x] Minha moradia: encerramento confirmado pelos dois lados (ou 7 dias), avaliação às cegas em 14 dias
- [ ] Verificação de proprietário por documento (selo "verificado") — futuro
- [x] Menu lateral à direita, links por papel (inquilino/proprietário)
- [x] Papel escolhido no cadastro; "Conta" virou "Meu perfil"
- [x] Só o morador principal divulga; 1 divulgação ativa por imóvel
- [x] 22 bairros oficiais de Quixadá
- [x] Foto de perfil (envio em Meu perfil, exibida em Pessoas e perfis)
