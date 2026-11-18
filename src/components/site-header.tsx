import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function SiteHeader() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<{ id: string; nome: string; prop: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const { data: perfil } = await supabase
          .from("profiles")
          .select("nome,tipo_conta")
          .eq("id", data.session.user.id)
          .maybeSingle();
        setSession({ id: data.session.user.id, nome: perfil?.nome ?? "Minha conta", prop: perfil?.tipo_conta === "proprietario" });
      } else {
        setSession(null);
      }
      setLoading(false);
    });
  }, []);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center bg-primary font-display text-xl text-primary-foreground rounded-sm">
            Q
          </div>
          <span className="font-display text-lg uppercase tracking-tight sm:text-2xl">
            Moradia Quixadá
          </span>
        </Link>
        <div className="hidden items-center gap-8 text-sm font-medium uppercase tracking-wider md:flex">
          <Link to="/" className="transition-colors hover:text-primary">
            Explorar
          </Link>
          <Link to="/usuarios" search={{ q: "", tipo: "todos" }} className="transition-colors hover:text-primary">
            Pessoas
          </Link>
          {session &&
            linksPorPapel(session).map((l) => (
              <Link key={l.label} to={l.to} params={l.params as never} className="transition-colors hover:text-primary">
                {l.label}
              </Link>
            ))}
        </div>
        <div className="flex items-center gap-3">
          <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
            <SheetTrigger asChild>
              <button aria-label="Abrir menu" className="p-2 md:hidden">
                <Menu className="size-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-display uppercase">Moradia Quixadá</SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-1 px-4 text-sm font-medium uppercase tracking-wider" onClick={() => setMenuAberto(false)}>
                <Link to="/" className="py-3 border-b border-border">Início</Link>
                <Link to="/usuarios" search={{ q: "", tipo: "todos" }} className="py-3 border-b border-border">Pessoas</Link>
                {session ? (
                  <>
                    {linksPorPapel(session).map((l) => (
                      <Link key={l.label} to={l.to} params={l.params as never} className="py-3 border-b border-border">{l.label}</Link>
                    ))}
                    <button onClick={handleSignOut} className="py-3 text-left uppercase text-primary">Sair</button>
                  </>
                ) : (
                  <Link to="/auth" search={{}} className="py-3 text-primary">Entrar</Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
          {loading ? (
            <div className="h-9 w-24 animate-pulse bg-muted" />
          ) : session ? (
            <>
              <span className="hidden text-sm font-medium text-muted-foreground sm:block">
                Olá, {session.nome.split(" ")[0]}
              </span>
              <button
                onClick={handleSignOut}
                className="hidden md:block px-5 py-2 bg-foreground text-sm font-bold uppercase tracking-tighter text-background transition-colors hover:bg-primary"
              >
                Sair
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              search={{}}
              className="px-5 py-2 bg-foreground text-sm font-bold uppercase tracking-tighter text-background transition-colors hover:bg-primary"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

type LinkMenu = { label: string; to: "/meus-imoveis" | "/anunciar" | "/solicitacoes" | "/perfil/$id" | "/moradia" | "/grupos" | "/conta"; params?: { id: string } };

function linksPorPapel(s: { id: string; prop: boolean }): LinkMenu[] {
  return s.prop
    ? [
        { label: "Meus imóveis", to: "/meus-imoveis" },
        { label: "Anunciar", to: "/anunciar" },
        { label: "Solicitações", to: "/solicitacoes" },
        { label: "Meu perfil", to: "/conta" },
      ]
    : [
        { label: "Minha moradia", to: "/moradia" },
        { label: "Grupos", to: "/grupos" },
        { label: "Solicitações", to: "/solicitacoes" },
        { label: "Meu perfil", to: "/conta" },
      ];
}
