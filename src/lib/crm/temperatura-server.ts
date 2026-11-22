import { and, desc, eq, isNotNull } from "drizzle-orm"
import { getTableColumns } from "drizzle-orm/utils"
import { db } from "@/lib/db"
import { clientes as clientesTable } from "@/lib/db/schema/clientes"
import { crmLeads } from "@/lib/db/schema/crm-leads"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { usuarios } from "@/lib/db/schema/usuarios"
import {
  contadoresCliente,
  contadoresLead,
  ganhoNoPeriodo,
  inicioMes,
  inicioTrimestre,
  pedidoNoPeriodo,
} from "@/lib/crm/contadores-listagem"
import { contarFaixasConversao, type FaixaConversao } from "@/lib/crm/faixa-conversao"
import type {
  OportunidadeResumidaTemperatura,
  TemperaturaItem,
} from "@/lib/crm/temperatura"

type IndicadoresTemperatura = {
  faixaConversao: string | null
  totalOportunidades: number | string | null
  totalOportunidadesProposta: number | string | null
  totalOportunidadesNegociacao: number | string | null
  totalPedidos: number | string | null
  totalVisitas: number | string | null
  totalAcoes: number | string | null
  temGanhoMes: unknown
  temGanhoTrimestre: unknown
  temPedidoMes: unknown
  temPedidoTrimestre: unknown
}

type LeadTemperaturaRow = typeof crmLeads.$inferSelect &
  IndicadoresTemperatura & { responsavelNome: string | null }

type ClienteTemperaturaRow = typeof clientesTable.$inferSelect & IndicadoresTemperatura

type OportunidadeBruta = {
  id: number
  titulo: string
  status: string
  valorEstimado: string | number | null
  empresaId: number | null
  clienteId: number | null
  createdAt: Date | null
}

function numero(valor: unknown): number {
  const convertido = Number(valor ?? 0)
  return Number.isFinite(convertido) ? convertido : 0
}

function faixa(valor: unknown): FaixaConversao {
  return valor === "QUENTE" || valor === "MORNO" ? valor : "FRIO"
}

function resumir(oportunidade: OportunidadeBruta): OportunidadeResumidaTemperatura {
  return {
    id: oportunidade.id,
    titulo: oportunidade.titulo,
    status: oportunidade.status,
    valorEstimado: oportunidade.valorEstimado,
  }
}

export async function carregarItensTemperatura(): Promise<{
  itens: TemperaturaItem[]
  contagem: Record<FaixaConversao, number>
}> {
  const [leads, clientes, oportunidades, vinculos] = await Promise.all([
    db
      .select({
        id: crmLeads.id,
        nome: crmLeads.nome,
        razaoSocial: crmLeads.razaoSocial,
        nomeFantasia: crmLeads.nomeFantasia,
        cpf: crmLeads.cpf,
        cnpj: crmLeads.cnpj,
        segmento: crmLeads.segmento,
        status: crmLeads.status,
        responsavelNome: usuarios.name,
        email: crmLeads.email,
        telefone: crmLeads.telefone,
        celular: crmLeads.celular,
        cidade: crmLeads.cidade,
        uf: crmLeads.uf,
        ...contadoresLead(),
        temGanhoMes: ganhoNoPeriodo("lead", inicioMes),
        temGanhoTrimestre: ganhoNoPeriodo("lead", inicioTrimestre),
        temPedidoMes: pedidoNoPeriodo("lead", inicioMes),
        temPedidoTrimestre: pedidoNoPeriodo("lead", inicioTrimestre),
      })
      .from(crmLeads)
      .leftJoin(usuarios, eq(crmLeads.responsavelId, usuarios.id))
      .where(and(eq(crmLeads.arquivado, false), eq(crmLeads.promovidaCliente, false)))
      .orderBy(desc(crmLeads.createdAt)),
    db
      .select({
        ...getTableColumns(clientesTable),
        ...contadoresCliente(),
        temGanhoMes: ganhoNoPeriodo("cliente", inicioMes),
        temGanhoTrimestre: ganhoNoPeriodo("cliente", inicioTrimestre),
        temPedidoMes: pedidoNoPeriodo("cliente", inicioMes),
        temPedidoTrimestre: pedidoNoPeriodo("cliente", inicioTrimestre),
      })
      .from(clientesTable)
      .orderBy(desc(clientesTable.createdAt)),
    db
      .select({
        id: crmOportunidades.id,
        titulo: crmOportunidades.titulo,
        status: crmOportunidades.status,
        valorEstimado: crmOportunidades.valorEstimado,
        empresaId: crmOportunidades.empresaId,
        clienteId: crmOportunidades.clienteId,
        createdAt: crmOportunidades.createdAt,
      })
      .from(crmOportunidades)
      .orderBy(desc(crmOportunidades.createdAt)),
    db
      .select({ id: crmLeads.id, clienteId: crmLeads.clienteId })
      .from(crmLeads)
      .where(isNotNull(crmLeads.clienteId)),
  ])

  const listaOportunidades = oportunidades as OportunidadeBruta[]
  const pessoasPorCliente = new Map<number, Set<number>>()
  for (const vinculo of vinculos) {
    if (!vinculo.clienteId) continue
    const conjunto = pessoasPorCliente.get(vinculo.clienteId) ?? new Set<number>()
    conjunto.add(vinculo.id)
    pessoasPorCliente.set(vinculo.clienteId, conjunto)
  }

  function oportunidadesDoLead(id: number) {
    return listaOportunidades.filter((oportunidade) => oportunidade.empresaId === id).map(resumir)
  }

  function oportunidadesDoCliente(id: number) {
    const pessoas = pessoasPorCliente.get(id) ?? new Set<number>()
    const encontradas = new Map<number, OportunidadeResumidaTemperatura>()
    for (const oportunidade of listaOportunidades) {
      const pertence =
        oportunidade.clienteId === id ||
        (oportunidade.empresaId !== null && pessoas.has(oportunidade.empresaId))
      if (pertence) encontradas.set(oportunidade.id, resumir(oportunidade))
    }
    return Array.from(encontradas.values())
  }

  const itensLeads: TemperaturaItem[] = (leads as LeadTemperaturaRow[]).map((lead) => ({
    id: `lead-${lead.id}`,
    tipo: "lead",
    entidadeId: lead.id,
    nome: lead.nome || lead.razaoSocial || "—",
    subtitulo:
      lead.nomeFantasia && lead.nomeFantasia !== (lead.nome || lead.razaoSocial)
        ? lead.nomeFantasia
        : lead.segmento,
    documento: lead.cpf || lead.cnpj || null,
    status: lead.status ?? null,
    razaoSocial: lead.razaoSocial,
    nomeFantasia: lead.nomeFantasia,
    cpf: lead.cpf,
    cnpj: lead.cnpj,
    segmento: lead.segmento,
    responsavelNome: lead.responsavelNome,
    contato: null,
    email: lead.email,
    telefone: lead.telefone,
    celular: lead.celular,
    cidade: lead.cidade,
    uf: lead.uf,
    faixaConversao: faixa(lead.faixaConversao),
    totalOportunidades: numero(lead.totalOportunidades),
    totalOportunidadesProposta: numero(lead.totalOportunidadesProposta),
    totalOportunidadesNegociacao: numero(lead.totalOportunidadesNegociacao),
    totalPedidos: numero(lead.totalPedidos),
    totalVisitas: numero(lead.totalVisitas),
    totalAcoes: numero(lead.totalAcoes),
    temGanhoMes: Boolean(lead.temGanhoMes),
    temGanhoTrimestre: Boolean(lead.temGanhoTrimestre),
    temPedidoMes: Boolean(lead.temPedidoMes),
    temPedidoTrimestre: Boolean(lead.temPedidoTrimestre),
    oportunidades: oportunidadesDoLead(lead.id),
    href: `/comercial/crm/leads/${lead.id}`,
  }))

  const itensClientes: TemperaturaItem[] = (clientes as ClienteTemperaturaRow[]).map((cliente) => ({
    id: `cliente-${cliente.id}`,
    tipo: "cliente",
    entidadeId: cliente.id,
    nome: cliente.nome || cliente.razaoSocial || "—",
    subtitulo: cliente.razaoSocial && cliente.razaoSocial !== cliente.nome ? cliente.razaoSocial : null,
    documento: cliente.cnpj,
    status: cliente.status ?? null,
    razaoSocial: cliente.razaoSocial,
    nomeFantasia: null,
    cpf: null,
    cnpj: cliente.cnpj,
    segmento: cliente.segmento,
    responsavelNome: null,
    contato: cliente.contato,
    email: cliente.email,
    telefone: cliente.telefone,
    celular: cliente.celular,
    cidade: cliente.cidade,
    uf: cliente.uf,
    faixaConversao: faixa(cliente.faixaConversao),
    totalOportunidades: numero(cliente.totalOportunidades),
    totalOportunidadesProposta: numero(cliente.totalOportunidadesProposta),
    totalOportunidadesNegociacao: numero(cliente.totalOportunidadesNegociacao),
    totalPedidos: numero(cliente.totalPedidos),
    totalVisitas: numero(cliente.totalVisitas),
    totalAcoes: numero(cliente.totalAcoes),
    temGanhoMes: Boolean(cliente.temGanhoMes),
    temGanhoTrimestre: Boolean(cliente.temGanhoTrimestre),
    temPedidoMes: Boolean(cliente.temPedidoMes),
    temPedidoTrimestre: Boolean(cliente.temPedidoTrimestre),
    oportunidades: oportunidadesDoCliente(cliente.id),
    href: `/comercial/clientes/${cliente.id}`,
  }))

  const itens = [...itensClientes, ...itensLeads]
  return { itens, contagem: contarFaixasConversao(itens) }
}
