"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { hrefEventoTimeline, resumoIdEventoTimeline } from "@/lib/crm/href-evento-timeline"
import {
  Loader2,
  Zap,
  Target,
  CalendarCheck,
  ListChecks,
  FileText,
  MessageSquare,
  FileCode2,
  UserPlus,
  Megaphone,
  RefreshCw,
  ShoppingCart,
  Receipt,
} from "lucide-react"

const TIPO_ICON: Record<string, { icon: any; cor: string }> = {
  LEAD: { icon: Zap, cor: "text-amber-500 bg-amber-50 dark:bg-amber-950/50" },
  VISITANTE: { icon: UserPlus, cor: "text-teal-500 bg-teal-50 dark:bg-teal-950/50" },
  OPORTUNIDADE: { icon: Target, cor: "text-blue-500 bg-blue-50 dark:bg-blue-950/50" },
  VISITA: { icon: CalendarCheck, cor: "text-purple-500 bg-purple-50 dark:bg-purple-950/50" },
  ACAO_PROSPECCAO: { icon: Megaphone, cor: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/50" },
  TAREFA: { icon: ListChecks, cor: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50" },
  PROPOSTA: { icon: FileText, cor: "text-rose-500 bg-rose-50 dark:bg-rose-950/50" },
  WHATSAPP: { icon: MessageSquare, cor: "text-green-500 bg-green-50 dark:bg-green-950/50" },
  SOLICITACAO: { icon: FileCode2, cor: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50" },
  CONVERSAO_CLIENTE: {
    icon: RefreshCw,
    cor: "text-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/50",
  },
  PEDIDO_VENDA: {
    icon: ShoppingCart,
    cor: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50",
  },
  FATURAMENTO: { icon: Receipt, cor: "text-orange-500 bg-orange-50 dark:bg-orange-950/50" },
  RESUMO_IA: { icon: FileText, cor: "text-violet-500 bg-violet-50 dark:bg-violet-950/50" },
}

const TIPO_LABEL: Record<string, string> = {
  LEAD: "Lead",
  VISITANTE: "Visitante",
  OPORTUNIDADE: "Oportunidade",
  VISITA: "Visita",
  ACAO_PROSPECCAO: "Ação de prospecção",
  TAREFA: "Tarefa",
  PROPOSTA: "Proposta",
  WHATSAPP: "WhatsApp",
  SOLICITACAO: "Solicitação",
  CONVERSAO_CLIENTE: "Conversão em cliente",
  PEDIDO_VENDA: "Pedido de venda",
  FATURAMENTO: "Faturamento",
  RESUMO_IA: "Resumo IA",
}

async function fetchTimeline(params: {
  pessoaId?: string
  clienteId?: string
  pedidoVendaId?: string
}) {
  const url = params.pedidoVendaId
    ? `/api/crm/timeline?pedidoVendaId=${params.pedidoVendaId}`
    : params.clienteId
      ? `/api/crm/timeline?clienteId=${params.clienteId}`
      : `/api/crm/timeline?pessoaId=${params.pessoaId}`
  const res = await fetch(url)
  if (!res.ok) throw new Error("Falha ao carregar timeline")
  return res.json()
}

/**
 * Timeline do CRM — da pessoa (`pessoaId`) ou do cliente (`clienteId`, que
 * reúne os eventos do próprio cliente e das pessoas que viraram o cliente).
 */
export default function CrmTimeline({
  pessoaId,
  clienteId,
  pedidoVendaId,
  onAbrirResumo,
}: {
  pessoaId?: string
  clienteId?: string
  pedidoVendaId?: string
  onAbrirResumo?: (resumoId: number) => void
}) {
  const queryKey = pedidoVendaId
    ? ["crm-timeline-pedido", pedidoVendaId]
    : clienteId
      ? ["crm-timeline-cliente", clienteId]
      : ["crm-timeline", pessoaId]

  const { data: eventos, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchTimeline({ pessoaId, clienteId, pedidoVendaId }),
    enabled: !!pessoaId || !!clienteId || !!pedidoVendaId,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!eventos?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-400">Nenhum evento registrado na timeline</p>
      </div>
    )
  }

  return (
    <div className="relative pl-8 space-y-0">
      <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
      {eventos.map((evento: any) => {
        const config = TIPO_ICON[evento.tipo] || {
          icon: Zap,
          cor: "text-slate-500 bg-slate-50 dark:bg-slate-800",
        }
        const Icon = config.icon
        const href = hrefEventoTimeline(evento)
        const resumoId = evento.tipo === "RESUMO_IA" ? resumoIdEventoTimeline(evento) : null
        return (
          <div key={evento.id} className="relative pb-5 group">
            <div
              className={`absolute -left-8 p-1.5 rounded-full ${config.cor} ring-2 ring-white dark:ring-slate-900`}
            >
              <Icon size={14} />
            </div>
            <div className="pl-2">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
                <span className="font-medium">{TIPO_LABEL[evento.tipo] || evento.tipo}</span>
                <span>•</span>
                <span>{new Date(evento.dataEvento).toLocaleString("pt-BR")}</span>
              </div>
              {resumoId && onAbrirResumo ? (
                <button
                  type="button"
                  onClick={() => onAbrirResumo(resumoId)}
                  className="text-sm text-left text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:underline dark:hover:text-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                >
                  {evento.descricao}
                </button>
              ) : href ? (
                <Link
                  href={href}
                  className="text-sm text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:underline dark:hover:text-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                >
                  {evento.descricao}
                </Link>
              ) : (
                <p className="text-sm text-slate-700 dark:text-slate-300">{evento.descricao}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
