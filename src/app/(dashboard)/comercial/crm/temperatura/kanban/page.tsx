"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { toast } from "sonner"
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Megaphone,
  RotateCcw,
  Search,
  ShoppingCart,
  Target,
  X,
} from "lucide-react"
import { InfoButton } from "@/components/ui/info-button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DecisaoAutomacaoModal } from "@/components/crm/decisao-automacao-modal"
import { DroppableColumn, KanbanSkeleton } from "@/components/crm/kanban-column"
import {
  MetricasModal,
  type TipoMetrica,
} from "@/components/crm/leads/metricas-modal"
import type { DecisaoPendente } from "@/lib/crm/automacoes-crm"
import { corPorTitulo } from "@/lib/dracula"
import { FAIXAS_CONVERSAO, contarFaixasConversao, type FaixaConversao } from "@/lib/crm/faixa-conversao"
import { STATUS_OPORTUNIDADE_PADRAO } from "@/lib/crm/status-oportunidade"
import {
  TEMPERATURA_FILTROS_VAZIOS,
  filtrarItensTemperatura,
  oportunidadesCandidatas,
  planoDaTransicao,
  temFiltrosTemperaturaAtivos,
  type EscolhasTemperatura,
  type TemperaturaFiltros,
  type TemperaturaItem,
} from "@/lib/crm/temperatura"
import { getInfoContent } from "@/lib/info-content"

type RespostaTemperatura = {
  itens: TemperaturaItem[]
  contagem: Record<FaixaConversao, number>
}

type MovimentoPendente = { item: TemperaturaItem; destino: FaixaConversao }

const valorFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

async function carregarTemperatura(): Promise<RespostaTemperatura> {
  const resposta = await fetch("/api/crm/temperatura")
  if (!resposta.ok) throw new Error("Não foi possível carregar o kanban de temperatura")
  return resposta.json()
}

function parar(evento: React.MouseEvent) {
  evento.stopPropagation()
}

function rotuloStatus(status: string) {
  return STATUS_OPORTUNIDADE_PADRAO.find((item) => item.nome === status)?.rotulo ?? status
}

function corStatus(status: string) {
  return STATUS_OPORTUNIDADE_PADRAO.find((item) => item.nome === status)?.cor ?? "#94a3b8"
}

function formatarValor(valor: string | number | null | undefined) {
  if (valor === null || valor === undefined || valor === "") return null
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return null
  return valorFormatter.format(numero)
}

function CabecalhoCard({ item }: { item: TemperaturaItem }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              item.tipo === "cliente"
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
            }`}
          >
            {item.tipo === "cliente" ? "Cliente" : "Lead"}
          </span>
          {item.status && (
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: corStatus(item.status) }}
                aria-hidden="true"
              />
              {rotuloStatus(item.status)}
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100" title={item.nome}>
          {item.nome}
        </p>
        {item.subtitulo && (
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400" title={item.subtitulo}>
            {item.subtitulo}
          </p>
        )}
        <p className="mt-0.5 font-mono text-[10px] text-slate-500 dark:text-slate-400">
          {item.documento || "—"}
        </p>
      </div>
      <span className="shrink-0 text-[10px] text-slate-400">#{item.entidadeId}</span>
    </div>
  )
}

function MetricaCard({
  label,
  valor,
  icone,
  onAbrir,
}: {
  label: string
  valor: number
  icone: React.ReactNode
  onAbrir: () => void
}) {
  return (
    <button
      type="button"
      onClick={(evento) => {
        parar(evento)
        onAbrir()
      }}
      className="flex min-w-0 flex-col items-center rounded-lg border border-slate-200 bg-white px-1 py-1.5 text-center transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-700 dark:hover:bg-blue-950/40"
    >
      {icone}
      <span className="mt-0.5 text-[10px] font-semibold tabular-nums text-slate-800 dark:text-slate-100">
        {valor}
      </span>
      <span className="truncate text-[9px] text-slate-500 dark:text-slate-400">{label}</span>
    </button>
  )
}

function CardTemperatura({
  item,
  onMover,
  onMetrica,
}: {
  item: TemperaturaItem
  onMover: (item: TemperaturaItem, destino: FaixaConversao) => void
  onMetrica: (item: TemperaturaItem, tipo: TipoMetrica) => void
}) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  })

  return (
    <article
      ref={setNodeRef}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
      {...attributes}
      {...listeners}
      onClick={() => router.push(item.href)}
      className={`cursor-grab rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm outline-none transition-shadow active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 ${
        isDragging ? "opacity-50 shadow-lg" : "card-hover"
      }`}
      aria-label={`${item.nome} — faixa ${rotuloFaixa(item.faixaConversao)}`}
    >
      <CabecalhoCard item={item} />
      <div className="mt-2 grid grid-cols-4 gap-1">
        <MetricaCard
          label="Oportun."
          valor={item.totalOportunidades}
          icone={<Target size={12} className="text-purple-500" />}
          onAbrir={() => onMetrica(item, "oportunidades")}
        />
        <MetricaCard
          label="Pedidos"
          valor={item.totalPedidos}
          icone={<ShoppingCart size={12} className="text-emerald-500" />}
          onAbrir={() => onMetrica(item, "pedidos")}
        />
        <MetricaCard
          label="Visitas"
          valor={item.totalVisitas}
          icone={<Calendar size={12} className="text-amber-500" />}
          onAbrir={() => onMetrica(item, "visitas")}
        />
        <MetricaCard
          label="Ações"
          valor={item.totalAcoes}
          icone={<Megaphone size={12} className="text-violet-500" />}
          onAbrir={() => onMetrica(item, "acoes")}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-100 pt-2 dark:border-slate-800">
        <Link
          href={item.href}
          onClick={parar}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Abrir cadastro <ExternalLink size={10} />
        </Link>
        <div className="flex items-center gap-1">
          {FAIXAS_CONVERSAO.map(({ faixa, rotulo }) => (
            <button
              key={faixa}
              type="button"
              disabled={faixa === item.faixaConversao}
              onClick={(evento) => {
                parar(evento)
                onMover(item, faixa)
              }}
              aria-label={`Mover ${item.nome} para ${rotulo}`}
              title={`Mover para ${rotulo}`}
              className="rounded border border-slate-200 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-600 disabled:cursor-default disabled:opacity-30 dark:border-slate-700 dark:text-slate-300"
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>
    </article>
  )
}

function rotuloFaixa(faixa: FaixaConversao) {
  return FAIXAS_CONVERSAO.find((item) => item.faixa === faixa)?.rotulo ?? faixa
}

export default function KanbanTemperaturaPage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname) ?? {
    title: "Kanban de Temperatura",
    description: "Quadro de leads e clientes por faixa de conversão.",
  }
  const queryClient = useQueryClient()
  const [filtros, setFiltros] = useState<TemperaturaFiltros>(TEMPERATURA_FILTROS_VAZIOS)
  const [itemArrastado, setItemArrastado] = useState<TemperaturaItem | null>(null)
  const [pendente, setPendente] = useState<MovimentoPendente | null>(null)
  const [escolhas, setEscolhas] = useState<EscolhasTemperatura>({})
  const [decisaoPendente, setDecisaoPendente] = useState<DecisaoPendente | null>(null)
  const [metricaAberta, setMetricaAberta] = useState<{
    item: TemperaturaItem
    tipo: TipoMetrica
  } | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["crm-temperatura"],
    queryFn: carregarTemperatura,
    retry: 1,
  })

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  const itens = useMemo(() => data?.itens ?? [], [data?.itens])
  const filtrados = useMemo(() => filtrarItensTemperatura(itens, filtros), [itens, filtros])
  const contagemFiltrada = useMemo(() => contarFaixasConversao(filtrados), [filtrados])
  const filtrosAtivos = temFiltrosTemperaturaAtivos(filtros)

  const mover = useMutation({
    mutationFn: async ({
      movimento,
      escolhasAtuais,
      decisao,
    }: {
      movimento: MovimentoPendente
      escolhasAtuais: EscolhasTemperatura
      decisao?: string
    }) => {
      const resposta = await fetch("/api/crm/temperatura/mover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: movimento.item.id,
          destino: movimento.destino,
          escolhas: escolhasAtuais,
          decisao,
        }),
      })
      const json = await resposta.json()
      if (!resposta.ok) {
        const erro = new Error(json.error || "Não foi possível mover o card") as Error & {
          decisaoPendente?: DecisaoPendente
        }
        erro.decisaoPendente = json.decisaoPendente
        throw erro
      }
      return json as RespostaTemperatura & { avisos?: string[] }
    },
  })

  function abrirMovimento(item: TemperaturaItem, destino: FaixaConversao) {
    const iniciais: EscolhasTemperatura = {}
    if (destino === "MORNO" && item.faixaConversao === "QUENTE") {
      iniciais.oportunidadesParaBaixarIds = item.oportunidades
        .filter((oportunidade) => oportunidade.status === "NEGOCIACAO")
        .map((oportunidade) => oportunidade.id)
    }
    if (destino === "FRIO") {
      iniciais.oportunidadesParaPerderIds = item.oportunidades
        .filter((oportunidade) => ["PROPOSTA", "NEGOCIACAO"].includes(oportunidade.status))
        .map((oportunidade) => oportunidade.id)
    }
    setPendente({ item, destino })
    setEscolhas(iniciais)
    setDecisaoPendente(null)
  }

  async function confirmarMovimento(decisao?: string) {
    if (!pendente) return
    try {
      const resposta = await mover.mutateAsync({ movimento: pendente, escolhasAtuais: escolhas, decisao })
      const atualizado = await queryClient.fetchQuery({
        queryKey: ["crm-temperatura"],
        queryFn: carregarTemperatura,
      })
      const visivel = filtrarItensTemperatura(atualizado.itens, filtros).some(
        (item) => item.id === pendente.item.id
      )
      setPendente(null)
      setDecisaoPendente(null)
      toast.success(`${pendente.item.nome} movido para ${rotuloFaixa(pendente.destino)}.`)
      for (const aviso of resposta.avisos ?? []) toast.info(aviso)
      if (!visivel) toast.info("O card saiu da lista porque não atende mais aos filtros ativos.")
    } catch (erro) {
      const pendenteDecisao = (erro as Error & { decisaoPendente?: DecisaoPendente }).decisaoPendente
      if (pendenteDecisao) {
        setDecisaoPendente(pendenteDecisao)
        return
      }
      toast.error(erro instanceof Error ? erro.message : "Não foi possível mover o card")
    }
  }

  const resultado = pendente
    ? planoDaTransicao(pendente.item, pendente.destino, escolhas)
    : null

  const candidatasSubida =
    pendente && (pendente.destino === "QUENTE" || pendente.destino === "MORNO")
      ? oportunidadesCandidatas(
          pendente.item,
          pendente.destino === "QUENTE" ? "NEGOCIACAO" : "PROPOSTA"
        )
      : []
  const negociacoes =
    pendente?.destino === "MORNO"
      ? pendente.item.oportunidades.filter((oportunidade) => oportunidade.status === "NEGOCIACAO")
      : []
  const oportunidadesParaPerder =
    pendente?.destino === "FRIO"
      ? pendente.item.oportunidades.filter((oportunidade) =>
          ["PROPOSTA", "NEGOCIACAO"].includes(oportunidade.status)
        )
      : []

  function alternarLista(
    campo: "oportunidadesParaBaixarIds" | "oportunidadesParaPerderIds",
    id: number
  ) {
    setEscolhas((anterior) => {
      const atual = anterior[campo] ?? []
      return {
        ...anterior,
        [campo]: atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id],
      }
    })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
            {info.title}
            <InfoButton content={info} label="Informações do kanban de temperatura" />
          </h1>
          <p className="mt-0.5 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            {info.description}
          </p>
        </div>
        <Link
          href="/comercial/crm"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={14} /> Voltar ao CRM
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <Input
            value={filtros.busca}
            onChange={(evento) => setFiltros((anterior) => ({ ...anterior, busca: evento.target.value }))}
            placeholder="Buscar leads e clientes"
            aria-label="Buscar leads e clientes"
            className="h-9 pl-9 text-sm"
          />
          {filtros.busca && (
            <button
              type="button"
              onClick={() => setFiltros((anterior) => ({ ...anterior, busca: "" }))}
              aria-label="Limpar busca"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700"
            role="radiogroup"
            aria-label="Filtrar por tipo"
          >
            {(["todos", "lead", "cliente"] as const).map((tipo) => (
              <button
                key={tipo}
                type="button"
                role="radio"
                aria-checked={filtros.tipo === tipo}
                onClick={() => setFiltros((anterior) => ({ ...anterior, tipo }))}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  filtros.tipo === tipo
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {tipo === "todos" ? "Todos" : tipo === "lead" ? "Leads" : "Clientes"}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={filtros.comOportunidade}
            onClick={() =>
              setFiltros((anterior) => ({ ...anterior, comOportunidade: !anterior.comOportunidade }))
            }
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
              filtros.comOportunidade
                ? "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                : "border-slate-200 text-slate-500 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400"
            }`}
          >
            <Target size={13} /> Com oportunidade ({itens.filter((item) => item.totalOportunidades > 0).length})
          </button>
          <button
            type="button"
            aria-pressed={filtros.comPedido}
            onClick={() => setFiltros((anterior) => ({ ...anterior, comPedido: !anterior.comPedido }))}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
              filtros.comPedido
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-slate-200 text-slate-500 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400"
            }`}
          >
            <ShoppingCart size={13} /> Com pedido ({itens.filter((item) => item.totalPedidos > 0).length})
          </button>
          {filtrosAtivos && (
            <button
              type="button"
              onClick={() => setFiltros(TEMPERATURA_FILTROS_VAZIOS)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400"
            >
              <RotateCcw size={13} /> Limpar filtros
            </button>
          )}
          <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
            {filtrados.length} de {itens.length} card(s)
          </span>
        </div>
      </div>

      {isLoading ? (
        <KanbanSkeleton />
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          Não foi possível carregar o kanban de temperatura.
        </div>
      ) : (
        <DndContext
          sensors={sensores}
          onDragStart={(evento) => {
            setItemArrastado((evento.active.data.current?.item as TemperaturaItem | undefined) ?? null)
          }}
          onDragCancel={() => setItemArrastado(null)}
          onDragEnd={(evento) => {
            const item = evento.active.data.current?.item as TemperaturaItem | undefined
            const destino = String(evento.over?.id ?? "") as FaixaConversao
            setItemArrastado(null)
            if (!item || !FAIXAS_CONVERSAO.some((faixa) => faixa.faixa === destino)) return
            if (item.faixaConversao === destino) return
            abrirMovimento(item, destino)
          }}
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {FAIXAS_CONVERSAO.map(({ faixa, rotulo, descricao }) => {
              const estilo = corPorTitulo(rotulo)
              return (
                <DroppableColumn
                  key={faixa}
                  id={faixa}
                  rotulo={rotulo}
                  cor={estilo.cor}
                  count={contagemFiltrada[faixa]}
                >
                  <p className="mb-2 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
                    {descricao}
                  </p>
                  <div className="space-y-2">
                    {filtrados
                      .filter((item) => item.faixaConversao === faixa)
                      .map((item) => (
                        <CardTemperatura
                          key={item.id}
                          item={item}
                          onMover={abrirMovimento}
                          onMetrica={(selecionado, tipo) => setMetricaAberta({ item: selecionado, tipo })}
                        />
                      ))}
                    {contagemFiltrada[faixa] === 0 && (
                      <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-700">
                        Nenhum card nesta faixa com os filtros atuais.
                      </p>
                    )}
                  </div>
                </DroppableColumn>
              )
            })}
          </div>
          <DragOverlay>
            {itemArrastado && (
              <div className="w-64 rounded-xl border border-blue-400 bg-white p-3 shadow-xl dark:bg-slate-900">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {itemArrastado.nome}
                </p>
                <p className="text-[10px] text-slate-500">{itemArrastado.documento || "—"}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <Dialog open={pendente !== null} onOpenChange={(aberto) => !aberto && setPendente(null)}>
        <DialogContent className="max-h-[88vh] overflow-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Mover {pendente?.item.nome} para {pendente ? rotuloFaixa(pendente.destino) : ""}
            </DialogTitle>
            <DialogDescription>
              A faixa é calculada a partir das oportunidades. Reveja as alterações necessárias antes de confirmar.
            </DialogDescription>
          </DialogHeader>

          {resultado && !resultado.ok && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              {resultado.erro}
            </div>
          )}

          {pendente &&
            (pendente.destino === "QUENTE" || pendente.destino === "MORNO") &&
            (pendente.item.faixaConversao !== "QUENTE" || pendente.destino === "QUENTE") && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  Oportunidade para {pendente.destino === "QUENTE" ? "Negociação" : "Proposta"}
                </legend>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700">
                  <input
                    type="radio"
                    name="oportunidade-temperatura"
                    checked={escolhas.oportunidadeId === "nova"}
                    onChange={() => setEscolhas((anterior) => ({ ...anterior, oportunidadeId: "nova" }))}
                  />
                  Criar nova oportunidade
                </label>
                {candidatasSubida.map((oportunidade) => (
                  <label
                    key={oportunidade.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <input
                        type="radio"
                        name="oportunidade-temperatura"
                        checked={escolhas.oportunidadeId === oportunidade.id}
                        onChange={() =>
                          setEscolhas((anterior) => ({ ...anterior, oportunidadeId: oportunidade.id }))
                        }
                      />
                      <span className="truncate">{oportunidade.titulo}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-500">
                      {rotuloStatus(oportunidade.status)}
                      {formatarValor(oportunidade.valorEstimado) &&
                        ` · ${formatarValor(oportunidade.valorEstimado)}`}
                    </span>
                  </label>
                ))}
              </fieldset>
            )}

          {pendente?.destino === "MORNO" && negociacoes.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-800 dark:text-slate-100">
                Rebaixar para Proposta
              </legend>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Todas as oportunidades em Negociação precisam sair dessa etapa para o card ficar Morno.
              </p>
              {negociacoes.map((oportunidade) => (
                <label
                  key={oportunidade.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={(escolhas.oportunidadesParaBaixarIds ?? []).includes(oportunidade.id)}
                    onChange={() => alternarLista("oportunidadesParaBaixarIds", oportunidade.id)}
                  />
                  {oportunidade.titulo}
                </label>
              ))}
            </fieldset>
          )}

          {pendente?.destino === "FRIO" && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-800 dark:text-slate-100">
                Perder oportunidades
              </legend>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Todas as oportunidades em Proposta ou Negociação precisam ser perdidas para o card ficar Frio.
              </p>
              {oportunidadesParaPerder.map((oportunidade) => (
                <label
                  key={oportunidade.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={(escolhas.oportunidadesParaPerderIds ?? []).includes(oportunidade.id)}
                    onChange={() => alternarLista("oportunidadesParaPerderIds", oportunidade.id)}
                  />
                  {oportunidade.titulo}
                </label>
              ))}
              <label className="block text-sm font-medium text-slate-800 dark:text-slate-100" htmlFor="motivo-perda">
                Motivo da perda
              </label>
              <textarea
                id="motivo-perda"
                value={escolhas.motivoPerda ?? ""}
                onChange={(evento) => setEscolhas((anterior) => ({ ...anterior, motivoPerda: evento.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                placeholder="Ex.: cliente optou por outro fornecedor"
              />
            </fieldset>
          )}

          {resultado?.ok &&
            resultado.plano.avisos.map((aviso) => (
              <p key={aviso} className="text-xs text-slate-500 dark:text-slate-400">
                {aviso}
              </p>
            ))}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setPendente(null)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!resultado?.ok || mover.isPending}
              onClick={() => confirmarMovimento()}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mover.isPending ? "Salvando..." : "Confirmar mudança"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <DecisaoAutomacaoModal
        open={decisaoPendente !== null}
        titulo="Última oportunidade da lead"
        mensagem={decisaoPendente?.mensagem ?? ""}
        opcoes={decisaoPendente?.opcoes ?? []}
        onCancel={() => setDecisaoPendente(null)}
        onEscolher={(valor) => confirmarMovimento(valor)}
      />

      {metricaAberta && (
        <MetricasModal
          tipo={metricaAberta.tipo}
          entidade={metricaAberta.item.tipo}
          entidadeId={metricaAberta.item.entidadeId}
          entidadeNome={metricaAberta.item.nome}
          onClose={() => setMetricaAberta(null)}
        />
      )}
    </div>
  )
}
