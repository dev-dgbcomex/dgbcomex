"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useCallback, useState } from "react"
import { usePathname } from "next/navigation"
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  MapPin,
  Navigation,
  PieChart as PieChartIcon,
  User,
  Users,
  XCircle,
} from "lucide-react"
import VisitLocationModal from "@/components/crm/visit-location-modal"
import ViagemCronogramaModal from "@/components/crm/viagem-cronograma"
import { exportCSV, exportMarkdown, exportPDFRelatorio } from "@/lib/export-utils"
import { formatarDocumento } from "@/lib/documento"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { InfoButton } from "@/components/ui/info-button"
import { getInfoContent } from "@/lib/info-content"
import { saudeProspeccaoInfo } from "@/lib/info-content/crm"
import type { VisitaModalRow } from "../types"

const VisitasCharts = dynamic(() => import("./charts").then((m) => m.VisitasCharts), {
  ssr: false,
})

type VisitasDashboardData = {
  total: number
  realizadas: number
  canceladas: number
  agendadas: number
  hoje: number
  esteMes: number
  byTipo: { tipo: string; total: number }[]
  byStatus: { status: string; total: number }[]
  porDia: { dia: string; total: number }[]
  porGerente: {
    gerenteId: number | null
    gerenteNome: string
    visitas: number
    diasAtivos: number
    mediaPorDia: number
    melhorDia: { dia: string; total: number } | null
    piorDia: { dia: string; total: number } | null
  }[]
  viagens: {
    viagemId: number | null
    viagemTitulo: string
    total: number
    realizadas: number
    dataInicio: string | null
    dataFim: string | null
    totalInvestimento: number
    possivelRetorno: number
    retornoReal: number
    vendas: number
  }[]
  ultimasVisitas: {
    id: number
    empresaId: number
    clienteId: number | null
    nome: string | null
    documento: string | null
    tipoEntidade: "cliente" | "lead" | "avulso"
    oportunidadeId: number | null
    totalOportunidades: number
    temOportunidade: boolean
    dataVisita: string
    hora: string | null
    tipo: string
    status: string
    endereco: string | null
    numero: string | null
    complemento: string | null
    bairro: string | null
    cidade: string | null
    uf: string | null
  }[]
  pesquisas: { enviadas: number; abertas: number; respondidas: number }
}


const STATUS_LABELS: Record<string, string> = {
  AGENDADA: "Agendada",
  EM_ANDAMENTO: "Em Andamento",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
}

const TIPO_LABELS: Record<string, string> = {
  PRESENCIAL: "Presencial",
  VIDEO: "Vídeo",
  TELEFONE: "Telefone",
}

const TIPO_ENTIDADE_LABELS: Record<"cliente" | "lead" | "avulso", string> = {
  cliente: "Cliente",
  lead: "Lead",
  avulso: "Avulso",
}

const ULTIMAS_VISITAS_CABECALHOS = [
  "ID da visita",
  "Nome",
  "Tipo de entidade",
  "Documento",
  "Data",
  "Hora",
  "Tipo",
  "Status",
  "Oportunidades",
  "Empresa ID",
  "Cliente ID",
  "Endereço",
]

const FILTROS_LABELS: Record<string, string> = {
  total: "Total de Visitas",
  realizadas: "Visitas Realizadas",
  canceladas: "Visitas Canceladas",
  agendadas: "Visitas Agendadas",
  hoje: "Visitas de Hoje",
  "este-mes": "Visitas deste Mês",
  "pesquisas-respondidas": "Visitas com Pesquisa Respondida",
  "tipo-PRESENCIAL": "Visitas Presenciais",
  "tipo-VIDEO": "Visitas por Vídeo",
  "tipo-TELEFONE": "Visitas por Telefone",
  "status-EM_ANDAMENTO": "Visitas Em Andamento",
}

export default function VisitasDashboardPage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const [selectedVisita, setSelectedVisita] = useState<{ id: number; nome: string } | null>(null)
  const [modalFiltro, setModalFiltro] = useState<string | null>(null)
  const [modalTitle, setModalTitle] = useState("")
  const [visitasFilter, setVisitasFilter] = useState<"todas" | "minhas">("todas")
  const [selectedViagem, setSelectedViagem] = useState<{
    viagemId: number
    viagemTitulo: string
  } | null>(null)

  const { data, isLoading } = useQuery<VisitasDashboardData>({
    queryKey: ["visitas-dashboard", visitasFilter],
    queryFn: () =>
      fetch(`/api/crm/visitas/dashboard${visitasFilter === "minhas" ? "?mine=true" : ""}`).then(
        (response) => {
          if (!response.ok) throw new Error("Falha ao carregar dashboard")
          return response.json()
        }
      ),
    retry: 1,
  })

  const modalQuery = useQuery<VisitaModalRow[]>({
    queryKey: ["visitas-dashboard-lista", modalFiltro, visitasFilter],
    queryFn: async () => {
      const response = await fetch(
        `/api/crm/visitas/dashboard-lista?filtro=${modalFiltro}${visitasFilter === "minhas" ? "&mine=true" : ""}`
      )
      if (!response.ok) return []
      const payload = await response.json()
      return Array.isArray(payload) ? payload : []
    },
    enabled: !!modalFiltro,
    retry: 1,
  })

  const openModal = useCallback((filtro: string) => {
    setModalTitle(FILTROS_LABELS[filtro] || filtro)
    setModalFiltro(filtro)
  }, [])

  const modalLista = modalQuery.data ?? []
  const modalLoading = modalQuery.isFetching
  const ultimasVisitas = data?.ultimasVisitas ?? []

  const ultimasVisitasExportacao = ultimasVisitas.map((visita) => [
    visita.id,
    visita.nome || `Visita #${visita.id}`,
    TIPO_ENTIDADE_LABELS[visita.tipoEntidade] || "—",
    formatarDocumento(visita.documento) || "—",
    fmtDataCompleta(visita.dataVisita),
    visita.hora || "—",
    TIPO_LABELS[visita.tipo] || visita.tipo || "—",
    STATUS_LABELS[visita.status] || visita.status || "—",
    visita.temOportunidade
      ? `Com oportunidade (${visita.totalOportunidades})`
      : "Sem oportunidade",
    visita.empresaId || "—",
    visita.clienteId ?? "—",
    [visita.endereco, visita.numero, visita.complemento, visita.bairro, visita.cidade, visita.uf]
      .filter(Boolean)
      .join(", ") || "—",
  ])

  const estatisticasUltimasVisitas = {
    Visitas: ultimasVisitas.length,
    Realizadas: ultimasVisitas.filter((visita) => visita.status === "REALIZADA").length,
    Agendadas: ultimasVisitas.filter((visita) => visita.status === "AGENDADA").length,
    Canceladas: ultimasVisitas.filter((visita) => visita.status === "CANCELADA").length,
  }

  function exportarUltimasVisitasCSV() {
    exportCSV("ultimas-visitas-dashboard", [...ULTIMAS_VISITAS_CABECALHOS], ultimasVisitasExportacao)
  }

  function exportarUltimasVisitasMarkdown() {
    exportMarkdown({
      filename: "ultimas-visitas-dashboard",
      title: "Últimas visitas — dashboard de visitas e prospecção",
      period: "Recorte atual do dashboard",
      stats: estatisticasUltimasVisitas,
      headers: [...ULTIMAS_VISITAS_CABECALHOS],
      rows: ultimasVisitasExportacao,
    })
  }

  function exportarUltimasVisitasPDF() {
    void exportPDFRelatorio({
      title: "Últimas visitas — dashboard de visitas e prospecção",
      period: "Recorte atual do dashboard",
      stats: estatisticasUltimasVisitas,
      tables: [{ headers: [...ULTIMAS_VISITAS_CABECALHOS], rows: ultimasVisitasExportacao }],
      filename: "ultimas-visitas-dashboard",
      orientation: "landscape",
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Dashboard de Visitas{info && <InfoButton content={info} />}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Indicadores de visitas comerciais, cobertura e retorno no ano corrente
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            role="group"
            aria-label="Filtro de visitas"
            className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => setVisitasFilter("todas")}
              aria-pressed={visitasFilter === "todas"}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                visitasFilter === "todas"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              <Users size={14} aria-hidden="true" />
              Todas
            </button>
            <button
              type="button"
              onClick={() => setVisitasFilter("minhas")}
              aria-pressed={visitasFilter === "minhas"}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                visitasFilter === "minhas"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              <User size={14} aria-hidden="true" />
              Minhas Visitas
            </button>
          </div>
          <Link
            href="/comercial/crm/visitas"
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Listar visitas <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div role="status" className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={32} aria-hidden="true" />
          <span className="sr-only">Carregando dashboard de visitas...</span>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <SummaryCard
              onClick={() => openModal("total")}
              icon={<Calendar size={20} />}
              value={data?.total ?? 0}
              label="Total Visitas"
              bgColor="bg-blue-100 dark:bg-blue-950/50"
              iconColor="text-blue-600 dark:text-blue-400"
            />
            <SummaryCard
              onClick={() => openModal("realizadas")}
              icon={<CheckCircle2 size={20} />}
              value={data?.realizadas ?? 0}
              label="Realizadas"
              bgColor="bg-green-100 dark:bg-green-950/50"
              iconColor="text-green-600 dark:text-green-400"
            />
            <SummaryCard
              onClick={() => openModal("canceladas")}
              icon={<XCircle size={20} />}
              value={data?.canceladas ?? 0}
              label="Canceladas"
              bgColor="bg-red-100 dark:bg-red-950/50"
              iconColor="text-red-600 dark:text-red-400"
            />
            <SummaryCard
              onClick={() => openModal("agendadas")}
              icon={<Clock size={20} />}
              value={data?.agendadas ?? 0}
              label="Agendadas"
              bgColor="bg-indigo-100 dark:bg-indigo-950/50"
              iconColor="text-indigo-600 dark:text-indigo-400"
            />
            <SummaryCard
              onClick={() => openModal("hoje")}
              icon={<MapPin size={20} />}
              value={data?.hoje ?? 0}
              label="Visitas Hoje"
              bgColor="bg-amber-100 dark:bg-amber-950/50"
              iconColor="text-amber-600 dark:text-amber-400"
            />
            <SummaryCard
              onClick={() => openModal("este-mes")}
              icon={<Calendar size={20} />}
              value={data?.esteMes ?? 0}
              label="Este Mês"
              bgColor="bg-teal-100 dark:bg-teal-950/50"
              iconColor="text-teal-600 dark:text-teal-400"
            />
            <SummaryCard
              onClick={() => openModal("pesquisas-respondidas")}
              icon={<ClipboardCheck size={20} />}
              value={data?.pesquisas?.respondidas ?? 0}
              label="Pesquisas Respondidas"
              sub={`${data?.pesquisas?.abertas ?? 0} abertas`}
              bgColor="bg-violet-100 dark:bg-violet-950/50"
              iconColor="text-violet-600 dark:text-violet-400"
            />
          </div>

          <VisitasCharts data={data} openModal={openModal} />

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                <Navigation size={16} className="text-cyan-500" aria-hidden="true" />
                Viagens
              </h2>
              <Link
                href="/comercial/crm/viagens"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                Ver todas <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </div>
            {data?.viagens && data.viagens.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.viagens.map((viagem) => {
                  const periodo = viagem.dataInicio
                    ? `${fmtData(viagem.dataInicio)} a ${fmtData(viagem.dataFim ?? "")}`
                    : null
                  const conteudo = (
                    <div className="flex items-center gap-3 p-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <Navigation
                          size={14}
                          className={viagem.viagemId ? "text-cyan-500" : "text-slate-300"}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {viagem.viagemTitulo ?? "Sem viagem"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {periodo
                              ? `${periodo} · ${viagem.realizadas ?? 0} realizada(s) · ${viagem.total} visitas`
                              : `${viagem.total} visitas`}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="text-right">
                            <p className="text-[10px] leading-none text-slate-400">Investimento</p>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {fmtBRL(viagem.totalInvestimento ?? 0)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] leading-none text-slate-400">
                              Possível retorno
                            </p>
                            <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                              {fmtBRL(viagem.possivelRetorno ?? 0)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] leading-none text-slate-400">Retorno real</p>
                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              {viagem.retornoReal ? fmtBRL(viagem.retornoReal) : "—"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] leading-none text-slate-400">Vendas</p>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {viagem.vendas ? fmtBRL(viagem.vendas) : "—"}
                            </p>
                          </div>
                        </div>
                        {viagem.viagemId && (
                          <ArrowRight size={14} className="text-cyan-500" aria-hidden="true" />
                        )}
                      </div>
                    </div>
                  )

                  return viagem.viagemId ? (
                    <button
                      key={viagem.viagemId}
                      type="button"
                      onClick={() =>
                        setSelectedViagem({
                          viagemId: viagem.viagemId!,
                          viagemTitulo: viagem.viagemTitulo,
                        })
                      }
                      className="w-full text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      title={`Ver cronograma da ${viagem.viagemTitulo}`}
                    >
                      {conteudo}
                    </button>
                  ) : (
                    <div key="sem-viagem" className="cursor-default">
                      {conteudo}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Navigation className="mb-2 h-10 w-10 text-slate-300 dark:text-slate-700" aria-hidden="true" />
                <p className="text-sm text-slate-400">Nenhuma viagem vinculada</p>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                <Users size={16} className="text-blue-500" aria-hidden="true" />
                Performance por Gerente Comercial
              </h2>
              <Link
                href="/comercial/crm/visitas"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                Ver todas <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </div>
            {data?.porGerente && data.porGerente.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.porGerente.map((gerente, indice) => (
                  <div key={gerente.gerenteId ?? indice} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="w-5 text-xs font-bold text-slate-400">{indice + 1}.</span>
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {gerente.gerenteNome}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {gerente.visitas} visitas
                      </p>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-3 pl-8 sm:grid-cols-3">
                      <KpiMini label="Média/dia" value={`${gerente.mediaPorDia}`} />
                      <KpiMini
                        label="Melhor dia"
                        value={
                          gerente.melhorDia
                            ? `${fmtData(gerente.melhorDia.dia)} (${gerente.melhorDia.total})`
                            : "—"
                        }
                        tone="green"
                      />
                      <KpiMini
                        label="Pior dia"
                        value={
                          gerente.piorDia
                            ? `${fmtData(gerente.piorDia.dia)} (${gerente.piorDia.total})`
                            : "—"
                        }
                        tone="red"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="mb-2 h-10 w-10 text-slate-300 dark:text-slate-700" aria-hidden="true" />
                <p className="text-sm text-slate-400">Nenhuma visita registrada</p>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                  <Calendar size={16} className="text-amber-500" aria-hidden="true" />
                  Últimas Visitas
                </h2>
                <InfoButton content={saudeProspeccaoInfo.ultimasVisitas} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={exportarUltimasVisitasCSV}
                  disabled={ultimasVisitas.length === 0}
                  aria-label="Exportar últimas visitas em CSV"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <FileSpreadsheet size={14} aria-hidden="true" />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={exportarUltimasVisitasPDF}
                  disabled={ultimasVisitas.length === 0}
                  aria-label="Exportar últimas visitas em PDF"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <FileDown size={14} aria-hidden="true" />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={exportarUltimasVisitasMarkdown}
                  disabled={ultimasVisitas.length === 0}
                  aria-label="Exportar últimas visitas em Markdown"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <FileText size={14} aria-hidden="true" />
                  MD
                </button>
                <Link
                  href="/comercial/crm/visitas"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  Ver todas <ArrowRight size={12} aria-hidden="true" />
                </Link>
              </div>
            </div>
            {data?.ultimasVisitas && data.ultimasVisitas.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.ultimasVisitas.map((visita) => (
                  <div key={visita.id} className="flex items-start justify-between gap-2 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <Link
                          href={`/comercial/crm/visitas/${visita.id}`}
                          className="truncate whitespace-nowrap text-xs font-medium text-slate-900 hover:underline dark:text-slate-100 md:text-sm"
                        >
                          {visita.nome || `Visita #${visita.id}`}
                        </Link>
                        <span className="whitespace-nowrap rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {TIPO_ENTIDADE_LABELS[visita.tipoEntidade]}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 md:text-xs">
                        <span className="font-mono">
                          {formatarDocumento(visita.documento) ?? "Sem documento"}
                        </span>
                        <span aria-hidden="true">•</span>
                        <span>
                          {visita.dataVisita
                            ? new Date(`${visita.dataVisita}T12:00:00`).toLocaleDateString("pt-BR")
                            : "—"}
                          {visita.hora ? ` ${visita.hora}` : ""}
                        </span>
                        <span aria-hidden="true">•</span>
                        <span>{TIPO_LABELS[visita.tipo] || visita.tipo}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 md:gap-2">
                      <span
                        className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-medium md:px-2 ${
                          visita.temOportunidade
                            ? "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {visita.temOportunidade
                          ? `Com oportunidade (${visita.totalOportunidades})`
                          : "Sem oportunidade"}
                      </span>
                      <span
                        className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-medium md:px-2 ${
                          visita.status === "REALIZADA"
                            ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                            : visita.status === "CANCELADA"
                              ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                        }`}
                      >
                        {STATUS_LABELS[visita.status] || visita.status}
                      </span>
                      {(visita.endereco || visita.cidade) && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([visita.endereco, visita.numero, visita.complemento, visita.bairro, visita.cidade, visita.uf].filter(Boolean).join(", "))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 md:p-1.5"
                          aria-label="Abrir no Google Maps"
                        >
                          <Navigation size={12} className="text-emerald-500" aria-hidden="true" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedVisita({
                            id: visita.id,
                            nome: visita.nome || `Visita #${visita.id}`,
                          })
                        }
                        className="rounded-lg p-1.5 hover:bg-blue-100 dark:hover:bg-blue-950/50 md:p-1.5"
                        aria-label="Gerenciar localizações"
                      >
                        <MapPin size={12} className="text-blue-500" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="mb-2 h-10 w-10 text-slate-300 dark:text-slate-700" aria-hidden="true" />
                <p className="text-sm text-slate-400">Nenhuma visita registrada</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Ações Rápidas
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <QuickAction
                href="/comercial/crm/visitas/novo"
                icon={<Calendar size={18} />}
                label="Nova Visita"
                color="text-amber-600"
                bg="bg-amber-100 dark:bg-amber-950/50"
              />
              <QuickAction
                href="/comercial/crm/visitas"
                icon={<BarChart3 size={18} />}
                label="Listar Visitas"
                color="text-blue-600"
                bg="bg-blue-100 dark:bg-blue-950/50"
              />
              <QuickAction
                href="/comercial/crm/visitas?view=kanban"
                icon={<PieChartIcon size={18} />}
                label="Kanban Visitas"
                color="text-indigo-600"
                bg="bg-indigo-100 dark:bg-indigo-950/50"
              />
              <QuickAction
                href="/comercial/crm/leads/dashboard"
                icon={<CheckCircle2 size={18} />}
                label="Saúde da Prospecção"
                color="text-green-600"
                bg="bg-green-100 dark:bg-green-950/50"
              />
            </div>
          </div>
        </>
      )}

      {selectedVisita && (
        <VisitLocationModal
          visitaId={selectedVisita.id}
          empresaNome={selectedVisita.nome}
          open={!!selectedVisita}
          onClose={() => setSelectedVisita(null)}
        />
      )}

      {selectedViagem && (
        <ViagemCronogramaModal
          viagemId={selectedViagem.viagemId}
          viagemTitulo={selectedViagem.viagemTitulo}
          open={!!selectedViagem}
          onClose={() => setSelectedViagem(null)}
        />
      )}

      <Dialog
        open={!!modalFiltro}
        onOpenChange={(aberto) => {
          if (!aberto) setModalFiltro(null)
        }}
      >
        <DialogContent className="flex max-h-[75vh] flex-col overflow-hidden gap-0 p-0 sm:max-w-2xl">
          <DialogHeader className="flex-row items-center justify-between gap-2 border-b border-slate-100 p-4 pr-12 dark:border-slate-800">
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {modalTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {modalLoading ? (
              <div role="status" className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-slate-400" size={24} aria-hidden="true" />
                <span className="sr-only">Carregando visitas...</span>
              </div>
            ) : modalLista.length === 0 ? (
              <p className="py-12 text-center text-slate-500">Nenhuma visita encontrada</p>
            ) : (
              <div className="space-y-1">
                {modalLista.map((visita) => (
                  <Link
                    key={visita.id}
                    href={`/comercial/crm/visitas/${visita.id}`}
                    onClick={() => setModalFiltro(null)}
                    className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-200">
                        {visita.empresaNome || visita.clienteNome || visita.nomeAvulso || `Visita #${visita.id}`}
                      </p>
                      <p className="text-xs text-slate-400">
                        {visita.dataVisita
                          ? new Date(`${visita.dataVisita}T12:00:00`).toLocaleDateString("pt-BR")
                          : ""}
                        {visita.hora ? ` ${visita.hora}` : ""}
                        {` · ${TIPO_LABELS[visita.tipo || ""] || visita.tipo}`}
                      </p>
                    </div>
                    <div className="ml-3 shrink-0">
                      <span
                        className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          visita.status === "REALIZADA"
                            ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                            : visita.status === "CANCELADA"
                              ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                        }`}
                      >
                        {STATUS_LABELS[visita.status || ""] || visita.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryCard({
  onClick,
  icon,
  value,
  label,
  sub,
  bgColor,
  iconColor,
}: {
  onClick: () => void
  icon: React.ReactNode
  value: number
  label: string
  sub?: string
  bgColor: string
  iconColor: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2.5 ${bgColor}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
      {sub && <p className="mt-1.5 text-[10px] text-slate-400">{sub}</p>}
    </button>
  )
}

function QuickAction({
  href,
  icon,
  label,
  color,
  bg,
}: {
  href: string
  icon: React.ReactNode
  label: string
  color: string
  bg: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border border-transparent p-3 hover:bg-slate-50 hover:border-slate-200 dark:hover:bg-slate-800 dark:hover:border-slate-700"
    >
      <div className={`rounded-lg p-2 ${bg}`}>
        <span className={color}>{icon}</span>
      </div>
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
    </Link>
  )
}

function fmtData(dia: string): string {
  const data = new Date(`${dia}T12:00:00`)
  return isNaN(data.getTime())
    ? dia
    : data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function fmtDataCompleta(dia: string): string {
  const data = new Date(`${dia}T12:00:00`)
  return isNaN(data.getTime()) ? dia : data.toLocaleDateString("pt-BR")
}

function fmtBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function KpiMini({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  const valueCls =
    tone === "green"
      ? "text-green-600 dark:text-green-400"
      : tone === "red"
        ? "text-red-600 dark:text-red-400"
        : "text-slate-800 dark:text-slate-100"
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className={`text-sm font-semibold ${valueCls}`}>{value}</p>
    </div>
  )
}
