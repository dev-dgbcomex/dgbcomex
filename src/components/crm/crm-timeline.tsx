"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
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
}

async function fetchTimeline(pessoaId?: string, clienteId?: string) {
  const url = clienteId
    ? `/api/crm/timeline?clienteId=${clienteId}`
    : `/api/crm/timeline?pessoaId=${pessoaId}`
  const res = await fetch(url)
  if (!res.ok) throw new Error("Falha ao carregar timeline")
  return res.json()
}

function metadadosEvento(evento: any): Record<string, any> {
  const bruto = evento?.metadados
  if (!bruto) return {}
  if (typeof bruto === "string") {
    try {
      return JSON.parse(bruto)
    } catch {
      return {}
    }
  }
  return bruto
}

function idMetadado(metadados: Record<string, any>, ...chaves: string[]): number | null {
  for (const chave of chaves) {
    const valor = metadados[chave]
    if (valor === undefined || valor === null || valor === "") continue
    const numero = Number(valor)
    if (Number.isFinite(numero) && numero > 0) return numero
  }
  return null
}

function hrefEvento(evento: any): string | null {
  const metadados = metadadosEvento(evento)
  switch (evento?.tipo) {
    case "LEAD": {
      const id = idMetadado(metadados, "leadId", "empresaId")
      return id ? `/comercial/crm/leads/${id}` : null
    }
    case "VISITANTE": {
      const id = idMetadado(metadados, "visitanteId")
      return id ? `/comercial/crm/visitantes/${id}` : null
    }
    case "OPORTUNIDADE": {
      const id = idMetadado(metadados, "oportunidadeId")
      return id ? `/comercial/crm/oportunidades/${id}` : null
    }
    case "VISITA": {
      const id = idMetadado(metadados, "visitaId")
      return id ? `/comercial/crm/visitas/${id}` : null
    }
    case "ACAO_PROSPECCAO": {
      const id = idMetadado(metadados, "acaoProspeccaoId")
      return id ? `/comercial/crm/acoes-prospeccao/${id}` : null
    }
    case "TAREFA": {
      const id = idMetadado(metadados, "tarefaId")
      return id ? `/comercial/crm/tarefas?busca=${id}` : null
    }
    case "PROPOSTA": {
      const id = idMetadado(metadados, "propostaId")
      return id ? `/comercial/crm/propostas/${id}` : null
    }
    case "CONVERSAO_CLIENTE": {
      const id = idMetadado(metadados, "clienteId")
      return id ? `/comercial/clientes/${id}` : null
    }
    default:
      return null
  }
}

/**
 * Timeline do CRM — da pessoa (`pessoaId`) ou do cliente (`clienteId`, que
 * reúne os eventos do próprio cliente e das pessoas que viraram o cliente).
 */
export default function CrmTimeline({
  pessoaId,
  clienteId,
}: {
  pessoaId?: string
  clienteId?: string
}) {
  const queryKey = clienteId ? ["crm-timeline-cliente", clienteId] : ["crm-timeline", pessoaId]

  const { data: eventos, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchTimeline(pessoaId, clienteId),
    enabled: !!pessoaId || !!clienteId,
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
        const href = hrefEvento(evento)
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
              {href ? (
                <Link
                  href={href}
                  className="text-sm text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:underline dark:hover:text-blue-400"
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
