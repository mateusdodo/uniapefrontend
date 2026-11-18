import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { whatsappLink } from "@/lib/imovel-format";
import {
  avaliarMoradia,
  confirmarEncerramento,
  contestarEncerramento,
  criarChamado,
  listMinhasMoradias,
  pedirEncerramento,
  type MoradiaItem,
} from "@/lib/painel.functions";

export const Route = createFileRoute("/_authenticated/moradia")({
  head: () => ({
    meta: [
      { title: "Minha moradia — Moradia Quixadá" },
      {
        name: "description",
        content: "Veja onde você mora, quem mora nos seus imóveis, encerre moradias e avalie o outro lado.",
      },
      { property: "og:title", content: "Minha moradia — Moradia Quixadá" },
      { property: "og:description", content: "Moradias ativas, saídas confirmadas e avaliações justas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MoradiaPage,
});

const STATUS: Record<MoradiaItem["status"], string> = {
  ativa: "Morando",
  encerramento_solicitado: "Saída pedida",
  encerrada: "Encerrada",
};

function dias(iso: string | null, soma: number) {
  if (!iso) return 0;
  const alvo = new Date(iso).getTime() + soma * 86400000;
  return Math.max(0, Math.ceil((alvo - Date.now()) / 86400000));
}

function MoradiaCard({ m, meuId, onChange }: { m: MoradiaItem; meuId: string | null; onChange: () => void }) {
  const pedir = useServerFn(pedirEncerramento);
  const confirmar = useServerFn(confirmarEncerramento);
  const contestar = useServerFn(contestarEncerramento);
  const avaliar = useServerFn(avaliarMoradia);
  const chamar = useServerFn(criarChamado);

  const [estrelas, setEstrelas] = useState(5);
  const [comentario, setComentario] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [chamadoTxt, setChamadoTxt] = useState("");
  const [chamadoVagas, setChamadoVagas] = useState("1");

  const acao = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível agora.");
    }
  };

  const pediuEu = m.encerramento_pedido_por === meuId;
  const outroLado = m.sou_proprietario ? m.moradores : m.proprietario ? [m.proprietario] : [];
  const faltaAvaliar = outroLado.filter((p) => !m.ja_avaliei.includes(p.id));
  const janelaAberta = m.status === "encerrada" && dias(m.avaliacao_janela_fim, 0) > 0;
  const contatos = outroLado.filter((p) => p.telefone);

  return (
    <article className="border border-border p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl uppercase">{m.imovel?.titulo ?? "Imóvel"}</h2>
          <p className="font-mono text-xs uppercase text-muted-foreground">
            {m.imovel?.bairro} · desde {new Date(m.inicio).toLocaleDateString("pt-BR")}
            {m.fim ? ` até ${new Date(m.fim).toLocaleDateString("pt-BR")}` : ""} ·{" "}
            {m.sou_proprietario ? "você é o dono" : "você mora aqui"}
          </p>
        </div>
        <span className="bg-muted px-2 py-1 font-mono text-[10px] uppercase">{STATUS[m.status]}</span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="font-mono text-[10px] uppercase text-muted-foreground">Proprietário</p>
          <p className="text-sm">{m.proprietario?.nome}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase text-muted-foreground">Moradores</p>
          <p className="text-sm">{m.moradores.map((p) => p.nome).join(", ") || "—"}</p>
        </div>
      </div>

      {m.status !== "encerrada" && (
        <div className="mt-5 flex flex-wrap gap-3">
          {m.whatsapp_url && (
            <a href={m.whatsapp_url} target="_blank" rel="noreferrer" className="bg-whatsapp px-5 py-2 text-xs font-bold uppercase text-white">
              Grupo da casa no WhatsApp
            </a>
          )}
          {contatos.slice(0, 1).map((p) => (
            <a
              key={p.id}
              href={whatsappLink(p.telefone, m.imovel?.titulo ?? "moradia") ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="border border-foreground px-5 py-2 text-xs font-bold uppercase"
            >
              Entrar em contato
            </a>
          ))}
        </div>
      )}

      {/* Encerramento confirmado pelos dois lados */}
      <div className="mt-6 border-t border-border pt-4">
        {m.status === "ativa" && (
          <button
            onClick={() => acao(() => pedir({ data: { moradia_id: m.id } }), "Pedido de saída enviado ao outro lado.")}
            className="font-mono text-[10px] uppercase text-muted-foreground hover:text-destructive"
          >
            pedir encerramento da moradia
          </button>
        )}
        {m.status === "encerramento_solicitado" &&
          (pediuEu ? (
            <p className="text-sm text-muted-foreground">
              Você pediu o encerramento. Aguardando o outro lado confirmar — encerra sozinho em{" "}
              {dias(m.encerramento_pedido_em, 7)} dia(s).
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">
                O outro lado pediu o encerramento. Se não responder, encerra em{" "}
                {dias(m.encerramento_pedido_em, 7)} dia(s).
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => acao(() => confirmar({ data: { moradia_id: m.id } }), "Saída confirmada. Avaliações liberadas.")}
                  className="bg-primary px-5 py-2 text-xs font-bold uppercase text-primary-foreground"
                >
                  Confirmar saída
                </button>
                <button
                  onClick={() => acao(() => contestar({ data: { moradia_id: m.id } }), "Moradia continua ativa.")}
                  className="border border-foreground px-5 py-2 text-xs font-bold uppercase"
                >
                  Ainda moramos aqui
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Chamado por novos moradores */}
      {m.sou_responsavel && m.status === "ativa" && m.imovel?.moradores_podem_recrutar && (
        <div className="mt-6 border-t border-border pt-4">
          <p className="font-mono text-[10px] uppercase text-muted-foreground">Divulgação · só o morador principal publica · defina o limite de vagas (aprovação do proprietário)</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={chamadoTxt}
              onChange={(e) => setChamadoTxt(e.target.value)}
              placeholder="Ex.: procuramos 1 pessoa tranquila, curso de computação"
              className="flex-1 border border-input bg-transparent px-3 py-2 text-sm"
            />
            <input
              value={chamadoVagas}
              onChange={(e) => setChamadoVagas(e.target.value)}
              inputMode="numeric"
              aria-label="Limite máximo de vagas"
              title="Limite máximo de vagas"
              className="w-20 border border-input bg-transparent px-3 py-2 text-sm"
            />
            <button
              onClick={() =>
                acao(
                  () =>
                    chamar({
                      data: { moradia_id: m.id, mensagem: chamadoTxt, vagas_procuradas: Number(chamadoVagas) || 1 },
                    }).then(() => setChamadoTxt("")),
                  "Enviado! Aparece no anúncio quando o proprietário aprovar.",
                )
              }
              className="bg-foreground px-5 py-2 text-xs font-bold uppercase text-background"
            >
              Publicar
            </button>
          </div>
        </div>
      )}

      {/* Avaliação às cegas */}
      {m.status === "encerrada" && (
        <div className="mt-6 border-t border-border pt-4">
          {janelaAberta && faltaAvaliar.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm">
                Avalie {m.sou_proprietario ? "os moradores" : "o proprietário"} — faltam{" "}
                {dias(m.avaliacao_janela_fim, 0)} dia(s). A nota fica oculta até os dois avaliarem.
              </p>
              {m.sou_proprietario && (
                <div className="flex flex-wrap gap-2">
                  {faltaAvaliar.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 border border-border px-3 py-1 text-sm">
                      <input
                        type="checkbox"
                        checked={selecionados.includes(p.id)}
                        onChange={(e) =>
                          setSelecionados((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))
                        }
                      />
                      {p.nome}
                    </label>
                  ))}
                  <button
                    onClick={() => setSelecionados(faltaAvaliar.map((p) => p.id))}
                    className="font-mono text-[10px] uppercase text-primary"
                  >
                    todos (mesma nota)
                  </button>
                </div>
              )}
              <div className="flex gap-1 text-2xl" role="radiogroup" aria-label="Estrelas">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" aria-label={`${n} estrelas`} onClick={() => setEstrelas(n)} className={n <= estrelas ? "text-primary" : "text-border"}>
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={2}
                placeholder="Como foi a convivência?"
                className="w-full border border-input bg-transparent p-3 text-sm"
              />
              <button
                onClick={() =>
                  acao(
                    () =>
                      avaliar({
                        data: {
                          moradia_id: m.id,
                          avaliados: m.sou_proprietario ? selecionados : faltaAvaliar.map((p) => p.id),
                          estrelas,
                          comentario,
                        },
                      }).then(() => {
                        setSelecionados([]);
                        setComentario("");
                      }),
                    "Avaliação enviada!",
                  )
                }
                className="bg-primary px-5 py-2 text-xs font-bold uppercase text-primary-foreground"
              >
                Enviar avaliação
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {faltaAvaliar.length === 0 ? "Você já avaliou." : "O prazo para avaliar terminou."}
            </p>
          )}

          <div className="mt-4">
            <p className="font-mono text-[10px] uppercase text-muted-foreground">Avaliações que você recebeu</p>
            {m.recebidas.map((a, i) => (
              <p key={i} className="mt-1 text-sm">
                <span className="text-primary">{"★".repeat(a.estrelas)}</span> {a.avaliador_nome}
                {a.comentario ? ` — “${a.comentario}”` : ""}
              </p>
            ))}
            {m.recebidas_ocultas > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {m.recebidas_ocultas} avaliação(ões) oculta(s) — avalie para ver, ou aguarde o fim do prazo.
              </p>
            )}
            {m.recebidas.length === 0 && m.recebidas_ocultas === 0 && (
              <p className="mt-1 text-sm text-muted-foreground">Nenhuma ainda.</p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function MoradiaPage() {
  const qc = useQueryClient();
  const carregar = useServerFn(listMinhasMoradias);
  const q = useQuery({ queryKey: ["moradias"], queryFn: () => carregar() });
  const { user } = Route.useRouteContext() as { user?: { id: string } };
  const lista = q.data ?? [];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Onde eu moro · quem mora no que é meu</p>
        <h1 className="mt-2 font-display text-4xl uppercase md:text-6xl">Minha moradia</h1>
        <div className="mt-8 space-y-6">
          {q.isLoading && <p className="text-muted-foreground">Carregando…</p>}
          {!q.isLoading && lista.length === 0 && (
            <p className="border border-dashed border-border p-8 text-center text-muted-foreground">
              Nenhuma moradia ainda. Quando uma solicitação for aceita, ela aparece aqui.{" "}
              <Link to="/" className="text-primary underline">Ver imóveis</Link>
            </p>
          )}
          {lista.map((m) => (
            <MoradiaCard
              key={m.id}
              m={m}
              meuId={user?.id ?? null}
              onChange={() => void qc.invalidateQueries({ queryKey: ["moradias"] })}
            />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
