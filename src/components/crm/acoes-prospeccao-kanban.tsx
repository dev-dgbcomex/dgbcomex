"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { Loader2, MapPin, Navigation } from "lucide-react"
import { useStatuses, type StatusConfig } from "@/hooks/use-statuses"
import AcaoProspeccaoLocationModal from "@/components/crm/acao-prospeccao-location-modal"
import type { AcaoProspeccaoResumo } from "@/app/(dashboard)/comercial/crm/acoes-prospeccao/types"

const TIPO_LABELS: Record<string, string> = {
  PRESENCIAL: "Presencial",
  VIDEO: "Vídeo",
  TELEFONE: "Telefone",
}

function formatarData(data: string | null) {
  if (!data) return "—"
  return new Date(data + "T12:00:00").toLocaleDateString("pt-BR")
}

function isFutura(data: string | null) {
  if (!data) return false
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const acao = new Date(data + "T12:00:00")
  return acao > hoje
}

function buildGoogleMapsUrl(acao: AcaoProspeccaoResumo) {
  const parts = [
    acao.endereco,
    acao.numero,
    acao.complemento,
    acao.bairro,
    acao.cidade,
    acao.uf,
  ].filter(Boolean)
  if (parts.length === 0) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`
}

function nomeEntidade(acao: AcaoProspeccaoResumo) {
  if (!acao.empresaId && !acao.clienteId) return acao.nomeAvulso || "Avulsa"
  return acao.empresaNome || acao.clienteNome || "Ação de Prospecção"
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
  cor: string | null
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
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: cor || "#94a3b8" }}
        />
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{rotulo}</span>
        <span className="ml-auto text-xs font-medium text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      <div className="flex-1 min-h-0 p-2 space-y-2 overflow-y-auto">{children}</div>
    </div>
  )
}

function DraggableCard({
  acao,
  statusOptions,
  onLocationClick,
  onStatusChange,
}: {
  acao: AcaoProspeccaoResumo
  statusOptions: StatusConfig[]
  onLocationClick: (id: number, nome: string) => void
  onStatusChange: (id: number, status: string) => void
}) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `acao-${acao.id}`,
    data: { acao },
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined

  const mapsUrl = buildGoogleMapsUrl(acao)
  const future = isFutura(acao.dataAcao)

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${future ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"}`}
        >
          {formatarData(acao.dataAcao)}
          {acao.hora ? ` ${acao.hora}` : ""}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400">
            {TIPO_LABELS[acao.tipo] || acao.tipo}
          </span>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
              aria-label="Abrir no Google Maps"
              title="Abrir no Google Maps"
            >
              <Navigation size={12} className="text-emerald-500" />
            </a>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onLocationClick(acao.id, nomeEntidade(acao))
            }}
            className="p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
            aria-label="Gerenciar localizações"
            title="Gerenciar localizações"
          >
            <MapPin size={12} className="text-blue-500" />
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          router.push(`/comercial/crm/acoes-prospeccao/${acao.id}`)
        }}
        className="block text-left w-full"
      >
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1 leading-snug line-clamp-2">
          {!acao.empresaId && !acao.clienteId ? (
            <span>
              <span className="text-orange-500">Avulsa:</span> {acao.nomeAvulso || "Sem entidade"}
            </span>
          ) : (
            acao.empresaNome || acao.clienteNome || "Sem entidade"
          )}
        </p>
      </button>
      {acao.oportunidadeTitulo && (
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{acao.oportunidadeTitulo}</p>
      )}
      <p className="text-xs text-slate-400 mt-1">{acao.criadoPorNome || ""}</p>
      <select
        value={acao.status}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onStatusChange(acao.id, e.target.value)}
        aria-label={`Alterar status de ${nomeEntidade(acao)}`}
        className="mt-2 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
      >
        {statusOptions.map((status) => (
          <option key={status.nome} value={status.nome}>
            {status.rotulo || status.nome}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function AcoesProspeccaoKanban({
  acoes,
}: {
  acoes: AcaoProspeccaoResumo[]
}) {
  const { statuses, loading: statusLoading, getLabel } = useStatuses("ACAO_PROSPECCAO")
  const [activeCard, setActiveCard] = useState<AcaoProspeccaoResumo | null>(null)
  const [cards, setCards] = useState<AcaoProspeccaoResumo[]>(acoes || [])
  const [selectedAcao, setSelectedAcao] = useState<{ id: number; nome: string } | null>(null)

  useEffect(() => {
    setCards(acoes || [])
  }, [acoes])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  const colunas = statuses
    .filter((status: StatusConfig) => status.ativo !== false)
    .map((status: StatusConfig) => ({
      ...status,
      cards: cards.filter((acao: AcaoProspeccaoResumo) => acao.status === status.nome),
    }))

  async function alterarStatus(id: number, novoStatus: string) {
    const acao = cards.find((item) => item.id === id)
    if (!acao || acao.status === novoStatus) return
    const statusAntigo = acao.status
    setCards((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: novoStatus } : item))
    )
    try {
      const res = await fetch(`/api/crm/acoes-prospeccao/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao alterar status")
      }
      toast.success(`Ação de Prospecção movida para ${getLabel(novoStatus)}`)
    } catch (err) {
      setCards((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: statusAntigo } : item))
      )
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const card = event.active.data.current?.acao as AcaoProspeccaoResumo | undefined
    if (card) setActiveCard(card)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null)

    const { active, over } = event
    if (!over || active.id === over.id) return

    const acao = active.data.current?.acao as AcaoProspeccaoResumo | undefined
    if (!acao) return

    const novoStatus = String(over.id)
    await alterarStatus(acao.id, novoStatus)
  }

  if (statusLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-280px)]">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 min-h-0 flex gap-4 overflow-x-auto pb-2">
          {colunas.map((col) => (
            <DroppableColumn
              key={col.nome}
              id={col.nome}
              rotulo={col.rotulo || col.nome}
              cor={col.cor}
              count={col.cards.length}
            >
              {col.cards.map((card) => (
                <DraggableCard
                  key={`acao-${card.id}`}
                  acao={card}
                  statusOptions={statuses}
                  onLocationClick={(id, nome) => setSelectedAcao({ id, nome })}
                  onStatusChange={alterarStatus}
                />
              ))}
            </DroppableColumn>
          ))}
        </div>

        {activeCard && (
          <DragOverlay>
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-blue-400 shadow-xl p-3 w-72 opacity-90">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                  {formatarData(activeCard.dataAcao)}
                  {activeCard.hora ? ` ${activeCard.hora}` : ""}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-900 mt-1">{nomeEntidade(activeCard)}</p>
            </div>
          </DragOverlay>
        )}
      </DndContext>

      {selectedAcao && (
        <AcaoProspeccaoLocationModal
          acaoId={selectedAcao.id}
          empresaNome={selectedAcao.nome}
          open={!!selectedAcao}
          onClose={() => setSelectedAcao(null)}
        />
      )}
    </div>
  )
}
