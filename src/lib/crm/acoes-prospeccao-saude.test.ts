// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  calcularConversao,
  calcularScores,
  classificarAlerta,
  filtrarClientesSaude,
  formatarPontos,
  obterDetalheScore,
  obterEngajamento,
  isStatusNegociado,
  labelStatusOportunidade,
  type ClienteSaude,
} from "./acoes-prospeccao-saude"

function cliente(overrides: Partial<ClienteSaude> = {}): ClienteSaude {
  return {
    id: 1,
    tipo: "cliente",
    nome: "Cliente Alpha",
    documento: "12345678000190",
    segmento: "Têxtil",
    porte: "Médio",
    responsaveis: ["Maria"],
    statusAcoes: ["REALIZADA"],
    tiposAcao: ["PRESENCIAL"],
    statusOportunidades: ["NEGOCIADA"],
    totalAcoes: 1,
    acoesRealizadas: 1,
    acoesAgendadas: 0,
    acoesCanceladas: 0,
    ultimaAcao: "2026-11-10",
    proximaAcao: null,
    acoesComRelato: 1,
    acoesComCheckIn: 1,
    temContato: true,
    temProposta: true,
    temOportunidade: true,
    propostasNegociadas: 1,
    oportunidadesNegociadas: 1,
    valorEstimadoTotal: 1000,
    probabilidadeMedia: 50,
    statusOportunidadeDominante: "Negociada",
    pedidosVenda: 1,
    valorPedidosVenda: 300,
    faturamentos: 1,
    valorFaturamento: 200,
    scoreEsforco: 100,
    scoreEngajamento: 100,
    acoes: [],
    ...overrides,
  }
}

describe("acoes-prospeccao-saude", () => {
  it("soma o esforço por presença de sinais, sem multiplicar ações", () => {
    const scores = calcularScores({
      acoesRealizadas: 8,
      acoesAgendadas: 3,
      acoesComRelato: 5,
      acoesComCheckIn: 4,
      temContato: true,
      temProposta: true,
      temOportunidade: true,
      propostasNegociadas: 4,
      oportunidadesNegociadas: 3,
      pedidosVenda: 2,
      faturamentos: 2,
    })

    expect(scores).toEqual({ scoreEsforco: 100, scoreEngajamento: 100 })
  })

  it("dá muito esforço e pouco retorno quando só ações e atas existem", () => {
    const scores = calcularScores({
      acoesRealizadas: 1,
      acoesAgendadas: 0,
      acoesComRelato: 1,
      acoesComCheckIn: 1,
      temContato: true,
      temProposta: false,
      temOportunidade: false,
      propostasNegociadas: 0,
      oportunidadesNegociadas: 0,
      pedidosVenda: 0,
      faturamentos: 0,
    })

    expect(scores).toEqual({ scoreEsforco: 50, scoreEngajamento: 20 })
    expect(classificarAlerta(scores)).toEqual({
      rotulo: "AEC",
      tom: "vermelho",
    })
  })

  it("classifica Engajados por engajamento acima de 30 e AEC/BEC pelo esforço", () => {
    expect(classificarAlerta({ scoreEsforco: 100, scoreEngajamento: 70 })).toEqual({
      rotulo: "Engajados",
      tom: "amarelo",
    })
    expect(classificarAlerta({ scoreEsforco: 40, scoreEngajamento: 80 })).toEqual({
      rotulo: "Engajados",
      tom: "amarelo",
    })
    expect(classificarAlerta({ scoreEsforco: 60, scoreEngajamento: 75 })).toEqual({
      rotulo: "Engajados",
      tom: "amarelo",
    })
    expect(classificarAlerta({ scoreEsforco: 60, scoreEngajamento: 55 })).toEqual({
      rotulo: "Engajados",
      tom: "amarelo",
    })
    expect(classificarAlerta({ scoreEsforco: 30, scoreEngajamento: 60 })).toEqual({
      rotulo: "Engajados",
      tom: "amarelo",
    })
    expect(classificarAlerta({ scoreEsforco: 45, scoreEngajamento: 20 })).toEqual({
      rotulo: "BEC",
      tom: "azul",
    })
    expect(classificarAlerta({ scoreEsforco: 46, scoreEngajamento: 20 })).toEqual({
      rotulo: "AEC",
      tom: "vermelho",
    })
    expect(classificarAlerta({ scoreEsforco: 50, scoreEngajamento: 20 })).toEqual({
      rotulo: "AEC",
      tom: "vermelho",
    })
  })

  it("reconhece status negociados e ignora perdido", () => {
    expect(isStatusNegociado("negociada")).toBe(true)
    expect(isStatusNegociado("FECHADO_GANHO")).toBe(true)
    expect(isStatusNegociado("ACEITA")).toBe(true)
    expect(isStatusNegociado("FECHADO_PERDIDO")).toBe(false)
    expect(isStatusNegociado(null)).toBe(false)
    expect(labelStatusOportunidade("negociacao")).toBe("Negociação")
    expect(labelStatusOportunidade(null)).toBe("—")
  })

  it("filtra por busca sem acento, campos e alerta", () => {
    const linhas = [
      cliente(),
      cliente({
        id: 2,
        nome: "Beta Ltda",
        documento: "99999999000100",
        segmento: "Agro",
        porte: "Grande",
        responsaveis: ["João"],
        statusAcoes: ["AGENDADA"],
        tiposAcao: ["VIDEO"],
        statusOportunidades: ["PERDIDO"],
        scoreEngajamento: 70,
      }),
    ]

    expect(filtrarClientesSaude(linhas, { busca: "alpha" })).toHaveLength(1)
    expect(filtrarClientesSaude(linhas, { busca: "textil" })).toHaveLength(1)
    expect(filtrarClientesSaude(linhas, { segmento: "Agro" })[0].nome).toBe("Beta Ltda")
    expect(filtrarClientesSaude(linhas, { porte: "Médio" })[0].nome).toBe("Cliente Alpha")
    expect(filtrarClientesSaude(linhas, { responsavel: "João" })[0].id).toBe(2)
    expect(filtrarClientesSaude(linhas, { statusAcao: "AGENDADA" })[0].id).toBe(2)
    expect(filtrarClientesSaude(linhas, { statusOportunidade: "PERDIDO" })[0].id).toBe(2)
    expect(filtrarClientesSaude(linhas, { tipoAcao: "VIDEO" })[0].id).toBe(2)
    expect(filtrarClientesSaude(linhas, { apenasAlertas: true }).map((linha) => linha.id)).toEqual([
      1, 2,
    ])
    expect(filtrarClientesSaude(linhas, { busca: "inexistente" })).toHaveLength(0)
  })

  it("calcula os itens de engajamento com pesos de 36% e 9,33% e resumo ponderado", () => {
    const linha = cliente({
      acoes: [
        {
          id: 11,
          dataAcao: "2026-11-10",
          hora: "10:00",
          tipo: "PRESENCIAL",
          status: "REALIZADA",
          relato: "Ata assinada",
          checkInTime: null,
          checkOutTime: "2026-11-10T11:00:00.000Z",
          empresaNome: "Cliente Alpha",
          clienteNome: null,
          nomeAvulso: null,
          oportunidadeId: 50,
          oportunidadeTitulo: "Oportunidade 50",
          oportunidadeStatus: "NEGOCIADA",
          oportunidadeValor: 1000,
          oportunidadeProbabilidade: 50,
          propostaId: 40,
          propostaTitulo: "Proposta 40",
          propostaStatus: "NEGOCIADA",
          contatoId: 30,
          contatoNome: "João",
          criadoPorNome: "Maria",
          enderecoTexto: null,
        },
      ],
    })

    const { itens, resumo } = obterEngajamento(linha)

    expect(resumo).toEqual({
      quantidade: 5,
      total: 5,
      porcentagem: 100,
      rotulo: "Completo",
      tom: "verde",
    })
    expect(itens.map((item) => item.rotulo)).toEqual([
      "Ata/Relato",
      "Check-in/check-out",
      "Contato",
      "Proposta",
      "Oportunidade",
    ])
    expect(itens.map((item) => item.peso)).toEqual([28 / 3, 28 / 3, 28 / 3, 36, 36])
    expect(itens.every((item) => item.presente)).toBe(true)
    expect(itens[1].quantidade).toBe(1)
    expect(itens[0].registros[0].href).toBe("/comercial/crm/acoes-prospeccao/11")
    expect(itens[3].registros[0].href).toBe("/comercial/crm/propostas/40")
  })

  it("aplica os pesos no resumo quando só alguns itens estão presentes", () => {
    const soProposta = obterEngajamento(
      cliente({
        acoesComRelato: 0,
        acoesComCheckIn: 0,
        temContato: false,
        temProposta: true,
        temOportunidade: false,
      })
    )
    expect(soProposta.resumo).toMatchObject({ quantidade: 1, total: 5, porcentagem: 36 })

    const semPropostaOuOportunidade = obterEngajamento(
      cliente({
        acoesComRelato: 1,
        acoesComCheckIn: 1,
        temContato: true,
        temProposta: false,
        temOportunidade: false,
      })
    )
    expect(semPropostaOuOportunidade.resumo).toMatchObject({
      quantidade: 3,
      total: 5,
      porcentagem: 28,
    })
  })

  it("marca todos os itens como ausentes quando não há sinais de engajamento", () => {
    const { itens, resumo } = obterEngajamento(
      cliente({
        acoesComRelato: 0,
        acoesComCheckIn: 0,
        temContato: false,
        temProposta: false,
        temOportunidade: false,
      })
    )

    expect(resumo).toMatchObject({
      quantidade: 0,
      porcentagem: 0,
      rotulo: "Sem itens",
      tom: "vermelho",
    })
    expect(itens.every((item) => !item.presente)).toBe(true)
  })

  it("calcula a conversão sobre o total de ações e limita a 100%", () => {
    expect(calcularConversao({ totalAcoes: 4, pedidosVenda: 1, faturamentos: 1 })).toEqual({
      percentual: 50,
      rotulo: "Alta",
      tom: "verde",
    })
    expect(calcularConversao({ totalAcoes: 5, pedidosVenda: 1, faturamentos: 0 })).toEqual({
      percentual: 20,
      rotulo: "Baixa",
      tom: "amarelo",
    })
    expect(calcularConversao({ totalAcoes: 1, pedidosVenda: 1, faturamentos: 1 })).toMatchObject({
      percentual: 100,
      rotulo: "Alta",
    })
    expect(calcularConversao({ totalAcoes: 0, pedidosVenda: 0, faturamentos: 0 })).toEqual({
      percentual: 0,
      rotulo: "Sem ações",
      tom: "vermelho",
    })
  })

  it("detalha os critérios que compõem cada score", () => {
    const base = cliente()
    const esforco = obterDetalheScore(base, "Esforço")
    expect(esforco.total).toBe(100)
    expect(esforco.componentes).toHaveLength(6)
    expect(esforco.componentes.map((componente) => componente.pontos)).toEqual([
      12.5, 12.5, 12.5, 12.5, 25, 25,
    ])
    expect(esforco.componentes.every((componente) => componente.presente)).toBe(true)

    const engajamento = obterDetalheScore(base, "Engajamento")
    expect(engajamento.total).toBe(90)
    expect(
      engajamento.componentes.find((componente) => componente.rotulo === "Ação agendada")?.pontos
    ).toBe(0)

    const semSinais = obterDetalheScore(
      cliente({
        acoesRealizadas: 0,
        acoesComRelato: 0,
        acoesComCheckIn: 0,
        temContato: false,
        temProposta: false,
        temOportunidade: false,
        propostasNegociadas: 0,
        oportunidadesNegociadas: 0,
        pedidosVenda: 0,
        faturamentos: 0,
      }),
      "Engajamento"
    )
    expect(semSinais.total).toBe(0)
    expect(semSinais.componentes.every((componente) => !componente.presente)).toBe(true)
  })

  it("formata pontos decimais em português", () => {
    expect(formatarPontos(12.5)).toBe("12,5")
    expect(formatarPontos(100)).toBe("100")
  })
})
