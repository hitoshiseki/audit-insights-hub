import { SearchX } from "lucide-react";

export function EmptyFilterState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <SearchX className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        Nenhum registro encontrado
      </h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Não há registros para os filtros informados. Ajuste o período, o setor ou
        a categoria para visualizar os resultados.
      </p>
    </div>
  );
}
