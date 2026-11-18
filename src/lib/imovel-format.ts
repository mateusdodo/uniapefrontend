export const TIPO_LABELS: Record<string, string> = {
  quarto: "Quarto individual",
  republica: "República completa",
  kitnet: "Kitnet",
  apartamento: "Apartamento",
};

export const TIPO_BADGES: Record<string, string> = {
  quarto: "QUARTO INDIVIDUAL",
  republica: "REPÚBLICA",
  kitnet: "KITNET",
  apartamento: "APARTAMENTO",
};

export const BAIRROS_QUIXADA = [
  "Alto da Boa Vista", "Alto São Francisco", "Baviera", "Bôto", "Campo Novo", "Campo Velho",
  "Carrascal", "Cedro", "Centro", "Cohab", "Combate", "Curicaca", "Herval", "Irajá",
  "Jardim dos Monólitos", "Monte Alegre", "Nova Jerusalém", "Planalto Renascer",
  "Planalto Universitário", "Putiú", "São João", "Triângulo",
];

export function formatPreco(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function whatsappLink(telefone: string | null, titulo: string): string | null {
  if (!telefone) return null;
  const digits = telefone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const msg = encodeURIComponent(
    `Olá! Vi "${titulo}" no Moradia Quixadá e gostaria de saber mais sobre a vaga.`,
  );
  return `https://wa.me/55${digits}?text=${msg}`;
}
