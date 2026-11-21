"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { AlertCircle, ArrowRight, ExternalLink, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type TipoMetricaLead = "oportunidades" | "pedidos" | "visitas" | "acoes"

type ItemMetrica = {
  id: number
  titulo: string
  subtitulo: string | null
  status: string | null
  data: string | null
  valor: number
  href: string
}

const RECURSOS: Record<TipoMetricaLead, string> = {
  oportunidades: "oportunidades",
  pedidos: "pedidos-venda",
  visitas: "visitas",
  acoes: "acoes-prospeccao",
}

const CONFIGURACOES: Record<
  TipoMetricaLead,
  { titulo: string; descricao: string; temValor: boolean }
> = {
  oportunidades: {
    titulo: "Oportunidades da lead",
    descricao: "Oportunidades vinculadas a esta lead.",
    temValor: true,
  },
  pedidos: {
    titulo: "Pedidos da lead",
    descricao: "Pedidos de venda vinculados às oportunidades desta lead.",
    temValor: true,
  },
  visitas: {
    titulo: "Visitas da lead",
    descricao: "Visitas registradas para esta lead.",
    temValor: false,
  },
  acoes: {
    titulo: "Ações da lead",
    descricao: "Ações de prospecção registradas para esta lead.",
    temValor: false,
  },
}

function comoRegistro(valor: unknown): Record<string, unknown> {
  return typeof valor === "object" && valor !== null ? (valor as Record<string, unknown>) : {}
}

function comoTexto(valor: unknown): string | null {
  if (typeof valor === "string") return valor.trim() || null
  if (typeof valor === "number" && Number.isFinite(valor)) return String(valor)
  return null
}

function comoNumero(valor: unknown): number {
  const numero = typeof valor === "number" ? valor : Number(valor)
  return Number.isFinite(numero) ? numero : 0
}

function formatarData(valor: string | null) {
  if (!valor) return null
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return valor
  return data.toLocaleDateString("pt-BR")
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function normalizarItem(tipo: TipoMetricaLead, leadId: number, valor: unknown): ItemMetrica {
  const registro = comoRegistro(valor)
  const id = comoNumero(registro.id)

  if (tipo === "pedidos") {
    return {
      id,
      titulo: comoTexto(registro.numero) ?? "Pedido de venda",
      subtitulo: comoTexto(registro.oportunidadeTitulo),
      status: comoTexto(registro.status),
      data: comoTexto(registro.dataEmissao),
      valor: comoNumero(registro.total),
      href: `/comercial/crm/pedidos-venda/${id}`,
    }
  }

  if (tipo === "visitas") {
    return {
      id,
      titulo:
        comoTexto(registro.relato) ??
        comoTexto(registro.tipo) ??
        comoTexto(registro.nomeAvulso) ??
        "Visita",
      subtitulo: comoTexto(registro.empresaNome) ?? comoTexto(registro.clienteNome),
      status: comoTexto(registro.status),
      data: comoTexto(registro.dataVisita),
      valor: 0,
      href: `/comercial/crm/visitas/${id}`,
    }
  }

  if (tipo === "acoes") {
    return {
      id,
      titulo:
        comoTexto(registro.relato) ??
        comoTexto(registro.tipo) ??
        comoTexto(registro.nomeAvulso) ??
        "Ação de prospecção",
      subtitulo: comoTexto(registro.empresaNome) ?? comoTexto(registro.clienteNome),
      status: comoTexto(registro.status),
      data: comoTexto(registro.dataAcao),
      valor: 0,
      href: `/comercial/crm/acoes-prospeccao/${id}`,
    }
  }

  return {
    id,
    titulo: comoTexto(registro.titulo) ?? "Oportunidade",
    subtitulo: comoTexto(registro.descricao),
    status: comoTexto(registro.status),
    data: comoTexto(registro.dataFechamentoPrevista),
    valor: comoNumero(registro.valorEstimado),
    href: `/comercial/crm/oportunidades/${id}`,
  }
}

export function LeadMetricasModal({
  tipo,
  leadId,
  leadNome,
  onClose,
}: {
  tipo: TipoMetricaLead
  leadId: number
  leadNome: string
  onClose: () => void
}) {
  const configuracao = CONFIGURACOES[tipo]
  const url = `/api/crm/${RECURSOS[tipo]}?all=true&empresaId=${leadId}`

  const { data, isLoading, isError } = useQuery<ItemMetrica[]>({
    queryKey: ["crm-lead-metricas", tipo, leadId],
    queryFn: async () => {
      const res = await fetch(url)
      if (!res.ok) throw new Error("Falha ao carregar os registros")
      const dados: unknown = await res.json()
      if (!Array.isArray(dados)) return []
      return dados.map((item) => normalizarItem(tipo, leadId, item))
    },
    retry: 0,
  })

  const itens = data ?? []
  const total = itens.reduce((soma, item) => soma + item.valor, 0)

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="sm:max-w-3xl p-0">
        <DialogHeader className="border-b border-slate-100 p-5 pr-12 dark:border-slate-800">
          <DialogTitle className="text-base text-slate-900 dark:text-slate-50">
            {configuracao.titulo}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            {configuracao.descricao} Lead: {leadNome}.
          </DialogDescription>
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
                Não foi possível carregar os registros.
              </p>
            </div>
          ) : itens.length > 0 ? (
            <ul className="space-y-2">
              {itens.map((item) => (
                <li key={`${tipo}-${item.id}`}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:border-blue-300 hover:bg-blue-50/60 dark:border-slate-800 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {item.titulo}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {item.subtitulo || (item.data ? formatarData(item.data) : "—")}
                      </p>
                    </div>
                    {item.status && (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {item.status}
                      </span>
                    )}
                    {item.valor > 0 && (
                      <span className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {formatarMoeda(item.valor)}
                      </span>
                    )}
                    {item.data && (
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {formatarData(item.data)}
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 dark:border-slate-800">
          {configuracao.temValor && itens.length > 0 ? (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Total de {itens.length} registro(s)
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
                {formatarMoeda(total)}
              </p>
            </div>
          ) : (
            <span />
          )}
          <Link
            href={`/comercial/crm/leads/${leadId}`}
            onClick={onClose}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Abrir detalhe da lead <ArrowRight size={12} />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
