import { createFileRoute, Link } from "@tanstack/react-router";
import { BAIRROS_QUIXADA } from "@/lib/imovel-format";
import { useMemo, useRef, useState } from "react";
import { listImoveis } from "@/lib/moradia.functions";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TIPO_LABELS, formatPreco } from "@/lib/imovel-format";

export const Route = createFileRoute("/")({
  loader: () => listImoveis(),
  head: () => ({
    meta: [
      {
        title: "Moradia Quixadá — Repúblicas, quartos e kitnets para estudantes",
      },
      {
        name: "description",
        content:
          "Encontre sua vaga em Quixadá: repúblicas, quartos e kitnets perto da UFC, Unicatólica e IFCE. Solicite moradia individual ou em grupo.",
      },
      {
        property: "og:title",
        content: "Moradia Quixadá — Repúblicas, quartos e kitnets para estudantes",
      },
      {
        property: "og:description",
        content:
          "A plataforma feita por universitários para universitários em Quixadá. Do Cedro ao Planalto, sua nova casa está aqui.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type Filtros = {
  bairro: string;
  tipo: string;
  ate600: boolean;
  pertoUfc: boolean;
};

function Home() {
  const imoveis = Route.useLoaderData();
  const gridRef = useRef<HTMLDivElement>(null);
  const [filtros, setFiltros] = useState<Filtros>({
    bairro: "todos",
    tipo: "todos",
    ate600: false,
    pertoUfc: false,
  });

  const bairros = useMemo(
    () => Array.from(new Set([...BAIRROS_QUIXADA, ...imoveis.map((i) => i.bairro)])),
    [imoveis],
  );

  const filtrados = useMemo(
    () =>
      imoveis.filter((i) => {
        if (filtros.bairro !== "todos" && i.bairro !== filtros.bairro) return false;
        if (filtros.tipo !== "todos" && i.tipo !== filtros.tipo) return false;
        if (filtros.ate600 && i.preco_mensal > 600) return false;
        if (filtros.pertoUfc && !(i.proximidade ?? "").toLowerCase().includes("ufc"))
          return false;
        return true;
      }),
    [imoveis, filtros],
  );

  function verDisponiveis() {
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero — mural */}
      <header className="relative mx-auto max-w-7xl px-6 py-12 md:py-24">
        <div className="flex flex-col items-end gap-12 md:flex-row">
          <div className="flex-1 space-y-6 animate-reveal">
            <h1 className="font-display text-6xl uppercase leading-[0.9] text-balance md:text-8xl">
              Encontre sua <span className="text-primary">vaga</span> no coração do
              Ceará
            </h1>
            <p className="max-w-[45ch] text-lg text-pretty text-secondary/80">
              A plataforma feita por universitários para universitários em Quixadá. Do
              Cedro ao Planalto, sua nova casa está aqui.
            </p>
          </div>

          {/* Busca rápida — nota de mural */}
          <div className="w-full animate-pin border-t-4 border-primary bg-white p-6 shadow-xl [animation-delay:300ms] md:w-96">
            <h3 className="mb-4 font-display text-xl uppercase">Busca Rápida</h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="filtro-bairro"
                  className="mb-1 block font-mono text-[10px] uppercase text-secondary/50"
                >
                  Onde você quer morar?
                </label>
                <select
                  id="filtro-bairro"
                  value={filtros.bairro}
                  onChange={(e) =>
                    setFiltros((f) => ({ ...f, bairro: e.target.value }))
                  }
                  className="w-full border-b border-border bg-transparent py-2 focus:border-primary focus:outline-none"
                >
                  <option value="todos">Todos os bairros</option>
                  {bairros.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="filtro-tipo"
                  className="mb-1 block font-mono text-[10px] uppercase text-secondary/50"
                >
                  Tipo de moradia
                </label>
                <select
                  id="filtro-tipo"
                  value={filtros.tipo}
                  onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value }))}
                  className="w-full border-b border-border bg-transparent py-2 focus:border-primary focus:outline-none"
                >
                  <option value="todos">Qualquer tipo</option>
                  <option value="quarto">Quarto individual</option>
                  <option value="republica">República completa</option>
                  <option value="kitnet">Kitnet</option>
                </select>
              </div>
              <button
                onClick={verDisponiveis}
                className="w-full bg-primary py-4 font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110"
              >
                Ver Disponíveis
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Chips de filtro */}
      <section className="border-y border-border px-6 py-8">
        <div className="no-scrollbar mx-auto flex max-w-7xl gap-3 overflow-x-auto pb-2">
          <Chip
            ativo={true}
            onClick={() =>
              setFiltros({ bairro: "todos", tipo: "todos", ate600: false, pertoUfc: false })
            }
          >
            Tudo
          </Chip>
          <Chip
            ativo={filtros.pertoUfc}
            onClick={() => setFiltros((f) => ({ ...f, pertoUfc: !f.pertoUfc }))}
          >
            Próximo à UFC
          </Chip>
          <Chip
            ativo={filtros.ate600}
            onClick={() => setFiltros((f) => ({ ...f, ate600: !f.ate600 }))}
            destacado
          >
            Até R$ 600
          </Chip>
          <Chip
            ativo={filtros.tipo === "quarto"}
            onClick={() =>
              setFiltros((f) => ({ ...f, tipo: f.tipo === "quarto" ? "todos" : "quarto" }))
            }
          >
            Individual
          </Chip>
          <Chip
            ativo={filtros.tipo === "republica"}
            onClick={() =>
              setFiltros((f) => ({
                ...f,
                tipo: f.tipo === "republica" ? "todos" : "republica",
              }))
            }
          >
            República
          </Chip>
          <Chip
            ativo={filtros.tipo === "kitnet"}
            onClick={() =>
              setFiltros((f) => ({ ...f, tipo: f.tipo === "kitnet" ? "todos" : "kitnet" }))
            }
          >
            Kitnet
          </Chip>
        </div>
      </section>

      {/* Grid de imóveis */}
      <main className="mx-auto max-w-7xl px-6 py-12">
        <div ref={gridRef} className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-y-16 lg:grid-cols-3">
          {filtrados.map((imovel, idx) => (
            <ImovelCard key={imovel.id} imovel={imovel} delay={400 + idx * 100} />
          ))}
        </div>
        {filtrados.length === 0 && (
          <div className="border-t-4 border-primary bg-white p-10 text-center shadow-md">
            <h3 className="font-display text-2xl uppercase">Nenhuma vaga por aqui</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Tente outro bairro ou limpe os filtros no chip "Tudo".
            </p>
          </div>
        )}

        {/* CTA do anfitrião */}
        <section className="mt-24 flex flex-col items-center gap-12 bg-secondary p-8 text-background md:flex-row md:p-16">
          <div className="flex-1 space-y-6">
            <h2 className="font-display text-4xl uppercase leading-[0.9] md:text-6xl">
              Tem um quarto sobrando em <span className="text-accent">Quixadá</span>?
            </h2>
            <p className="max-w-[40ch] text-stone-300">
              Ajude a comunidade universitária e garanta uma renda extra. Publique seu
              anúncio em menos de 5 minutos.
            </p>
            <Link
              to="/anunciar"
              className="inline-block bg-primary px-8 py-4 font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-accent hover:text-accent-foreground"
            >
              Publicar Imóvel Agora
            </Link>
          </div>
          <div className="relative grid aspect-square w-full place-items-center border border-white/10 bg-white/5 md:w-1/3">
            <div className="absolute inset-4 border-2 border-dashed border-white/20" />
            <span className="font-mono text-sm uppercase opacity-40">Mural de Fotos</span>
          </div>
        </section>
      </main>

      {/* WhatsApp flutuante */}
      <a
        href="https://wa.me/5588999999999?text=Ol%C3%A1!%20Tenho%20d%C3%BAvidas%20sobre%20o%20Moradia%20Quixad%C3%A1."
        target="_blank"
        rel="noreferrer"
        className="group fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full bg-whatsapp p-4 text-white shadow-2xl transition-transform hover:scale-105"
      >
        <span className="ml-2 hidden font-bold text-sm group-hover:inline">
          Dúvidas? Fale conosco
        </span>
        <svg className="size-6 fill-white" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.625 1.432h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

      <SiteFooter />
    </div>
  );
}

function Chip({
  ativo,
  destacado,
  children,
  onClick,
}: {
  ativo?: boolean;
  destacado?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        ativo
          ? "whitespace-nowrap rounded-full border border-foreground bg-foreground px-4 py-1.5 text-xs font-bold text-background"
          : destacado
            ? "whitespace-nowrap rounded-full border border-border px-4 py-1.5 text-xs font-medium text-primary transition-colors hover:border-foreground"
            : "whitespace-nowrap rounded-full border border-border px-4 py-1.5 text-xs font-medium transition-colors hover:border-foreground"
      }
    >
      {children}
    </button>
  );
}

function badge(imovel: {
  status: string;
  quartos: number;
  ocupado: boolean;
  aceita_solicitacoes: boolean;
}): { texto: string; classe: string } {
  if (imovel.status !== "disponivel" || !imovel.aceita_solicitacoes)
    return { texto: "FECHADO", classe: "bg-secondary text-background" };
  if (imovel.ocupado) return { texto: "OCUPADO", classe: "bg-accent text-accent-foreground" };
  return {
    texto: `${imovel.quartos} QUARTO(S) · SUGESTÃO ${imovel.quartos} PESSOA(S)`,
    classe: "bg-primary text-primary-foreground",
  };
}

function ImovelCard({
  imovel,
  delay,
}: {
  imovel: {
    id: string;
    titulo: string;
    tipo: string;
    preco_mensal: number;
    bairro: string;
    proximidade: string | null;
    fotos: string[];
    status: string;
    quartos: number;
    ocupado: boolean;
    aceita_solicitacoes: boolean;
    media_estrelas: number;
    parada_ida_minutos?: number | null;
    proprietario_tem_documento: boolean;
  };
  delay: number;
}) {
  const b = badge(imovel);
  const foto = imovel.fotos?.[0];
  return (
    <Link
      to="/imoveis/$id"
      params={{ id: imovel.id }}
      className="group animate-reveal block"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative mb-4 aspect-[4/3] overflow-hidden bg-muted">
        {foto ? (
          <img
            src={foto}
            alt={`Foto do imóvel ${imovel.titulo}`}
            loading="lazy"
            width={1024}
            height={768}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center font-mono text-xs uppercase text-muted-foreground">
            Sem foto
          </div>
        )}
        <div className={`absolute left-3 top-3 px-2 py-1 font-mono text-[10px] font-bold ${b.classe}`}>
          {b.texto}
        </div>
        {!imovel.proprietario_tem_documento && (
          <div
            title="Este proprietário ainda não enviou a documentação de propriedade."
            className="absolute right-3 top-3 max-w-[55%] bg-amber-100 px-2 py-1 text-right font-mono text-[10px] font-bold text-amber-950"
          >
            ⚠️ Proprietário Não Verificado
          </div>
        )}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-background/90 px-3 py-1">
          <span className="text-primary">★</span>
          <span className="text-xs font-bold">{imovel.media_estrelas.toFixed(1)}</span>
        </div>
      </div>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-xl uppercase leading-tight transition-colors group-hover:text-primary">
            {imovel.titulo}
          </h3>
          <p className="font-mono text-sm text-secondary/60">
            {imovel.bairro}
            {imovel.proximidade ? ` • ${imovel.proximidade}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-xl text-primary">
            {formatPreco(Number(imovel.preco_mensal))}
          </p>
          <p className="text-[10px] font-bold uppercase text-secondary/40">/ mensal</p>
        </div>
      </div>
      <p className="mt-1 font-mono text-[10px] uppercase text-secondary/40">
        {TIPO_LABELS[imovel.tipo] ?? imovel.tipo}
        {imovel.parada_ida_minutos != null
          ? ` • ${imovel.parada_ida_minutos} min a pé do ônibus`
          : ""}
      </p>
    </Link>
  );
}
