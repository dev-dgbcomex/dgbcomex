import { and, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { crmTimelineEventos } from "@/lib/db/schema/crm-timeline-eventos"

type TipoEvento =
  | "LEAD"
  | "VISITANTE"
  | "OPORTUNIDADE"
  | "VISITA"
  | "ACAO_PROSPECCAO"
  | "TAREFA"
  | "PROPOSTA"
  | "WHATSAPP"
  | "SOLICITACAO"
  | "CONVERSAO_CLIENTE"
  | "RESUMO_IA"

export async function inserirTimelineEvento(params: {
  empresaId?: number | null
  clienteId?: number | null
  tipo: TipoEvento
  descricao: string
  metadados?: Record<string, any>
}) {
  if (!params.empresaId && !params.clienteId) return
  await db.insert(crmTimelineEventos).values({
    empresaId: params.empresaId ?? null,
    clienteId: params.clienteId ?? null,
    tipo: params.tipo,
    descricao: params.descricao,
    metadados: params.metadados || {},
    dataEvento: new Date(),
  })
}

export async function excluirTimelineEventosEntidade(
  params: {
    tipo: "LEAD" | "VISITANTE" | "OPORTUNIDADE" | "VISITA" | "ACAO_PROSPECCAO" | "TAREFA" | "PROPOSTA"
    campo:
      | "leadId"
      | "visitanteId"
      | "oportunidadeId"
      | "visitaId"
      | "acaoProspeccaoId"
      | "tarefaId"
      | "propostaId"
    id: number
  },
  client: any = db
) {
  if (!params.id) return
  await client
    .delete(crmTimelineEventos)
    .where(
      and(
        eq(crmTimelineEventos.tipo, params.tipo),
        sql`${crmTimelineEventos.metadados}->>'${sql.raw(params.campo)}' = ${String(params.id)}`
      )
    )
}
