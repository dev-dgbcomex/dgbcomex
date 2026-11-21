import { sql } from "drizzle-orm"
import { crmAcoesProspeccao } from "@/lib/db/schema/crm-acoes-prospeccao"
import { crmLeads } from "@/lib/db/schema/crm-leads"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmPedidosVenda } from "@/lib/db/schema/crm-pedidos-venda"
import { crmVisitas } from "@/lib/db/schema/crm-visitas"

const clienteId = sql.raw('"clientes"."id"')
const leadId = sql.raw('"crm_leads"."id"')

const oportunidadeClienteId = sql.raw('"crm_oportunidades"."cliente_id"')
const oportunidadeEmpresaId = sql.raw('"crm_oportunidades"."lead_id"')
const oportunidadeId = sql.raw('"crm_oportunidades"."id"')
const pedidoOportunidadeId = sql.raw('"crm_pedidos_venda"."oportunidade_id"')
const visitaClienteId = sql.raw('"crm_visitas"."cliente_id"')
const visitaEmpresaId = sql.raw('"crm_visitas"."lead_id"')
const acaoClienteId = sql.raw('"crm_acoes_prospeccao"."cliente_id"')
const acaoEmpresaId = sql.raw('"crm_acoes_prospeccao"."lead_id"')

export function contadoresCliente() {
  return {
    totalOportunidades: sql<number>`(select count(*)::int from ${crmOportunidades} where ${oportunidadeClienteId} = ${clienteId})`,
    totalPedidos: sql<number>`(select count(*)::int from ${crmPedidosVenda} inner join ${crmOportunidades} on ${pedidoOportunidadeId} = ${oportunidadeId} where ${oportunidadeClienteId} = ${clienteId})`,
    totalVisitas: sql<number>`(select count(*)::int from ${crmVisitas} where ${visitaClienteId} = ${clienteId})`,
    totalAcoes: sql<number>`(select count(*)::int from ${crmAcoesProspeccao} where ${acaoClienteId} = ${clienteId})`,
  }
}

export function contadoresLead() {
  return {
    totalOportunidades: sql<number>`(select count(*)::int from ${crmOportunidades} where ${oportunidadeEmpresaId} = ${leadId})`,
    totalPedidos: sql<number>`(select count(*)::int from ${crmPedidosVenda} inner join ${crmOportunidades} on ${pedidoOportunidadeId} = ${oportunidadeId} where ${oportunidadeEmpresaId} = ${leadId})`,
    totalVisitas: sql<number>`(select count(*)::int from ${crmVisitas} where ${visitaEmpresaId} = ${leadId})`,
    totalAcoes: sql<number>`(select count(*)::int from ${crmAcoesProspeccao} where ${acaoEmpresaId} = ${leadId})`,
  }
}
