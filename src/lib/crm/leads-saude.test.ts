import { describe, it, expect } from "vitest"
import type { ClienteSaude as ClienteSaudeAcoes } from "./acoes-prospeccao-saude"
import type { ClienteSaude as ClienteSaudeVisitas } from "./visitas-saude"
import { chaveClienteSaude, mesclarSaudeProspeccao } from "./leads-saude"

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

describe("chaveClienteSaude", () => {
  it("distingue cliente e pessoa com o mesmo id", () => {
    expect(chaveClienteSaude({ id: 10, tipo: "cliente" })).toBe("cliente:10")
    expect(chaveClienteSaude({ id: 10, tipo: "pessoa" })).toBe("pessoa:10")
  })
})

describe("mesclarSaudeProspeccao", () => {
  it("mescla visitas e ações do mesmo cliente em uma única linha", () => {
    const linhas = mesclarSaudeProspeccao([linhaVisitas()], [linhaAcoes()])

    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({
      visitasRealizadas: 2,
      visitasAgendadas: 1,
      visitasCanceladas: 0,
      acoesRealizadas: 3,
      acoesAgendadas: 1,
      acoesCanceladas: 0,
    })
  })

  it("deriva as ações a partir das visitas quando o cliente só tem visitas", () => {
    const visitas = linhaVisitas({
      visitas: [
        {
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
        },
      ],
    })

    const [linha] = mesclarSaudeProspeccao([visitas], [])

    expect(linha.acoesRealizadas).toBe(2)
    expect(linha.acoesAgendadas).toBe(1)
    expect(linha.acoesCanceladas).toBe(0)
    expect(linha.acoes[0]).toMatchObject({ id: 11, dataAcao: "2026-11-10", relato: "Ata" })
  })

  it("deriva as visitas a partir das ações quando o cliente só tem ações", () => {
    const acoes = linhaAcoes({
      acoes: [
        {
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
        },
      ],
    })

    const [linha] = mesclarSaudeProspeccao([], [acoes])

    expect(linha.visitasRealizadas).toBe(3)
    expect(linha.visitasAgendadas).toBe(1)
    expect(linha.visitasCanceladas).toBe(0)
    expect(linha.visitas[0]).toMatchObject({ id: 12, dataVisita: "2026-11-11", relato: "Contato" })
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
