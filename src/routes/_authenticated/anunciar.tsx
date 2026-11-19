import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { createImovel, getMeuPerfil } from "@/lib/moradia.functions";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BAIRROS_QUIXADA } from "@/lib/imovel-format";
import { supabase } from "@/integrations/supabase/client";

const EXTENSOES_FOTO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const Route = createFileRoute("/_authenticated/anunciar")({
  head: () => ({
    meta: [
      { title: "Anunciar imóvel — Moradia Quixadá" },
      {
        name: "description",
        content:
          "Publique seu quarto, república ou kitnet em Quixadá e alcance estudantes da UFC, Unicatólica e IFCE.",
      },
      { property: "og:title", content: "Anunciar imóvel — Moradia Quixadá" },
      {
        property: "og:description",
        content: "Publique sua vaga em menos de 5 minutos no Moradia Quixadá.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnunciarPage,
});

function AnunciarPage() {
  const navigate = useNavigate();
  const publicar = useServerFn(createImovel);
  const carregarPerfil = useServerFn(getMeuPerfil);
  const perfil = useQuery({ queryKey: ["meu-perfil"], queryFn: () => carregarPerfil() });

  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("quarto");
  const [preco, setPreco] = useState("");
  const [quartos, setQuartos] = useState("2");
  const [aceita, setAceita] = useState(true);
  const [recrutar, setRecrutar] = useState(false);
  const [whatsGrupo, setWhatsGrupo] = useState("");
  const [contato, setContato] = useState("");
  const [bairro, setBairro] = useState("Centro");
  const [endereco, setEndereco] = useState("");
  const [proximidade, setProximidade] = useState("");
  const [descricao, setDescricao] = useState("");
  const [comodidades, setComodidades] = useState("");
  const [fotosSelecionadas, setFotosSelecionadas] = useState<File[]>([]);
  const [salvando, setSalvando] = useState(false);

  function selecionarFotos(arquivos: FileList | null) {
    const selecionados = Array.from(arquivos ?? []);
    if (selecionados.length > 5) {
      toast.error("Selecione no máximo 5 imagens.");
      return;
    }
    if (selecionados.some((arquivo) => !EXTENSOES_FOTO[arquivo.type])) {
      toast.error("Use imagens JPG, PNG ou WebP.");
      return;
    }
    if (selecionados.some((arquivo) => arquivo.size > 5 * 1024 * 1024)) {
      toast.error("Cada imagem pode ter no máximo 5 MB.");
      return;
    }
    setFotosSelecionadas(selecionados);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const caminhosEnviados: string[] = [];
    let resultado: { id: string };
    try {
      const precoNum = Number(preco.replace(",", "."));
      const nQuartos = Math.max(1, Number(quartos) || 1);
      const usuarioId = perfil.data?.id;
      if (!Number.isFinite(precoNum) || precoNum <= 0) {
        throw new Error("Informe um preço mensal válido.");
      }
      if (fotosSelecionadas.length > 0 && !usuarioId) {
        throw new Error("Não foi possível identificar sua conta para enviar as imagens.");
      }

      for (const arquivo of fotosSelecionadas) {
        if (!usuarioId) {
          throw new Error("Não foi possível identificar sua conta para enviar as imagens.");
        }
        const extensao = EXTENSOES_FOTO[arquivo.type];
        const caminho = `${usuarioId}/${crypto.randomUUID()}.${extensao}`;
        const { error } = await supabase.storage
          .from("imoveis")
          .upload(caminho, arquivo, { contentType: arquivo.type });
        if (error) throw error;
        caminhosEnviados.push(caminho);
      }

      const fotos = caminhosEnviados.map(
        (caminho) => supabase.storage.from("imoveis").getPublicUrl(caminho).data.publicUrl,
      );
      resultado = await publicar({
        data: {
          titulo,
          descricao,
          tipo: tipo as "quarto" | "republica" | "kitnet" | "apartamento",
          preco_mensal: precoNum,
          quartos: nQuartos,
          aceita_solicitacoes: aceita,
          moradores_podem_recrutar: recrutar,
          whatsapp_grupo_url: whatsGrupo.trim() || null,
          contato_whatsapp: contato.trim() || null,
          bairro,
          endereco,
          proximidade,
          comodidades: comodidades
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
          fotos,
        },
      });
    } catch (err) {
      let erroAoLimpar: unknown;
      if (caminhosEnviados.length > 0) {
        try {
          const { error } = await supabase.storage.from("imoveis").remove(caminhosEnviados);
          if (error) erroAoLimpar = error;
        } catch (cleanupError) {
          erroAoLimpar = cleanupError;
        }
      }
      if (erroAoLimpar) {
        console.error(
          "Não foi possível limpar as imagens de um anúncio não publicado.",
          erroAoLimpar,
        );
      }
      toast.error(err instanceof Error ? err.message : "Erro ao publicar o imóvel.", {
        description: erroAoLimpar
          ? "Algumas imagens enviadas não puderam ser removidas. Tente novamente mais tarde."
          : undefined,
      });
      return;
    } finally {
      setSalvando(false);
    }
    toast.success("Imóvel publicado no mural!");
    navigate({ to: "/imoveis/$id", params: { id: resultado.id } });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <h1 className="animate-reveal font-display text-5xl uppercase leading-[0.9] md:text-6xl">
          Coloque sua vaga <span className="text-primary">no mural</span>
        </h1>
        <p className="mt-4 max-w-[55ch] text-secondary/70">
          Preencha os dados do imóvel. Depois de publicado, estudantes podem enviar
          solicitações e falar com você pelo WhatsApp.
        </p>

        {perfil.data && perfil.data.tipo_conta !== "proprietario" ? (
          <div className="mt-10 border-t-4 border-accent bg-white p-8 shadow-xl">
            <p className="font-display text-2xl uppercase">Só proprietários anunciam</p>
            <p className="mt-2 text-sm text-secondary/70">
              Sua conta é de inquilino. Para anunciar imóveis, crie uma conta de proprietário.
            </p>
            <Link
              to="/"
              className="mt-5 inline-block bg-primary px-6 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground"
            >
              Voltar ao início
            </Link>
          </div>
        ) : (
        <form
          onSubmit={submit}
          className="mt-10 animate-pin space-y-6 border-t-4 border-primary bg-white p-8 shadow-xl"
        >
          <Campo
            id="titulo"
            label="Título do anúncio"
            required
            value={titulo}
            onChange={setTitulo}
            placeholder="Ex.: República Arretada — Planalto"
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="tipo"
                className="mb-1 block font-mono text-[10px] uppercase text-secondary/50"
              >
                Tipo de moradia
              </label>
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full border border-input bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              >
                <option value="quarto">Quarto individual</option>
                <option value="republica">República completa</option>
                <option value="kitnet">Kitnet</option>
                <option value="apartamento">Apartamento</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="bairro"
                className="mb-1 block font-mono text-[10px] uppercase text-secondary/50"
              >
                Bairro
              </label>
              <select
                id="bairro"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                className="w-full border border-input bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              >
                {BAIRROS_QUIXADA.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Campo
              id="preco"
              label="Preço mensal (R$)"
              required
              value={preco}
              onChange={setPreco}
              placeholder="550"
              inputMode="decimal"
            />
            <Campo
              id="quartos"
              label="Quartos"
              required
              value={quartos}
              onChange={setQuartos}
              placeholder="3"
              inputMode="numeric"
            />
            <p className="col-span-1 self-end pb-2 font-mono text-[10px] uppercase text-secondary/50 sm:col-span-1">
              Sugestão de {Math.max(1, Number(quartos) || 1)} pessoa(s) — o grupo pode combinar mais
            </p>
          </div>

          <div>
            <Campo
              id="endereco"
              label="Endereço (rua e número)"
              value={endereco}
              onChange={setEndereco}
              placeholder="Ex.: Rua Basílio Emiliano Pinto, 1290"
            />
            <p className="mt-1 font-mono text-[10px] uppercase text-secondary/40">
              Usamos o endereço para calcular quantos minutos a pé o imóvel fica das
              paradas de ônibus da ida e da volta da universidade.
            </p>
          </div>

          <Campo
            id="proximidade"
            label="Perto de quê? (opcional)"
            value={proximidade}
            onChange={setProximidade}
            placeholder="Ex.: 400m do campus da UFC"
          />

          <div>
            <label
              htmlFor="descricao"
              className="mb-1 block font-mono text-[10px] uppercase text-secondary/50"
            >
              Descrição
            </label>
            <textarea
              id="descricao"
              rows={4}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Conte como é a casa, o ambiente, regras, o que está incluso..."
              className="w-full border border-input bg-transparent p-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <Campo
            id="comodidades"
            label="Comodidades (separadas por vírgula)"
            value={comodidades}
            onChange={setComodidades}
            placeholder="Wifi, Ar-condicionado, Lavanderia"
          />

          <div>
            <label
              htmlFor="fotos"
              className="mb-1 block font-mono text-[10px] uppercase text-secondary/50"
            >
              Fotos do imóvel (opcional, até 5 imagens)
            </label>
            <input
              id="fotos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => {
                selecionarFotos(e.currentTarget.files);
                e.currentTarget.value = "";
              }}
              className="w-full border border-input bg-transparent p-3 text-sm focus:border-primary focus:outline-none"
            />
            <p className="mt-1 font-mono text-[10px] uppercase text-secondary/40">
              JPG, PNG ou WebP · até 5 MB por imagem
            </p>
            {fotosSelecionadas.length > 0 && (
              <ul className="mt-3 space-y-2">
                {fotosSelecionadas.map((arquivo, indice) => (
                  <li key={`${arquivo.name}-${indice}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{arquivo.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFotosSelecionadas((atuais) => atuais.filter((_, i) => i !== indice))
                      }
                      className="shrink-0 text-xs font-bold uppercase text-primary"
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <fieldset className="space-y-3 border border-border p-4">
            <legend className="px-1 font-mono text-[10px] uppercase text-secondary/50">
              Opções do anúncio
            </legend>
            <Toggle
              checked={aceita}
              onChange={setAceita}
              titulo="Anúncio aberto para solicitações"
              texto="Você pode fechar e reabrir quando quiser."
            />
            <Toggle
              checked={recrutar}
              onChange={setRecrutar}
              titulo="Permitir que os moradores procurem novas pessoas"
              texto="Quem já mora aqui pode publicar “procuramos mais alguém” no anúncio."
            />
          </fieldset>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Campo
              id="whats-grupo"
              label="Link do grupo de WhatsApp (opcional)"
              value={whatsGrupo}
              onChange={setWhatsGrupo}
              placeholder="https://chat.whatsapp.com/..."
            />
            <Campo
              id="contato"
              label="Seu WhatsApp para contato"
              value={contato}
              onChange={setContato}
              placeholder="(88) 9 9999-9999"
              inputMode="numeric"
            />
          </div>
          <p className="-mt-3 font-mono text-[10px] uppercase text-secondary/40">
            Ao aceitar uma solicitação, liberamos o grupo (ou seu número) para os novos
            moradores seguirem a conversa por lá. Seu número não aparece publicamente.
          </p>

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-primary py-4 font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
          >
            {salvando ? "Publicando..." : "Publicar Imóvel Agora"}
          </button>
        </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Campo({
  id,
  label,
  value,
  onChange,
  required,
  placeholder,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  inputMode?: "text" | "decimal" | "numeric";
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block font-mono text-[10px] uppercase text-secondary/50"
      >
        {label}
      </label>
      <input
        id={id}
        value={value}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-input bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  titulo,
  texto,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  titulo: string;
  texto: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4 accent-primary"
      />
      <span>
        <span className="block text-sm font-medium">{titulo}</span>
        <span className="block text-xs text-secondary/60">{texto}</span>
      </span>
    </label>
  );
}
