"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { AlertCircle, ArrowRight, ExternalLink, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ExportarDados } from "@/components/exportar/ExportarDados"

export type DetalheDashboard = {
  bloco: string
  status?: string
}

type DetalheItem = {
  id: number
  titulo: string
  subtitulo?: string | null
  detalhe?: string | null
  status?: string | null
  data?: string | null
  valor?: number | null
  href?: string | null
}

type DetalheResponse = {
  bloco: string
  titulo: string
  listagem: string
  itens: DetalheItem[]
  totalRegistros?: number
  totalValor?: number
}

const STATUS_CORES: Record<string, string> = {
  NOVO: "text-blue-700 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300",
  QUALIFICADO: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300",
  QUALIFICACAO: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300",
  PROPOSTA: "text-purple-700 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-300",
  NEGOCIACAO: "text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300",
  FECHADO_GANHO: "text-green-700 bg-green-50 dark:bg-green-950/50 dark:text-green-300",
  CONVERTIDO: "text-green-700 bg-green-50 dark:bg-green-950/50 dark:text-green-300",
  FECHADO_PERDIDO: "text-red-700 bg-red-50 dark:bg-red-950/50 dark:text-red-300",
  PERDIDO: "text-red-700 bg-red-50 dark:bg-red-950/50 dark:text-red-300",
  PENDENTE: "text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300",
  REALIZADA: "text-green-700 bg-green-50 dark:bg-green-950/50 dark:text-green-300",
  AGENDADA: "text-blue-700 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300",
  CANCELADA: "text-red-700 bg-red-50 dark:bg-red-950/50 dark:text-red-300",
  ACAO_PROSPECCAO: "text-cyan-700 bg-cyan-50 dark:bg-cyan-950/50 dark:text-cyan-300",
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatarData(valor: string | null | undefined) {
  if (!valor) return "—"
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return valor
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const COLUNAS_EXPORTACAO = [
  { key: "titulo", label: "Oportunidade" },
  { key: "subtitulo", label: "Detalhe" },
  { key: "status", label: "Status" },
  { key: "data", label: "Data" },
  { key: "valor", label: "Valor" },
  { key: "link", label: "Link" },
]

export function DashboardDetalhesModal({
  detalhe,
  onClose,
}: {
  detalhe: DetalheDashboard
  onClose: () => void
}) {
  const params = new URLSearchParams({ bloco: detalhe.bloco })
  if (detalhe.status) params.set("status", detalhe.status)
  const comTotais = detalhe.bloco === "previsao-abertas" || detalhe.bloco === "previsao-convertidas"
  if (comTotais) params.set("limite", "500")

  const { data, isLoading, isError } = useQuery<DetalheResponse>({
    queryKey: ["crm-dashboard-detalhes", detalhe.bloco, detalhe.status ?? null],
    queryFn: async () => {
      const res = await fetch(`/api/crm/dashboard/detalhes?${params.toString()}`)
      if (!res.ok) throw new Error("Falha ao carregar detalhes")
      return res.json()
    },
    retry: 1,
  })

  const linhasExportacao = (data?.itens ?? []).map((item) => ({
    titulo: item.titulo,
    subtitulo: item.subtitulo || item.detalhe || "",
    status: item.status || "",
    data: formatarData(item.data),
    valor: typeof item.valor === "number" ? formatCurrency(item.valor) : "",
    link: item.href || "",
  }))
  const nomeArquivo = `dashboard-${detalhe.bloco}`

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl p-0">
        <DialogHeader className="border-b border-slate-100 p-5 pr-12 dark:border-slate-800">
          <DialogTitle className="text-base text-slate-900 dark:text-slate-50">
            {data?.titulo ?? "Detalhes do dashboard"}
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {data
              ? `${data.totalRegistros ?? data.itens.length} registro(s) encontrado(s)`
              : "Carregando registros..."}
          </p>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-5">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Não foi possível carregar os detalhes.
              </p>
            </div>
          ) : data?.itens.length ? (
            <ul className="space-y-2">
              {data.itens.map((item) => (
                <li key={`${detalhe.bloco}-${item.id}`}>
                  <Link
                    href={item.href || data.listagem}
                    onClick={onClose}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:border-blue-300 hover:bg-blue-50/60 dark:border-slate-800 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {item.titulo}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {item.subtitulo || item.detalhe || formatarData(item.data)}
                      </p>
                    </div>
                    {item.status && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          STATUS_CORES[item.status] ??
                          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {item.status}
                      </span>
                    )}
                    {typeof item.valor === "number" && (
                      <span className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {formatCurrency(item.valor)}
                      </span>
                    )}
                    <ExternalLink size={13} className="shrink-0 text-slate-400" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <AlertCircle className="h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="text-sm text-slate-400">Nenhum registro encontrado.</p>
            </div>
          )}
        </div>
        {data && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 dark:border-slate-800">
            {comTotais ? (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total de {data.totalRegistros ?? data.itens.length} oportunidade(s)
                </p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
                  {formatCurrency(data.totalValor ?? 0)}
                </p>
              </div>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap items-center gap-3">
              {comTotais && data.itens.length > 0 && (
                <ExportarDados
                  data={linhasExportacao}
                  columns={COLUNAS_EXPORTACAO}
                  filename={nomeArquivo}
                  title={data.titulo}
                />
              )}
              <Link
                href={data.listagem}
                onClick={onClose}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Ver todas <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
