export function Estrelas({
  valor,
  size = "text-sm",
}: {
  valor: number;
  size?: string;
}) {
  const cheias = Math.round(valor);
  return (
    <span className={`${size} tracking-tight text-accent`} aria-label={`${valor} de 5 estrelas`}>
      {"★".repeat(Math.max(0, Math.min(5, cheias)))}
      <span className="text-muted-foreground">
        {"★".repeat(Math.max(0, 5 - Math.min(5, cheias)))}
      </span>
      <span className="ml-1 font-mono text-xs text-muted-foreground">
        {valor > 0 ? valor.toFixed(1) : "novo"}
      </span>
    </span>
  );
}

export function SeletorEstrelas({
  valor,
  onChange,
}: {
  valor: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
          className={`text-2xl leading-none transition-transform hover:scale-110 ${
            n <= valor ? "text-accent" : "text-muted-foreground"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
