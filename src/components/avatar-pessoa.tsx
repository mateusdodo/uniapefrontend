import { iniciais } from "@/lib/whatsapp";

export function Avatar({ nome, url, grande }: { nome: string; url: string | null; grande?: boolean }) {
  const tam = grande ? "size-24 text-3xl" : "size-12 text-lg";
  return url ? (
    <img src={url} alt={nome} className={`${tam} shrink-0 rounded-full object-cover`} />
  ) : (
    <div className={`${tam} flex shrink-0 items-center justify-center rounded-full bg-secondary font-display text-secondary-foreground`}>
      {iniciais(nome)}
    </div>
  );
}
