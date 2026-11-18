export function SiteFooter() {
  return (
    <footer className="bg-secondary px-6 py-12 text-background/50">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-12 border-t border-white/10 pt-12 md:flex-row">
        <div>
          <div className="mb-4 flex items-center gap-2 text-background">
            <div className="size-6 bg-primary rounded-sm" />
            <span className="font-display text-xl uppercase">Moradia Quixadá</span>
          </div>
          <p className="max-w-[30ch] font-mono text-xs">
            Conectando a nova geração acadêmica de Quixadá. Feito com orgulho no
            Sertão Central.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 font-mono text-[10px] uppercase tracking-widest md:grid-cols-3">
          <div className="flex flex-col gap-3">
            <span className="mb-2 font-bold text-background">Plataforma</span>
            <a href="#" className="hover:text-primary">
              Como funciona
            </a>
            <a href="#" className="hover:text-primary">
              Segurança
            </a>
            <a href="#" className="hover:text-primary">
              Preços
            </a>
          </div>
          <div className="flex flex-col gap-3">
            <span className="mb-2 font-bold text-background">Comunidade</span>
            <span className="opacity-80">UFC Quixadá</span>
            <span className="opacity-80">Unicatólica</span>
            <span className="opacity-80">IFCE</span>
          </div>
          <div className="flex flex-col gap-3">
            <span className="mb-2 font-bold text-background">Legal</span>
            <a href="#" className="hover:text-primary">
              Privacidade
            </a>
            <a href="#" className="hover:text-primary">
              Termos
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-7xl font-mono text-[10px] md:text-left">
        &copy; {new Date().getFullYear()} MORADIA QUIXADÁ • FEITO NO SERTÃO CENTRAL
      </div>
    </footer>
  );
}
