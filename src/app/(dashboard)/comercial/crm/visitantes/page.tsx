"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Suspense, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { InfoButton } from "@/components/ui/info-button"
import { getInfoContent } from "@/lib/info-content"
import {
  PlusCircle,
  UserPlus,
  Search,
  Phone,
  Star,
  Building2,
  XCircle,
  Trash2,
  Table,
  Columns,
} from "lucide-react"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { FloatableKanban } from "@/components/crm/floatable-kanban"
import VisitantesKanban from "@/components/crm/visitantes-kanban"
import { ConfirmModal } from "@/components/ui/confirm-modal"
import ListFilters, { useListFilters } from "@/components/ui/list-filters"
import { PageSkeleton } from "@/components/ui/page-skeleton"

async function fetchVisitantes(): Promise<Visitante[]> {
  const res = await fetch("/api/crm/visitantes")
  if (!res.ok) throw new Error("Falha ao carregar")
  return res.json()
}

interface Visitante {
  id: number
  nome: string
  email: string | null
  celular: string | null
  empresaNome: string | null
  empresaRazaoSocial: string | null
  empresaId: number | null
  tipoPessoa: "PF" | "PJ" | null
  score: number | null
  origem: string | null
  responsavelNome: string | null
  status: string
  createdAt: string
}

const STATUS_CORES: Record<string, string> = {
  NOVO: "text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400",
  CONTATADO: "text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400",
  QUALIFICADO: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400",
  CONVERTIDO: "text-green-600 bg-green-50 dark:bg-green-950/50 dark:text-green-400",
  PERDIDO: "text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400",
}

const ORIGEM_LABELS: Record<string, string> = {
  SITE: "Site",
  INDICACAO: "Indicação",
  EVENTO: "Evento",
  PROSPECCAO: "Prospecção",
  LIGACAO: "Ligação",
  WHATSAPP: "WhatsApp",
  EMAIL: "E-mail",
  OUTRO: "Outro",
}

function CrmVisitantesPageContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const info = getInfoContent(pathname)
  const [modo, setModo] = useState<"tabela" | "kanban">(
    searchParams.get("view") === "kanban" ? "kanban" : "tabela"
  )
  const [visitanteToPerder, setVisitanteToPerder] = useState<Visitante | null>(null)
  const [visitanteToExcluir, setVisitanteToExcluir] = useState<Visitante | null>(null)
  const { data: session } = useSession()
  const role = (session?.user as Session["user"] | undefined)?.role
  const isAdmin = role === "ADMIN" || role === "SUDO"

  const {
    data: visitantes,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["crm-visitantes"],
    queryFn: fetchVisitantes,
    retry: 1,
  })

  const filterState = useListFilters(
    {
      searchFields: ["nome", "email", "empresaNome", "responsavelNome", "origem", "tipoPessoa"],
      statusOptions: [
        { value: "NOVO", label: "Novo" },
        { value: "CONTATADO", label: "Contatado" },
        { value: "QUALIFICADO", label: "Qualificado" },
        { value: "CONVERTIDO", label: "Convertido" },
        { value: "PERDIDO", label: "Perdido" },
      ],
      dateField: "createdAt",
    },
    visitantes || []
  )
  const filteredData = filterState.filtered

  async function converterParaEmpresa(visitante: Visitante) {
    const isPF = visitante.tipoPessoa === "PF"
    const label = isPF ? "Nome completo" : "Razão social"
    const valor = prompt(`${label}:`, visitante.empresaNome || visitante.nome)
    if (!valor) return

    try {
      const body: Record<string, unknown> = isPF
        ? { tipoPessoa: "PF", nome: valor }
        : { tipoPessoa: "PJ", razaoSocial: valor }

      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Erro ao criar lead")
      const lead = await res.json()

      await fetch(`/api/crm/visitantes/${visitante.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONVERTIDO", pessoaId: lead.id }),
      })

      toast.success(`Visitante convertido para lead "${valor}"`)
      refetch()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao converter")
    }
  }

  async function mudarStatus(visitante: Visitante, status: string) {
    try {
      await fetch(`/api/crm/visitantes/${visitante.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      toast.success(`Visitante alterado para ${status}`)
      refetch()
    } catch {
      toast.error("Erro ao atualizar status")
    }
  }

  async function excluirVisitante(visitante: Visitante) {
    try {
      const res = await fetch(`/api/crm/visitantes/${visitante.id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || "Erro ao excluir")
      }
      toast.success(`Visitante "${visitante.nome}" excluído`)
      refetch()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir")
    } finally {
      setVisitanteToExcluir(null)
    }
  }

  function formatDateTime(dateStr: string) {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Visitantes{info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isLoading
              ? "Carregando..."
              : `${filteredData.length} de ${(visitantes || []).length} total`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 shadow-sm">
            <button
              onClick={() => setModo("tabela")}
              aria-pressed={modo === "tabela"}
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
              onClick={() => setModo("kanban")}
              aria-pressed={modo === "kanban"}
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
          <Link
            href="/comercial/crm/visitantes/novo"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <PlusCircle size={14} />
            Novo Visitante
          </Link>
        </div>
      </div>

      <ListFilters
        config={{
          searchFields: ["nome", "email", "empresaNome", "responsavelNome", "origem", "tipoPessoa"],
          statusOptions: [
            { value: "NOVO", label: "Novo" },
            { value: "CONTATADO", label: "Contatado" },
            { value: "QUALIFICADO", label: "Qualificado" },
            { value: "CONVERTIDO", label: "Convertido" },
            { value: "PERDIDO", label: "Perdido" },
          ],
          dateField: "createdAt",
        }}
        data={visitantes || []}
        filterState={filterState}
        placeholder="Buscar visitantes..."
      />

      {modo === "tabela" && (
        <>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <UserPlus className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Nenhum visitante encontrado
                </p>
              </div>
            ) : (
              <div className="overflow-auto max-h-[70vh]">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">
                        Nome
                      </th>
                      <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap hidden sm:table-cell">
                        Contato
                      </th>
                      <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap hidden md:table-cell">
                        Visitante
                      </th>
                      <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap hidden sm:table-cell">
                        Score
                      </th>
                      <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap hidden lg:table-cell">
                        Origem
                      </th>
                      <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap hidden lg:table-cell">
                        Responsável
                      </th>
                      <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap hidden sm:table-cell">
                        Criado
                      </th>
                      <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredData.map((visitante: Visitante) => (
                      <tr key={visitante.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm font-medium whitespace-nowrap">
                          <Link
                            href={`/comercial/crm/visitantes/${visitante.id}`}
                            className="text-slate-900 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {visitante.nome}
                          </Link>
                        </td>
                        <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-slate-500 hidden sm:table-cell">
                          {visitante.email && <div className="truncate max-w-[180px]">{visitante.email}</div>}
                          {visitante.celular && <div className="text-xs">{visitante.celular}</div>}
                          {!visitante.email && !visitante.celular && "—"}
                        </td>
                        <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-slate-500 hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            {visitante.empresaNome ||
                              (visitante.empresaRazaoSocial ? (
                                <Link
                                  href={`/comercial/crm/leads/${visitante.empresaId}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  {visitante.empresaRazaoSocial}
                                </Link>
                              ) : (
                                "—"
                              ))}
                            {visitante.tipoPessoa && (
                              <span
                                className={`inline-flex text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  visitante.tipoPessoa === "PF"
                                    ? "text-purple-600 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-400"
                                    : "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/50 dark:text-cyan-400"
                                }`}
                              >
                                {visitante.tipoPessoa === "PF" ? "PF" : "PJ"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2 md:px-4 md:py-3 hidden sm:table-cell">
                          {visitante.score != null ? (
                            <span
                              className={`inline-flex text-[10px] px-1.5 md:px-2 py-0.5 rounded-full font-medium ${
                                visitante.score >= 70
                                  ? "text-green-600 bg-green-50 dark:bg-green-950/50 dark:text-green-400"
                                  : visitante.score >= 40
                                    ? "text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400"
                                    : "text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400"
                              }`}
                            >
                              {visitante.score}%
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2 md:px-4 md:py-3 hidden lg:table-cell">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                            {visitante.origem ? ORIGEM_LABELS[visitante.origem] || visitante.origem : "—"}
                          </span>
                        </td>
                        <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-slate-500 hidden lg:table-cell">
                          {visitante.responsavelNome || "—"}
                        </td>
                        <td className="px-2 py-2 md:px-4 md:py-3">
                          <span
                            className={`inline-flex text-[10px] px-1.5 md:px-2 py-0.5 rounded-full font-medium ${STATUS_CORES[visitante.status] || ""}`}
                          >
                            {visitante.status}
                          </span>
                        </td>
                        <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-slate-500 whitespace-nowrap hidden sm:table-cell">
                          {formatDateTime(visitante.createdAt)}
                        </td>
                        <td className="px-2 py-2 md:px-4 md:py-3">
                          <div className="flex items-center gap-2">
                            {visitante.status === "NOVO" && (
                              <button
                                onClick={() => mudarStatus(visitante, "CONTATADO")}
                                title="Contatar"
                                aria-label={`Contatar ${visitante.nome}`}
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                              >
                                <Phone size={15} />
                              </button>
                            )}
                            {visitante.status === "CONTATADO" && (
                              <button
                                onClick={() => mudarStatus(visitante, "QUALIFICADO")}
                                title="Qualificar"
                                aria-label={`Qualificar ${visitante.nome}`}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              >
                                <Star size={15} />
                              </button>
                            )}
                            {(visitante.status === "QUALIFICADO" || visitante.status === "NOVO") &&
                              !visitante.empresaId && (
                                <button
                                  onClick={() => converterParaEmpresa(visitante)}
                                  title="Converter para Lead (Negócio)"
                                  aria-label={`Converter ${visitante.nome} para lead`}
                                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                >
                                  <Building2 size={15} />
                                </button>
                              )}
                            {visitante.status !== "PERDIDO" && visitante.status !== "CONVERTIDO" && (
                              <button
                                onClick={() => setVisitanteToPerder(visitante)}
                                title="Perder"
                                aria-label={`Marcar ${visitante.nome} como perdido`}
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                              >
                                <XCircle size={15} />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => setVisitanteToExcluir(visitante)}
                                title="Excluir visitante"
                                aria-label={`Excluir ${visitante.nome}`}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600"
                              >
                                <Trash2 size={15} />
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
        </>
      )}

      {modo === "kanban" &&
        (isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <FloatableKanban tipo="VISITANTE">
            <VisitantesKanban visitantes={filteredData} />
          </FloatableKanban>
        ))}

      <ConfirmModal
        open={!!visitanteToPerder}
        title="Marcar visitante como perdido?"
        message={`O visitante "${visitanteToPerder?.nome}" será marcado como PERDIDO.`}
        subMessage="Esta ação não pode ser desfeita facilmente."
        variant="danger"
        confirmLabel="Marcar como Perdido"
        onConfirm={() => {
          if (visitanteToPerder) {
            mudarStatus(visitanteToPerder, "PERDIDO")
            setVisitanteToPerder(null)
          }
        }}
        onCancel={() => setVisitanteToPerder(null)}
      />
      <ConfirmModal
        open={!!visitanteToExcluir}
        title="Excluir visitante?"
        message={`Tem certeza que deseja excluir "${visitanteToExcluir?.nome}"? Oportunidades vinculadas e a timeline também serão removidos. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={() => visitanteToExcluir && excluirVisitante(visitanteToExcluir)}
        onCancel={() => setVisitanteToExcluir(null)}
      />
    </div>
  )
}

export default function CrmVisitantesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CrmVisitantesPageContent />
    </Suspense>
  )
}
