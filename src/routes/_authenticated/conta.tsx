import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getMeuPerfil } from "@/lib/moradia.functions";
import { salvarDocumento } from "@/lib/painel.functions";
import { Avatar } from "@/components/avatar-pessoa";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({
    meta: [
      { title: "Meu perfil — Moradia Quixadá" },
      {
        name: "description",
        content: "Edite sua foto, WhatsApp e documentos no Moradia Quixadá.",
      },
      { property: "og:title", content: "Meu perfil — Moradia Quixadá" },
      { property: "og:description", content: "Seu perfil no Moradia Quixadá." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContaPage,
});

function ContaPage() {
  const qc = useQueryClient();
  const carregar = useServerFn(getMeuPerfil);
  const perfil = useQuery({ queryKey: ["meu-perfil"], queryFn: () => carregar() });
  const [telefone, setTelefone] = useState("");
  const [salvando, setSalvando] = useState(false);
  const salvarDoc = useServerFn(salvarDocumento);
  const [enviandoDoc, setEnviandoDoc] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  useEffect(() => {
    if (perfil.data) setTelefone(perfil.data.telefone ?? "");
  }, [perfil.data]);

  async function enviarFoto(file: File) {
    if (!perfil.data) return;
    if (!file.type.startsWith("image/")) { toast.error("Escolha uma imagem."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("A foto deve ter até 5 MB."); return; }
    setEnviandoFoto(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const caminho = `${perfil.data.id}/foto-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("avatars").upload(caminho, file, { contentType: file.type });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("avatars").createSignedUrl(caminho, 60 * 60 * 24 * 365 * 10);
      if (signed.error) throw signed.error;
      const { error } = await supabase.from("profiles").update({ avatar_url: signed.data.signedUrl }).eq("id", perfil.data.id);
      if (error) throw error;
      await qc.invalidateQueries();
      toast.success("Foto atualizada!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no envio da foto.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function enviarDocumento(file: File) {
    if (!perfil.data) return;
    setEnviandoDoc(true);
    try {
      const ext = file.name.split(".").pop() ?? "pdf";
      const caminho = `${perfil.data.id}/comprovante-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("documentos").upload(caminho, file);
      if (error) throw error;
      await salvarDoc({ data: { caminho } });
      await qc.invalidateQueries({ queryKey: ["meu-perfil"] });
      toast.success("Documento enviado! A verificação será feita pela equipe.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no envio.");
    } finally {
      setEnviandoDoc(false);
    }
  }

  async function salvarTelefone(e: React.FormEvent) {
    e.preventDefault();
    if (!perfil.data) return;
    setSalvando(true);
    const { error } = await supabase.from("profiles").update({ telefone: telefone.trim() || null }).eq("id", perfil.data.id);
    setSalvando(false);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["meu-perfil"] });
    toast.success("WhatsApp salvo!");
  }

  const p = perfil.data;
  const souProp = p?.tipo_conta === "proprietario";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-display text-4xl uppercase md:text-5xl">Meu perfil</h1>
        {!p ? (
          <div className="mt-8 h-40 animate-pulse bg-muted" />
        ) : (
          <div className="mt-8 space-y-8">
            <div className="flex items-center gap-5">
              <Avatar nome={p.nome} url={p.avatar_url} grande />
              <div>
                <p className="font-display text-2xl uppercase">{p.nome}</p>
                <p className="font-mono text-xs uppercase text-muted-foreground">
                  {souProp ? "Proprietário" : "Inquilino"}
                  {p.verificado && " · ✓ verificado"}
                </p>
                <label className="mt-3 inline-block cursor-pointer border border-foreground px-4 py-2 text-xs font-bold uppercase hover:bg-foreground hover:text-background">
                  {enviandoFoto ? "Enviando..." : "Trocar foto"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={enviandoFoto}
                    onChange={(e) => e.target.files?.[0] && enviarFoto(e.target.files[0])}
                  />
                </label>
              </div>
            </div>

            <form onSubmit={salvarTelefone} className="space-y-3">
              <label htmlFor="tel" className="block font-mono text-[10px] uppercase text-muted-foreground">
                WhatsApp
              </label>
              <div className="flex gap-2">
                <input
                  id="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(88) 9 9999-9999"
                  className="flex-1 border border-input bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
                <button disabled={salvando} className="bg-primary px-5 text-xs font-bold uppercase text-primary-foreground disabled:opacity-50">
                  {salvando ? "..." : "Salvar"}
                </button>
              </div>
            </form>

            {souProp && (
              <div className="border border-dashed border-border p-4 text-sm">
                <p className="font-bold">Comprovação de propriedade</p>
                <p className="mt-1 text-muted-foreground">
                  Envie um comprovante de endereço ou documento do imóvel (PDF ou foto). Só você e a equipe
                  têm acesso. Aprovado, seu perfil ganha o selo “verificado”.
                </p>
                {p.verificado ? (
                  <p className="mt-2 font-bold text-primary">✓ Conta verificada</p>
                ) : p.documento_url ? (
                  <p className="mt-2">Documento enviado — em análise.</p>
                ) : null}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={enviandoDoc}
                  onChange={(e) => e.target.files?.[0] && enviarDocumento(e.target.files[0])}
                  className="mt-3 block text-sm"
                />
              </div>
            )}

            <Link to="/perfil/$id" params={{ id: p.id }} className="inline-block text-sm font-bold uppercase text-primary hover:underline">
              Ver meu perfil público →
            </Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
