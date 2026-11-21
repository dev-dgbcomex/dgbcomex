"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Suspense, useEffect, useMemo, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { InfoButton } from "@/components/ui/info-button"
import { getInfoContent } from "@/lib/info-content"
import {
  PlusCircle,
  UserCircle,
  LayoutGrid,
  Table,
  Columns,
  Database,
  Building2,
  Eye,
  Pencil,
  ExternalLink,
  Archive,
  Mail,
  Phone,
  MapPin,
} from "lucide-react"
import LeadsKanban from "@/components/crm/leads-kanban"
import { FloatableKanban } from "@/components/crm/floatable-kanban"
import ImportarApiModal from "@/components/integracao/ImportarApiModal"
import BuscarCnpjModal from "@/components/crm/buscar-cnpj-modal"
import { Button } from "@/components/ui/button"
import ListFilters, { useListFilters } from "@/components/ui/list-filters"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { ExportarRelatorio } from "@/components/crm/relatorios/exportar-relatorio"
import { PromoverClienteBotao } from "@/components/crm/promover-cliente-botao"
import { LeadMetricasModal, type TipoMetricaLead } from "@/components/crm/leads/metricas-modal"
import { SemaforoConversao, type SemaforoConversaoItem } from "@/components/crm/semaforo-conversao"
import { contarFaixasConversao } from "@/lib/crm/faixa-conversao"
import type { Lead } from "./types"

async function fetchEmpresas(): Promise<Lead[]> {
  const res = await fetch("/api/crm/leads")
  if (!res.ok) throw new Error("Falha ao carregar")
  return res.json()
}

const STATUS_CORES: Record<string, string> = {
  NOVO: "text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400",
  QUALIFICADO: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400",
  CONVERTIDO_CLIENTE: "text-green-600 bg-green-50 dark:bg-green-950/50 dark:text-green-400",
  PERDIDO: "text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400",
  INATIVO: "text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-500",
}

type ConversaoFiltro = "sem" | "com" | "todos"
type ModoLead = "cards" | "tabela" | "kanban"

function CrmLeadsPageContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const info = getInfoContent(pathname)
  const [modo, setModo] = useState<ModoLead>(() => {
    if (typeof window !== "undefined") {
      const salvo = localStorage.getItem("leads-modo")
      if (salvo === "cards" || salvo === "tabela" || salvo === "kanban") return salvo
    }
    const view = searchParams.get("view")
    if (view === "cards" || view === "tabela" || view === "kanban") return view
    return "cards"
  })
  useEffect(() => {
    localStorage.setItem("leads-modo", modo)
  }, [modo])
  const [showApiImport, setShowApiImport] = useState(false)
  const [showCnpjSearch, setShowCnpjSearch] = useState(false)
  const [conversaoFiltro, setConversaoFiltro] = useState<ConversaoFiltro>("sem")
  const [metricaAberta, setMetricaAberta] = useState<{ lead: Lead; tipo: TipoMetricaLead } | null>(
    null
  )

  const {
    data: empresas,
    isLoading,
    refetch,
  } = useQuery<Lead[]>({
    queryKey: ["crm-leads"],
    queryFn: fetchEmpresas,
    retry: 1,
  })

  const filterState = useListFilters(
    {
      searchFields: ["nome", "razaoSocial", "cpf", "cnpj", "segmento", "responsavelNome"],
      statusOptions: [
        { value: "NOVO", label: "Novo" },
        { value: "QUALIFICADO", label: "Qualificado" },
        { value: "CONVERTIDO_CLIENTE", label: "Convertido" },
        { value: "PERDIDO", label: "Perdido" },
        { value: "INATIVO", label: "Inativo" },
      ],
      dateField: "createdAt",
    },
    empresas || []
  )

  const filtradasPorConversao = useMemo(() => {
    const lista = filterState.filtered
    if (conversaoFiltro === "todos") return lista
    return lista.filter((p) => Boolean(p.promovidaCliente) === (conversaoFiltro === "com"))
  }, [filterState.filtered, conversaoFiltro])

  const filteredData = filtradasPorConversao

  function nomeExibicao(p: Lead) {
    if (p.tipoPessoa === "PF") return p.nome || "—"
    return p.razaoSocial || "—"
  }

  function documento(p: Lead) {
    if (p.tipoPessoa === "PF") return p.cpf || "—"
    return p.cnpj || "—"
  }

  function mapsUrl(p: Lead) {
    const parts = [p.endereco, p.numero, p.bairro, p.cidade, p.uf, p.cep].filter(Boolean)
    if (parts.length === 0) return null
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`
  }

  const itensSemaforo: SemaforoConversaoItem[] = filteredData.map((emp) => ({
    id: emp.id,
    faixaConversao: emp.faixaConversao,
    nome: nomeExibicao(emp),
    subtitulo: emp.nomeFantasia && emp.nomeFantasia !== nomeExibicao(emp) ? emp.nomeFantasia : null,
    documento: documento(emp),
    status: emp.status ?? null,
    href: `/comercial/crm/leads/${emp.id}`,
  }))

  const dadosExportacao = useMemo(
    () => ({
      filename: "leads-crm",
      title: "Relatório de Leads (Negócios)",
      period: `${filtradasPorConversao.length} registro(s)${
        conversaoFiltro === "com"
          ? " convertidos em cliente"
          : conversaoFiltro === "sem"
            ? " sem conversão"
            : ""
      }`,
      headers: ["Nome", "Documento", "Tipo", "Segmento", "Status", "Conversão", "Data"],
      rows: filtradasPorConversao.map((p) => [
        nomeExibicao(p),
        documento(p),
        p.tipoPessoa || "—",
        p.segmento || "—",
        p.status || "—",
        p.promovidaCliente ? "Sim" : "Não",
        p.createdAt ? new Date(p.createdAt).toLocaleDateString("pt-BR") : "—",
      ]),
      stats: {
        Total: filtradasPorConversao.length,
        Convertidos: filtradasPorConversao.filter((p) => p.promovidaCliente).length,
        "Sem conversão": filtradasPorConversao.filter((p) => !p.promovidaCliente).length,
      },
    }),
    [filtradasPorConversao, conversaoFiltro]
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Leads (Negócios){info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isLoading
              ? "Carregando..."
              : `${filteredData.length} de ${(empresas || []).length} total`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 shadow-sm">
            <button
              type="button"
              aria-pressed={conversaoFiltro === "sem"}
              onClick={() => setConversaoFiltro("sem")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                conversaoFiltro === "sem"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
              title="Mostrar apenas leads que ainda não viraram cliente"
            >
              <UserCircle size={14} />
              Sem conversão
            </button>
            <button
              type="button"
              aria-pressed={conversaoFiltro === "com"}
              onClick={() => setConversaoFiltro("com")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                conversaoFiltro === "com"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
              title="Mostrar apenas leads que já viraram cliente"
            >
              <Archive size={14} />
              Convertidos
            </button>
            <button
              type="button"
              aria-pressed={conversaoFiltro === "todos"}
              onClick={() => setConversaoFiltro("todos")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                conversaoFiltro === "todos"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
              title="Mostrar todas as leads"
            >
              Todos
            </button>
          </div>
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 shadow-sm">
            <button
              type="button"
              aria-pressed={modo === "cards"}
              onClick={() => setModo("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                modo === "cards"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <LayoutGrid size={14} />
              Cards
            </button>
            <button
              type="button"
              aria-pressed={modo === "tabela"}
              onClick={() => setModo("tabela")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                modo === "tabela"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Table size={14} />
              Tabela
            </button>
            <button
              type="button"
              aria-pressed={modo === "kanban"}
              onClick={() => setModo("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                modo === "kanban"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Columns size={14} />
              Kanban
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCnpjSearch(true)}
            className="gap-1.5"
          >
            <Building2 size={14} />
            Buscar CNPJ
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowApiImport(true)}
            className="gap-1.5"
          >
            <Database size={14} />
            Importar via API
          </Button>
          <Link
            href="/comercial/crm/leads/novo"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <PlusCircle size={14} />
            Novo Lead
          </Link>
          <ExportarRelatorio dados={dadosExportacao} disabled={isLoading} />
        </div>
      </div>

      <ListFilters
        config={{
          searchFields: ["nome", "razaoSocial", "cpf", "cnpj", "segmento", "responsavelNome"],
          statusOptions: [
            { value: "NOVO", label: "Novo" },
            { value: "QUALIFICADO", label: "Qualificado" },
            { value: "CONVERTIDO_CLIENTE", label: "Convertido" },
            { value: "PERDIDO", label: "Perdido" },
            { value: "INATIVO", label: "Inativo" },
          ],
          dateField: "createdAt",
        }}
        data={empresas || []}
        filterState={filterState}
        placeholder="Buscar leads..."
      />

      <SemaforoConversao
        contagem={contarFaixasConversao(filteredData)}
        entidade="leads"
        itens={itensSemaforo}
        listagem="/comercial/crm/leads"
      />

      {modo === "cards" &&
        (isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-20 text-center">
            <UserCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Nenhum lead encontrada
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredData.map((emp) => (
              <article
                key={emp.id}
                className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/comercial/crm/leads/${emp.id}`}
                      className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:underline"
                    >
                      {nomeExibicao(emp)}
                    </Link>
                    {emp.nomeFantasia && emp.nomeFantasia !== nomeExibicao(emp) && (
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {emp.nomeFantasia}
                      </p>
                    )}
                    <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {documento(emp)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                      {emp.tipoPessoa || "—"}
                    </span>
                    {emp.promovidaCliente && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                        <Archive size={11} />
                        Cliente
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      STATUS_CORES[emp.status ?? ""] || "text-slate-600 bg-slate-100"
                    }`}
                  >
                    {emp.status || "—"}
                  </span>
                  {emp.segmento && (
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                      {emp.segmento}
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-4 gap-1 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-2 text-center">
                  {[
                    {
                      label: "Oportunidades",
                      valor: emp.totalOportunidades ?? 0,
                      tipo: "oportunidades" as const,
                    },
                    { label: "Pedidos", valor: emp.totalPedidos ?? 0, tipo: "pedidos" as const },
                    { label: "Visitas", valor: emp.totalVisitas ?? 0, tipo: "visitas" as const },
                    { label: "Ações", valor: emp.totalAcoes ?? 0, tipo: "acoes" as const },
                  ].map((metrica) => (
                    <button
                      key={metrica.tipo}
                      type="button"
                      onClick={() => setMetricaAberta({ lead: emp, tipo: metrica.tipo })}
                      aria-label={`Ver ${metrica.label.toLowerCase()} de ${nomeExibicao(emp)}`}
                      title={`Ver ${metrica.label.toLowerCase()} de ${nomeExibicao(emp)}`}
                      className="min-w-0 rounded-md px-1 py-1 transition-colors hover:bg-white dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {metrica.valor}
                      </div>
                      <div className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                        {metrica.label}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between gap-3">
                    <span>Cadastro</span>
                    <span className="text-slate-700 dark:text-slate-200">
                      {emp.createdAt ? new Date(emp.createdAt).toLocaleDateString("pt-BR") : "—"}
                    </span>
                  </div>
                </div>

                {(emp.email || emp.telefone || emp.cidade) && (
                  <div className="mt-3 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-600 dark:text-slate-400">
                    {emp.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={12} className="shrink-0 text-slate-400" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                    )}
                    {emp.telefone && (
                      <div className="flex items-center gap-2">
                        <Phone size={12} className="shrink-0 text-slate-400" />
                        <span>{emp.telefone}</span>
                      </div>
                    )}
                    {emp.cidade && (
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="shrink-0 text-slate-400" />
                        <span className="truncate">
                          {emp.cidade}
                          {emp.uf ? `, ${emp.uf}` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <Link
                    href={`/comercial/crm/leads/${emp.id}`}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    title="Ver detalhes"
                  >
                    <Eye size={12} />
                    Ver
                  </Link>
                  <Link
                    href={`/comercial/crm/leads/${emp.id}?edit=true`}
                    className="inline-flex items-center gap-1 text-xs text-amber-600 hover:underline"
                    title="Editar"
                  >
                    <Pencil size={12} />
                    Editar
                  </Link>
                  {mapsUrl(emp) && (
                    <a
                      href={mapsUrl(emp)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                      title="Abrir no Google Maps"
                    >
                      <ExternalLink size={12} />
                      Mapa
                    </a>
                  )}
                  {!emp.promovidaCliente && (
                    <PromoverClienteBotao lead={emp} compact onPromovido={() => refetch()} />
                  )}
                </div>
              </article>
            ))}
          </div>
        ))}

      {modo === "tabela" && (
        <>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <UserCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Nenhum lead encontrada
                </p>
              </div>
            ) : (
              <div className="overflow-auto max-h-[70vh]">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">
                        Tipo
                      </th>
                      <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">
                        Nome
                      </th>
                      <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap hidden sm:table-cell">
                        Documento
                      </th>
                      <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap hidden lg:table-cell">
                        Segmento
                      </th>
                      <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap hidden md:table-cell">
                        Responsável
                      </th>
                      <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap hidden sm:table-cell">
                        Data
                      </th>
                      <th className="px-2 py-2 md:px-4 md:py-3 text-right text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">
                        Responsável
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredData.map((emp: Lead) => (
                      <tr
                        key={emp.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                      >
                        <td className="px-2 py-2 md:px-4 md:py-3">
                          {emp.tipoPessoa ? (
                            <span
                              className={`inline-flex text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                emp.tipoPessoa === "PF"
                                  ? "text-purple-600 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-400"
                                  : "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/50 dark:text-cyan-400"
                              }`}
                            >
                              {emp.tipoPessoa === "PF" ? "PF" : "PJ"}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm font-medium text-slate-900 dark:text-slate-200 whitespace-nowrap">
                          <Link href={`/comercial/crm/leads/${emp.id}`} className="hover:underline">
                            {nomeExibicao(emp)}
                          </Link>
                        </td>
                        <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm font-mono text-slate-500 hidden sm:table-cell">
                          {documento(emp)}
                        </td>
                        <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-slate-500 hidden lg:table-cell">
                          {emp.segmento || "—"}
                        </td>
                        <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-slate-500 hidden md:table-cell">
                          {emp.responsavelNome || "—"}
                        </td>
                        <td className="px-2 py-2 md:px-4 md:py-3">
                          <span
                            className={`inline-flex text-[10px] px-1.5 md:px-2 py-0.5 rounded-full font-medium ${STATUS_CORES[emp.status ?? ""] || "text-slate-600 bg-slate-100"}`}
                          >
                            {emp.status}
                          </span>
                        </td>
                        <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-slate-500 whitespace-nowrap hidden sm:table-cell">
                          {emp.createdAt
                            ? new Date(emp.createdAt).toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                        <td
                          className="px-2 py-2 md:px-4 md:py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/comercial/crm/leads/${emp.id}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye size={14} />
                            </Link>
                            <Link
                              href={`/comercial/crm/leads/${emp.id}?edit=true`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </Link>
                            {mapsUrl(emp) && (
                              <a
                                href={mapsUrl(emp)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                                title="Abrir no Google Maps"
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                            {emp.promovidaCliente ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                                title={`Virou cliente${emp.promovidoEm ? ` em ${new Date(emp.promovidoEm).toLocaleDateString("pt-BR")}` : ""}`}
                              >
                                <Archive size={12} />
                                Cliente
                              </span>
                            ) : (
                              <PromoverClienteBotao
                                lead={emp}
                                compact
                                onPromovido={() => refetch()}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {modo === "kanban" &&
        (isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <FloatableKanban tipo="PESSOA">
            <LeadsKanban leads={filteredData} />
          </FloatableKanban>
        ))}

      {metricaAberta && (
        <LeadMetricasModal
          tipo={metricaAberta.tipo}
          leadId={metricaAberta.lead.id}
          leadNome={nomeExibicao(metricaAberta.lead)}
          onClose={() => setMetricaAberta(null)}
        />
      )}

      {showApiImport && (
        <ImportarApiModal
          tela="leads"
          existingRecords={empresas || []}
          existingKey="idIntegracao"
          onImportado={() => window.location.reload()}
          onClose={() => setShowApiImport(false)}
        />
      )}

      {showCnpjSearch && (
        <BuscarCnpjModal
          tipo="lead"
          onCreated={() => window.location.reload()}
          onClose={() => setShowCnpjSearch(false)}
        />
      )}
    </div>
  )
}

export default function CrmLeadsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CrmLeadsPageContent />
    </Suspense>
  )
}
