"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChartCard, ChartCardBody } from "@/components/ui/chart-card"
import { ChartTooltip } from "@/components/ui/chart-tooltip"
import {
  ORIENTACAO_LABEL,
  agruparPorNf,
  filtrarGruposPorBusca,
  topPorFaturamento,
  topPorProduto,
} from "./utils"
import { formatarMetragem, formatarPeso, formatarValor } from "./utils"
import type { GrupoFaturamento } from "./types"

const CORES = ["#0f766e", "#1d4ed8", "#b45309", "#7c3aed", "#be123c", "#0369a1", "#4d7c0f"]

/**
 * A ordem é do usuário, não do navegador: mora em `usuarios.bi_ordem_graficos` e
 * segue a pessoa entre máquinas. O `localStorage` só cobre o primeiro acesso /
 * API fora do ar, e é descartado assim que o servidor responde.
 */
const CHAVE_CACHE = "faturamento_graficos_ordem"

type IdGrafico = "mes" | "clientes" | "produtos" | "participacao"

const ORDEM_PADRAO: IdGrafico[] = ["mes", "clientes", "produtos", "participacao"]

const TITULOS: Record<IdGrafico, string> = {
  mes: "Faturamento e metragem por mês",
  clientes: "Faturamento e metragem por cliente (top 8)",
  produtos: "Faturamento e metragem por produto (top 8)",
  participacao: "Participação por representante",
}

/** Ignora ids desconhecidos (versão antiga salva) e completa os que faltarem. */
function normalizarOrdem(salva: unknown): IdGrafico[] {
  const validos = Array.isArray(salva)
    ? (salva.filter((id) => ORDEM_PADRAO.includes(id as IdGrafico)) as IdGrafico[])
    : []
  const faltando = ORDEM_PADRAO.filter((id) => !validos.includes(id))
  return [...validos, ...faltando]
}

interface Props {
  grupos: GrupoFaturamento[]
  faturamentoTotal: number
  totalItens: number
  totalNotas: number
  totalMetros: number
  totalPeso: number
}

interface KpiProps {
  rotulo: string
  valor: string
  detalhe?: string
}

function Kpi({ rotulo, valor, detalhe }: KpiProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {rotulo}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{detalhe}</p>}
    </div>
  )
}

/** Cartão de gráfico com handle de arraste e alternativa por teclado (setas). */
function GraficoOrdenado({
  id,
  titulo,
  children,
  aoMover,
  podeSubir,
  podeDescer,
}: {
  id: IdGrafico
  titulo: string
  children: React.ReactNode
  aoMover: (delta: 1 | -1) => void
  podeSubir: boolean
  podeDescer: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform ?? null), transition }}
      className={`h-full ${isDragging ? "z-10 opacity-90" : "z-0"}`}
    >
      <ChartCard
        title={titulo}
        // Altura uniforme: o card estica até a do vizinho mais alto e o gráfico
        // ocupa o que sobra, então a pizza com legenda não desalinha a grade.
        className={`flex h-full flex-col ${isDragging ? "ring-2 ring-teal-500" : ""}`}
        actions={
          <>
            <button
              type="button"
              aria-label={`Arrastar ${titulo} para reordenar`}
              className="cursor-grab touch-none rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-800 dark:hover:text-slate-200"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              aria-label={`Mover ${titulo} para cima`}
              disabled={!podeSubir}
              onClick={() => aoMover(-1)}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              aria-label={`Mover ${titulo} para baixo`}
              disabled={!podeDescer}
              onClick={() => aoMover(1)}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </>
        }
      >
        {children}
      </ChartCard>
    </div>
  )
}

/** Legenda em HTML — é o padrão do projeto (ver `comercial/crm/charts.tsx`). */
function LegendaRepresentantes({
  dados,
}: {
  dados: { representante: string; faturamento: number; fill: string }[]
}) {
  const total = dados.reduce((soma, d) => soma + d.faturamento, 0)
  return (
    <ul
      aria-label="Legenda da participação por representante"
      className="mt-2 flex flex-wrap justify-center gap-1.5"
    >
      {dados.map((d) => {
        const parte = total > 0 ? (d.faturamento / total) * 100 : 0
        return (
          <li
            key={d.representante}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: d.fill }}
            />
            <span className="max-w-[120px] truncate" title={d.representante}>
              {d.representante}
            </span>
            <span className="text-slate-400">{parte.toFixed(1)}%</span>
          </li>
        )
      })}
    </ul>
  )
}

export function FaturamentoCharts({
  grupos,
  faturamentoTotal,
  totalItens,
  totalNotas,
  totalMetros,
  totalPeso,
}: Props) {
  const [ordem, setOrdem] = useState<IdGrafico[]>(ORDEM_PADRAO)
  const queryClient = useQueryClient()

  const { data: ordemServida } = useQuery<{ ids: IdGrafico[] }>({
    queryKey: ["faturamento-ordem-graficos"],
    queryFn: async () => {
      const res = await fetch("/api/integracao/ordem-graficos")
      if (!res.ok) throw new Error("Erro ao ler a ordem dos gráficos")
      const json = await res.json()
      return { ids: Array.isArray(json?.ids) ? json.ids : [] }
    },
    retry: false,
  })

  const salvarOrdem = useMutation({
    mutationFn: async (ids: IdGrafico[]) => {
      const res = await fetch("/api/integracao/ordem-graficos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Erro ao salvar a ordem")
      }
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["faturamento-ordem-graficos"] }),
  })

  // A ordem salva no servidor manda. Sem ela (primeiro acesso ou API fora), cai no
  // cache local; cache corrompido é apagado em vez de derrubar a tela.
  useEffect(() => {
    if (ordemServida?.ids?.length) {
      setOrdem(normalizarOrdem(ordemServida.ids))
      return
    }
    try {
      const bruto = localStorage.getItem(CHAVE_CACHE)
      if (!bruto) return
      setOrdem(normalizarOrdem(JSON.parse(bruto)))
    } catch {
      localStorage.removeItem(CHAVE_CACHE)
    }
  }, [ordemServida])

  function reordenar(nova: IdGrafico[]) {
    setOrdem(nova)
    localStorage.setItem(CHAVE_CACHE, JSON.stringify(nova))
    salvarOrdem.mutate(nova, {
      onError: () => {
        // A ordem fica no cache local; o servidor volta a mandar no próximo load.
        queryClient.invalidateQueries({ queryKey: ["faturamento-ordem-graficos"] })
      },
    })
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } })
  )

  function aoArrastar(evento: DragEndEvent) {
    const { active, over } = evento
    if (!over || active.id === over.id) return
    const de = ordem.indexOf(active.id as IdGrafico)
    const para = ordem.indexOf(over.id as IdGrafico)
    if (de < 0 || para < 0) return
    reordenar(arrayMove(ordem, de, para))
  }

  function mover(id: IdGrafico, delta: 1 | -1) {
    const de = ordem.indexOf(id)
    const para = de + delta
    if (de < 0 || para < 0 || para >= ordem.length) return
    reordenar(arrayMove(ordem, de, para))
  }

  const porMes = useMemo(() => {
    const mapa = new Map<string, { mes: string; faturamento: number; metros: number }>()
    for (const grupo of grupos) {
      const partes = (grupo.data_nota || "").split("-")
      if (partes.length !== 3) continue
      const rotulo = `${partes[1]}/${partes[0].slice(2)}`
      const atual = mapa.get(rotulo) ?? { mes: rotulo, faturamento: 0, metros: 0 }
      atual.faturamento += grupo.faturamento
      atual.metros += grupo.totalMetros
      mapa.set(rotulo, atual)
    }
    return [...mapa.values()].sort((a, b) => a.mes.localeCompare(b.mes))
  }, [grupos])

  const topClientes = useMemo(
    () =>
      topPorFaturamento(
        (grupo) => {
          const nome = grupo.nome_cliente || grupo.cliente || "Sem cliente"
          return { chave: nome, rotulo: nome }
        },
        grupos
      ).map((serie) => ({ nome: serie.rotulo, faturamento: serie.faturamento, metros: serie.metros })),
    [grupos]
  )

  const topProdutos = useMemo(() => topPorProduto(grupos), [grupos])

  const topRepresentantes = useMemo(
    () =>
      topPorFaturamento(
        (grupo) => {
          const nome = grupo.representante || "Sem representante"
          return { chave: nome, rotulo: nome }
        },
        grupos
      ).map((serie) => ({ representante: serie.rotulo, faturamento: serie.faturamento })),
    [grupos]
  )

  const representacao = useMemo(
    () =>
      topRepresentantes.map((item, i) => ({ ...item, fill: CORES[i % CORES.length] })),
    [topRepresentantes]
  )

  const graficos: Record<IdGrafico, React.ReactNode> = {
    mes: (
      <ChartCardBody>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={porMes} margin={{ bottom: 8 }}>
          <defs>
            <linearGradient id="gradFaturamento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f766e" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#0f766e" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <YAxis
            yAxisId="valor"
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
            tickFormatter={(v) => formatarValor(Number(v))}
          />
          <YAxis
            yAxisId="metros"
            orientation="right"
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
            tickFormatter={(v) => `${Math.round(Number(v))} m`}
          />
          <Tooltip
            content={<ChartTooltip formatter={(v, nome) => (nome === "Metros" ? formatarMetragem(v) : formatarValor(v))} />}
          />
          <Area
            yAxisId="valor"
            type="monotone"
            dataKey="faturamento"
            name="Faturamento"
            stroke="#0f766e"
            strokeWidth={2.5}
            fill="url(#gradFaturamento)"
            animationDuration={1200}
          />
          <Line
            yAxisId="metros"
            type="monotone"
            dataKey="metros"
            name="Metros"
            stroke="#b45309"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 5 }}
            animationDuration={1200}
          />
</AreaChart>
        </ResponsiveContainer>
      </ChartCardBody>
    ),
    clientes: (
      <ChartCardBody>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topClientes} margin={{ bottom: 8 }}>
          <defs>
            <linearGradient id="gradCliente" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="nome"
            tick={{ fontSize: 10 }}
            stroke="#94a3b8"
            interval={0}
            angle={-20}
            textAnchor="end"
            height={70}
            tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
          />
          <YAxis
            yAxisId="valor"
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
            tickFormatter={(v) => formatarValor(Number(v))}
          />
          <YAxis
            yAxisId="metros"
            orientation="right"
            tick={{ fontSize: 10 }}
            stroke="#94a3b8"
            tickFormatter={(v) => `${Math.round(Number(v))} m`}
          />
          <Tooltip
            cursor={{ fill: "#94a3b8", fillOpacity: 0.08 }}
            content={
              <ChartTooltip
                formatter={(v, nome) => (nome === "Metros" ? formatarMetragem(v) : formatarValor(v))}
              />
            }
          />
          <Bar
            yAxisId="valor"
            dataKey="faturamento"
            name="Faturamento"
            fill="url(#gradCliente)"
            radius={[6, 6, 0, 0]}
            maxBarSize={44}
            animationDuration={1000}
          />
          <Line
            yAxisId="metros"
            type="monotone"
            dataKey="metros"
            name="Metros"
            stroke="#b45309"
            strokeWidth={2}
            dot={{ r: 3, fill: "#b45309" }}
            activeDot={{ r: 5 }}
            animationDuration={1000}
          />
        </BarChart>
        </ResponsiveContainer>
      </ChartCardBody>
    ),
    produtos: (
      <ChartCardBody>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topProdutos} margin={{ bottom: 8 }}>
          <defs>
            <linearGradient id="gradProduto" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f766e" />
              <stop offset="100%" stopColor="#0f766e" stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="produto"
            tick={{ fontSize: 10 }}
            stroke="#94a3b8"
            interval={0}
            angle={-20}
            textAnchor="end"
            height={70}
          />
          <YAxis
            yAxisId="valor"
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
            tickFormatter={(v) => formatarValor(Number(v))}
          />
          <YAxis
            yAxisId="metros"
            orientation="right"
            tick={{ fontSize: 10 }}
            stroke="#94a3b8"
            tickFormatter={(v) => `${Math.round(Number(v))} m`}
          />
          <Tooltip
            cursor={{ fill: "#94a3b8", fillOpacity: 0.08 }}
            content={
              <ChartTooltip
                formatter={(v, nome) => (nome === "Metros" ? formatarMetragem(v) : formatarValor(v))}
              />
            }
          />
          <Bar
            yAxisId="valor"
            dataKey="faturamento"
            name="Faturamento"
            fill="url(#gradProduto)"
            radius={[6, 6, 0, 0]}
            maxBarSize={44}
            animationDuration={1000}
          />
          <Line
            yAxisId="metros"
            type="monotone"
            dataKey="metros"
            name="Metros"
            stroke="#b45309"
            strokeWidth={2}
            dot={{ r: 3, fill: "#b45309" }}
            activeDot={{ r: 5 }}
            animationDuration={1000}
          />
        </BarChart>
        </ResponsiveContainer>
      </ChartCardBody>
    ),
    participacao: (
      <>
        <ChartCardBody>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={representacao}
                dataKey="faturamento"
                nameKey="representante"
                innerRadius="45%"
                outerRadius="78%"
                paddingAngle={2}
                startAngle={90}
                endAngle={-270}
                animationDuration={1200}
                stroke="#fff"
                strokeWidth={2}
              >
                {representacao.map((entrada) => (
                  <Cell key={entrada.representante} fill={entrada.fill} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip formatter={(v) => formatarValor(v)} />} />
</PieChart>
          </ResponsiveContainer>
        </ChartCardBody>
        <LegendaRepresentantes dados={representacao} />
      </>
    ),
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi
          rotulo="Faturamento"
          valor={formatarValor(faturamentoTotal)}
          detalhe={`${totalNotas} notas`}
        />
        <Kpi
          rotulo="Itens"
          valor={totalItens.toLocaleString("pt-BR")}
          detalhe={`${(totalItens / Math.max(totalNotas, 1)).toFixed(1)} itens/nota`}
        />
        <Kpi rotulo="Metragem" valor={formatarMetragem(totalMetros)} detalhe="m² faturados" />
        <Kpi rotulo="Peso" valor={formatarPeso(totalPeso)} detalhe="kg faturados" />
        <Kpi
          rotulo="Ticket médio"
          valor={formatarValor(faturamentoTotal / Math.max(totalNotas, 1))}
          detalhe="por nota"
        />
      </div>

      {grupos.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={aoArrastar}>
          <SortableContext items={ordem} strategy={rectSortingStrategy}>
            <div className="grid auto-rows-fr gap-4 lg:grid-cols-2">
              {ordem.map((id, indice) => (
                <GraficoOrdenado
                  key={id}
                  id={id}
                  titulo={TITULOS[id]}
                  aoMover={(delta) => mover(id, delta)}
                  podeSubir={indice > 0}
                  podeDescer={indice < ordem.length - 1}
                >
                  {graficos[id]}
                </GraficoOrdenado>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}