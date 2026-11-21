import { sql } from "drizzle-orm"
import { crmAcoesProspeccao } from "@/lib/db/schema/crm-acoes-prospeccao"
import { crmLeads } from "@/lib/db/schema/crm-leads"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmPedidosVenda } from "@/lib/db/schema/crm-pedidos-venda"
import { crmVisitas } from "@/lib/db/schema/crm-visitas"
import { clientes } from "@/lib/db/schema/clientes"

export function contadoresCliente() {
  return {
    totalOportunidades: sql<number>`(select count(*)::int from ${crmOportunidades} where ${crmOportunidades.clienteId} = ${clientes.id})`,
    totalPedidos: sql<number>`(select count(*)::int from ${crmPedidosVenda} inner join ${crmOportunidades} on ${crmPedidosVenda.oportunidadeId} = ${crmOportunidades.id} where ${crmOportunidades.clienteId} = ${clientes.id})`,
    totalVisitas: sql<number>`(select count(*)::int from ${crmVisitas} where ${crmVisitas.clienteId} = ${clientes.id})`,
    totalAcoes: sql<number>`(select count(*)::int from ${crmAcoesProspeccao} where ${crmAcoesProspeccao.clienteId} = ${clientes.id})`,
  }
}

export function contadoresLead() {
  return {
    totalOportunidades: sql<number>`(select count(*)::int from ${crmOportunidades} where ${crmOportunidades.empresaId} = ${crmLeads.id})`,
    totalPedidos: sql<number>`(select count(*)::int from ${crmPedidosVenda} inner join ${crmOportunidades} on ${crmPedidosVenda.oportunidadeId} = ${crmOportunidades.id} where ${crmOportunidades.empresaId} = ${crmLeads.id})`,
    totalVisitas: sql<number>`(select count(*)::int from ${crmVisitas} where ${crmVisitas.empresaId} = ${crmLeads.id})`,
    totalAcoes: sql<number>`(select count(*)::int from ${crmAcoesProspeccao} where ${crmAcoesProspeccao.empresaId} = ${crmLeads.id})`,
  }
}
