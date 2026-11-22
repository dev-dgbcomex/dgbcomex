"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  PlusCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  Pencil,
  Eye,
  Users,
  Database,
  FileText,
  FlaskConical,
  Loader2,
  X,
  ExternalLink,
  Trash2,
  Search,
  Columns,
  Table,
} from "lucide-react"
import { toast } from "sonner"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { InfoButton } from "@/components/ui/info-button"
import ListFilters, { useListFilters } from "@/components/ui/list-filters"
import { getInfoContent } from "@/lib/info-content"
import { Button } from "@/components/ui/button"
import { ConfirmModal } from "@/components/ui/confirm-modal"
import ImportarApiModal from "@/components/integracao/ImportarApiModal"
import BuscarCnpjModal from "@/components/crm/buscar-cnpj-modal"
import { ExportarDados } from "@/components/exportar/ExportarDados"
import { SemaforoConversao, type SemaforoConversaoItem } from "@/components/crm/semaforo-conversao"
import { contarFaixasConversao } from "@/lib/crm/faixa-conversao"
import { MetricasModal, type TipoMetrica } from "@/components/crm/leads/metricas-modal"
import { useStatuses, hexToRgba, statusAtivos } from "@/hooks/use-statuses"
import type { Cliente, SolicitacaoResumo, AmostraResumo } from "./types"

const AMOSTRA_STATUS_BADGE: Record<string, string> = {
  PENDENTE: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  APROVADO: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  REPROVADO: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
}

export default function ClientesPage() {
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const { getLabel: getStatusLabel, getColor: getStatusColor } = useStatuses(
    "SOLICITACAO_DESENVOLVIMENTO"
  )
  const { statuses: statusClienteCadastro } = useStatuses("CLIENTE")
  const statusClienteOpcoes = statusAtivos(statusClienteCadastro).map((item) => ({
    value: item.nome,
    label: item.rotulo || item.nome,
  }))
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showCnpjSearch, setShowCnpjSearch] = useState(false)
  const [modo, setModo] = useState<"cards" | "tabela">(() => {
    if (typeof window !== "undefined") {
      const salvo = localStorage.getItem("clientes-modo")
      if (salvo === "cards" || salvo === "tabela") return salvo
    }
    return "cards"
  })

  const filterState = useListFilters(
    {
      searchFields: ["nome", "razaoSocial", "cnpj", "contato", "email", "telefone", "cidade"],
      statusOptions: statusClienteOpcoes,
    },
    clientes
  )
  const filteredData = filterState.filtered
  const itensSemaforo: SemaforoConversaoItem[] = filteredData.map((cliente) => ({
    id: cliente.id,
    faixaConversao: cliente.faixaConversao,
    nome: cliente.nome,
    subtitulo: cliente.razaoSocial,
    documento: cliente.cnpj,
    status: cliente.status || (cliente.ativo === false ? "Inativo" : cliente.ativo ? "Ativo" : null),
    href: `/comercial/clientes/${cliente.id}`,
  }))
  const [showApiImport, setShowApiImport] = useState(false)

  const [solicModal, setSolicModal] = useState<{
    cliente: Cliente
    data: SolicitacaoResumo[]
    loading: boolean
  } | null>(null)
  const [amostraModal, setAmostraModal] = useState<{
    cliente: Cliente
    data: AmostraResumo[]
    loading: boolean
  } | null>(null)
  const [metricaAberta, setMetricaAberta] = useState<{
    cliente: Cliente
    tipo: TipoMetrica
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Cliente | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteBlocked, setDeleteBlocked] = useState(false)
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUDO"

  const carregarClientes = useCallback(async () => {
    try {
      const res = await fetch("/api/clientes")
      if (res.ok) {
        const data = await res.json()
        setClientes(data)
      }
    } catch (err) {
      console.error("Erro ao buscar clientes:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarClientes()
  }, [carregarClientes])

  useEffect(() => {
    localStorage.setItem("clientes-modo", modo)
  }, [modo])

  async function abrirSolicitacoes(cliente: Cliente) {
    setSolicModal({ cliente, data: [], loading: true })
    try {
      const res = await fetch(`/api/clientes/${cliente.id}/solicitacoes`)
      if (res.ok) {
        const data = await res.json()
        setSolicModal({ cliente, data, loading: false })
      } else {
        setSolicModal(null)
        toast.error("Erro ao carregar solicitações")
      }
    } catch {
      setSolicModal(null)
      toast.error("Erro ao carregar solicitações")
    }
  }

  async function abrirAmostras(cliente: Cliente) {
    setAmostraModal({ cliente, data: [], loading: true })
    try {
      const res = await fetch(`/api/clientes/${cliente.id}/amostras`)
      if (res.ok) {
        const json = await res.json()
        const todas: AmostraResumo[] = [...(json.tecidoCru || []), ...(json.acabamento || [])]
        setAmostraModal({ cliente, data: todas, loading: false })
      } else {
        setAmostraModal(null)
        toast.error("Erro ao carregar amostras")
      }
    } catch {
      setAmostraModal(null)
      toast.error("Erro ao carregar amostras")
    }
  }

  function mapsUrl(cliente: Cliente) {
    const parts = [cliente.endereco, cliente.cidade, cliente.uf].filter(Boolean)
    if (parts.length === 0) return null
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`
  }

  async function handleExcluirCliente() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteBlocked(false)
    try {
      const res = await fetch(`/api/clientes/${deleteTarget.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        if (data.fkError) {
          setDeleteBlocked(true)
          return
        }
        throw new Error(data.error || "Erro ao excluir cliente")
      }
      toast.success("Cliente excluído com sucesso")
      setClientes((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir cliente")
      setDeleteTarget(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Clientes{info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {loading ? "Carregando..." : `${filteredData.length} de ${clientes.length} total`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 shadow-sm">
            <button
              onClick={() => setModo("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                modo === "cards"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Columns size={14} />
              Cards
            </button>
            <button
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
          </div>
          <Button variant="outline" onClick={() => setShowCnpjSearch(true)} className="gap-2">
            <Search size={16} />
            Buscar CNPJ
          </Button>
          <ExportarDados
            data={filteredData}
            columns={[
              { key: "nome", label: "Nome" },
              { key: "cnpj", label: "CNPJ" },
              { key: "email", label: "Email" },
              { key: "telefone", label: "Telefone" },
              { key: "cidade", label: "Cidade" },
              { key: "uf", label: "UF" },
            ]}
            filename="clientes-comercial"
            title="Clientes"
          />
          <Button variant="outline" onClick={() => setShowApiImport(true)} className="gap-2">
            <Database size={16} />
            Importar via API
          </Button>
          <Link
            href="/comercial/clientes/novo"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <PlusCircle size={16} />
            Novo Cliente
          </Link>
        </div>
      </div>

      <ListFilters
        config={{
          searchFields: ["nome", "razaoSocial", "cnpj", "contato", "email", "telefone", "cidade"],
          statusOptions: statusClienteOpcoes,
        }}
        data={clientes}
        filterState={filterState}
        placeholder="Buscar por nome, CNPJ, razão social, contato, email, telefone ou cidade..."
      />

      <SemaforoConversao
        contagem={contarFaixasConversao(filteredData)}
        entidade="clientes"
        itens={itensSemaforo}
        listagem="/comercial/clientes"
      />

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500 mt-2">Carregando clientes...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Nenhum cliente encontrado
            </p>
          </div>
        ) : modo === "cards" ? (
          <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredData.map((cliente) => (
              <div
                key={cliente.id}
                className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {cliente.nome}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {cliente.razaoSocial}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded shrink-0 ml-2">
                    {cliente.cnpj}
                  </span>
                </div>

                <div className="space-y-2 text-sm flex-1">
                  {cliente.contato && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Users size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{cliente.contato}</span>
                    </div>
                  )}
                  {cliente.email && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Mail size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{cliente.email}</span>
                    </div>
                  )}
                  {cliente.telefone && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Phone size={14} className="text-slate-400 shrink-0" />
                      <span>{cliente.telefone}</span>
                    </div>
                  )}
                  {cliente.cidade && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <MapPin size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">
                        {cliente.cidade}
                        {cliente.uf ? `, ${cliente.uf}` : ""}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-4 gap-1 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-2 text-center">
                  {[
                    {
                      label: "Oportunidades",
                      valor: cliente.totalOportunidades ?? 0,
                      tipo: "oportunidades" as const,
                    },
                    { label: "Pedidos", valor: cliente.totalPedidos ?? 0, tipo: "pedidos" as const },
                    { label: "Visitas", valor: cliente.totalVisitas ?? 0, tipo: "visitas" as const },
                    { label: "Ações", valor: cliente.totalAcoes ?? 0, tipo: "acoes" as const },
                  ].map((metrica) => (
                    <button
                      key={metrica.tipo}
                      type="button"
                      onClick={() => setMetricaAberta({ cliente, tipo: metrica.tipo })}
                      aria-label={`Ver ${metrica.label.toLowerCase()} de ${cliente.nome}`}
                      title={`Ver ${metrica.label.toLowerCase()} de ${cliente.nome}`}
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

                <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <Link
                    href={`/comercial/clientes/${cliente.id}`}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    title="Ver detalhes"
                  >
                    <Eye size={12} />
                    Ver
                  </Link>
                  <Link
                    href={`/comercial/clientes/${cliente.id}?edit=true`}
                    className="inline-flex items-center gap-1 text-xs text-amber-600 hover:underline"
                    title="Editar"
                  >
                    <Pencil size={12} />
                    Editar
                  </Link>
                  {mapsUrl(cliente) && (
                    <a
                      href={mapsUrl(cliente)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                      title="Abrir no Google Maps"
                    >
                      <ExternalLink size={12} />
                      Mapa
                    </a>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setDeleteTarget(cliente)
                        setDeleteBlocked(false)
                      }}
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline ml-auto"
                    >
                      <Trash2 size={12} />
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">
                    CNPJ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap hidden md:table-cell">
                    Razão Social
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap hidden lg:table-cell">
                    Contato
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap hidden lg:table-cell">
                    Cidade/UF
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredData.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-200 whitespace-nowrap">
                      {cliente.nome}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-500 whitespace-nowrap">
                      {cliente.cnpj}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 hidden md:table-cell">
                      {cliente.razaoSocial || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 hidden lg:table-cell">
                      {cliente.contato || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 hidden lg:table-cell">
                      {cliente.cidade
                        ? `${cliente.cidade}${cliente.uf ? `, ${cliente.uf}` : ""}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/comercial/clientes/${cliente.id}`}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <Pencil size={12} />
                          Editar
                        </Link>
                        <button
                          onClick={() => abrirSolicitacoes(cliente)}
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                        >
                          <FileText size={12} />
                          Solicitações
                        </button>
                        <button
                          onClick={() => abrirAmostras(cliente)}
                          className="inline-flex items-center gap-1 text-xs text-purple-600 hover:underline"
                        >
                          <FlaskConical size={12} />
                          Amostras
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setDeleteTarget(cliente)
                              setDeleteBlocked(false)
                            }}
                            className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                          >
                            <Trash2 size={12} />
                            Excluir
                          </button>
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

      {solicModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSolicModal(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl w-[90vw] max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText size={18} className="text-emerald-500" />
                Solicitações — {solicModal.cliente.nome}
              </h2>
              <button
                onClick={() => setSolicModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {solicModal.loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-slate-400" size={24} />
                </div>
              ) : solicModal.data.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-12">
                  Nenhuma solicitação encontrada
                </p>
              ) : (
                <div className="space-y-2">
                  {solicModal.data.map((s) => (
                    <Link
                      key={s.id}
                      href={`/comercial/solicitacoes/${s.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            #{s.id}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: hexToRgba(getStatusColor(s.status), 0.15),
                              color: getStatusColor(s.status),
                            }}
                          >
                            {getStatusLabel(s.status)}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                            {s.tipo === "DESENVOLVIMENTO_TECELAGEM"
                              ? "TECELAGEM"
                              : "BENEFICIAMENTO"}
                          </span>
                        </div>
                        {s.projeto && (
                          <p className="text-xs text-slate-500 mt-1 truncate">{s.projeto}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5">
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString("pt-BR") : ""}
                          {s.solicitanteNome ? ` ⬢ ${s.solicitanteNome}` : ""}
                        </p>
                      </div>
                      <ExternalLink
                        size={14}
                        className="text-slate-300 group-hover:text-slate-500 shrink-0 ml-2"
                      />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {amostraModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setAmostraModal(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl w-[90vw] max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FlaskConical size={18} className="text-purple-500" />
                Amostras — {amostraModal.cliente.nome}
              </h2>
              <button
                onClick={() => setAmostraModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {amostraModal.loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-slate-400" size={24} />
                </div>
              ) : amostraModal.data.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-12">
                  Nenhuma amostra encontrada
                </p>
              ) : (
                <div className="space-y-2">
                  {amostraModal.data.map((a) => (
                    <Link
                      key={`${a.tipoAmostra}-${a.id}`}
                      href={`/amostras?focoAmostra=${a.id}&tipo=${a.tipoAmostra}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">
                            {a.produtoCodigo}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${AMOSTRA_STATUS_BADGE[a.status] || "bg-slate-100 text-slate-600"}`}
                          >
                            {a.status}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 uppercase">
                            {a.tipoAmostra === "TECIDO_CRU" ? "CRU" : "ACABAMENTO"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {a.descricao || a.produtoDescricao}
                        </p>
                        {a.acabamentoDescricao && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Acabamento: {a.acabamentoDescricao}
                          </p>
                        )}
                      </div>
                      <ExternalLink
                        size={14}
                        className="text-slate-300 group-hover:text-slate-500 shrink-0 ml-2"
                      />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCnpjSearch && (
        <BuscarCnpjModal
          tipo="cliente"
          onCreated={carregarClientes}
          onClose={() => setShowCnpjSearch(false)}
        />
      )}

      {showApiImport && (
        <ImportarApiModal
          tela="clientes"
          existingRecords={clientes}
          existingKey="idIntegracao"
          onImportado={() => window.location.reload()}
          onClose={() => setShowApiImport(false)}
        />
      )}

      {metricaAberta && (
        <MetricasModal
          tipo={metricaAberta.tipo}
          entidade="cliente"
          entidadeId={metricaAberta.cliente.id}
          entidadeNome={metricaAberta.cliente.nome}
          onClose={() => setMetricaAberta(null)}
        />
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title={deleteBlocked ? "Exclusão não permitida" : "Excluir cliente?"}
        message={
          deleteBlocked
            ? "Este cliente possui cadastros vinculados e não pode ser excluído."
            : `Tem certeza que deseja excluir "${deleteTarget?.nome}"? Esta ação não pode ser desfeita.`
        }
        subMessage={
          deleteBlocked
            ? "Remova ou desvincule os registros associados antes de excluir. Entre em contato com o administrador para mais informações."
            : undefined
        }
        confirmLabel={deleteBlocked ? "OK" : "Excluir"}
        variant={deleteBlocked ? "warning" : "danger"}
        loading={deleteLoading}
        onConfirm={() => {
          if (deleteBlocked) {
            setDeleteTarget(null)
            setDeleteBlocked(false)
            return
          }
          handleExcluirCliente()
        }}
        onCancel={() => {
          setDeleteTarget(null)
          setDeleteBlocked(false)
        }}
      />
    </div>
  )
}
