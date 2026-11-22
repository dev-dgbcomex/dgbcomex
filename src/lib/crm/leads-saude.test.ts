import { describe, expect, it } from "vitest"
import type { ClienteSaude as ClienteSaudeAcoes } from "./acoes-prospeccao-saude"
import type { ClienteSaude as ClienteSaudeVisitas } from "./visitas-saude"
import {
  calcularConversaoLeads,
  calcularScoresProspeccao,
  chaveClienteSaude,
  filtrarClientesSaudeLeads,
  mesclarSaudeProspeccao,
  obterEngajamentoLeads,
} from "./leads-saude"

const comum = {
  id: 10,
  tipo: "cliente" as const,
  nome: "Cliente Alpha",
  documento: "12345678000190",
  segmento: "Têxtil",
  porte: "Médio",
  responsaveis: ["Maria"],
  statusOportunidades: ["NEGOCIADA"],
  statusOportunidadeDominante: "NEGOCIADA",
  temContato: true,
  temProposta: true,
  temOportunidade: true,
  propostasNegociadas: 1,
  oportunidadesNegociadas: 1,
  valorEstimadoTotal: 125000,
  probabilidadeMedia: 60,
  pedidosVenda: 1,
  valorPedidosVenda: 30000,
  faturamentos: 1,
  valorFaturamento: 20000,
  scoreEsforco: 100,
  scoreEngajamento: 90,
}

const basico = {
  ...comum,
  temContato: false,
  temProposta: false,
  temOportunidade: false,
  propostasNegociadas: 0,
  oportunidadesNegociadas: 0,
  pedidosVenda: 0,
  valorPedidosVenda: 0,
  faturamentos: 0,
  valorFaturamento: 0,
  scoreEsforco: 0,
  scoreEngajamento: 0,
}

function linhaVisitas(overrides: Partial<ClienteSaudeVisitas> = {}): ClienteSaudeVisitas {
  return {
    ...comum,
    statusVisitas: ["REALIZADA"],
    tiposVisita: ["PRESENCIAL"],
    totalVisitas: 3,
    visitasRealizadas: 2,
    visitasAgendadas: 1,
    visitasCanceladas: 0,
    ultimaVisita: "2026-11-10",
    proximaVisita: "2026-12-15",
    visitasComRelato: 2,
    visitasComCheckIn: 1,
    visitas: [],
    ...overrides,
  }
}

function linhaAcoes(overrides: Partial<ClienteSaudeAcoes> = {}): ClienteSaudeAcoes {
  return {
    ...comum,
    statusAcoes: ["REALIZADA"],
    tiposAcao: ["PRESENCIAL"],
    totalAcoes: 4,
    acoesRealizadas: 3,
    acoesAgendadas: 1,
    acoesCanceladas: 0,
    ultimaAcao: "2026-11-11",
    proximaAcao: "2026-12-16",
    acoesComRelato: 3,
    acoesComCheckIn: 2,
    acoes: [],
    ...overrides,
  }
}

const visitaDetalhe = {
  id: 11,
  dataVisita: "2026-11-10",
  hora: "10:00",
  tipo: "PRESENCIAL",
  status: "REALIZADA",
  relato: "Ata",
  checkInTime: null,
  checkOutTime: null,
  empresaNome: "Cliente Alpha",
  clienteNome: null,
  nomeAvulso: null,
  oportunidadeId: null,
  oportunidadeTitulo: null,
  oportunidadeStatus: null,
  oportunidadeValor: 0,
  oportunidadeProbabilidade: 0,
  propostaId: null,
  propostaTitulo: null,
  propostaStatus: null,
  contatoId: null,
  contatoNome: null,
  criadoPorNome: "Maria",
  enderecoTexto: null,
}

const acaoDetalhe = {
  id: 12,
  dataAcao: "2026-11-11",
  hora: "11:00",
  tipo: "TELEFONE",
  status: "REALIZADA",
  relato: "Contato",
  checkInTime: null,
  checkOutTime: null,
  empresaNome: "Cliente Alpha",
  clienteNome: null,
  nomeAvulso: null,
  oportunidadeId: null,
  oportunidadeTitulo: null,
  oportunidadeStatus: null,
  oportunidadeValor: 0,
  oportunidadeProbabilidade: 0,
  propostaId: null,
  propostaTitulo: null,
  propostaStatus: null,
  contatoId: null,
  contatoNome: null,
  criadoPorNome: "Maria",
  enderecoTexto: null,
}

describe("chaveClienteSaude", () => {
  it("distingue cliente e pessoa com o mesmo id", () => {
    expect(chaveClienteSaude({ id: 10, tipo: "cliente" })).toBe("cliente:10")
    expect(chaveClienteSaude({ id: 10, tipo: "pessoa" })).toBe("pessoa:10")
  })
})

describe("mesclarSaudeProspeccao", () => {
  it("mescla visitas e ações do mesmo cliente em uma única linha sem trocar dados", () => {
    const [linha] = mesclarSaudeProspeccao([linhaVisitas()], [linhaAcoes()])

    expect(linha).toMatchObject({
      visitasRealizadas: 2,
      visitasAgendadas: 1,
      visitasCanceladas: 0,
      acoesRealizadas: 3,
      acoesAgendadas: 1,
      acoesCanceladas: 0,
    })
  })

  it("não deriva ações a partir das visitas", () => {
    const [linha] = mesclarSaudeProspeccao([linhaVisitas({ visitas: [visitaDetalhe] })], [])

    expect(linha.visitas[0]).toMatchObject({ id: 11, dataVisita: "2026-11-10" })
    expect(linha.totalAcoes).toBe(0)
    expect(linha.acoesRealizadas).toBe(0)
    expect(linha.acoesAgendadas).toBe(0)
    expect(linha.acoesCanceladas).toBe(0)
    expect(linha.acoes).toEqual([])
    expect(linha.statusAcoes).toEqual([])
  })

  it("não deriva visitas a partir das ações", () => {
    const [linha] = mesclarSaudeProspeccao([], [linhaAcoes({ acoes: [acaoDetalhe] })])

    expect(linha.acoes[0]).toMatchObject({ id: 12, dataAcao: "2026-11-11" })
    expect(linha.totalVisitas).toBe(0)
    expect(linha.visitasRealizadas).toBe(0)
    expect(linha.visitasAgendadas).toBe(0)
    expect(linha.visitasCanceladas).toBe(0)
    expect(linha.visitas).toEqual([])
    expect(linha.statusVisitas).toEqual([])
    expect(linha.ultimaVisita).toBeNull()
    expect(linha.proximaVisita).toBeNull()
  })

  it("mantém pessoas com o mesmo id em linhas separadas", () => {
    const pessoaVisitas = linhaVisitas({ id: 20, tipo: "pessoa", nome: "Pessoa A" })
    const pessoaAcoes = linhaAcoes({ id: 20, tipo: "pessoa", nome: "Pessoa A" })
    const cliente = linhaVisitas({ id: 20, tipo: "cliente", nome: "Cliente A" })

    const linhas = mesclarSaudeProspeccao([pessoaVisitas, cliente], [pessoaAcoes])

    expect(linhas).toHaveLength(2)
    expect(linhas.map((linha) => chaveClienteSaude(linha))).toEqual(["pessoa:20", "cliente:20"])
  })
})

describe("calcularScoresProspeccao", () => {
  it("soma visitas e ações reais com a mesma ponderação", () => {
    const visitas = linhaVisitas({
      ...basico,
      totalVisitas: 1,
      visitasRealizadas: 1,
      visitasAgendadas: 0,
      visitasComRelato: 0,
      visitasComCheckIn: 0,
    })
    const acoes = linhaAcoes({
      ...basico,
      totalAcoes: 1,
      acoesRealizadas: 0,
      acoesAgendadas: 1,
      acoesComRelato: 0,
      acoesComCheckIn: 0,
    })
    const [linha] = mesclarSaudeProspeccao([visitas], [acoes])

    expect(calcularScoresProspeccao(linha)).toEqual({
      scoreEsforco: 12.5,
      scoreEngajamento: 30,
    })
  })
})

describe("calcularConversaoLeads", () => {
  it("usa visitas reais + ações reais como denominador", () => {
    const visitas = linhaVisitas({
      totalVisitas: 2,
      visitasRealizadas: 2,
      visitasAgendadas: 0,
    })
    const acoes = linhaAcoes({ totalAcoes: 2, acoesRealizadas: 2, acoesAgendadas: 0 })
    const [linha] = mesclarSaudeProspeccao([visitas], [acoes])

    expect(calcularConversaoLeads(linha)).toEqual({
      percentual: 50,
      rotulo: "Alta",
      tom: "verde",
      total: 4,
      rotuloTotal: "registros de prospecção",
    })
  })

  it("usa rótulo sem prospecção quando não há visitas nem ações", () => {
    const [linha] = mesclarSaudeProspeccao(
      [
        linhaVisitas({
          ...basico,
          totalVisitas: 0,
          visitasRealizadas: 0,
          visitasAgendadas: 0,
          visitasCanceladas: 0,
          ultimaVisita: null,
          proximaVisita: null,
          visitas: [],
        }),
      ],
      []
    )

    expect(calcularConversaoLeads(linha)).toMatchObject({
      percentual: 0,
      rotulo: "Sem prospecção",
      total: 0,
    })
  })
})

describe("obterEngajamentoLeads", () => {
  it("considera itens de visitas e ações sem duplicar registros", () => {
    const visitas = linhaVisitas({
      visitas: [{ ...visitaDetalhe, relato: "Ata da visita" }],
    })
    const acoes = linhaAcoes({
      acoes: [{ ...acaoDetalhe, relato: "Relato da ação" }],
    })
    const [linha] = mesclarSaudeProspeccao([visitas], [acoes])
    const { itens, resumo } = obterEngajamentoLeads(linha)

    expect(resumo).toMatchObject({ quantidade: 5, total: 5, porcentagem: 100 })
    expect(itens.find((item) => item.chave === "ata")).toMatchObject({
      presente: true,
      quantidade: 2,
    })
    expect(itens.find((item) => item.chave === "ata")?.registros).toEqual([
      {
        id: 11,
        rotulo: "Visita #11",
        href: "/comercial/crm/visitas/11",
      },
      {
        id: 12,
        rotulo: "Ação de Prospecção #12",
        href: "/comercial/crm/acoes-prospeccao/12",
      },
    ])
  })
})

describe("filtrarClientesSaudeLeads", () => {
  it("filtra por status e tipo Presentes em visitas ou ações", () => {
    const somenteAcoes = linhaAcoes({
      id: 30,
      statusAcoes: ["TELEFONADA"],
      tiposAcao: ["TELEFONE"],
    })
    const [linha] = mesclarSaudeProspeccao([], [somenteAcoes])

    expect(
      filtrarClientesSaudeLeads([linha], {
        statusVisita: "TELEFONADA",
        tipoVisita: "TELEFONE",
      })
    ).toHaveLength(1)
    expect(filtrarClientesSaudeLeads([linha], { statusVisita: "REALIZADA" })).toHaveLength(0)
  })
})
