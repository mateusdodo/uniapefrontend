import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { viaApi, LOCAL } from "./api-proxy";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Cliente publicável (leitura pública, sem sessão). RLS aplica-se como anon. */
function createPublicClient() {
  const SUPABASE_URL = process.env["SUPABASE_URL"];
  const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing Supabase server environment variables");
  }
  const key = SUPABASE_PUBLISHABLE_KEY;
  return createClient(SUPABASE_URL, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type ImovelCard = {
  id: string;
  titulo: string;
  tipo: string;
  preco_mensal: number;
  quartos: number;
  aceita_solicitacoes: boolean;
  moradores_podem_recrutar: boolean;
  ocupado: boolean;
  bairro: string;
  proximidade: string | null;
  endereco?: string | null;
  parada_ida_nome?: string | null;
  parada_ida_minutos?: number | null;
  parada_volta_nome?: string | null;
  parada_volta_minutos?: number | null;
  transporte_fonte?: string | null;
  comodidades: string[];
  fotos: string[];
  status: "disponivel" | "esgotado" | "inativo";
  media_estrelas: number;
};

export const listImoveis = createServerFn({ method: "GET" }).handler(async ({ data: __in }) => {
    { const r = await viaApi("listImoveis", __in); if (r !== LOCAL) return r as never; }
  const supabasePublic = createPublicClient();
  const { data, error } = await supabasePublic
    .from("imoveis")
    .select(
      "id,titulo,tipo,preco_mensal,quartos,aceita_solicitacoes,moradores_podem_recrutar,ocupado,bairro,proximidade,comodidades,fotos,status,media_estrelas,parada_ida_minutos,parada_volta_minutos",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as ImovelCard[];
});

export type AvaliacaoDetalhe = {
  id: string;
  estrelas: number;
  comentario: string;
  created_at: string;
  avaliador: { nome: string } | null;
};

export type ImovelDetalhe = ImovelCard & {
  descricao: string;
  proprietario: {
    id: string;
    nome: string;
    verificado: boolean;
    media_estrelas: number;
    total_avaliacoes: number;
  } | null;
  avaliacoes: AvaliacaoDetalhe[];
  chamados: { id: string; mensagem: string; vagas_procuradas: number; created_at: string; autor: { nome: string } | null }[];
};

export const getImovel = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    { const r = await viaApi("getImovel", data); if (r !== LOCAL) return r as never; }
    const supabasePublic = createPublicClient();
    const { data: imovel, error } = await supabasePublic
      .from("imoveis")
      .select(
        "id,titulo,tipo,preco_mensal,quartos,aceita_solicitacoes,moradores_podem_recrutar,ocupado,bairro,proximidade,comodidades,fotos,status,media_estrelas,descricao,endereco,parada_ida_nome,parada_ida_minutos,parada_volta_nome,parada_volta_minutos,transporte_fonte,proprietario:profiles!imoveis_proprietario_id_fkey(id,nome,verificado,media_estrelas,total_avaliacoes)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!imovel) return null;

    const { data: avaliacoes } = await supabasePublic
      .from("avaliacoes")
      .select("id,estrelas,comentario,created_at,avaliador:profiles!avaliacoes_avaliador_id_fkey(nome)")
      .eq("imovel_id", data.id)
      .eq("revelada", true)
      .order("created_at", { ascending: false });

    const { data: chamados } = await supabasePublic
      .from("chamados_moradores")
      .select("id,mensagem,vagas_procuradas,created_at,autor:profiles!chamados_moradores_autor_id_fkey(nome)")
      .eq("imovel_id", data.id)
      .eq("ativo", true)
      .order("created_at", { ascending: false });

    return {
      ...(imovel as unknown as Omit<ImovelDetalhe, "avaliacoes" | "chamados">),
      chamados: (chamados ?? []) as any,
      avaliacoes: (avaliacoes ?? []) as unknown as AvaliacaoDetalhe[],
    } as ImovelDetalhe;
  });

const tipoImovel = z.enum(["quarto", "republica", "kitnet", "apartamento"]);

export const createImovel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        titulo: z.string().min(3).max(120),
        descricao: z.string().max(2000).default(""),
        tipo: tipoImovel,
        preco_mensal: z.number().positive(),
        quartos: z.number().int().min(1).max(20),
        aceita_solicitacoes: z.boolean().default(true),
        moradores_podem_recrutar: z.boolean().default(false),
        whatsapp_grupo_url: z.string().url().max(300).nullable().default(null),
        contato_whatsapp: z.string().max(30).nullable().default(null),
        bairro: z.string().min(1).max(80),
        proximidade: z.string().max(120).default(""),
        comodidades: z.array(z.string()).default([]),
        fotos: z.array(z.string().url()).default([]),
        endereco: z.string().max(200).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    { const r = await viaApi("createImovel", data); if (r !== LOCAL) return r as never; }
    const { data: perfil } = await context.supabase
      .from("profiles")
      .select("tipo_conta")
      .eq("id", context.userId)
      .maybeSingle();
    if (perfil?.tipo_conta !== "proprietario") {
      throw new Error("Só contas de proprietário podem anunciar. Mude o tipo da conta no seu perfil.");
    }
    let transporte: Record<string, unknown> = {};
    if (data.endereco.trim().length > 3) {
      const { geocodificar, calcularParadas } = await import("./transporte.server");
      const coord = await geocodificar(data.endereco.trim());
      if (coord) {
        const { data: paradas } = await context.supabase
          .from("paradas_onibus")
          .select("id,nome,endereco,sentido,latitude,longitude");
        if (paradas && paradas.length > 0) {
          const calculo = await calcularParadas(
            coord,
            paradas as unknown as import("./transporte.server").Parada[],
          );
          transporte = { latitude: coord.lat, longitude: coord.lon, ...calculo };
        } else {
          transporte = { latitude: coord.lat, longitude: coord.lon };
        }
      }
    }

    const { data: imovel, error } = await context.supabase
      .from("imoveis")
      .insert({
        ...data,
        ...transporte,
        vagas_total: data.quartos,
        vagas_disponiveis: data.quartos,
        proprietario_id: context.userId,
        status: "disponivel",
      })
      .select("id")
      .single();
    if (error) throw error;
    return imovel as { id: string };
  });

export const createSolicitacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        imovel_id: z.string().uuid(),
        tipo_solicitante: z.enum(["individual", "grupo"]),
        grupo_id: z.string().uuid().nullable().default(null),
        mensagem: z.string().max(1000).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    { const r = await viaApi("createSolicitacao", data); if (r !== LOCAL) return r as never; }
    const { data: imovel } = await context.supabase
      .from("imoveis")
      .select("aceita_solicitacoes,proprietario_id")
      .eq("id", data.imovel_id)
      .maybeSingle();
    if (!imovel?.aceita_solicitacoes) throw new Error("Este anúncio não está recebendo solicitações agora.");
    if (imovel.proprietario_id === context.userId) throw new Error("Você é o dono deste imóvel.");
    const { data: solicitacao, error } = await context.supabase
      .from("solicitacoes")
      .insert({ ...data, solicitante_id: context.userId, status: "pendente" })
      .select("id")
      .single();
    if (error) throw error;
    return solicitacao as { id: string };
  });

export type MeuPerfil = {
  id: string;
  nome: string;
  telefone: string | null;
  tipo: "estudante" | "trabalhador" | "proprietario";
  tipo_conta: "comum" | "proprietario";
  verificado: boolean;
  documento_url: string | null;
  avatar_url: string | null;
};

export const getMeuPerfil = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: __in, context }) => {
    { const r = await viaApi("getMeuPerfil", __in); if (r !== LOCAL) return r as never; }
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id,nome,telefone,tipo,tipo_conta,verificado,documento_url,avatar_url")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as MeuPerfil | null;
  });
