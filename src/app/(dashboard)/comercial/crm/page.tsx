"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { InfoButton } from "@/components/ui/info-button"
import type { InfoContent } from "@/lib/info-content"
import { crmDashboardInfo } from "@/lib/info-content/crm-dashboard"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  DashboardDetalhesModal,
  type DetalheDashboard,
} from "@/components/crm/dashboard/detalhes-modal"
import { SemaforoConversao } from "@/components/crm/semaforo-conversao"
import type { FaixaConversao } from "@/lib/crm/faixa-conversao"
import type { TemperaturaItem } from "@/lib/crm/temperatura"
import {
  Building2,
  Users,
  Target,
  UserPlus,
  Clock,
  CheckCircle2,
  FileText,
  Calendar,
  ArrowRight,
  AlertCircle,
  BarChart3,
  Megaphone,
} from "lucide-react"

const CrmCharts = dynamic(() => import("./charts").then((m) => m.CrmCharts), { ssr: false })

type CrmDashboardData = {
  temperatura: { itens: TemperaturaItem[]; contagem: Record<FaixaConversao, number> }
  visitantes: { total: number; esteMes: number }
  leads: { total: number }
  clientes: { total: number }
  oportunidades: {
    total: number
    esteMes: number
    byStatus: { status: string; total: number }[]
  }
  propostas: {
    total: number
    byStatus: { status: string; total: number }[]
  }
  visitas: { total: number; hoje: number }
  acoesProspeccao: { realizadas: number; hoje: number; esteMes: number }
  tarefas: { pendentes: number; vencendo: number }
  topEmpresas: {
    empresaId: number | null
    empresaNome: string
    totalValor: number
  }[]
  topClientes: {
    clienteId: number
    clienteNome: string
    totalValor: number
    totalOportunidades: number
    oportunidadesConvertidas: number
    valorAberto: number
  }[]
  forecast: number
  forecastQuantidade: number
  conversao: {
    oportunidadesConvertidas: number
    totalOportunidades: number
    valorConvertido: number
  }
  totalPrevisaoConversao: { quantidade: number; valor: number }
  recentes: { id: number; tipo: string; descricao: string; dataEvento: string; href?: string }[]
  previsaoVendas: {
    periodo: string
    valorPrevisto: number
    valorReal: number | null
    dados: unknown
  }[]
  campanhas: { total: number; ativas: number; orcamentoTotal: number }
  emailMassa: { enviados: number; lidos: number; clicados: number }
}

const STATUS_CORES: Record<string, string> = {
  NOVO: "text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400",
  QUALIFICADO: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400",
  QUALIFICACAO: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400",
  PROPOSTA: "text-purple-600 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-400",
  NEGOCIACAO: "text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400",
  FECHADO_GANHO: "text-green-600 bg-green-50 dark:bg-green-950/50 dark:text-green-400",
  FECHADO_PERDIDO: "text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400",
  CONVERTIDO: "text-green-600 bg-green-50 dark:bg-green-950/50 dark:text-green-400",
  PERDIDO: "text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400",
  CONTATADO: "text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400",
}

const TIPO_EVENTO_ICON: Record<string, React.ReactNode> = {
  LEAD: <UserPlus size={14} />,
  OPORTUNIDADE: <Target size={14} />,
  VISITA: <Calendar size={14} />,
  TAREFA: <CheckCircle2 size={14} />,
  PROPOSTA: <FileText size={14} />,
  ACAO_PROSPECCAO: <Megaphone size={14} />,
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function getTipoCor(tipo: string) {
  const map: Record<string, string> = {
    LEAD: "text-emerald-500",
    OPORTUNIDADE: "text-purple-500",
    VISITA: "text-blue-500",
    TAREFA: "text-amber-500",
    PROPOSTA: "text-cyan-500",
    ACAO_PROSPECCAO: "text-violet-500",
  }
  return map[tipo] || "text-slate-400"
}

function getTipoBg(tipo: string) {
  const map: Record<string, string> = {
    LEAD: "bg-emerald-100 dark:bg-emerald-950/50",
    OPORTUNIDADE: "bg-purple-100 dark:bg-purple-950/50",
    VISITA: "bg-blue-100 dark:bg-blue-950/50",
    TAREFA: "bg-amber-100 dark:bg-amber-950/50",
    PROPOSTA: "bg-cyan-100 dark:bg-cyan-950/50",
    ACAO_PROSPECCAO: "bg-violet-100 dark:bg-violet-950/50",
  }
  return map[tipo] || "bg-slate-100 dark:bg-slate-800"
}

export default function CrmDashboardPage() {
  const [detalhe, setDetalhe] = useState<DetalheDashboard | null>(null)
  const { data, isLoading, isError } = useQuery<CrmDashboardData>({
    queryKey: ["crm-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/crm/dashboard")
      if (!res.ok) throw new Error("Falha ao carregar dashboard")
      return res.json()
    },
    retry: 1,
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            CRM
            <InfoButton
              content={crmDashboardInfo.pagina}
              label="Informações da visão geral do CRM"
            />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Dashboard comercial com métricas de pipeline, atividades e previsão
          </p>
        </div>
      </div>

      <QuickActionsBar />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Erro ao carregar dashboard
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Verifique se as tabelas do CRM existem no banco de dados.
          </p>
        </div>
      ) : (
        <>
          {/* Linha 1: Cards de resumo */}
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <SummaryCard
              onClick={() => setDetalhe({ bloco: "leads" })}
              icon={<Building2 size={20} />}
              value={data?.leads.total ?? 0}
              label="Leads (Negócios)"
              info={crmDashboardInfo.resumo}
              bgColor="bg-blue-100 dark:bg-blue-950/50"
              iconColor="text-blue-600 dark:text-blue-400"
            />
            <SummaryCard
              onClick={() => setDetalhe({ bloco: "clientes" })}
              icon={<Users size={20} />}
              value={data?.clientes.total ?? 0}
              label="Clientes"
              info={crmDashboardInfo.resumo}
              bgColor="bg-indigo-100 dark:bg-indigo-950/50"
              iconColor="text-indigo-600 dark:text-indigo-400"
            />
            <SummaryCard
              onClick={() => setDetalhe({ bloco: "oportunidades" })}
              icon={<Target size={20} />}
              value={data?.oportunidades.total ?? 0}
              label="Oportunidades"
              sub={`${data?.oportunidades.esteMes ?? 0} este mês`}
              info={crmDashboardInfo.resumo}
              bgColor="bg-purple-100 dark:bg-purple-950/50"
              iconColor="text-purple-600 dark:text-purple-400"
            />
            <SummaryCard
              onClick={() => setDetalhe({ bloco: "visitas" })}
              icon={<Calendar size={20} />}
              value={data?.visitas.total ?? 0}
              label="Visitas"
              sub={data?.visitas.hoje ? `${data.visitas.hoje} hoje` : undefined}
              info={crmDashboardInfo.resumo}
              bgColor="bg-amber-100 dark:bg-amber-950/50"
              iconColor="text-amber-600 dark:text-amber-400"
            />
            <SummaryCard
              onClick={() => setDetalhe({ bloco: "acoes-realizadas" })}
              icon={<Megaphone size={20} />}
              value={data?.acoesProspeccao.realizadas ?? 0}
              label="Ações de Prospecção"
              sub={`${data?.acoesProspeccao.hoje ?? 0} hoje · ${data?.acoesProspeccao.esteMes ?? 0} no mês`}
              info={crmDashboardInfo.resumo}
              bgColor="bg-violet-100 dark:bg-violet-950/50"
              iconColor="text-violet-600 dark:text-violet-400"
            />
            <SummaryCard
              onClick={() => setDetalhe({ bloco: "tarefas" })}
              icon={<CheckCircle2 size={20} />}
              value={data?.tarefas.pendentes ?? 0}
              label="Tarefas Pendentes"
              sub={data?.tarefas.vencendo ? `${data.tarefas.vencendo} vencidas` : undefined}
              info={crmDashboardInfo.resumo}
              bgColor="bg-rose-100 dark:bg-rose-950/50"
              iconColor="text-rose-600 dark:text-rose-400"
            />
          </div>

          {data?.temperatura && (
            <section aria-label="Temperatura de leads e clientes" className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Temperatura — leads e clientes
                  <InfoButton
                    content={crmDashboardInfo.temperatura}
                    label="Informações da temperatura de leads e clientes"
                  />
                </h2>
                <Link
                  href="/comercial/crm/temperatura/kanban"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Abrir kanban de temperatura <ArrowRight size={12} />
                </Link>
              </div>
              <SemaforoConversao
                contagem={data.temperatura.contagem}
                entidade="leads-clientes"
                itens={data.temperatura.itens}
                listagem="/comercial/crm/temperatura/kanban"
              />
            </section>
          )}

          {/* Linha 2: Pipeline, Forecast, Conversão */}
          <div className="grid gap-6 md:grid-cols-3">
            <CrmCharts data={data} onDetalhe={(bloco, status) => setDetalhe({ bloco, status })} />
          </div>

          {/* Linha 3: Top Leads, Top Clientes e Atividades Recentes */}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {/* Top Leads */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Building2 size={16} className="text-blue-500" />
                  Top Leads (Negócios)
                  <InfoButton
                    content={crmDashboardInfo.paineis.topLeads}
                    label="Informações do painel Top Leads"
                  />
                </h2>
                <button
                  type="button"
                  onClick={() => setDetalhe({ bloco: "top-leads" })}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Ver todas <ArrowRight size={12} />
                </button>
              </div>
              {data?.topEmpresas && data.topEmpresas.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.topEmpresas.map((emp, i) => (
                    <Link
                      key={emp.empresaId ?? i}
                      href={
                        emp.empresaId
                          ? `/comercial/crm/leads/${emp.empresaId}`
                          : "/comercial/crm/leads"
                      }
                      className="flex items-center justify-between p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-slate-400 w-5">{i + 1}.</span>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {emp.empresaNome}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(emp.totalValor)}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">
                  Nenhuma oportunidade em aberto
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Users size={16} className="text-indigo-500" />
                  Top Clientes
                  <InfoButton
                    content={crmDashboardInfo.paineis.topClientes}
                    label="Informações do painel Top Clientes"
                  />
                </h2>
                <button
                  type="button"
                  onClick={() => setDetalhe({ bloco: "top-clientes" })}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Ver todas <ArrowRight size={12} />
                </button>
              </div>
              {data?.topClientes && data.topClientes.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.topClientes.map((cliente, i) => (
                    <Link
                      key={cliente.clienteId}
                      href={`/comercial/clientes/${cliente.clienteId}`}
                      className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 w-5">{i + 1}.</span>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {cliente.clienteNome}
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {cliente.oportunidadesConvertidas} convertidas de{" "}
                          {cliente.totalOportunidades}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                        {formatCurrency(cliente.totalValor)}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">
                  Nenhuma oportunidade de cliente
                </p>
              )}
            </div>

            {/* Atividades Recentes */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Clock size={16} className="text-slate-500" />
                  Atividades Recentes
                  <InfoButton
                    content={crmDashboardInfo.paineis.recentes}
                    label="Informações do painel Atividades Recentes"
                  />
                </h2>
                <button
                  type="button"
                  onClick={() => setDetalhe({ bloco: "recentes" })}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Ver todas <ArrowRight size={12} />
                </button>
              </div>
              {data?.recentes && data.recentes.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.recentes.map((ev) => (
                    <Link
                      key={ev.id}
                      href={ev.href || "/comercial/crm"}
                      className="flex items-start gap-3 p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <div className={`rounded-lg p-1.5 mt-0.5 ${getTipoBg(ev.tipo)}`}>
                        <span className={getTipoCor(ev.tipo)}>
                          {TIPO_EVENTO_ICON[ev.tipo] || <Clock size={14} />}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-900 dark:text-slate-100 leading-tight">
                          {ev.descricao}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {ev.dataEvento
                            ? new Date(ev.dataEvento).toLocaleString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-sm text-slate-400">Nenhuma atividade recente</p>
                </div>
              )}
            </div>
          </div>

          <QuickActionsBar />

          {detalhe && <DashboardDetalhesModal detalhe={detalhe} onClose={() => setDetalhe(null)} />}
        </>
      )}
    </div>
  )
}

function SummaryCard({
  onClick,
  icon,
  value,
  label,
  sub,
  info,
  bgColor,
  iconColor,
}: {
  onClick: () => void
  icon: React.ReactNode
  value: number
  label: string
  sub?: string
  info: InfoContent
  bgColor: string
  iconColor: string
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      title={label}
      aria-label={`Abrir detalhes de ${label}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onClick()
        }
      }}
      className="min-w-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`shrink-0 rounded-lg ${bgColor} p-2.5`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 truncate">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{label}</p>
        </div>
        <span
          className="shrink-0"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <InfoButton content={info} label={`Informações do card ${label}`} />
        </span>
      </div>
      {sub && <p className="text-[10px] text-slate-400 mt-1.5 truncate">{sub}</p>}
    </div>
  )
}

function QuickActionsBar() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
      <h2 className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
        Ações Rápidas
        <InfoButton content={crmDashboardInfo.acoesRapidas} label="Informações das Ações Rápidas" />
      </h2>
      <div className="flex flex-1 flex-wrap items-center gap-1.5">
        <QuickAction
          href="/comercial/crm/leads/novo"
          icon={<Building2 size={14} />}
          label="Novo Lead (Negócio)"
          color="text-blue-600 dark:text-blue-400"
        />
        <QuickAction
          href="/comercial/crm/oportunidades/novo"
          icon={<Target size={14} />}
          label="Nova Oportunidade"
          color="text-purple-600 dark:text-purple-400"
        />
        <QuickAction
          href="/comercial/crm/acoes-prospeccao/novo"
          icon={<Megaphone size={14} />}
          label="Nova Ação de Prospecção"
          color="text-violet-600 dark:text-violet-400"
        />
        <QuickAction
          href="/comercial/crm/temperatura/kanban"
          icon={<BarChart3 size={14} />}
          label="Kanban"
          color="text-indigo-600 dark:text-indigo-400"
        />
        <QuickAction
          href="/comercial/crm/visitas/novo"
          icon={<Calendar size={14} />}
          label="Nova Visita"
          color="text-amber-600 dark:text-amber-400"
        />
        <QuickAction
          href="/comercial/crm/tarefas"
          icon={<CheckCircle2 size={14} />}
          label="Minhas Tarefas"
          color="text-rose-600 dark:text-rose-400"
        />
      </div>
    </div>
  )
}

function QuickAction({
  href,
  icon,
  label,
  color,
}: {
  href: string
  icon: React.ReactNode
  label: string
  color: string
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-transparent px-2 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-colors hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
    >
      <span className={color}>{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  )
}
