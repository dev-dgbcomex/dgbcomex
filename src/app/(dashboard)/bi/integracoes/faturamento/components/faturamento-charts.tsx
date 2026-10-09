"use client"

import { useEffect, useMemo, useState } from "react"
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
import { ChartCard } from "@/components/ui/chart-card"
import { ChartTooltip } from "@/components/ui/chart-tooltip"
import { formatarMetragem, formatarPeso, formatarValor } from "./utils"
import type { GrupoFaturamento } from "./types"

const CORES = ["#0f766e", "#1d4ed8", "#b45309", "#7c3aed", "#be123c", "#0369a1", "#4d7c0f"]

/** Preferência de layout do usuário; mesma convenção de `sidebar-collapsed` e `bi_last_sheet`. */
const CHAVE_ORDEM = "faturamento_graficos_ordem"

type IdGrafico = "mes" | "clientes" | "produtos" | "participacao"

const ORDEM_PADRAO: IdGrafico[] = ["mes", "clientes", "produtos", "participacao"]

const TITULOS: Record<IdGrafico, string> = {
  mes: "Faturamento e metragem por mês",
  clientes: "Faturamento por cliente (top 8)",
  produtos: "Faturamento por produto (top 8)",
  participacao: "Participação por produto",
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
        className={isDragging ? "ring-2 ring-teal-500" : ""}
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
function LegendaProdutos({ dados }: { dados: { produto: string; faturamento: number; fill: string }[] }) {
  const total = dados.reduce((soma, d) => soma + d.faturamento, 0)
  return (
    <ul
      aria-label="Legenda da participação por produto"
      className="mt-2 flex flex-wrap justify-center gap-1.5"
    >
      {dados.map((d) => {
        const parte = total > 0 ? (d.faturamento / total) * 100 : 0
        return (
          <li
            key={d.produto}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: d.fill }}
            />
            <span className="max-w-[120px] truncate" title={d.produto}>
              {d.produto}
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

  useEffect(() => {
    try {
      setOrdem(normalizarOrdem(JSON.parse(localStorage.getItem(CHAVE_ORDEM) ?? "null")))
    } catch {
      // Preferência corrompida não pode derrubar a tela: fica na ordem padrão.
      localStorage.removeItem(CHAVE_ORDEM)
    }
  }, [])

  function reordenar(nova: IdGrafico[]) {
    setOrdem(nova)
    localStorage.setItem(CHAVE_ORDEM, JSON.stringify(nova))
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

  const topClientes = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const grupo of grupos) {
      const chave = grupo.nome_cliente || grupo.cliente || "Sem cliente"
      mapa.set(chave, (mapa.get(chave) ?? 0) + grupo.faturamento)
    }
    return [...mapa.entries()]
      .map(([nome, faturamento]) => ({ nome, faturamento }))
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, 8)
  }, [grupos])

  const topProdutos = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const grupo of grupos) {
      for (const item of grupo.itens) {
        const valor = (item.vr_total || 0) + (item.acres_desc || 0)
        mapa.set(item.cod_produto, (mapa.get(item.cod_produto) ?? 0) + valor)
      }
    }
    return [...mapa.entries()]
      .map(([produto, faturamento]) => ({ produto: produto || "—", faturamento }))
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, 8)
  }, [grupos])

  const representacao = useMemo(
    () => topProdutos.map((item, i) => ({ ...item, fill: CORES[i % CORES.length] })),
    [topProdutos]
  )

  const graficos: Record<IdGrafico, React.ReactNode> = {
    mes: (
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={porMes}>
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
    ),
    clientes: (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={topClientes} layout="vertical" margin={{ left: 8 }}>
          <defs>
            <linearGradient id="gradCliente" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
            tickFormatter={(v) => formatarValor(Number(v))}
          />
          <YAxis
            type="category"
            dataKey="nome"
            width={120}
            tick={{ fontSize: 10 }}
            stroke="#94a3b8"
            tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
          />
          <Tooltip content={<ChartTooltip formatter={(v) => formatarValor(v)} />} />
          <Bar
            dataKey="faturamento"
            name="Faturamento"
            fill="url(#gradCliente)"
            radius={[0, 6, 6, 0]}
            animationDuration={1000}
          />
        </BarChart>
      </ResponsiveContainer>
    ),
    produtos: (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={topProdutos}>
          <defs>
            <linearGradient id="gradProduto" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f766e" />
              <stop offset="100%" stopColor="#0f766e" stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="produto" tick={{ fontSize: 10 }} stroke="#94a3b8" interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
            tickFormatter={(v) => formatarValor(Number(v))}
          />
          <Tooltip content={<ChartTooltip formatter={(v) => formatarValor(v)} />} />
          <Bar
            dataKey="faturamento"
            name="Faturamento"
            fill="url(#gradProduto)"
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
            animationDuration={1000}
          />
        </BarChart>
      </ResponsiveContainer>
    ),
    participacao: (
      <>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={representacao}
              dataKey="faturamento"
              nameKey="produto"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
              animationDuration={1200}
              stroke="#fff"
              strokeWidth={2}
            >
              {representacao.map((entrada) => (
                <Cell key={entrada.produto} fill={entrada.fill} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip formatter={(v) => formatarValor(v)} />} />
          </PieChart>
        </ResponsiveContainer>
        <LegendaProdutos dados={representacao} />
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
            <div className="grid gap-4 lg:grid-cols-2">
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