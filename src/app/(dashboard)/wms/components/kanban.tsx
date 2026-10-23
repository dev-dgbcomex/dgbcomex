"use client"

import { useState } from "react"
import Link from "next/link"
import {
  DndContext,
  DragOverlay,
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

function DroppableColumn({
  id,
  children,
  rotulo,
  cor,
  count,
}: {
  id: string
  children: React.ReactNode
  rotulo: string
  cor: string
  count: number
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full w-72 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors shrink-0 ${
        isOver ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30" : ""
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cor }} />
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {rotulo}
        </span>
        <span className="ml-auto text-xs font-medium text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      <div className="flex-1 min-h-0 p-2 space-y-2 overflow-y-auto">{children}</div>
    </div>
  )
}

function DraggableCard<T>({
  id,
  item,
  disabled,
  children,
}: {
  id: string
  item: T
  disabled?: boolean
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { item },
    disabled,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${
        isDragging ? "opacity-50 shadow-lg" : ""
      } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
    >
      {children}
    </div>
  )
}

export function KanbanWms<T>({
  colunas,
  renderCard,
  chave,
  onMover,
  podeMover,
  vazio = "Nenhum item",
  className,
}: {
  colunas: KanbanColuna<T>[]
  renderCard: (item: T) => React.ReactNode
  chave?: (item: T) => string
  onMover?: (item: T, colunaId: string) => void
  podeMover?: (item: T, colunaId: string) => boolean
  vazio?: string
  className?: string
}) {
  const [ativo, setAtivo] = useState<{ item: T; colunaId: string } | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )
  const idDoItem = chave ?? ((item: T) => String(item))

  function iniciar(event: DragStartEvent) {
    const item = event.active.data.current?.item as T | undefined
    if (!item) return
    const colunaId = colunas.find((c) => c.itens.includes(item))?.id
    setAtivo(colunaId ? { item, colunaId } : { item, colunaId: "" })
  }

  function soltar(event: DragEndEvent) {
    const { active, over } = event
    const item = active.data.current?.item as T | undefined
    setAtivo(null)
    if (!over || !item || !onMover) return
    const destino = String(over.id)
    if (ativo?.colunaId === destino) return
    if (podeMover && !podeMover(item, destino)) return
    onMover(item, destino)
  }

  return (
    <DndContext sensors={sensors} onDragStart={iniciar} onDragEnd={soltar}>
      <div
        className={`flex h-[calc(100vh-280px)] min-h-[520px] gap-3 overflow-x-auto overflow-y-hidden pb-2 ${className ?? ""}`}
      >
        {colunas.map((coluna) => (
          <DroppableColumn
            key={coluna.id}
            id={coluna.id}
            rotulo={coluna.rotulo}
            cor={coluna.cor}
            count={coluna.itens.length}
          >
            {coluna.itens.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                {vazio}
              </div>
            ) : (
              coluna.itens.map((item) => {
                const id = idDoItem(item)
                const arrastavel = !!onMover && (!podeMover || podeMover(item, coluna.id))
                return (
                  <DraggableCard key={id} id={id} item={item} disabled={!arrastavel}>
                    {renderCard(item)}
                  </DraggableCard>
                )
              })
            )}
          </DroppableColumn>
        ))}
      </div>
      <DragOverlay>
        {ativo ? (
          <div className="w-72 rounded-lg border border-blue-400 bg-white dark:bg-slate-800 p-3 shadow-xl cursor-grabbing">
            {renderCard(ativo.item)}
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
