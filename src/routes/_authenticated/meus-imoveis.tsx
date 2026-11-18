import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  aprovarChamado,
  buscarPessoas,
  listMeusImoveis,
  vincularMorador,
  type MeuImovel,
} from "@/lib/painel.functions";

export const Route = createFileRoute("/_authenticated/meus-imoveis")({
  head: () => ({
    meta: [
      { title: "Meus imóveis — Moradia Quixadá" },
      { name: "description", content: "Gerencie seus imóveis, vincule moradores e aprove anúncios de vagas." },
      { property: "og:title", content: "Meus imóveis — Moradia Quixadá" },
      { property: "og:description", content: "Painel do proprietário." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MeusImoveisPage,
});

function MeusImoveisPage() {
  const listar = useServerFn(listMeusImoveis);
  const q = useQuery({ queryKey: ["meus-imoveis"], queryFn: () => listar() });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-4xl uppercase md:text-5xl">Meus imóveis</h1>
          <Link to="/anunciar" className="bg-primary px-5 py-2.5 text-sm font-bold uppercase text-primary-foreground">
            Anunciar imóvel
          </Link>
        </div>
        {q.isLoading ? (
          <p className="mt-8 text-muted-foreground">Carregando...</p>
        ) : !q.data?.length ? (
          <p className="mt-8 text-muted-foreground">Você ainda não anunciou imóveis.</p>
        ) : (
          <div className="mt-8 space-y-6">
            {q.data.map((i) => (
              <ImovelCard key={i.id} imovel={i} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function ImovelCard({ imovel }: { imovel: MeuImovel }) {
  const qc = useQueryClient();
  const buscar = useServerFn(buscarPessoas);
  const vincular = useServerFn(vincularMorador);
  const aprovar = useServerFn(aprovarChamado);
  const [termo, setTermo] = useState("");
  const [achados, setAchados] = useState<{ id: string; nome: string }[]>([]);

  const recarregar = () => qc.invalidateQueries({ queryKey: ["meus-imoveis"] });

  return (
    <section className="border border-border p-5">
      <div className="flex flex-wrap justify-between gap-2">
        <Link to="/imoveis/$id" params={{ id: imovel.id }} className="font-display text-2xl uppercase hover:text-primary">
          {imovel.titulo}
        </Link>
        <span className="font-mono text-[10px] uppercase text-muted-foreground">
          {imovel.bairro} · {imovel.ocupado ? "ocupado" : "livre"} · {imovel.aceita_solicitacoes ? "anúncio aberto" : "anúncio fechado"}
        </span>
      </div>

      <div className="mt-4">
        <p className="font-mono text-[10px] uppercase text-muted-foreground">Moradores vinculados</p>
        {imovel.moradores.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum.</p>
        ) : (
          <ul className="mt-1 flex flex-wrap gap-2">
            {imovel.moradores.map((m) => (
              <li key={m.id}>
                <Link to="/perfil/$id" params={{ id: m.id }} className="border border-border px-2 py-1 text-sm">
                  {m.nome}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (termo.trim().length < 2) return;
            setAchados(await buscar({ data: { termo: termo.trim() } }));
          }}
        >
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Vincular quem já mora aqui (nome)"
            className="min-w-0 flex-1 border border-input bg-transparent px-3 py-2 text-sm"
          />
          <button className="border border-foreground px-4 text-xs font-bold uppercase">Buscar</button>
        </form>
        {achados.length > 0 && (
          <ul className="mt-2 space-y-1">
            {achados.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                {p.nome}
                <button
                  className="text-xs font-bold uppercase text-primary"
                  onClick={async () => {
                    try {
                      await vincular({ data: { imovel_id: imovel.id, usuario_id: p.id } });
                      toast.success(`${p.nome} vinculado ao imóvel.`);
                      setAchados([]);
                      setTermo("");
                      recarregar();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Erro ao vincular.");
                    }
                  }}
                >
                  Vincular
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5">
        <p className="font-mono text-[10px] uppercase text-muted-foreground">
          Anúncios de vagas dos moradores {!imovel.moradores_podem_recrutar && "(desativado neste imóvel)"}
        </p>
        {imovel.chamados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum anúncio.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {imovel.chamados.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 border border-border p-3 text-sm">
                <span>
                  <b>{c.autor_nome}</b> · até {c.vagas_procuradas} vaga(s): {c.mensagem}
                </span>
                <button
                  className={`px-3 py-1 text-xs font-bold uppercase ${c.aprovado ? "border border-foreground" : "bg-primary text-primary-foreground"}`}
                  onClick={async () => {
                    try {
                      await aprovar({ data: { chamado_id: c.id, aprovado: !c.aprovado } });
                      toast.success(c.aprovado ? "Anúncio ocultado." : "Anúncio aprovado e público.");
                      recarregar();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Erro.");
                    }
                  }}
                >
                  {c.aprovado ? "Ocultar" : "Aprovar"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
