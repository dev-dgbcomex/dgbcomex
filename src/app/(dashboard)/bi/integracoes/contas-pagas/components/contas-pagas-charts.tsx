"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
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
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChartCard, ChartCardBody } from "@/components/ui/chart-card"
import { ChartTooltip } from "@/components/ui/chart-tooltip"
import { FORMATAR, type GrupoPorChave, type MesContasPagas } from "@/lib/bi/contas-pagas-detalhe"
import { DadosDoGrafico, type LinhaDados } from "./dados-do-grafico"

const CORES = ["#0f766e", "#1d4ed8", "#b45309", "#7c3aed", "#be123c", "#0369a1", "#4d7c0f"]

/**
 * Altura mínima da área do gráfico. O `ResponsiveContainer` usa `height="100%"`, e um
 * pai sem altura intrínseca colapsaria para zero; o mínimo é o que dá corpo ao card. O
 * `auto-rows-fr` iguala os seis pela altura do maior.
 */
const ALTURA_MIN_GRAFICO = "min-h-[260px]"

const TOP = 8

/** `12,5%` — o mesmo formato nos eixos, nas barras e no tooltip dos gráficos em %. */
const formatarPercentual = (valor: number) =>
  `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`

const PAINEL = "contas-pagas"
const CHAVE_CACHE = "contas_pagas_graficos_ordem"

type IdGrafico =
  | "mes"
  | "fornecedor"
  | "fornecedor_pct"
  | "fornecedor_fat"
  | "banco"
  | "empresa"
  | "departamento"
  | "departamento_fat"

const ORDEM_PADRAO: IdGrafico[] = [
  "mes",
  "fornecedor",
  "fornecedor_pct",
  "fornecedor_fat",
  "banco",
  "empresa",
  "departamento",
  "departamento_fat",
]

const TITULOS: Record<IdGrafico, string> = {
  mes: "Pagamentos mês a mês",
  fornecedor: "Pagamentos por fornecedor (top 8)",
  fornecedor_pct: "Participação do fornecedor — % do total pago (top 8)",
  fornecedor_fat: "Fornecedor sobre o faturamento — % pago ÷ faturado (top 8)",
  banco: "Pagamentos por banco — de onde saiu o dinheiro (top 8)",
  empresa: "Pagamentos por empresa (top 8)",
  departamento: "Participação por departamento",
  departamento_fat: "Departamento sobre o faturamento — % pago ÷ faturado (top 8)",
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
  meses: MesContasPagas[]
  porFornecedor: GrupoPorChave[]
  porBanco: GrupoPorChave[]
  porEmpresa: GrupoPorChave[]
  porDepartamento: GrupoPorChave[]
  total: number
  /** Faturamento do mesmo recorte: denominador da razão pagamento ÷ faturamento. */
  faturamento?: number
}

interface KpiProps {
  rotulo: string
  valor: string
  detalhe?: string
}

/** Cartão de gráfico com handle de arraste e alternativa por teclado (setas). */
function GraficoOrdenado({
  id,
  titulo,
  children,
  aoMover,
  podeSubir,
  podeDescer,
  dados,
}: {
  id: IdGrafico
  titulo: string
  children: React.ReactNode
  aoMover: (delta: 1 | -1) => void
  podeSubir: boolean
  podeDescer: boolean
  dados: LinhaDados[]
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

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
            <DadosDoGrafico
              titulo={titulo}
              subtitulo={`${dados.length} ${dados.length === 1 ? "linha" : "linhas"} no recorte · ${FORMATAR.valor(
                dados.reduce((soma, linha) => soma + linha.valor, 0)
              )}`}
              colunas={[
                { titulo: "" },
                { titulo: "Baixas", numero: true },
                { titulo: "Valor", numero: true },
                { titulo: "% do recorte", numero: true },
              ]}
              linhas={dados}
              total={dados.reduce((soma, linha) => soma + linha.valor, 0)}
              totalOcorrencias={dados.reduce((soma, linha) => soma + linha.ocorrencias, 0)}
              formatarValor={FORMATAR.valor}
              vazio="Sem dados no recorte."
            />
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
              <ArrowUp className="h-3.5 w-3.5" />
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
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
          </>
        }
      >
        {children}
      </ChartCard>
    </div>
  )
}

/** Linhas do modal: todos os grupos do recorte, com % sobre o total. */
function paraLinhas(grupos: GrupoPorChave[], chave: string, total: number): LinhaDados[] {
  return grupos.map((grupo) => {
    const rotulo = String(grupo[chave] || "—")
    const valor = Number(grupo.valor)
    return {
      rotulo,
      detalhe: rotulo === "—" ? "sem classificação" : undefined,
      valor,
      ocorrencias: Number(grupo.lancamentos),
      percentual: total > 0 ? (valor / total) * 100 : 0,
    }
  })
}

function LegendaGrupos({ dados }: { dados: { rotulo: string; percentual: number }[] }) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
      {dados.map((item, i) => (
        <li key={item.rotulo} className="flex items-center gap-2 text-xs">
          <span
            className="size-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: CORES[i % CORES.length] }}
          />
          <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">
            {item.rotulo}
          </span>
          <span className="shrink-0 text-slate-400">
            {item.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Os mesmos gráficos do faturamento, com os dados de contas pagas: área do valor
 * mês a mês com a contagem de baixas em linha, barras deitadas nos grupos, o
 * percentual do fornecedor em barras em pé e pizza na participação. A diferença não
 * é no desenho, é no que cada card responde.
 */
export function ContasPagasCharts({
  meses,
  porFornecedor,
  porBanco,
  porEmpresa,
  porDepartamento,
  total,
  faturamento,
}: Props) {
  const [ordem, setOrdem] = useState<IdGrafico[]>(ORDEM_PADRAO)
  const queryClient = useQueryClient()

  const { data: ordemServida } = useQuery<{ ids: IdGrafico[] }>({
    queryKey: ["contas-pagas-ordem-graficos"],
    queryFn: async () => {
      const res = await fetch(`/api/integracao/ordem-graficos?painel=${PAINEL}`)
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
        body: JSON.stringify({ painel: PAINEL, ids }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Erro ao salvar a ordem")
      }
      return res.json()
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["contas-pagas-ordem-graficos"] }),
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
        queryClient.invalidateQueries({ queryKey: ["contas-pagas-ordem-graficos"] })
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

  const serieMes = useMemo(
    () => meses.map((mes) => ({ mes: mes.rotulo, valor: mes.total, lancamentos: mes.lancamentos })),
    [meses]
  )

  const top = (grupos: GrupoPorChave[], chave: string) =>
    grupos.slice(0, TOP).map((grupo) => ({ rotulo: String(grupo[chave] || "—"), valor: Number(grupo.valor) }))

  const topFornecedor = useMemo(() => top(porFornecedor, "razao_social"), [porFornecedor])
  const topBanco = useMemo(() => top(porBanco, "banco"), [porBanco])
  const topEmpresa = useMemo(() => top(porEmpresa, "empresa"), [porEmpresa])

  const barrasFornecedorPct = useMemo(
    () =>
      topFornecedor.map((item) => ({
        rotulo: item.rotulo,
        valor: total > 0 ? (item.valor / total) * 100 : 0,
      })),
    [topFornecedor, total]
  )

  // Sobre o faturamento: quanto do que foi faturado no recorte cada fornecedor comeu.
  // É a mesma leitura do card, só que por grupo — a barra é `pago ÷ faturado`.
  const barrasFornecedorFat = useMemo(
    () =>
      topFornecedor.map((item) => ({
        rotulo: item.rotulo,
        valor: faturamento && faturamento > 0 ? (item.valor / faturamento) * 100 : 0,
      })),
    [topFornecedor, faturamento]
  )

  const topDepartamento = useMemo(
    () =>
      porDepartamento
        .slice(0, TOP)
        .map((grupo) => ({ rotulo: String(grupo.departamento || "—"), valor: Number(grupo.valor) })),
    [porDepartamento]
  )

  const barrasDepartamentoFat = useMemo(
    () =>
      topDepartamento.map((item) => ({
        rotulo: item.rotulo,
        valor: faturamento && faturamento > 0 ? (item.valor / faturamento) * 100 : 0,
      })),
    [topDepartamento, faturamento]
  )

  const linhasMes: LinhaDados[] = useMemo(
    () =>
      serieMes.map((ponto) => ({
        rotulo: ponto.mes,
        valor: ponto.valor,
        ocorrencias: ponto.lancamentos,
        percentual: total > 0 ? (ponto.valor / total) * 100 : 0,
      })),
    [serieMes, total]
  )
  const linhasFornecedor = useMemo(
    () => paraLinhas(porFornecedor, "razao_social", total),
    [porFornecedor, total]
  )
  const linhasBanco = useMemo(() => paraLinhas(porBanco, "banco", total), [porBanco, total])
  const linhasEmpresa = useMemo(() => paraLinhas(porEmpresa, "empresa", total), [porEmpresa, total])
  const linhasDepartamento = useMemo(
    () => paraLinhas(porDepartamento, "departamento", total),
    [porDepartamento, total]
  )

  const participacao = useMemo(
    () =>
      linhasDepartamento.slice(0, 8).map((linha, i) => ({
        rotulo: linha.rotulo,
        valor: linha.valor,
        percentual: linha.percentual,
        fill: CORES[i % CORES.length],
      })),
    [linhasDepartamento]
  )

  const graficos: Record<IdGrafico, React.ReactNode> = {
    mes: (
      <ChartCardBody className={ALTURA_MIN_GRAFICO}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={serieMes} margin={{ bottom: 8 }}>
            <defs>
              <linearGradient id="gradPagamento" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f766e" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#0f766e" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} stroke="#94a3b8" interval="preserveStartEnd" />
            <YAxis
              yAxisId="valor"
              tick={{ fontSize: 11 }}
              stroke="#94a3b8"
              tickFormatter={(v) => FORMATAR.valor(Number(v))}
            />
            <YAxis yAxisId="baixas" orientation="right" tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <Tooltip
              content={
                <ChartTooltip
                  formatter={(v, nome) =>
                    nome === "Baixas" ? `${v} baixas` : FORMATAR.valor(Number(v))
                  }
                />
              }
            />
            <Area
              yAxisId="valor"
              type="monotone"
              dataKey="valor"
              name="Valor pago"
              stroke="#0f766e"
              strokeWidth={2.5}
              fill="url(#gradPagamento)"
              animationDuration={1200}
            />
            <Line
              yAxisId="baixas"
              type="monotone"
              dataKey="lancamentos"
              name="Baixas"
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
    fornecedor: graficoBarras(topFornecedor, "gradFornecedor", "#1d4ed8"),
    fornecedor_pct: graficoBarrasVerticais(barrasFornecedorPct, "gradFornecedorPct", "#1d4ed8"),
    fornecedor_fat: graficoBarras(
      barrasFornecedorFat,
      "gradFornecedorFat",
      "#be123c",
      formatarPercentual,
      "% do faturamento"
    ),
    banco: graficoBarras(topBanco, "gradBanco", "#0f766e"),
    empresa: graficoBarras(topEmpresa, "gradEmpresa", "#b45309"),
    departamento_fat: graficoBarras(
      barrasDepartamentoFat,
      "gradDepartamentoFat",
      "#be123c",
      formatarPercentual,
      "% do faturamento"
    ),
    departamento: (
      <>
        <ChartCardBody className={ALTURA_MIN_GRAFICO}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={participacao}
                dataKey="valor"
                nameKey="rotulo"
                innerRadius="45%"
                outerRadius="78%"
                paddingAngle={2}
                startAngle={90}
                endAngle={-270}
                animationDuration={1200}
                stroke="#fff"
                strokeWidth={2}
              >
                {participacao.map((entrada) => (
                  <Cell key={entrada.rotulo} fill={entrada.fill} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip formatter={(v) => FORMATAR.valor(Number(v))} />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCardBody>
        {participacao.length > 0 && <LegendaGrupos dados={participacao} />}
      </>
    ),
  }

  return (
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
              dados={
                id === "mes"
                  ? linhasMes
                  : id === "fornecedor" || id === "fornecedor_pct" || id === "fornecedor_fat"
                    ? linhasFornecedor
                    : id === "banco"
                      ? linhasBanco
                      : id === "empresa"
                        ? linhasEmpresa
                        : linhasDepartamento
              }
            >
              {graficos[id]}
            </GraficoOrdenado>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

/**
 * Barras em pé: cada fornecedor é uma barra e a altura é o quanto ele representa do
 * total pago no recorte (%). O eixo Y fica em %, o rótulo do fornecedor vai no eixo X
 * (girado), e o topo da barra traz o próprio número, que é o que interessa ler de longe.
 */
function graficoBarrasVerticais(
  dados: { rotulo: string; valor: number }[],
  gradiente: string,
  cor: string
) {
  const pct = (v: number) =>
    `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
  const maxPct = dados.reduce((maior, item) => Math.max(maior, item.valor), 0)

  return (
    <ChartCardBody className={ALTURA_MIN_GRAFICO}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 20, left: 8, right: 8, bottom: 8 }}>
          <defs>
            <linearGradient id={gradiente} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cor} stopOpacity={0.95} />
              <stop offset="100%" stopColor={cor} stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            type="category"
            dataKey="rotulo"
            tick={{ fontSize: 9 }}
            stroke="#94a3b8"
            interval={0}
            height={64}
            tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
            angle={-35}
            textAnchor="end"
          />
          <YAxis
            type="number"
            tick={{ fontSize: 10 }}
            stroke="#94a3b8"
            width={48}
            domain={[0, Math.max(1, Math.ceil(maxPct))]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            cursor={{ fill: "#94a3b8", fillOpacity: 0.08 }}
            content={<ChartTooltip formatter={(v) => pct(Number(v))} />}
          />
          <Bar
            dataKey="valor"
            name="% do total pago"
            fill={`url(#${gradiente})`}
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
            animationDuration={1000}
            label={{
              position: "top",
              fontSize: 10,
              fill: "#64748b",
              formatter: (v: unknown) => pct(Number(v)),
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCardBody>
  )
}

/**
 * Barras deitadas, o mesmo desenho dos cards de cliente e produto do faturamento.
 * O `formatador`/`nome` permitem reaproveitar o desenho para os gráficos em % sobre o
 * faturamento, em vez de duplicar o componente só para trocar o eixo.
 */
function graficoBarras(
  dados: { rotulo: string; valor: number }[],
  gradiente: string,
  cor: string,
  formatador: (valor: number) => string = FORMATAR.valor,
  nome = "Valor pago"
) {
  return (
    <ChartCardBody className={ALTURA_MIN_GRAFICO}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 24 }}>
          <defs>
            <linearGradient id={gradiente} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={cor} />
              <stop offset="100%" stopColor={cor} stopOpacity={0.45} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10 }}
            stroke="#94a3b8"
            tickFormatter={(v) => formatador(Number(v))}
          />
          <YAxis
            type="category"
            dataKey="rotulo"
            tick={{ fontSize: 10 }}
            stroke="#94a3b8"
            width={130}
            tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 19)}…` : v)}
          />
          <Tooltip
            cursor={{ fill: "#94a3b8", fillOpacity: 0.08 }}
            content={<ChartTooltip formatter={(v) => formatador(Number(v))} />}
          />
          <Bar
            dataKey="valor"
            name={nome}
            fill={`url(#${gradiente})`}
            radius={[0, 6, 6, 0]}
            maxBarSize={26}
            animationDuration={1000}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCardBody>
  )
}
