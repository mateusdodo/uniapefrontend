/**
 * Encaminha as funções do app para o backend UniApê (Express) quando a
 * variável UNIAPE_API_URL estiver configurada. Sem ela, o app usa a lógica local.
 */
export const LOCAL = Symbol("local");

export async function viaApi(nome: string, data: unknown): Promise<unknown> {
  const base = process.env["UNIAPE_API_URL"];
  if (!base) return LOCAL;
  const { getRequest } = await import("@tanstack/react-start/server");
  const auth = getRequest()?.headers.get("authorization");
  const res = await fetch(`${base.replace(/\/$/, "")}/rpc/${nome}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(auth ? { authorization: auth } : {}) },
    body: JSON.stringify({ data: data ?? null }),
  });
  const corpo = (await res.json().catch(() => ({}))) as { data?: unknown; error?: string };
  if (!res.ok) throw new Error(corpo.error ?? `Falha no backend [${res.status}]`);
  return corpo.data;
}
