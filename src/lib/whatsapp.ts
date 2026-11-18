/** Monta o link universal do WhatsApp (https://wa.me/55...) com mensagem pré-formatada. */
export function linkWhatsapp(telefone: string | null | undefined, mensagem: string): string | null {
  if (!telefone) return null;
  let digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 10) return null;
  if (!digitos.startsWith("55") || digitos.length <= 11) digitos = `55${digitos}`;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`;
}

export function iniciais(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
