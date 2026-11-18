import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { viaApi, LOCAL } from "./api-proxy";
import type { Database } from "@/integrations/supabase/types";

function clientePublico() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type UsuarioResumo = {
  id: string;
  nome: string;
  tipo_conta: "comum" | "proprietario";
  verificado: boolean;
  media_estrelas: number;
  total_avaliacoes: number;
  telefone: string | null;
  avatar_url: string | null;
  status_moradia: string | null;
};

const CAMPOS =
  "id,nome,tipo_conta,verificado,media_estrelas,total_avaliacoes,telefone,avatar_url,status_moradia";

export const listUsuarios = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z
      .object({
        q: z.string().max(80).default(""),
        tipo: z.enum(["todos", "comum", "proprietario"]).default("todos"),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<UsuarioResumo[]> => {
    { const r = await viaApi("listUsuarios", data); if (r !== LOCAL) return r as never; }
    let query = clientePublico()
      .from("profiles")
      .select(CAMPOS)
      .order("verificado", { ascending: false })
      .order("media_estrelas", { ascending: false })
      .limit(60);
    if (data.q.trim().length >= 2) query = query.ilike("nome", `%${data.q.trim()}%`);
    if (data.tipo !== "todos") query = query.eq("tipo_conta", data.tipo);
    const { data: rows, error } = await query;
    if (error) {
      console.error(error);
      return [];
    }
    return (rows ?? []) as UsuarioResumo[];
  });

export type PerfilPublico = {
  usuario: UsuarioResumo;
  avaliacoes: { id: string; estrelas: number; comentario: string; created_at: string; avaliador_nome: string }[];
  imoveis: { id: string; titulo: string; bairro: string; preco_mensal: number; ocupado: boolean }[];
};

export const getPerfilPublico = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<PerfilPublico | null> => {
    { const r = await viaApi("getPerfilPublico", data); if (r !== LOCAL) return r as never; }
    const sb = clientePublico();
    const { data: u } = await sb.from("profiles").select(CAMPOS).eq("id", data.id).maybeSingle();
    if (!u) return null;
    const [{ data: av }, { data: im }] = await Promise.all([
      sb
        .from("avaliacoes")
        .select("id,estrelas,comentario,created_at,avaliador:profiles!avaliacoes_avaliador_id_fkey(nome)")
        .eq("avaliado_id", data.id)
        .eq("revelada", true)
        .order("created_at", { ascending: false })
        .limit(30),
      sb
        .from("imoveis")
        .select("id,titulo,bairro,preco_mensal,ocupado")
        .eq("proprietario_id", data.id)
        .neq("status", "inativo")
        .limit(20),
    ]);
    return {
      usuario: u as UsuarioResumo,
      avaliacoes: ((av ?? []) as any[]).map((a) => ({
        id: a.id,
        estrelas: a.estrelas,
        comentario: a.comentario,
        created_at: a.created_at,
        avaliador_nome: a.avaliador?.nome ?? "Alguém",
      })),
      imoveis: (im ?? []).map((i) => ({ ...i, preco_mensal: Number(i.preco_mensal) })),
    };
  });
