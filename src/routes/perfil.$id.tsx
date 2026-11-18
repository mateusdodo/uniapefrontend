import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Estrelas } from "@/components/estrelas";
import { Avatar } from "@/components/avatar-pessoa";
import { getPerfilPublico } from "@/lib/usuarios.functions";
import { linkWhatsapp } from "@/lib/whatsapp";

const perfilQuery = (id: string) =>
  queryOptions({ queryKey: ["perfil-publico", id], queryFn: () => getPerfilPublico({ data: { id } }) });

export const Route = createFileRoute("/perfil/$id")({
  loader: async ({ context, params }) => {
    const p = await context.queryClient.ensureQueryData(perfilQuery(params.id));
    if (!p) throw notFound();
    return { nome: p.usuario.nome };
  },
  head: ({ loaderData }) => {
    const t = loaderData ? `${loaderData.nome} — Moradia Quixadá` : "Perfil — Moradia Quixadá";
    return {
      meta: [
        { title: t },
        { name: "description", content: "Perfil público com avaliações e imóveis no Moradia Quixadá." },
        { property: "og:title", content: t },
        { property: "og:description", content: "Avaliações e contato no Moradia Quixadá." },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  errorComponent: ({ error }) => <div className="p-10">Erro: {error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => (
    <div className="p-10">
      Perfil não encontrado. <Link to="/usuarios" search={{ q: "", tipo: "todos" }} className="underline">Voltar</Link>
    </div>
  ),
  component: PerfilPage,
});

function PerfilPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(perfilQuery(id));
  if (!data) return null;
  const { usuario: u, avaliacoes, imoveis } = data;
  const souProp = u.tipo_conta === "proprietario";
  const wa = linkWhatsapp(
    u.telefone,
    souProp
      ? `Olá, ${u.nome.split(" ")[0]}! Vi seus imóveis no Moradia Quixadá e gostaria de conversar.`
      : `Olá, ${u.nome.split(" ")[0]}! Vi seu perfil no Moradia Quixadá e queria conversar sobre moradia.`,
  );

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <Avatar nome={u.nome} url={u.avatar_url} grande />
          <div className="flex-1">
            <h1 className="font-display text-4xl uppercase">{u.nome}</h1>
            <p className="mt-1 font-mono text-xs uppercase text-muted-foreground">
              {souProp ? "Proprietário" : "Inquilino"}
              {u.verificado && " · ✓ verificado"}
              {u.status_moradia === "morando" && " · mora em um imóvel"}
            </p>
            <div className="mt-2">
              <Estrelas valor={u.total_avaliacoes >= 2 ? Number(u.media_estrelas) : 0} size="text-xl" />
              <span className="ml-2 text-xs text-muted-foreground">{u.total_avaliacoes} avaliações</span>
            </div>
          </div>
          {wa ? (
            <a href={wa} target="_blank" rel="noreferrer" className="bg-primary px-6 py-3 font-bold uppercase text-primary-foreground">
              Chamar no WhatsApp
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">Sem WhatsApp cadastrado</span>
          )}
        </div>

        {imoveis.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl uppercase">Imóveis</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {imoveis.map((i) => (
                <li key={i.id}>
                  <Link to="/imoveis/$id" params={{ id: i.id }} className="block border border-border p-4 hover:border-primary">
                    <p className="font-bold">{i.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {i.bairro} · R$ {i.preco_mensal.toLocaleString("pt-BR")}/mês {i.ocupado && "· ocupado"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-12">
          <h2 className="font-display text-2xl uppercase">Avaliações</h2>
          {avaliacoes.length === 0 ? (
            <p className="mt-3 text-muted-foreground">Ainda sem avaliações publicadas.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {avaliacoes.map((a) => (
                <li key={a.id} className="border border-border p-4">
                  <div className="flex justify-between">
                    <Estrelas valor={a.estrelas} />
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {a.comentario && <p className="mt-2 text-sm">“{a.comentario}”</p>}
                  <p className="mt-1 text-xs text-muted-foreground">— {a.avaliador_nome}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
