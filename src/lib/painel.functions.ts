import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { viaApi, LOCAL } from "./api-proxy";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ---------------------------------- Grupos --------------------------------- */

export type GrupoMembro = {
  usuario_id: string;
  nome: string;
  telefone: string | null;
  media_estrelas: number;
  status_moradia: string | null;
};

export type GrupoDetalhe = {
  id: string;
  nome_grupo: string;
  lider_id: string;
  sou_lider: boolean;
  membros: GrupoMembro[];
};

export const listMeusGrupos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<GrupoDetalhe[]> => {
    { const r = await viaApi("listMeusGrupos", data); if (r !== LOCAL) return r as never; }
    const { data: vinculos } = await context.supabase
      .from("grupo_membros")
      .select("grupo_id")
      .eq("usuario_id", context.userId);

    const ids = (vinculos ?? []).map((v) => v.grupo_id);

    const { data: grupos, error } = await context.supabase
      .from("grupos")
      .select("id,nome_grupo,lider_id")
      .or(
        ids.length > 0
          ? `lider_id.eq.${context.userId},id.in.(${ids.join(",")})`
          : `lider_id.eq.${context.userId}`,
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!grupos || grupos.length === 0) return [];

    const { data: membros } = await context.supabase
      .from("grupo_membros")
      .select(
        "grupo_id,usuario_id,profiles!grupo_membros_usuario_id_fkey(nome,telefone,media_estrelas,status_moradia)",
      )
      .in(
        "grupo_id",
        grupos.map((g) => g.id),
      );

    return grupos.map((g) => ({
      id: g.id,
      nome_grupo: g.nome_grupo,
      lider_id: g.lider_id,
      sou_lider: g.lider_id === context.userId,
      membros: (membros ?? [])
        .filter((m) => m.grupo_id === g.id)
        .map((m) => {
          const p = m.profiles as unknown as {
            nome: string;
            telefone: string | null;
            media_estrelas: number;
            status_moradia: string | null;
          } | null;
          return {
            usuario_id: m.usuario_id,
            nome: p?.nome ?? "Membro",
            telefone: p?.telefone ?? null,
            media_estrelas: Number(p?.media_estrelas ?? 0),
            status_moradia: p?.status_moradia ?? null,
          };
        }),
    }));
  });

export const createGrupo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ nome_grupo: z.string().min(2).max(80) }).parse(data))
  .handler(async ({ data, context }) => {
    { const r = await viaApi("createGrupo", data); if (r !== LOCAL) return r as never; }
    const { data: grupo, error } = await context.supabase
      .from("grupos")
      .insert({ nome_grupo: data.nome_grupo, lider_id: context.userId })
      .select("id")
      .single();
    if (error) throw error;
    await context.supabase
      .from("grupo_membros")
      .insert({ grupo_id: grupo.id, usuario_id: context.userId });
    return grupo as { id: string };
  });

export const buscarPessoas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ termo: z.string().min(2).max(80) }).parse(data))
  .handler(async ({ data, context }) => {
    { const r = await viaApi("buscarPessoas", data); if (r !== LOCAL) return r as never; }
    const { data: pessoas, error } = await context.supabase
      .from("profiles")
      .select("id,nome,media_estrelas,status_moradia")
      .ilike("nome", `%${data.termo}%`)
      .neq("id", context.userId)
      .limit(8);
    if (error) throw error;
    return (pessoas ?? []) as {
      id: string;
      nome: string;
      media_estrelas: number;
      status_moradia: string | null;
    }[];
  });

export const adicionarMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ grupo_id: z.string().uuid(), usuario_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    { const r = await viaApi("adicionarMembro", data); if (r !== LOCAL) return r as never; }
    const { data: grupo } = await context.supabase
      .from("grupos")
      .select("id,lider_id")
      .eq("id", data.grupo_id)
      .maybeSingle();
    if (!grupo || grupo.lider_id !== context.userId) {
      throw new Error("Apenas o líder pode adicionar membros ao grupo.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("grupo_membros")
      .upsert(
        { grupo_id: data.grupo_id, usuario_id: data.usuario_id },
        { onConflict: "grupo_id,usuario_id" },
      );
    if (error) throw error;
    return { ok: true };
  });

export const removerMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ grupo_id: z.string().uuid(), usuario_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    { const r = await viaApi("removerMembro", data); if (r !== LOCAL) return r as never; }
    const { data: grupo } = await context.supabase
      .from("grupos")
      .select("id,lider_id")
      .eq("id", data.grupo_id)
      .maybeSingle();
    const souLider = grupo?.lider_id === context.userId;
    if (!souLider && data.usuario_id !== context.userId) {
      throw new Error("Sem permissão para remover este membro.");
    }
    if (souLider && data.usuario_id === context.userId) {
      throw new Error("O líder não pode sair do próprio grupo.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("grupo_membros")
      .delete()
      .eq("grupo_id", data.grupo_id)
      .eq("usuario_id", data.usuario_id);
    if (error) throw error;
    return { ok: true };
  });


/* ------------------------------- Solicitações ------------------------------- */

export type SolicitacaoItem = {
  id: string;
  status: "pendente" | "aceita" | "recusada" | "cancelada";
  mensagem: string;
  tipo_solicitante: "individual" | "grupo";
  created_at: string;
  imovel: {
    id: string;
    titulo: string;
    bairro: string;
    preco_mensal: number;
    quartos: number;
    proprietario_id: string;
  } | null;
  solicitante: {
    id: string;
    nome: string;
    telefone: string | null;
    media_estrelas: number;
    total_avaliacoes: number;
  } | null;
  grupo: { id: string; nome_grupo: string } | null;
  grupo_membros: { nome: string; media_estrelas: number; total_avaliacoes: number }[];
  /** Contato liberado após o aceite */
  contato: { whatsapp_grupo: string | null; telefone_outro_lado: string | null } | null;
};

const SOLICITACAO_SELECT =
  "id,status,mensagem,tipo_solicitante,created_at,grupo_id,imovel_id,imovel:imoveis!solicitacoes_imovel_id_fkey(id,titulo,bairro,preco_mensal,quartos,proprietario_id,contato_whatsapp,proprietario:profiles!imoveis_proprietario_id_fkey(telefone)),solicitante:profiles!solicitacoes_solicitante_id_fkey(id,nome,telefone,media_estrelas,total_avaliacoes),grupo:grupos!solicitacoes_grupo_id_fkey(id,nome_grupo)";

export const listSolicitacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: __in, context }) => {
    { const r = await viaApi("listSolicitacoes", __in); if (r !== LOCAL) return r as never; }
    const { data, error } = await context.supabase
      .from("solicitacoes")
      .select(SOLICITACAO_SELECT)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as any[];

    const grupoIds = rows.map((r) => r.grupo_id).filter(Boolean);
    let membros: any[] = [];
    if (grupoIds.length > 0) {
      const { data: m } = await context.supabase
        .from("grupo_membros")
        .select(
          "grupo_id,profiles!grupo_membros_usuario_id_fkey(nome,media_estrelas,total_avaliacoes)",
        )
        .in("grupo_id", grupoIds);
      membros = m ?? [];
    }

    // moradias visíveis (para link do grupo de WhatsApp)
    const { data: moradias } = await context.supabase
      .from("moradias")
      .select("imovel_id,responsavel_id,whatsapp_url,status");

    const todas: SolicitacaoItem[] = rows.map((r) => {
      const souDono = r.imovel?.proprietario_id === context.userId;
      const moradia = (moradias ?? []).find(
        (m: any) => m.imovel_id === r.imovel_id && m.responsavel_id === r.solicitante?.id,
      );
      const telDono = r.imovel?.contato_whatsapp || r.imovel?.proprietario?.telefone || null;
      return {
        id: r.id,
        status: r.status,
        mensagem: r.mensagem,
        tipo_solicitante: r.tipo_solicitante,
        created_at: r.created_at,
        imovel: r.imovel
          ? {
              id: r.imovel.id,
              titulo: r.imovel.titulo,
              bairro: r.imovel.bairro,
              preco_mensal: Number(r.imovel.preco_mensal),
              quartos: r.imovel.quartos,
              proprietario_id: r.imovel.proprietario_id,
            }
          : null,
        solicitante: r.solicitante
          ? { ...r.solicitante, media_estrelas: Number(r.solicitante.media_estrelas) }
          : null,
        grupo: r.grupo,
        grupo_membros: membros
          .filter((m) => m.grupo_id === r.grupo_id)
          .map((m) => ({
            nome: m.profiles?.nome ?? "Membro",
            media_estrelas: Number(m.profiles?.media_estrelas ?? 0),
            total_avaliacoes: Number(m.profiles?.total_avaliacoes ?? 0),
          })),
        contato:
          r.status === "aceita"
            ? {
                whatsapp_grupo: (moradia as any)?.whatsapp_url ?? null,
                telefone_outro_lado: souDono ? (r.solicitante?.telefone ?? null) : telDono,
              }
            : null,
      };
    });

    return {
      recebidas: todas.filter((s) => s.imovel?.proprietario_id === context.userId),
      enviadas: todas.filter((s) => s.imovel?.proprietario_id !== context.userId),
    };
  });

export const responderSolicitacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        solicitacao_id: z.string().uuid(),
        decisao: z.enum(["aceita", "recusada"]),
        whatsapp_url: z.string().url().max(300).nullable().default(null),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    { const r = await viaApi("responderSolicitacao", data); if (r !== LOCAL) return r as never; }
    const { data: sol, error: solErr } = await context.supabase
      .from("solicitacoes")
      .select(
        "id,status,solicitante_id,grupo_id,imovel_id,imoveis!solicitacoes_imovel_id_fkey(id,proprietario_id)",
      )
      .eq("id", data.solicitacao_id)
      .maybeSingle();
    if (solErr) throw solErr;
    const imovel = (sol as any)?.imoveis as { id: string; proprietario_id: string } | null;
    if (!sol || !imovel || imovel.proprietario_id !== context.userId) {
      throw new Error("Solicitação não encontrada.");
    }
    if ((sol as any).status !== "pendente") throw new Error("Essa solicitação já foi respondida.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await supabaseAdmin
      .from("solicitacoes")
      .update({ status: data.decisao })
      .eq("id", data.solicitacao_id);
    if (upErr) throw upErr;

    if (data.decisao !== "aceita") return { ok: true };

    const solicitanteId = (sol as any).solicitante_id as string;
    let moradores = [solicitanteId];
    if ((sol as any).grupo_id) {
      const { data: membros } = await supabaseAdmin
        .from("grupo_membros")
        .select("usuario_id")
        .eq("grupo_id", (sol as any).grupo_id);
      moradores = Array.from(
        new Set([...moradores, ...(membros ?? []).map((m: any) => m.usuario_id as string)]),
      );
    }

    const { data: moradia, error: mErr } = await supabaseAdmin
      .from("moradias")
      .insert({
        imovel_id: imovel.id,
        grupo_id: (sol as any).grupo_id,
        responsavel_id: solicitanteId,
        proprietario_id: context.userId,
        whatsapp_url: data.whatsapp_url,
      })
      .select("id")
      .single();
    if (mErr) throw mErr;

    await supabaseAdmin
      .from("moradia_moradores")
      .insert(moradores.map((id) => ({ moradia_id: moradia.id, morador_id: id })));
    await supabaseAdmin.from("imoveis").update({ ocupado: true }).eq("id", imovel.id);
    await supabaseAdmin.from("profiles").update({ status_moradia: "morando" }).in("id", moradores);

    return { ok: true };
  });

export const cancelarSolicitacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ solicitacao_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    { const r = await viaApi("cancelarSolicitacao", data); if (r !== LOCAL) return r as never; }
    const { error } = await context.supabase
      .from("solicitacoes")
      .update({ status: "cancelada" })
      .eq("id", data.solicitacao_id)
      .eq("solicitante_id", context.userId)
      .eq("status", "pendente");
    if (error) throw error;
    return { ok: true };
  });

/* --------------------------------- Moradias --------------------------------- */

export type Pessoa = { id: string; nome: string; telefone: string | null };

export type MoradiaItem = {
  id: string;
  status: "ativa" | "encerramento_solicitado" | "encerrada";
  inicio: string;
  fim: string | null;
  whatsapp_url: string | null;
  encerramento_pedido_por: string | null;
  encerramento_pedido_em: string | null;
  avaliacao_janela_fim: string | null;
  sou_proprietario: boolean;
  sou_responsavel: boolean;
  imovel: {
    id: string;
    titulo: string;
    bairro: string;
    moradores_podem_recrutar: boolean;
    aceita_solicitacoes: boolean;
  } | null;
  proprietario: Pessoa | null;
  moradores: Pessoa[];
  /** ids de quem eu já avaliei nesta moradia */
  ja_avaliei: string[];
  /** avaliações recebidas por mim já reveladas */
  recebidas: { estrelas: number; comentario: string; avaliador_nome: string }[];
  recebidas_ocultas: number;
};

async function processar() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.rpc("processar_moradias" as never);
  return supabaseAdmin;
}

export const listMinhasMoradias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: __in, context }): Promise<MoradiaItem[]> => {
    { const r = await viaApi("listMinhasMoradias", __in); if (r !== LOCAL) return r as never; }
    await processar();
    const { data, error } = await context.supabase
      .from("moradias")
      .select(
        "id,status,inicio,fim,whatsapp_url,encerramento_pedido_por,encerramento_pedido_em,avaliacao_janela_fim,proprietario_id,responsavel_id,imovel:imoveis!moradias_imovel_id_fkey(id,titulo,bairro,moradores_podem_recrutar,aceita_solicitacoes),proprietario:profiles!moradias_proprietario_id_fkey(id,nome,telefone)",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as any[];
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);

    const [{ data: mm }, { data: minhas }, { data: recebidas }] = await Promise.all([
      context.supabase
        .from("moradia_moradores")
        .select("moradia_id,profiles!moradia_moradores_morador_id_fkey(id,nome,telefone)")
        .in("moradia_id", ids),
      context.supabase
        .from("avaliacoes")
        .select("moradia_id,avaliado_id")
        .eq("avaliador_id", context.userId)
        .in("moradia_id", ids),
      context.supabase
        .from("avaliacoes")
        .select(
          "moradia_id,estrelas,comentario,avaliador:profiles!avaliacoes_avaliador_id_fkey(nome)",
        )
        .eq("avaliado_id", context.userId)
        .in("moradia_id", ids),
    ]);

    // quantas avaliações recebidas ainda ocultas (contagem via admin, sem revelar conteúdo)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ocultas } = await supabaseAdmin
      .from("avaliacoes")
      .select("moradia_id")
      .eq("avaliado_id", context.userId)
      .eq("revelada", false)
      .in("moradia_id", ids);

    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      inicio: r.inicio,
      fim: r.fim,
      whatsapp_url: r.whatsapp_url,
      encerramento_pedido_por: r.encerramento_pedido_por,
      encerramento_pedido_em: r.encerramento_pedido_em,
      avaliacao_janela_fim: r.avaliacao_janela_fim,
      sou_proprietario: r.proprietario_id === context.userId,
      sou_responsavel: r.responsavel_id === context.userId,
      imovel: r.imovel,
      proprietario: r.proprietario,
      moradores: (mm ?? [])
        .filter((m: any) => m.moradia_id === r.id)
        .map((m: any) => m.profiles as Pessoa)
        .filter(Boolean),
      ja_avaliei: (minhas ?? [])
        .filter((a: any) => a.moradia_id === r.id)
        .map((a: any) => a.avaliado_id as string),
      recebidas: (recebidas ?? [])
        .filter((a: any) => a.moradia_id === r.id)
        .map((a: any) => ({
          estrelas: a.estrelas,
          comentario: a.comentario,
          avaliador_nome: a.avaliador?.nome ?? "Alguém",
        })),
      recebidas_ocultas: (ocultas ?? []).filter((a: any) => a.moradia_id === r.id).length,
    }));
  });

async function carregarMoradiaParticipante(context: any, moradia_id: string) {
  const { data: m } = await context.supabase
    .from("moradias")
    .select("id,status,imovel_id,proprietario_id,responsavel_id,encerramento_pedido_por,avaliacao_janela_fim")
    .eq("id", moradia_id)
    .maybeSingle();
  if (!m) throw new Error("Moradia não encontrada.");
  return m as {
    id: string;
    status: string;
    imovel_id: string;
    proprietario_id: string;
    responsavel_id: string;
    encerramento_pedido_por: string | null;
    avaliacao_janela_fim: string | null;
  };
}

/** Qualquer um dos lados pede o encerramento. */
export const pedirEncerramento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ moradia_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    { const r = await viaApi("pedirEncerramento", data); if (r !== LOCAL) return r as never; }
    const m = await carregarMoradiaParticipante(context, data.moradia_id);
    if (m.status !== "ativa") throw new Error("Essa moradia já está em encerramento.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("moradias")
      .update({
        status: "encerramento_solicitado",
        encerramento_pedido_por: context.userId,
        encerramento_pedido_em: new Date().toISOString(),
      })
      .eq("id", m.id);
    if (error) throw error;
    return { ok: true };
  });

/** O OUTRO lado confirma; quem pediu não pode confirmar o próprio pedido. */
export const confirmarEncerramento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ moradia_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    { const r = await viaApi("confirmarEncerramento", data); if (r !== LOCAL) return r as never; }
    const m = await carregarMoradiaParticipante(context, data.moradia_id);
    if (m.status !== "encerramento_solicitado") throw new Error("Não há pedido de encerramento.");
    const pedidoPeloDono = m.encerramento_pedido_por === m.proprietario_id;
    const souDono = context.userId === m.proprietario_id;
    if (pedidoPeloDono === souDono) {
      throw new Error("Quem confirma é o outro lado da moradia.");
    }
    const supabaseAdmin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    const janela = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
    const { error } = await supabaseAdmin
      .from("moradias")
      .update({
        status: "encerrada",
        fim: new Date().toISOString().slice(0, 10),
        avaliacao_janela_fim: janela,
      })
      .eq("id", m.id);
    if (error) throw error;
    await supabaseAdmin.rpc("processar_moradias" as never);
    return { ok: true };
  });

/** Contestar: quem recebeu o pedido diz que a moradia continua. */
export const contestarEncerramento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ moradia_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    { const r = await viaApi("contestarEncerramento", data); if (r !== LOCAL) return r as never; }
    const m = await carregarMoradiaParticipante(context, data.moradia_id);
    if (m.status !== "encerramento_solicitado") throw new Error("Não há pedido para contestar.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("moradias")
      .update({ status: "ativa", encerramento_pedido_por: null, encerramento_pedido_em: null })
      .eq("id", m.id);
    return { ok: true };
  });

/* -------------------------------- Avaliações -------------------------------- */

export const avaliarMoradia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        moradia_id: z.string().uuid(),
        avaliados: z.array(z.string().uuid()).min(1).max(20),
        estrelas: z.number().int().min(1).max(5),
        comentario: z.string().max(600).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    { const r = await viaApi("avaliarMoradia", data); if (r !== LOCAL) return r as never; }
    const m = await carregarMoradiaParticipante(context, data.moradia_id);
    if (m.status !== "encerrada") {
      throw new Error("A avaliação abre quando a saída for confirmada pelos dois lados.");
    }
    if (m.avaliacao_janela_fim && new Date(m.avaliacao_janela_fim) < new Date()) {
      throw new Error("O prazo de 14 dias para avaliar já terminou.");
    }
    const { data: mm } = await context.supabase
      .from("moradia_moradores")
      .select("morador_id")
      .eq("moradia_id", m.id);
    const moradores = (mm ?? []).map((x: any) => x.morador_id as string);
    const souDono = context.userId === m.proprietario_id;
    const permitidos = souDono ? moradores : [m.proprietario_id];
    if (!souDono && !moradores.includes(context.userId)) throw new Error("Sem permissão.");
    if (data.avaliados.some((id) => !permitidos.includes(id))) {
      throw new Error("Você só pode avaliar o outro lado da moradia.");
    }

    const { error } = await context.supabase.from("avaliacoes").insert(
      data.avaliados.map((avaliado_id) => ({
        imovel_id: m.imovel_id,
        moradia_id: m.id,
        avaliador_id: context.userId,
        avaliado_id,
        estrelas: data.estrelas,
        comentario: data.comentario,
        janela_fim: m.avaliacao_janela_fim,
      })),
    );
    if (error) {
      if (error.code === "23505") throw new Error("Você já avaliou essa pessoa nesta moradia.");
      throw error;
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("revelar_avaliacoes" as never, { _moradia_id: m.id } as never);
    return { ok: true };
  });

/* ------------------------- Chamados dos moradores --------------------------- */

export const criarChamado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        moradia_id: z.string().uuid(),
        mensagem: z.string().min(5).max(600),
        vagas_procuradas: z.number().int().min(1).max(10),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    { const r = await viaApi("criarChamado", data); if (r !== LOCAL) return r as never; }
    const m = await carregarMoradiaParticipante(context, data.moradia_id);
    const { error } = await context.supabase.from("chamados_moradores").insert({
      imovel_id: m.imovel_id,
      moradia_id: m.id,
      autor_id: context.userId,
      mensagem: data.mensagem,
      vagas_procuradas: data.vagas_procuradas,
    });
    if (error) throw new Error(error.code === "23505" ? "Já existe uma divulgação ativa para esta casa. Encerre a atual antes de criar outra." : "Só o morador principal pode divulgar, e o proprietário precisa ter liberado.");
    return { ok: true };
  });

export const encerrarChamado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ chamado_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    { const r = await viaApi("encerrarChamado", data); if (r !== LOCAL) return r as never; }
    const { error } = await context.supabase
      .from("chamados_moradores")
      .update({ ativo: false })
      .eq("id", data.chamado_id)
      .eq("autor_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

/** Dono abre/fecha o anúncio para novas solicitações. */
export const alternarAnuncio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ imovel_id: z.string().uuid(), aberto: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    { const r = await viaApi("alternarAnuncio", data); if (r !== LOCAL) return r as never; }
    const { error } = await context.supabase
      .from("imoveis")
      .update({ aceita_solicitacoes: data.aberto })
      .eq("id", data.imovel_id)
      .eq("proprietario_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

/* ------------------------------ Tipo de conta ------------------------------- */

export const definirTipoConta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        tipo_conta: z.enum(["comum", "proprietario"]),
        telefone: z.string().max(30).optional(),
        declaro: z.boolean().default(false),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    { const r = await viaApi("definirTipoConta", data); if (r !== LOCAL) return r as never; }
    if (data.tipo_conta === "proprietario" && !data.declaro) {
      throw new Error("Confirme a declaração de responsável pelo imóvel.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        tipo_conta: data.tipo_conta,
        ...(data.telefone ? { telefone: data.telefone } : {}),
        proprietario_declarado_em:
          data.tipo_conta === "proprietario" ? new Date().toISOString() : null,
      })
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

/* ------------------------------ Meus imóveis -------------------------------- */

export type MeuImovel = {
  id: string;
  titulo: string;
  bairro: string;
  aceita_solicitacoes: boolean;
  moradores_podem_recrutar: boolean;
  ocupado: boolean;
  moradores: { id: string; nome: string }[];
  chamados: { id: string; mensagem: string; vagas_procuradas: number; aprovado: boolean; ativo: boolean; autor_nome: string }[];
};

export const listMeusImoveis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<MeuImovel[]> => {
    { const r = await viaApi("listMeusImoveis", data); if (r !== LOCAL) return r as never; }
    const { data: ims, error } = await context.supabase
      .from("imoveis")
      .select("id,titulo,bairro,aceita_solicitacoes,moradores_podem_recrutar,ocupado")
      .eq("proprietario_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const ids = (ims ?? []).map((i) => i.id);
    if (ids.length === 0) return [];
    const [{ data: ch }, { data: mor }] = await Promise.all([
      context.supabase
        .from("chamados_moradores")
        .select("id,imovel_id,mensagem,vagas_procuradas,aprovado,ativo,autor:profiles!chamados_moradores_autor_id_fkey(nome)")
        .in("imovel_id", ids)
        .eq("ativo", true),
      context.supabase
        .from("moradias")
        .select("imovel_id,status,moradia_moradores(profiles!moradia_moradores_morador_id_fkey(id,nome))")
        .in("imovel_id", ids)
        .neq("status", "encerrada"),
    ]);
    return (ims ?? []).map((i) => ({
      ...i,
      moradores: ((mor ?? []) as any[])
        .filter((m) => m.imovel_id === i.id)
        .flatMap((m) => (m.moradia_moradores ?? []).map((x: any) => x.profiles))
        .filter(Boolean),
      chamados: ((ch ?? []) as any[])
        .filter((c) => c.imovel_id === i.id)
        .map((c) => ({
          id: c.id,
          mensagem: c.mensagem,
          vagas_procuradas: c.vagas_procuradas,
          aprovado: c.aprovado,
          ativo: c.ativo,
          autor_nome: c.autor?.nome ?? "Morador",
        })),
    }));
  });

/** Proprietário vincula um inquilino que já mora no imóvel. */
export const vincularMorador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ imovel_id: z.string().uuid(), usuario_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    { const r = await viaApi("vincularMorador", data); if (r !== LOCAL) return r as never; }
    const { data: im } = await context.supabase
      .from("imoveis")
      .select("id")
      .eq("id", data.imovel_id)
      .eq("proprietario_id", context.userId)
      .maybeSingle();
    if (!im) throw new Error("Só o proprietário do imóvel pode vincular moradores.");
    if (data.usuario_id === context.userId) throw new Error("Escolha outra pessoa.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ativa } = await supabaseAdmin
      .from("moradias")
      .select("id")
      .eq("imovel_id", data.imovel_id)
      .neq("status", "encerrada")
      .limit(1)
      .maybeSingle();
    let moradiaId = ativa?.id;
    if (!moradiaId) {
      const { data: nova, error } = await supabaseAdmin
        .from("moradias")
        .insert({ imovel_id: data.imovel_id, proprietario_id: context.userId, responsavel_id: data.usuario_id })
        .select("id")
        .single();
      if (error) throw error;
      moradiaId = nova.id;
    }
    const { data: ja } = await supabaseAdmin
      .from("moradia_moradores")
      .select("morador_id")
      .eq("moradia_id", moradiaId)
      .eq("morador_id", data.usuario_id)
      .maybeSingle();
    if (!ja) {
      const { error: e2 } = await supabaseAdmin
        .from("moradia_moradores")
        .insert({ moradia_id: moradiaId, morador_id: data.usuario_id });
      if (e2) throw e2;
    }
    await supabaseAdmin.from("imoveis").update({ ocupado: true }).eq("id", data.imovel_id);
    await supabaseAdmin.from("profiles").update({ status_moradia: "morando" }).eq("id", data.usuario_id);
    return { ok: true };
  });

/** Proprietário aprova (ou oculta) o anúncio de vagas publicado pelos moradores. */
export const aprovarChamado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ chamado_id: z.string().uuid(), aprovado: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    { const r = await viaApi("aprovarChamado", data); if (r !== LOCAL) return r as never; }
    const { data: row, error } = await context.supabase
      .from("chamados_moradores")
      .update({ aprovado: data.aprovado })
      .eq("id", data.chamado_id)
      .select("id")
      .maybeSingle();
    if (error || !row) throw new Error("Só o proprietário pode aprovar este anúncio.");
    return { ok: true };
  });

export const salvarDocumento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ caminho: z.string().min(3).max(300) }).parse(data))
  .handler(async ({ data, context }) => {
    { const r = await viaApi("salvarDocumento", data); if (r !== LOCAL) return r as never; }
    if (!data.caminho.startsWith(`${context.userId}/`)) throw new Error("Arquivo inválido.");
    const { error } = await context.supabase
      .from("profiles")
      .update({ documento_url: data.caminho })
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
