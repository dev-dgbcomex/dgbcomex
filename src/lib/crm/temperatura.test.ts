// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  TEMPERATURA_FILTROS_VAZIOS,
  filtrarItensTemperatura,
  planoDaTransicao,
  temFiltrosTemperaturaAtivos,
  type TemperaturaItem,
} from "./temperatura"

function item(overrides: Partial<TemperaturaItem> = {}): TemperaturaItem {
  return {
    id: "lead-1",
    tipo: "lead",
    entidadeId: 1,
    nome: "Empresa Ação",
    razaoSocial: "Empresa Ação Ltda",
    nomeFantasia: "Ação",
    cpf: null,
    cnpj: "12.345.678/0001-90",
    documento: "12.345.678/0001-90",
    segmento: "Têxtil",
    responsavelNome: "João Silva",
    contato: "Maria",
    email: "maria@empresa.com",
    telefone: "11999999999",
    celular: null,
    cidade: "São Paulo",
    uf: "SP",
    faixaConversao: "FRIO",
    totalOportunidades: 0,
    totalOportunidadesProposta: 0,
    totalOportunidadesNegociacao: 0,
    totalPedidos: 0,
    totalVisitas: 0,
    totalAcoes: 0,
    temGanhoMes: false,
    temGanhoTrimestre: false,
    temPedidoMes: false,
    temPedidoTrimestre: false,
    oportunidades: [],
    href: "/comercial/crm/leads/1",
    ...overrides,
  }
}

describe("filtrarItensTemperatura", () => {
  const itens = [
    item(),
    item({
      id: "cliente-2",
      tipo: "cliente",
      entidadeId: 2,
      nome: "Cliente Frio",
      razaoSocial: "Cliente Frio SA",
      nomeFantasia: null,
      segmento: null,
      responsavelNome: null,
      contato: null,
      email: null,
      telefone: null,
      cidade: "Curitiba",
      cnpj: "98.765.432/0001-10",
      documento: "98.765.432/0001-10",
      totalOportunidades: 2,
      totalPedidos: 1,
      oportunidades: [{ id: 9, titulo: "Oportunidade Secreta", status: "PROPOSTA" }],
      faixaConversao: "MORNO",
      href: "/comercial/clientes/2",
    }),
  ]

  it("ignora acentos e aceita documento sem pontuação", () => {
    expect(filtrarItensTemperatura(itens, { ...TEMPERATURA_FILTROS_VAZIOS, busca: "acao" })).toEqual([
      itens[0],
    ])
    expect(
      filtrarItensTemperatura(itens, { ...TEMPERATURA_FILTROS_VAZIOS, busca: "12345678000190" })
    ).toEqual([itens[0]])
  })

  it("não busca títulos de oportunidades", () => {
    expect(
      filtrarItensTemperatura(itens, { ...TEMPERATURA_FILTROS_VAZIOS, busca: "secreta" })
    ).toEqual([])
  })

  it("combina tipo, oportunidade e pedido", () => {
    const filtros = {
      ...TEMPERATURA_FILTROS_VAZIOS,
      tipo: "cliente" as const,
      comOportunidade: true,
      comPedido: true,
    }
    expect(filtrarItensTemperatura(itens, filtros)).toEqual([itens[1]])
    expect(temFiltrosTemperaturaAtivos(filtros)).toBe(true)
  })
})

describe("planoDaTransicao", () => {
  it("cria oportunidade em Proposta ao subir de Frio para Morno", () => {
    const resultado = planoDaTransicao(item(), "MORNO", { oportunidadeId: "nova" })
    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.plano.acoes).toEqual([
        { tipo: "CRIAR_OPORTUNIDADE", status: "PROPOSTA", titulo: "Proposta — Empresa Ação" },
      ])
    }
  })

  it("reaproveita oportunidade em Negociação ao subir para Quente", () => {
    const origem = item({
      faixaConversao: "MORNO",
      oportunidades: [{ id: 5, titulo: "Oportunidade 5", status: "PROPOSTA" }],
    })
    const resultado = planoDaTransicao(origem, "QUENTE", { oportunidadeId: 5 })
    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.plano.acoes).toEqual([
        { tipo: "ALTERAR_STATUS_OPORTUNIDADE", oportunidadeId: 5, status: "NEGOCIACAO" },
      ])
    }
  })

  it("exige todas as negociações para descer de Quente para Morno", () => {
    const origem = item({
      faixaConversao: "QUENTE",
      oportunidades: [
        { id: 5, titulo: "Oportunidade 5", status: "NEGOCIACAO" },
        { id: 6, titulo: "Oportunidade 6", status: "NEGOCIACAO" },
      ],
    })
    expect(planoDaTransicao(origem, "MORNO", { oportunidadesParaBaixarIds: [5] })).toEqual({
      ok: false,
      erro: "Selecione todas as oportunidades em Negociação.",
    })
    const resultado = planoDaTransicao(origem, "MORNO", {
      oportunidadesParaBaixarIds: [5, 6],
    })
    expect(resultado.ok).toBe(true)
    if (resultado.ok) expect(resultado.plano.acoes).toHaveLength(2)
  })

  it("bloqueia descida com ganho no mês", () => {
    const origem = item({ faixaConversao: "QUENTE", temGanhoMes: true })
    expect(planoDaTransicao(origem, "MORNO", { oportunidadeId: "nova" })).toEqual({
      ok: false,
      erro: "Não é possível mover para Morno: existe ganho ou pedido neste mês.",
    })
  })

  it("exige todas as oportunidades abertas e motivo para descer para Frio", () => {
    const origem = item({
      faixaConversao: "MORNO",
      oportunidades: [
        { id: 5, titulo: "Oportunidade 5", status: "PROPOSTA" },
        { id: 6, titulo: "Oportunidade 6", status: "NEGOCIACAO" },
      ],
    })
    expect(planoDaTransicao(origem, "FRIO", { motivoPerda: "Sem interesse" })).toEqual({
      ok: false,
      erro: "Selecione todas as oportunidades em Proposta ou Negociação.",
    })
    expect(
      planoDaTransicao(origem, "FRIO", {
        oportunidadesParaPerderIds: [5, 6],
        motivoPerda: "Sem interesse",
      })
    ).toEqual({
      ok: true,
      plano: {
        destino: "FRIO",
        avisos: [],
        acoes: [
          { tipo: "PERDER_OPORTUNIDADE", oportunidadeId: 5, motivoPerda: "Sem interesse" },
          { tipo: "PERDER_OPORTUNIDADE", oportunidadeId: 6, motivoPerda: "Sem interesse" },
        ],
      },
    })
  })

  it("bloqueia descida para Frio quando há pedido no trimestre", () => {
    const origem = item({ faixaConversao: "MORNO", temPedidoTrimestre: true })
    expect(planoDaTransicao(origem, "FRIO", { motivoPerda: "Sem interesse" })).toEqual({
      ok: false,
      erro: "Não é possível mover para Frio: existe ganho ou pedido neste trimestre.",
    })
  })
})
