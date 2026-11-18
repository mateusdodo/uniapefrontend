import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Estrelas } from "@/components/estrelas";
import { listUsuarios } from "@/lib/usuarios.functions";
import { linkWhatsapp } from "@/lib/whatsapp";
import { Avatar } from "@/components/avatar-pessoa";

const searchSchema = z.object({
  q: z.string().catch(""),
  tipo: z.enum(["todos", "comum", "proprietario"]).catch("todos"),
});

const usuariosQuery = (q: string, tipo: "todos" | "comum" | "proprietario") =>
  queryOptions({
    queryKey: ["usuarios", q, tipo],
    queryFn: () => listUsuarios({ data: { q, tipo } }),
  });

export const Route = createFileRoute("/usuarios")({
  validateSearch: (s) => searchSchema.parse(s),
  loaderDeps: ({ search }) => ({ q: search.q, tipo: search.tipo }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(usuariosQuery(deps.q, deps.tipo)),
  head: () => ({
    meta: [
      { title: "Pessoas — Moradia Quixadá" },
      { name: "description", content: "Encontre inquilinos e proprietários em Quixadá, veja as estrelas e chame no WhatsApp." },
      { property: "og:title", content: "Pessoas — Moradia Quixadá" },
      { property: "og:description", content: "Diretório de inquilinos e proprietários com avaliações." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: ({ error }) => <div className="p-10">Erro: {error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-10">Nada encontrado.</div>,
  component: UsuariosPage,
});

function UsuariosPage() {
  const { q, tipo } = Route.useSearch();
  const navigate = useNavigate({ from: "/usuarios" });
  const { data } = useSuspenseQuery(usuariosQuery(q, tipo));
  const [termo, setTermo] = useState(q);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-display text-4xl uppercase md:text-5xl">Pessoas</h1>
        <p className="mt-2 text-muted-foreground">Colegas de casa e proprietários de Quixadá.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ search: (p) => ({ ...p, q: termo }) });
          }}
          className="mt-6 flex flex-wrap gap-3"
        >
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar por nome"
            className="min-w-0 flex-1 border border-input bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
          <select
            value={tipo}
            onChange={(e) => navigate({ search: (p) => ({ ...p, tipo: e.target.value as typeof tipo }) })}
            className="border border-input bg-background px-3 py-2.5 text-sm"
          >
            <option value="todos">Todos</option>
            <option value="comum">Inquilinos</option>
            <option value="proprietario">Proprietários</option>
          </select>
          <button className="bg-primary px-5 py-2.5 text-sm font-bold uppercase text-primary-foreground">Buscar</button>
        </form>

        {data.length === 0 ? (
          <p className="mt-10 text-muted-foreground">Ninguém encontrado.</p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((u) => {
              const wa = linkWhatsapp(u.telefone, `Olá, ${u.nome.split(" ")[0]}! Vi seu perfil no Moradia Quixadá.`);
              return (
                <li key={u.id} className="flex flex-col border border-border p-5">
                  <Link to="/perfil/$id" params={{ id: u.id }} className="flex items-center gap-3">
                    <Avatar nome={u.nome} url={u.avatar_url} />
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg uppercase">{u.nome}</p>
                      <p className="font-mono text-[10px] uppercase text-muted-foreground">
                        {u.tipo_conta === "proprietario" ? "Proprietário" : "Inquilino"}
                        {u.verificado && " · ✓ verificado"}
                      </p>
                    </div>
                  </Link>
                  <div className="mt-3">
                    <Estrelas valor={u.total_avaliacoes >= 2 ? Number(u.media_estrelas) : 0} />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link
                      to="/perfil/$id"
                      params={{ id: u.id }}
                      className="flex-1 border border-foreground py-2 text-center text-xs font-bold uppercase"
                    >
                      Ver perfil
                    </Link>
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 bg-primary py-2 text-center text-xs font-bold uppercase text-primary-foreground"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
