import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Estrelas } from "@/components/estrelas";
import { formatPreco, whatsappLink } from "@/lib/imovel-format";
import {
  cancelarSolicitacao,
  listSolicitacoes,
  responderSolicitacao,
  type SolicitacaoItem,
} from "@/lib/painel.functions";

export const Route = createFileRoute("/_authenticated/solicitacoes")({
  head: () => ({
    meta: [
      { title: "Solicitações de moradia — Moradia Quixadá" },
      {
        name: "description",
        content:
          "Acompanhe pedidos de vaga recebidos e enviados, veja as estrelas de cada candidato e aceite quem combina com a casa.",
      },
      { property: "og:title", content: "Solicitações de moradia — Moradia Quixadá" },
      {
        property: "og:description",
        content: "Aceite ou recuse pedidos de vaga com base na reputação de cada estudante.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SolicitacoesPage,
});

const STATUS_LABEL: Record<string, string> = {
  pendente: "Aguardando resposta",
  aceita: "Aceita",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

function StatusTag({ status }: { status: string }) {
  const cor =
    status === "aceita"
      ? "bg-accent text-accent-foreground"
      : status === "pendente"
        ? "bg-muted text-foreground"
        : "bg-foreground text-background";
  return (
    <span className={`px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${cor}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function SolicitacaoCard({
  s,
  modo,
  onResponder,
  onCancelar,
}: {
  s: SolicitacaoItem;
  modo: "recebida" | "enviada";
  onResponder: (decisao: "aceita" | "recusada", whatsapp?: string) => void;
  onCancelar: () => void;
}) {
  const [grupoWa, setGrupoWa] = useState("");
  const wa = s.contato?.telefone_outro_lado
    ? whatsappLink(s.contato.telefone_outro_lado, s.imovel?.titulo ?? "vaga")
    : null;

  return (
    <article className="border border-border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl uppercase tracking-tight">
            {s.imovel?.titulo ?? "Imóvel"}
          </h3>
          <p className="font-mono text-xs uppercase text-muted-foreground">
            {s.imovel?.bairro} · {s.imovel ? formatPreco(Number(s.imovel.preco_mensal)) : ""}/mês ·{" "}
            {s.tipo_solicitante === "grupo" ? "pedido em grupo" : "pedido individual"}
          </p>
        </div>
        <StatusTag status={s.status} />
      </div>

      {modo === "recebida" && s.solicitante && (
        <div className="mt-4 bg-muted/40 p-3">
          <p className="text-sm font-medium">{s.solicitante.nome}</p>
          <Estrelas valor={s.solicitante.total_avaliacoes >= 2 ? Number(s.solicitante.media_estrelas) : 0} />
          {s.solicitante.total_avaliacoes < 2 && <span className="font-mono text-[10px] uppercase text-muted-foreground">novo</span>}
          {s.grupo && (
            <p className="mt-2 font-mono text-[10px] uppercase text-muted-foreground">
              Grupo: {s.grupo.nome_grupo}
            </p>
          )}
          {s.grupo_membros.length > 0 && (
            <ul className="mt-1 space-y-1">
              {s.grupo_membros.map((m) => (
                <li key={m.nome} className="flex items-center gap-2 text-sm">
                  <span>{m.nome}</span>
                  <Estrelas valor={m.media_estrelas} size="text-xs" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {s.mensagem && <p className="mt-3 text-sm text-muted-foreground">“{s.mensagem}”</p>}

      <div className="mt-4 flex flex-wrap gap-3">
        {modo === "recebida" && s.status === "pendente" && (
          <>
            <input
              value={grupoWa}
              onChange={(e) => setGrupoWa(e.target.value)}
              placeholder="Link do grupo de WhatsApp (opcional)"
              className="w-full border border-input bg-transparent px-3 py-2 text-sm"
            />
            <p className="w-full font-mono text-[10px] uppercase text-muted-foreground">
              Sem grupo? Crie no WhatsApp (Novo grupo → adicione os moradores) ou deixe vazio e
              eles recebem só o seu número.
            </p>
            <button
              onClick={() => onResponder("aceita", grupoWa.trim() || undefined)}
              className="bg-primary px-5 py-2 text-xs font-bold uppercase tracking-tighter text-primary-foreground transition-colors hover:bg-foreground"
            >
              Aceitar
            </button>
            <button
              onClick={() => onResponder("recusada")}
              className="border border-foreground px-5 py-2 text-xs font-bold uppercase tracking-tighter transition-colors hover:bg-foreground hover:text-background"
            >
              Recusar
            </button>
          </>
        )}
        {s.status === "aceita" && s.contato?.whatsapp_grupo && (
          <a
            href={s.contato.whatsapp_grupo}
            target="_blank"
            rel="noreferrer"
            className="bg-whatsapp px-5 py-2 text-xs font-bold uppercase tracking-tighter text-white"
          >
            Entrar no grupo
          </a>
        )}
        {s.status === "aceita" && wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="border border-foreground px-5 py-2 text-xs font-bold uppercase tracking-tighter"
          >
            Entrar em contato
          </a>
        )}
        {modo === "enviada" && s.status === "pendente" && (
          <button
            onClick={onCancelar}
            className="font-mono text-[10px] uppercase text-muted-foreground hover:text-destructive"
          >
            cancelar pedido
          </button>
        )}
        {s.imovel && (
          <Link
            to="/imoveis/$id"
            params={{ id: s.imovel.id }}
            className="font-mono text-[10px] uppercase text-primary underline-offset-4 hover:underline"
          >
            ver imóvel
          </Link>
        )}
      </div>
    </article>
  );
}

function SolicitacoesPage() {
  const queryClient = useQueryClient();
  const carregar = useServerFn(listSolicitacoes);
  const responder = useServerFn(responderSolicitacao);
  const cancelar = useServerFn(cancelarSolicitacao);
  const [aba, setAba] = useState<"recebidas" | "enviadas">("recebidas");

  const q = useQuery({ queryKey: ["solicitacoes"], queryFn: () => carregar({}) });
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["solicitacoes"] });
    void queryClient.invalidateQueries({ queryKey: ["moradias"] });
  };

  const lista = aba === "recebidas" ? (q.data?.recebidas ?? []) : (q.data?.enviadas ?? []);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
          Quem entra na casa
        </p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-tight md:text-6xl">
          Solicitações
        </h1>

        <div className="mt-6 flex gap-2">
          {(["recebidas", "enviadas"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setAba(k)}
              className={`px-5 py-2 text-xs font-bold uppercase tracking-tighter transition-colors ${
                aba === k
                  ? "bg-foreground text-background"
                  : "border border-border hover:border-foreground"
              }`}
            >
              {k === "recebidas" ? "Recebidas (meus imóveis)" : "Enviadas por mim"}
            </button>
          ))}
        </div>

        <div className="mt-8 space-y-5">
          {q.isLoading && <p className="text-muted-foreground">Carregando…</p>}
          {!q.isLoading && lista.length === 0 && (
            <p className="border border-dashed border-border p-8 text-center text-muted-foreground">
              Nada por aqui ainda.
            </p>
          )}
          {lista.map((s) => (
            <SolicitacaoCard
              key={s.id}
              s={s}
              modo={aba === "recebidas" ? "recebida" : "enviada"}
              onResponder={async (decisao, whatsapp) => {
                try {
                  await responder({
                    data: { solicitacao_id: s.id, decisao, whatsapp_url: whatsapp ?? null },
                  });
                  toast.success(
                    decisao === "aceita"
                      ? "Aceita! A moradia foi registrada."
                      : "Solicitação recusada.",
                  );
                  invalidate();
                } catch {
                  toast.error("Não foi possível responder agora.");
                }
              }}
              onCancelar={async () => {
                try {
                  await cancelar({ data: { solicitacao_id: s.id } });
                  invalidate();
                } catch {
                  toast.error("Não foi possível cancelar.");
                }
              }}
            />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
