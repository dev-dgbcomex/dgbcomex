import { sql, type SQLWrapper } from "drizzle-orm"
import type { FaixaConversao } from "@/lib/crm/faixa-conversao"
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

const inicioMes = sql`date_trunc('month', current_date)`
const inicioTrimestre = sql`date_trunc('quarter', current_date)`
const dataPedido = sql`coalesce(${crmPedidosVenda.dataEmissao}::timestamp, ${crmPedidosVenda.createdAt})`

type TipoContagem = "cliente" | "lead"

function oportunidadesCliente() {
  return sql`from ${crmOportunidades} where (${oportunidadeClienteId} = ${clienteId} or ${oportunidadeEmpresaId} in (select ${crmLeads.id} from ${crmLeads} where ${crmLeads.clienteId} = ${clienteId}))`
}

function oportunidadesLead() {
  return sql`from ${crmOportunidades} where ${oportunidadeEmpresaId} = ${leadId}`
}

function baseOportunidades(tipo: TipoContagem) {
  return tipo === "cliente" ? oportunidadesCliente() : oportunidadesLead()
}

function basePedidos(tipo: TipoContagem) {
  return sql`from ${crmPedidosVenda}
    inner join ${crmOportunidades} on ${pedidoOportunidadeId} = ${oportunidadeId}
    where ${oportunidadeId} in (select ${oportunidadeId} ${baseOportunidades(tipo)})`
}

function ganhoNoPeriodo(tipo: TipoContagem, inicio: SQLWrapper) {
  return sql`exists (select 1 ${baseOportunidades(tipo)} and ${crmOportunidades.status} in ('FECHADO_GANHO', 'GANHO') and ${crmOportunidades.updatedAt} >= ${inicio})`
}

function pedidoNoPeriodo(tipo: TipoContagem, inicio: SQLWrapper) {
  return sql`exists (select 1 ${basePedidos(tipo)} and ${dataPedido} >= ${inicio})`
}

function faixaConversao(tipo: TipoContagem) {
  return sql<FaixaConversao>`case
    when exists (select 1 ${baseOportunidades(tipo)} and ${crmOportunidades.status} = 'NEGOCIACAO') then 'QUENTE'
    when ${ganhoNoPeriodo(tipo, inicioMes)} then 'QUENTE'
    when ${pedidoNoPeriodo(tipo, inicioMes)} then 'QUENTE'
    when exists (select 1 ${baseOportunidades(tipo)} and ${crmOportunidades.status} = 'PROPOSTA') then 'MORNO'
    when ${ganhoNoPeriodo(tipo, inicioTrimestre)} then 'MORNO'
    when ${pedidoNoPeriodo(tipo, inicioTrimestre)} then 'MORNO'
    else 'FRIO'
  end`
}

export function contadoresCliente() {
  return {
    totalOportunidades: sql<number>`(select count(*)::int from ${crmOportunidades} where ${oportunidadeClienteId} = ${clienteId})`,
    totalPedidos: sql<number>`(select count(*)::int ${basePedidos("cliente")})`,
    totalVisitas: sql<number>`(select count(*)::int from ${crmVisitas} where ${visitaClienteId} = ${clienteId})`,
    totalAcoes: sql<number>`(select count(*)::int from ${crmAcoesProspeccao} where ${acaoClienteId} = ${clienteId})`,
    faixaConversao: faixaConversao("cliente"),
  }
}

export function contadoresLead() {
  return {
    totalOportunidades: sql<number>`(select count(*)::int from ${crmOportunidades} where ${oportunidadeEmpresaId} = ${leadId})`,
    totalPedidos: sql<number>`(select count(*)::int ${basePedidos("lead")})`,
    totalVisitas: sql<number>`(select count(*)::int from ${crmVisitas} where ${visitaEmpresaId} = ${leadId})`,
    totalAcoes: sql<number>`(select count(*)::int from ${crmAcoesProspeccao} where ${acaoEmpresaId} = ${leadId})`,
    faixaConversao: faixaConversao("lead"),
  }
}
