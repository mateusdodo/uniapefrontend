import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const r = search["redirect"];
    return typeof r === "string" && r.startsWith("/") ? { redirect: r } : {};
  },
  head: () => ({
    meta: [
      { title: "Entrar — Moradia Quixadá" },
      {
        name: "description",
        content:
          "Entre ou crie sua conta no Moradia Quixadá para solicitar moradia, anunciar vagas e montar seu grupo.",
      },
      { property: "og:title", content: "Entrar — Moradia Quixadá" },
      {
        property: "og:description",
        content: "Entre ou crie sua conta para solicitar moradia em Quixadá.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [nome, setNome] = useState("");
  const [tipoConta, setTipoConta] = useState<"comum" | "proprietario">("comum");
  const [telefone, setTelefone] = useState("");
  const [declaro, setDeclaro] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [aguardandoEmail, setAguardandoEmail] = useState(false);

  useEffect(() => {
    // Já autenticado → vai direto para o destino.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: redirect ?? "/", replace: true });
      }
    });
  }, [navigate, redirect]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        navigate({ to: redirect ?? "/", replace: true });
      } else {
        if (tipoConta === "proprietario" && !declaro) {
          throw new Error("Confirme que você é proprietário ou responsável pelo imóvel.");
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: { nome, tipo_conta: tipoConta, telefone: telefone.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (!data.session) {
          setAguardandoEmail(true);
        } else {
          toast.success("Conta criada!");
          navigate({ to: redirect ?? "/", replace: true });
        }
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível continuar. Tente novamente.",
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex max-w-7xl flex-col items-center px-6 py-16 md:py-24">
        <div className="w-full max-w-md animate-pin border-t-4 border-primary bg-white p-8 shadow-xl">
          <h1 className="font-display text-4xl uppercase">
            {modo === "entrar" ? "Entrar" : "Criar conta"}
          </h1>
          <p className="mt-2 font-mono text-xs uppercase text-secondary/50">
            {modo === "entrar"
              ? "Bem-vindo de volta ao mural"
              : "Feito por universitários, para universitários"}
          </p>

          {aguardandoEmail ? (
            <div className="mt-8 space-y-4">
              <p className="text-sm leading-relaxed text-secondary/80">
                ✔ Conta criada! Enviamos um link de confirmação para{" "}
                <strong>{email}</strong>. Confirme o e-mail para entrar.
              </p>
              <button
                onClick={() => {
                  setAguardandoEmail(false);
                  setModo("entrar");
                }}
                className="w-full bg-foreground py-3 font-bold uppercase tracking-widest text-background hover:bg-primary"
              >
                Voltar para o login
              </button>
            </div>
          ) : (
            <form className="mt-8 space-y-5" onSubmit={submit}>
              {modo === "criar" && (
                <Campo
                  id="nome"
                  label="Seu nome"
                  value={nome}
                  onChange={setNome}
                  type="text"
                  required
                  placeholder="Maria da Silva"
                />
              )}
              {modo === "criar" && (
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase text-secondary/50">Eu sou</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ["comum", "Inquilino", "Procuro moradia"],
                      ["proprietario", "Proprietário", "Anuncio imóveis"],
                    ] as const).map(([k, t, d]) => (
                      <button
                        type="button"
                        key={k}
                        onClick={() => setTipoConta(k)}
                        className={`border-2 p-3 text-left ${tipoConta === k ? "border-primary bg-primary/5" : "border-border"}`}
                      >
                        <span className="block font-bold uppercase">{t}</span>
                        <span className="text-xs text-muted-foreground">{d}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {modo === "criar" && (
                <Campo
                  id="telefone"
                  label="WhatsApp"
                  value={telefone}
                  onChange={setTelefone}
                  type="tel"
                  placeholder="(88) 9 9999-9999"
                />
              )}
              {modo === "criar" && tipoConta === "proprietario" && (
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={declaro} onChange={(e) => setDeclaro(e.target.checked)} className="mt-1 size-4 accent-primary" />
                  Declaro que sou proprietário ou responsável pelos imóveis que vou anunciar.
                </label>
              )}
              <Campo
                id="email"
                label="E-mail"
                value={email}
                onChange={setEmail}
                type="email"
                required
                placeholder="voce@exemplo.com"
              />
              <Campo
                id="senha"
                label="Senha"
                value={senha}
                onChange={setSenha}
                type="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="submit"
                disabled={carregando}
                className="w-full bg-primary py-4 font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
              >
                {carregando
                  ? "Aguarde..."
                  : modo === "entrar"
                    ? "Entrar"
                    : "Criar minha conta"}
              </button>
            </form>
          )}

          {!aguardandoEmail && (
            <p className="mt-6 border-t border-border pt-4 text-center text-sm text-secondary/60">
              {modo === "entrar" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
              <button
                type="button"
                onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
                className="font-bold uppercase tracking-wider text-primary hover:underline"
              >
                {modo === "entrar" ? "Criar agora" : "Entrar"}
              </button>
            </p>
          )}
        </div>

        <Link
          to="/"
          className="mt-8 font-mono text-xs uppercase tracking-widest text-secondary/60 hover:text-primary"
        >
          ← Continuar explorando sem conta
        </Link>
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
  type,
  required,
  minLength,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
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
        type={type}
        value={value}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-input bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}

// re-export para manter o import usado no fluxo de OAuth futuro
