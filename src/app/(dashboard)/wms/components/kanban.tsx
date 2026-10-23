"use client"

import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"

export type KanbanColuna<T> = {
  id: string
  rotulo: string
  cor: string
  itens: T[]
}

function CartaoArrastavel<T>({
  item,
  chave,
  destacado,
  renderCard,
  destinos,
  onMover,
  rotuloMover,
}: {
  item: T
  chave: string
  destacado: boolean
  renderCard: (item: T) => React.ReactNode
  destinos: KanbanColuna<T>[]
  onMover?: (item: T, colunaId: string) => void
  rotuloMover: string
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: chave,
    data: { item },
    disabled: !onMover,
  })

  return (
    <article
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`space-y-2 rounded-lg border bg-white dark:bg-slate-950 p-3 shadow-sm transition-shadow ${
        destacado ? "border-blue-500 ring-2 ring-blue-500/30" : "border-slate-200 dark:border-slate-700"
      } ${isDragging ? "opacity-40" : "opacity-100"} ${
        onMover ? "cursor-grab active:cursor-grabbing" : ""
      } hover:shadow-md`}
    >
      {renderCard(item)}
      {onMover && destinos.length > 0 && (
        <select
          aria-label={`${rotuloMover}: ${chave}`}
          value=""
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onChange={(event) => {
            const destino = event.target.value
            if (destino) onMover(item, destino)
            event.target.value = ""
          }}
          className="w-full h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 text-xs text-slate-600 dark:text-slate-300"
        >
          <option value="">{rotuloMover}…</option>
          {destinos.map((destino) => (
            <option key={destino.id} value={destino.id}>
              {destino.rotulo}
            </option>
          ))}
        </select>
      )}
    </article>
  )
}

function ColunaKanban<T>({
  coluna,
  ativa,
  renderCard,
  chave,
  colunas,
  podeMover,
  onMover,
  rotuloMover,
  vazio,
}: {
  coluna: KanbanColuna<T>
  ativa: boolean
  renderCard: (item: T) => React.ReactNode
  chave: (item: T) => string
  colunas: KanbanColuna<T>[]
  podeMover?: (item: T, colunaId: string) => boolean
  onMover?: (item: T, colunaId: string) => void
  rotuloMover: string
  vazio: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id })

  return (
    <section
      ref={setNodeRef}
      aria-label={`Coluna ${coluna.rotulo}`}
      className={`flex flex-col flex-1 min-w-[220px] rounded-xl border bg-slate-100 dark:bg-slate-900 transition-colors ${
        isOver
          ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30"
          : "border-slate-200 dark:border-slate-800"
      }`}
      style={{ borderTopColor: coluna.cor, borderTopWidth: 4 }}
    >
      <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-200 dark:border-slate-800">
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: coluna.cor }}
        />
        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
          {coluna.rotulo}
        </span>
        <span className="ml-auto text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
          {coluna.itens.length}
        </span>
      </div>
      <div className="flex-1 p-2.5 space-y-2.5 min-h-[140px]">
        {coluna.itens.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
            {vazio}
          </p>
        ) : (
          coluna.itens.map((item) => {
            const destinos = onMover
              ? colunas.filter(
                  (destino) =>
                    destino.id !== coluna.id &&
                    (!podeMover || podeMover(item, destino.id))
                )
              : []
            return (
              <CartaoArrastavel
                key={chave(item)}
                item={item}
                chave={chave(item)}
                destacado={ativa}
                renderCard={renderCard}
                destinos={destinos}
                onMover={onMover}
                rotuloMover={rotuloMover}
              />
            )
          })
        )}
      </div>
    </section>
  )
}

export function KanbanWms<T>({
  colunas,
  renderCard,
  chave,
  onMover,
  podeMover,
  rotuloMover = "Mover para",
  vazio,
}: {
  colunas: KanbanColuna<T>[]
  renderCard: (item: T) => React.ReactNode
  chave?: (item: T) => string
  onMover?: (item: T, colunaId: string) => void
  podeMover?: (item: T, colunaId: string) => boolean
  rotuloMover?: string
  vazio?: string
}) {
  const [ativo, setAtivo] = useState<T | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )
  const idDoItem = chave ?? ((item: T) => String(item))

  function iniciar(event: DragStartEvent) {
    setAtivo((event.active.data.current?.item as T | undefined) ?? null)
  }

  function soltar(event: DragEndEvent) {
    setAtivo(null)
    const { active, over } = event
    if (!over || !onMover) return
    const item = active.data.current?.item as T | undefined
    const destino = String(over.id)
    if (!item) return
    if (podeMover && !podeMover(item, destino)) return
    onMover(item, destino)
  }

  return (
    <DndContext sensors={sensors} onDragStart={iniciar} onDragEnd={soltar}>
      <div className="flex items-stretch gap-3 overflow-x-auto pb-2 min-w-full">
        {colunas.map((coluna) => (
          <ColunaKanban
            key={coluna.id}
            coluna={coluna}
            ativa={ativo != null && coluna.itens.includes(ativo)}
            renderCard={renderCard}
            chave={idDoItem}
            colunas={colunas}
            podeMover={podeMover}
            onMover={onMover}
            rotuloMover={rotuloMover}
            vazio={vazio ?? "Nenhum item"}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {ativo ? (
          <div className="w-72 rounded-lg border border-blue-400 bg-white dark:bg-slate-950 p-3 shadow-xl">
            {renderCard(ativo)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
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
