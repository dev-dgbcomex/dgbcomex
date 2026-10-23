"use client"

export type KanbanColuna<T> = {
  id: string
  rotulo: string
  cor: string
  itens: T[]
}

export function KanbanWms<T>({
  colunas,
  renderCard,
  vazio,
}: {
  colunas: KanbanColuna<T>[]
  renderCard: (item: T) => React.ReactNode
  vazio?: string
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {colunas.map((coluna) => (
        <div
          key={coluna.id}
          className="flex flex-col w-72 shrink-0 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800"
        >
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 dark:border-slate-800">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: coluna.cor }}
            />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {coluna.rotulo}
            </span>
            <span className="ml-auto text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
              {coluna.itens.length}
            </span>
          </div>
          <div className="flex-1 p-2 space-y-2 min-h-[80px]">
            {coluna.itens.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                {vazio ?? "Nenhum item"}
              </p>
            ) : (
              coluna.itens.map(renderCard)
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function VisualizacaoToggle({
  modo,
  onChange,
}: {
  modo: "lista" | "kanban"
  onChange: (modo: "lista" | "kanban") => void
}) {
  return (
    <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 shadow-sm">
      <button
        type="button"
        onClick={() => onChange("lista")}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          modo === "lista"
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
        }`}
      >
        Lista
      </button>
      <button
        type="button"
        onClick={() => onChange("kanban")}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          modo === "kanban"
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
        }`}
      >
        Kanban
      </button>
    </div>
  )
}

export function Paginacao({
  total,
  pagina,
  porPagina,
  onAnterior,
  onProxima,
}: {
  total: number
  pagina: number
  porPagina: number
  onAnterior: () => void
  onProxima: () => void
}) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
  return (
    <div className="flex items-center justify-between text-sm text-slate-500">
      <span>
        {total.toLocaleString("pt-BR")} item(ns) — página {pagina} de {totalPaginas}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAnterior}
          disabled={pagina <= 1}
          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={onProxima}
          disabled={pagina >= totalPaginas}
          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-40"
        >
          Próxima
        </button>
      </div>
    </div>
  )
}

export const CORES_STATUS: Record<string, string> = {
  LIBERADO: "#f59e0b",
  EM_SEPARACAO: "#2563eb",
  SEPARADO: "#16a34a",
  CANCELADO: "#ef4444",
  SEM_SEPARACAO: "#94a3b8",
}

export const ROTULOS_STATUS: Record<string, string> = {
  LIBERADO: "Liberado",
  EM_SEPARACAO: "Em separação",
  SEPARADO: "Separado",
  CANCELADO: "Cancelado",
  SEM_SEPARACAO: "Sem separação",
}
