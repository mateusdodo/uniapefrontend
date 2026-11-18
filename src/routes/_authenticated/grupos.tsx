import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Estrelas } from "@/components/estrelas";
import {
  adicionarMembro,
  buscarPessoas,
  createGrupo,
  listMeusGrupos,
  removerMembro,
} from "@/lib/painel.functions";

export const Route = createFileRoute("/_authenticated/grupos")({
  head: () => ({
    meta: [
      { title: "Meus grupos de moradia — Moradia Quixadá" },
      {
        name: "description",
        content:
          "Monte um grupo com seus amigos e solicite uma república inteira em Quixadá de uma vez só.",
      },
      { property: "og:title", content: "Meus grupos de moradia — Moradia Quixadá" },
      {
        property: "og:description",
        content: "Junte a galera e peça a casa inteira em uma única solicitação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GruposPage,
});

function GruposPage() {
  const queryClient = useQueryClient();
  const carregar = useServerFn(listMeusGrupos);
  const criar = useServerFn(createGrupo);
  const buscar = useServerFn(buscarPessoas);
  const adicionar = useServerFn(adicionarMembro);
  const remover = useServerFn(removerMembro);

  const [nome, setNome] = useState("");
  const [termo, setTermo] = useState("");
  const [grupoAtivo, setGrupoAtivo] = useState<string | null>(null);
  const [resultados, setResultados] = useState<
    { id: string; nome: string; media_estrelas: number; status_moradia: string | null }[]
  >([]);

  const grupos = useQuery({ queryKey: ["grupos"], queryFn: () => carregar({}) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["grupos"] });

  const criarMut = useMutation({
    mutationFn: (nome_grupo: string) => criar({ data: { nome_grupo } }),
    onSuccess: () => {
      setNome("");
      toast.success("Grupo criado!");
      void invalidate();
    },
    onError: () => toast.error("Não foi possível criar o grupo."),
  });

  async function procurar() {
    if (termo.trim().length < 2) return;
    try {
      setResultados(await buscar({ data: { termo: termo.trim() } }));
    } catch {
      toast.error("Não foi possível buscar pessoas.");
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
          Morar junto sai mais barato
        </p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-tight md:text-6xl">
          Meus grupos
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Monte a turma, adicione as pessoas e envie uma única solicitação para o dono do imóvel —
          ele vê a nota de todo mundo antes de aceitar.
        </p>

        <form
          className="mt-8 flex flex-col gap-3 border border-border p-5 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (nome.trim().length >= 2) criarMut.mutate(nome.trim());
          }}
        >
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do grupo (ex.: Galera da Computação)"
            className="flex-1 border-b border-border bg-transparent py-2 focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={criarMut.isPending}
            className="bg-primary px-6 py-3 text-sm font-bold uppercase tracking-tighter text-primary-foreground transition-colors hover:bg-foreground disabled:opacity-50"
          >
            Criar grupo
          </button>
        </form>

        <div className="mt-10 space-y-6">
          {grupos.isLoading && <p className="text-muted-foreground">Carregando…</p>}
          {grupos.data?.length === 0 && (
            <p className="border border-dashed border-border p-8 text-center text-muted-foreground">
              Você ainda não faz parte de nenhum grupo.
            </p>
          )}
          {grupos.data?.map((g) => (
            <section key={g.id} className="border border-border p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl uppercase tracking-tight">{g.nome_grupo}</h2>
                  <p className="font-mono text-xs uppercase text-muted-foreground">
                    {g.sou_lider ? "Você é o líder" : "Você é membro"} · {g.membros.length}{" "}
                    {g.membros.length === 1 ? "pessoa" : "pessoas"}
                  </p>
                </div>
                {g.sou_lider && (
                  <button
                    onClick={() => setGrupoAtivo(grupoAtivo === g.id ? null : g.id)}
                    className="border border-foreground px-4 py-2 text-xs font-bold uppercase tracking-tighter transition-colors hover:bg-foreground hover:text-background"
                  >
                    {grupoAtivo === g.id ? "Fechar" : "Adicionar pessoa"}
                  </button>
                )}
              </div>

              <ul className="mt-4 divide-y divide-border">
                {g.membros.map((m) => (
                  <li key={m.usuario_id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium">
                        {m.nome}
                        {m.usuario_id === g.lider_id && (
                          <span className="ml-2 bg-accent px-2 py-0.5 font-mono text-[10px] uppercase text-accent-foreground">
                            líder
                          </span>
                        )}
                      </p>
                      <Estrelas valor={m.media_estrelas} />
                    </div>
                    {(g.sou_lider || m.usuario_id === g.lider_id) &&
                      m.usuario_id !== g.lider_id && (
                        <button
                          onClick={async () => {
                            try {
                              await remover({
                                data: { grupo_id: g.id, usuario_id: m.usuario_id },
                              });
                              void invalidate();
                            } catch {
                              toast.error("Não foi possível remover.");
                            }
                          }}
                          className="font-mono text-[10px] uppercase text-muted-foreground hover:text-destructive"
                        >
                          remover
                        </button>
                      )}
                  </li>
                ))}
              </ul>

              {grupoAtivo === g.id && g.sou_lider && (
                <div className="mt-4 border-t border-dashed border-border pt-4">
                  <div className="flex gap-2">
                    <input
                      value={termo}
                      onChange={(e) => setTermo(e.target.value)}
                      placeholder="Buscar pelo nome da pessoa"
                      className="flex-1 border-b border-border bg-transparent py-2 focus:border-primary focus:outline-none"
                    />
                    <button
                      onClick={() => void procurar()}
                      className="bg-foreground px-4 py-2 text-xs font-bold uppercase tracking-tighter text-background"
                    >
                      Buscar
                    </button>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {resultados.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-3 bg-muted/40 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">{p.nome}</p>
                          <Estrelas valor={Number(p.media_estrelas)} />
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              await adicionar({ data: { grupo_id: g.id, usuario_id: p.id } });
                              toast.success(`${p.nome} entrou no grupo.`);
                              void invalidate();
                            } catch {
                              toast.error("Não foi possível adicionar.");
                            }
                          }}
                          className="font-mono text-[10px] uppercase text-primary"
                        >
                          adicionar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
