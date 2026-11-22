"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useCallback, useState, type CSSProperties } from "react"
import { usePathname } from "next/navigation"
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
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
import AcaoProspeccaoLocationModal from "@/components/crm/acao-prospeccao-location-modal"
import AcaoProspeccaoCronogramaModal from "@/components/crm/acao-prospeccao-cronograma"
import { exportCSV, exportMarkdown, exportPDFRelatorio } from "@/lib/export-utils"
import { formatarDocumento } from "@/lib/documento"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { InfoButton } from "@/components/ui/info-button"
import { corPorTitulo, iconePorTitulo } from "@/lib/dracula"
import { getInfoContent } from "@/lib/info-content"
import { saudeProspeccaoAcoesInfo } from "@/lib/info-content/crm"
import type { AcoesProspeccaoDashboardData } from "./charts"

const AcoesProspeccaoCharts = dynamic(
  () => import("./charts").then((m) => m.AcoesProspeccaoCharts),
  { ssr: false }
)

type AcaoModalRow = {
  id: number
  empresaNome?: string | null
  clienteNome?: string | null
  nomeAvulso?: string | null
  dataAcao?: string | null
  hora?: string | null
  tipo?: string
  status?: string
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

const ULTIMAS_ACOES_CABECALHOS = [
  "ID da ação",
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
  total: "Total de Ações de Prospecção",
  realizadas: "Ações Realizadas",
  canceladas: "Ações Canceladas",
  agendadas: "Ações Agendadas",
  hoje: "Ações de Hoje",
  "este-mes": "Ações deste Mês",
  "pesquisas-respondidas": "Ações com Pesquisa Respondida",
  "tipo-PRESENCIAL": "Ações Presenciais",
  "tipo-VIDEO": "Ações por Vídeo",
  "tipo-TELEFONE": "Ações por Telefone",
  "status-EM_ANDAMENTO": "Ações Em Andamento",
}

export default function AcoesProspeccaoDashboardPage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const [selectedAcao, setSelectedAcao] = useState<{ id: number; nome: string } | null>(null)
  const [modalFiltro, setModalFiltro] = useState<string | null>(null)
  const [modalTitle, setModalTitle] = useState("")
  const [acoesFilter, setAcoesFilter] = useState<"todas" | "minhas">("todas")
  const [selectedViagem, setSelectedViagem] = useState<{
    viagemId: number
    viagemTitulo: string
  } | null>(null)

  const { data, isLoading } = useQuery<AcoesProspeccaoDashboardData>({
    queryKey: ["acoes-prospeccao-dashboard", acoesFilter],
    queryFn: () =>
      fetch(
        `/api/crm/acoes-prospeccao/dashboard${acoesFilter === "minhas" ? "?mine=true" : ""}`
      ).then((response) => {
        if (!response.ok) throw new Error("Falha ao carregar dashboard")
        return response.json()
      }),
    retry: 1,
  })

  const modalQuery = useQuery<AcaoModalRow[]>({
    queryKey: ["acoes-prospeccao-dashboard-lista", modalFiltro, acoesFilter],
    queryFn: async () => {
      const response = await fetch(
        `/api/crm/acoes-prospeccao/dashboard-lista?filtro=${modalFiltro}${acoesFilter === "minhas" ? "&mine=true" : ""}`
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
  const ultimasAcoes = data?.ultimasAcoes ?? []

  const ultimasAcoesExportacao = ultimasAcoes.map((acao) => [
    acao.id,
    acao.nome || `Ação #${acao.id}`,
    TIPO_ENTIDADE_LABELS[acao.tipoEntidade] || "—",
    formatarDocumento(acao.documento) || "—",
    fmtDataCompleta(acao.dataAcao),
    acao.hora || "—",
    TIPO_LABELS[acao.tipo] || acao.tipo || "—",
    STATUS_LABELS[acao.status] || acao.status || "—",
    acao.temOportunidade
      ? `Com oportunidade (${acao.totalOportunidades})`
      : "Sem oportunidade",
    acao.empresaId || "—",
    acao.clienteId ?? "—",
    [acao.endereco, acao.numero, acao.complemento, acao.bairro, acao.cidade, acao.uf]
      .filter(Boolean)
      .join(", ") || "—",
  ])

  const estatisticasUltimasAcoes = {
    Ações: ultimasAcoes.length,
    Realizadas: ultimasAcoes.filter((acao) => acao.status === "REALIZADA").length,
    Agendadas: ultimasAcoes.filter((acao) => acao.status === "AGENDADA").length,
    Canceladas: ultimasAcoes.filter((acao) => acao.status === "CANCELADA").length,
  }

  function exportarUltimasAcoesCSV() {
    exportCSV("ultimas-acoes-prospeccao-dashboard", [...ULTIMAS_ACOES_CABECALHOS], ultimasAcoesExportacao)
  }

  function exportarUltimasAcoesMarkdown() {
    exportMarkdown({
      filename: "ultimas-acoes-prospeccao-dashboard",
      title: "Últimas ações — dashboard de Ações de Prospecção",
      period: "Recorte atual do dashboard",
      stats: estatisticasUltimasAcoes,
      headers: [...ULTIMAS_ACOES_CABECALHOS],
      rows: ultimasAcoesExportacao,
    })
  }

  function exportarUltimasAcoesPDF() {
    void exportPDFRelatorio({
      title: "Últimas ações — dashboard de Ações de Prospecção",
      period: "Recorte atual do dashboard",
      stats: estatisticasUltimasAcoes,
      tables: [{ headers: [...ULTIMAS_ACOES_CABECALHOS], rows: ultimasAcoesExportacao }],
      filename: "ultimas-acoes-prospeccao-dashboard",
      orientation: "landscape",
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Dashboard de Ações de Prospecção{info && <InfoButton content={info} />}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Indicadores das ações de prospecção, cobertura e retorno no ano corrente
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            role="group"
            aria-label="Filtro de ações de prospecção"
            className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => setAcoesFilter("todas")}
              aria-pressed={acoesFilter === "todas"}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                acoesFilter === "todas"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              <Users size={14} aria-hidden="true" />
              Todas
            </button>
            <button
              type="button"
              onClick={() => setAcoesFilter("minhas")}
              aria-pressed={acoesFilter === "minhas"}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                acoesFilter === "minhas"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              <User size={14} aria-hidden="true" />
              Minhas Ações
            </button>
          </div>
          <Link
            href="/comercial/crm/acoes-prospeccao"
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Listar ações <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div role="status" className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={32} aria-hidden="true" />
          <span className="sr-only">Carregando dashboard de ações de prospecção...</span>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <SummaryCard
              onClick={() => openModal("total")}
              value={data?.total ?? 0}
              label="Total Ações"
            />
            <SummaryCard
              onClick={() => openModal("realizadas")}
              value={data?.realizadas ?? 0}
              label="Realizadas"
            />
            <SummaryCard
              onClick={() => openModal("canceladas")}
              value={data?.canceladas ?? 0}
              label="Canceladas"
            />
            <SummaryCard
              onClick={() => openModal("agendadas")}
              value={data?.agendadas ?? 0}
              label="Agendadas"
            />
            <SummaryCard
              onClick={() => openModal("hoje")}
              value={data?.hoje ?? 0}
              label="Ações Hoje"
            />
            <SummaryCard
              onClick={() => openModal("este-mes")}
              value={data?.esteMes ?? 0}
              label="Este Mês"
            />
            <SummaryCard
              onClick={() => openModal("pesquisas-respondidas")}
              value={data?.pesquisas?.respondidas ?? 0}
              label="Pesquisas Respondidas"
              sub={`${data?.pesquisas?.abertas ?? 0} abertas`}
            />
          </div>

          <AcoesProspeccaoCharts data={data} openModal={openModal} />

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
                              ? `${periodo} · ${viagem.realizadas ?? 0} realizada(s) · ${viagem.total} ações`
                              : `${viagem.total} ações`}
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
                href="/comercial/crm/acoes-prospeccao"
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
                        {gerente.acoes} ações
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
                <p className="text-sm text-slate-400">Nenhuma ação registrada</p>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                  <Calendar size={16} className="text-amber-500" aria-hidden="true" />
                  Últimas Ações
                </h2>
                <InfoButton content={saudeProspeccaoAcoesInfo.ultimasVisitas} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={exportarUltimasAcoesCSV}
                  disabled={ultimasAcoes.length === 0}
                  aria-label="Exportar últimas ações em CSV"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <FileSpreadsheet size={14} aria-hidden="true" />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={exportarUltimasAcoesPDF}
                  disabled={ultimasAcoes.length === 0}
                  aria-label="Exportar últimas ações em PDF"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <FileDown size={14} aria-hidden="true" />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={exportarUltimasAcoesMarkdown}
                  disabled={ultimasAcoes.length === 0}
                  aria-label="Exportar últimas ações em Markdown"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <FileText size={14} aria-hidden="true" />
                  MD
                </button>
                <Link
                  href="/comercial/crm/acoes-prospeccao"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  Ver todas <ArrowRight size={12} aria-hidden="true" />
                </Link>
              </div>
            </div>
            {data?.ultimasAcoes && data.ultimasAcoes.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.ultimasAcoes.map((acao) => (
                  <div key={acao.id} className="flex items-start justify-between gap-2 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <Link
                          href={`/comercial/crm/acoes-prospeccao/${acao.id}`}
                          className="truncate whitespace-nowrap text-xs font-medium text-slate-900 hover:underline dark:text-slate-100 md:text-sm"
                        >
                          {acao.nome || `Ação #${acao.id}`}
                        </Link>
                        <span className="whitespace-nowrap rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {TIPO_ENTIDADE_LABELS[acao.tipoEntidade]}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 md:text-xs">
                        <span className="font-mono">
                          {formatarDocumento(acao.documento) ?? "Sem documento"}
                        </span>
                        <span aria-hidden="true">•</span>
                        <span>
                          {acao.dataAcao
                            ? new Date(`${acao.dataAcao}T12:00:00`).toLocaleDateString("pt-BR")
                            : "—"}
                          {acao.hora ? ` ${acao.hora}` : ""}
                        </span>
                        <span aria-hidden="true">•</span>
                        <span>{TIPO_LABELS[acao.tipo] || acao.tipo}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 md:gap-2">
                      <span
                        className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-medium md:px-2 ${
                          acao.temOportunidade
                            ? "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {acao.temOportunidade
                          ? `Com oportunidade (${acao.totalOportunidades})`
                          : "Sem oportunidade"}
                      </span>
                      <span
                        className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-medium md:px-2 ${
                          acao.status === "REALIZADA"
                            ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                            : acao.status === "CANCELADA"
                              ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                        }`}
                      >
                        {STATUS_LABELS[acao.status] || acao.status}
                      </span>
                      {(acao.endereco || acao.cidade) && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([acao.endereco, acao.numero, acao.complemento, acao.bairro, acao.cidade, acao.uf].filter(Boolean).join(", "))}`}
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
                          setSelectedAcao({
                            id: acao.id,
                            nome: acao.nome || `Ação #${acao.id}`,
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
                <p className="text-sm text-slate-400">Nenhuma ação registrada</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Ações Rápidas
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <QuickAction
                href="/comercial/crm/acoes-prospeccao/novo"
                icon={<Calendar size={18} />}
                label="Nova Ação"
              />
              <QuickAction
                href="/comercial/crm/acoes-prospeccao"
                icon={<BarChart3 size={18} />}
                label="Listar Ações"
              />
              <QuickAction
                href="/comercial/crm/acoes-prospeccao?view=kanban"
                icon={<PieChartIcon size={18} />}
                label="Kanban Ações"
              />
              <QuickAction
                href="/comercial/crm/leads/dashboard"
                icon={<CheckCircle2 size={18} />}
                label="Saúde da Prospecção"
              />
            </div>
          </div>
        </>
      )}

      {selectedAcao && (
        <AcaoProspeccaoLocationModal
          acaoId={selectedAcao.id}
          empresaNome={selectedAcao.nome}
          open={!!selectedAcao}
          onClose={() => setSelectedAcao(null)}
        />
      )}

      {selectedViagem && (
        <AcaoProspeccaoCronogramaModal
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
                <span className="sr-only">Carregando ações...</span>
              </div>
            ) : modalLista.length === 0 ? (
              <p className="py-12 text-center text-slate-500">Nenhuma ação encontrada</p>
            ) : (
              <div className="space-y-1">
                {modalLista.map((acao) => (
                  <Link
                    key={acao.id}
                    href={`/comercial/crm/acoes-prospeccao/${acao.id}`}
                    onClick={() => setModalFiltro(null)}
                    className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-200">
                        {acao.empresaNome || acao.clienteNome || acao.nomeAvulso || `Ação #${acao.id}`}
                      </p>
                      <p className="text-xs text-slate-400">
                        {acao.dataAcao
                          ? new Date(`${acao.dataAcao}T12:00:00`).toLocaleDateString("pt-BR")
                          : ""}
                        {acao.hora ? ` ${acao.hora}` : ""}
                        {` · ${TIPO_LABELS[acao.tipo || ""] || acao.tipo}`}
                      </p>
                    </div>
                    <div className="ml-3 shrink-0">
                      <span
                        className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          acao.status === "REALIZADA"
                            ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                            : acao.status === "CANCELADA"
                              ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                        }`}
                      >
                        {STATUS_LABELS[acao.status || ""] || acao.status}
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
  value,
  label,
  sub,
}: {
  onClick: () => void
  value: number
  label: string
  sub?: string
}) {
  const estilo = corPorTitulo(label)
  const Icone = iconePorTitulo(label)

  return (
    <button
      type="button"
      onClick={onClick}
      style={
        {
          "--card-borda": estilo.borda,
          "--card-realce": estilo.cor,
        } as CSSProperties
      }
      className="w-full rounded-xl border border-[color:var(--card-borda)] bg-white p-4 text-left hover:shadow-md dark:bg-slate-900"
    >
      <div className="flex items-center gap-3">
        <div
          className="rounded-lg p-2.5"
          style={{ backgroundColor: estilo.fundoIcone, color: estilo.cor }}
        >
          <Icone size={20} aria-hidden="true" />
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
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border border-transparent p-3 hover:bg-slate-50 hover:border-slate-200 dark:hover:bg-slate-800 dark:hover:border-slate-700"
    >
      <span className="text-blue-600 dark:text-blue-400">{icon}</span>
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
