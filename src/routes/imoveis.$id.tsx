import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { getImovel, createSolicitacao } from "@/lib/moradia.functions";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TIPO_LABELS, formatPreco } from "@/lib/imovel-format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/imoveis/$id")({
  loader: async ({ params }) => {
    if (!z.string().uuid().safeParse(params.id).success) throw notFound();
    const imovel = await getImovel({ data: { id: params.id } });
    if (!imovel) throw notFound();
    return imovel;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Imóvel não encontrado — Moradia Quixadá" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    return {
      meta: [
        { title: `${loaderData.titulo} — Moradia Quixadá` },
        {
          name: "description",
          content: `${loaderData.titulo} no bairro ${loaderData.bairro}, Quixadá. ${loaderData.quartos} quarto(s), combinável, a ${formatPreco(Number(loaderData.preco_mensal))}/mês.`,
        },
        { property: "og:title", content: `${loaderData.titulo} — Moradia Quixadá` },
        {
          property: "og:description",
          content: `${loaderData.quartos} quarto(s) a ${formatPreco(Number(loaderData.preco_mensal))}/mês • ${loaderData.bairro}, Quixadá`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: ImovelNaoEncontrado,
  errorComponent: ImovelErro,
  component: ImovelDetalhe,
});

function ImovelNaoEncontrado() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-4xl uppercase">Essa vaga saiu do mural</h1>
      <p className="text-sm text-muted-foreground">
        O imóvel pode ter sido alugado ou removido pelo proprietário.
      </p>
      <Link
        to="/"
        className="bg-primary px-6 py-3 font-bold uppercase tracking-widest text-primary-foreground hover:brightness-110"
      >
        Ver outras vagas
      </Link>
    </div>
  );
}

function ImovelErro() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-4xl uppercase">Não carregou</h1>
      <p className="text-sm text-muted-foreground">Tente novamente em instantes.</p>
      <Link
        to="/"
        className="bg-primary px-6 py-3 font-bold uppercase tracking-widest text-primary-foreground hover:brightness-110"
      >
        Voltar ao mural
      </Link>
    </div>
  );
}

function ImovelDetalhe() {
  const imovel = Route.useLoaderData();
  const [session, setSession] = useState<{ userId: string } | null>(null);
  const [tipo, setTipo] = useState<"individual" | "grupo">("individual");
  const [grupoId, setGrupoId] = useState<string>("");
  const [meusGrupos, setMeusGrupos] = useState<{ id: string; nome_grupo: string }[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session ? { userId: data.session.user.id } : null);
      if (data.session) {
        const { data: grupos } = await supabase.from("grupos").select("id,nome_grupo");
        setMeusGrupos(grupos ?? []);
      }
    });
  }, []);

  async function solicitar() {
    if (!session) return;
    setEnviando(true);
    try {
      await createSolicitacao({
        data: {
          imovel_id: imovel.id,
          tipo_solicitante: tipo,
          mensagem,
          grupo_id: tipo === "grupo" && grupoId ? grupoId : null,
        },
      });
      toast.success("Solicitação enviada!", {
        description: "O proprietário vai responder em breve.",
      });
      setEnviado(true);
      setMensagem("");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível enviar a solicitação.");
    } finally {
      setEnviando(false);
    }
  }

  const foto = imovel.fotos?.[0];

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <Link
          to="/"
          className="font-mono text-xs uppercase tracking-widest text-secondary/60 hover:text-primary"
        >
          ← Voltar ao mural
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-12 lg:grid-cols-[1.6fr_1fr]">
          {/* Coluna principal */}
          <div className="animate-reveal">
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
              {foto ? (
                <img
                  src={foto}
                  alt={`Foto do imóvel ${imovel.titulo}`}
                  width={1024}
                  height={768}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center font-mono text-xs uppercase text-muted-foreground">
                  Sem foto
                </div>
              )}
              <div className="absolute left-3 top-3 bg-primary px-2 py-1 font-mono text-[10px] font-bold text-primary-foreground">
                {imovel.quartos} QUARTO(S) · SUGESTÃO {imovel.quartos} PESSOA(S), COMBINÁVEL
              </div>
              {imovel.ocupado && (
                <div className="absolute right-3 top-3 bg-accent px-2 py-1 font-mono text-[10px] font-bold text-accent-foreground">
                  OCUPADO
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-4xl uppercase leading-tight md:text-5xl">
                  {imovel.titulo}
                </h1>
                <p className="mt-2 font-mono text-sm text-secondary/60">
                  {imovel.bairro}
                  {imovel.proximidade ? ` • ${imovel.proximidade}` : ""} •{" "}
                  {TIPO_LABELS[imovel.tipo] ?? imovel.tipo}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-3xl text-primary">
                  {formatPreco(Number(imovel.preco_mensal))}
                </p>
                <p className="text-[10px] font-bold uppercase text-secondary/40">
                  por mês
                </p>
              </div>
            </div>

            <section className="mt-10 border-t border-border pt-8">
              <h2 className="font-display text-2xl uppercase">Sobre o lugar</h2>
              <p className="mt-4 max-w-[65ch] leading-relaxed text-secondary/80">
                {imovel.descricao || "Sem descrição fornecida pelo proprietário."}
              </p>
            </section>

            {(imovel.parada_ida_minutos != null || imovel.parada_volta_minutos != null) && (
              <section className="mt-10 border-t border-border pt-8">
                <h2 className="font-display text-2xl uppercase">Ônibus da universidade</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {imovel.parada_ida_minutos != null && (
                    <div className="border-l-4 border-primary bg-white p-5 shadow-sm">
                      <p className="font-mono text-[10px] uppercase text-secondary/50">
                        Ida — melhor parada para embarcar
                      </p>
                      <p className="mt-2 font-display text-3xl text-primary">
                        {imovel.parada_ida_minutos} min a pé
                      </p>
                      <p className="mt-1 text-sm text-secondary/70">{imovel.parada_ida_nome}</p>
                    </div>
                  )}
                  {imovel.parada_volta_minutos != null && (
                    <div className="border-l-4 border-accent bg-white p-5 shadow-sm">
                      <p className="font-mono text-[10px] uppercase text-secondary/50">
                        Volta — melhor parada para descer
                      </p>
                      <p className="mt-2 font-display text-3xl text-primary">
                        {imovel.parada_volta_minutos} min a pé
                      </p>
                      <p className="mt-1 text-sm text-secondary/70">{imovel.parada_volta_nome}</p>
                    </div>
                  )}
                </div>
                <p className="mt-3 font-mono text-[10px] uppercase text-secondary/40">
                  {imovel.transporte_fonte === "osrm"
                    ? "Trajeto real calculado pelas ruas (OpenStreetMap)"
                    : "Tempo estimado pela distância até a parada"}
                </p>
              </section>
            )}

            {imovel.comodidades?.length > 0 && (
              <section className="mt-10 border-t border-border pt-8">
                <h2 className="font-display text-2xl uppercase">O que tem de casa</h2>
                <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {imovel.comodidades.map((c) => (
                    <li
                      key={c}
                      className="flex items-center gap-2 border border-border bg-white px-3 py-2 font-mono text-xs uppercase"
                    >
                      <span className="text-primary">+</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {imovel.chamados.length > 0 && (
              <section className="mt-10 border-t border-border pt-8">
                <h2 className="font-display text-2xl uppercase">Moradores procuram</h2>
                <ul className="mt-4 space-y-3">
                  {imovel.chamados.map((c) => (
                    <li key={c.id} className="border-l-4 border-accent bg-white p-4 text-sm shadow-sm">
                      “{c.mensagem}” — {c.autor?.nome ?? "morador"} ·{" "}
                      <span className="font-mono text-[10px] uppercase">
                        {c.vagas_procuradas} pessoa(s)
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-10 border-t border-border pt-8">
              <h2 className="font-display text-2xl uppercase">
                Avaliações ({imovel.avaliacoes.length})
              </h2>
              <div className="mt-6 space-y-6">
                {imovel.avaliacoes.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Ainda sem avaliações para este imóvel.
                  </p>
                )}
                {imovel.avaliacoes.map((a) => (
                  <article key={a.id} className="border-t-4 border-accent bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{a.avaliador?.nome ?? "Morador"}</span>
                      <span className="font-mono text-sm">
                        <span className="text-primary">{"★".repeat(a.estrelas)}</span>
                        <span className="text-border">{"★".repeat(5 - a.estrelas)}</span>
                      </span>
                    </div>
                    <p className="mt-3 text-pretty text-sm text-secondary/80">{a.comentario}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar — proprietário + solicitação */}
          <aside className="space-y-6">
            <div className="border-t-4 border-primary bg-white p-6 shadow-xl">
              <h3 className="font-display text-xl uppercase">Proprietário</h3>
              <div className="mt-4 flex items-center gap-4">
                <div className="grid size-12 place-items-center bg-primary/10 font-display text-xl text-primary">
                  {(imovel.proprietario?.nome ?? "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{imovel.proprietario?.nome ?? "Anunciante"}</p>
                  <p className="font-mono text-xs text-secondary/50">
                    {imovel.media_estrelas.toFixed(1)} ★ média do imóvel
                  </p>
                </div>
              </div>
              {imovel.proprietario?.verificado && (
                <p className="mt-3 inline-block bg-accent px-2 py-1 font-mono text-[10px] uppercase text-accent-foreground">
                  ✔ proprietário verificado
                </p>
              )}
              {imovel.proprietario && !imovel.proprietario.tem_documento && (
                <p
                  title="O proprietário ainda não enviou a documentação de propriedade."
                  className="mt-3 inline-block bg-amber-100 px-2 py-1 font-mono text-[10px] font-bold text-amber-950"
                >
                  ⚠️ Proprietário Não Verificado
                </p>
              )}
              <p className="mt-3 font-mono text-[10px] uppercase text-secondary/50">
                O contato do proprietário é liberado quando sua solicitação for aceita.
              </p>
            </div>

            <div className="border-t-4 border-accent bg-white p-6 shadow-xl">
              <h3 className="font-display text-xl uppercase">Solicitar moradia</h3>
              {!session ? (
                <div className="mt-4">
                  <p className="text-sm text-secondary/70">
                    Entre na sua conta para enviar uma solicitação de moradia —
                    individual ou em grupo.
                  </p>
                  <Link
                    to="/auth"
                    search={{ redirect: `/imoveis/${imovel.id}` }}
                    className="mt-4 block bg-foreground py-3 text-center font-bold uppercase tracking-widest text-background transition-colors hover:bg-primary"
                  >
                    Entrar para solicitar
                  </Link>
                </div>
              ) : enviado ? (
                <div className="mt-4">
                  <p className="font-mono text-sm text-secondary/70">
                    ✔ Solicitação registrada. O proprietário entra em contato pelo
                    WhatsApp.
                  </p>
                  <button
                    onClick={() => setEnviado(false)}
                    className="mt-4 w-full border border-foreground py-3 text-center font-bold uppercase tracking-widest transition-colors hover:bg-foreground hover:text-background"
                  >
                    Enviar outra
                  </button>
                </div>
              ) : (
                <form
                  className="mt-4 space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void solicitar();
                  }}
                >
                  <div>
                    <label
                      htmlFor="tipo-solicitante"
                      className="mb-1 block font-mono text-[10px] uppercase text-secondary/50"
                    >
                      Como você quer morar?
                    </label>
                    <select
                      id="tipo-solicitante"
                      value={tipo}
                      onChange={(e) =>
                        setTipo(e.target.value as "individual" | "grupo")
                      }
                      className="w-full border-b border-border bg-transparent py-2 focus:border-primary focus:outline-none"
                    >
                      <option value="individual">Sozinho (individual)</option>
                      <option value="grupo">Com meu grupo de amigos</option>
                    </select>
                  </div>
                  {tipo === "grupo" && (
                    <div>
                      <label
                        htmlFor="grupo-solicitante"
                        className="mb-1 block font-mono text-[10px] uppercase text-secondary/50"
                      >
                        Qual grupo?
                      </label>
                      {meusGrupos.length === 0 ? (
                        <p className="text-sm text-secondary/70">
                          Você ainda não tem grupo.{" "}
                          <Link to="/grupos" className="underline">
                            Criar um grupo
                          </Link>
                        </p>
                      ) : (
                        <select
                          id="grupo-solicitante"
                          value={grupoId}
                          onChange={(e) => setGrupoId(e.target.value)}
                          className="w-full border-b border-border bg-transparent py-2 focus:border-primary focus:outline-none"
                        >
                          <option value="">Selecione o grupo</option>
                          {meusGrupos.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.nome_grupo}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                  <div>
                    <label
                      htmlFor="mensagem-solicitacao"
                      className="mb-1 block font-mono text-[10px] uppercase text-secondary/50"
                    >
                      Mensagem (opcional)
                    </label>
                    <textarea
                      id="mensagem-solicitacao"
                      value={mensagem}
                      onChange={(e) => setMensagem(e.target.value)}
                      rows={3}
                      placeholder="Oi! Sou estudante de Engenharia e procuro vaga a partir do próximo mês..."
                      className="w-full border border-input bg-transparent p-3 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={enviando}
                    className="w-full bg-primary py-3 font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
                  >
                    {enviando ? "Enviando..." : "Enviar solicitação"}
                  </button>
                </form>
              )}
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
