// @vitest-environment node
import { describe, expect, it } from "vitest"
import { CORES_DRACULA, PALETA_DRACULA, corPorTitulo, hashTitulo, iconePorTitulo } from "./dracula"

const TITULOS_BI = [
  "Faturamento",
  "Itens",
  "Metragem",
  "Peso",
  "Ticket médio",
  "Mês atual",
  "Mês anterior",
  "Ano atual",
  "Ano anterior",
  "Período selecionado",
  "Variação",
  "Departamentos",
  "% do faturamento",
  "Custo administrativo total",
  "Custo administrativo médio mensal",
  "Faturamento e metragem por mês",
  "Pagamentos por fornecedor (top 8)",
  "Participação do fornecedor - % do total pago (top 8)",
  "Pagamentos por banco - de onde saiu o dinheiro (top 8)",
  "Participação por departamento",
]

const TITULOS_CRM = [
  "Clientes",
  "Clientes com negócio",
  "Oportunidades",
  "Propostas",
  "Visitas",
  "Valor das oportunidades",
  "Valor das propostas",
  "Tarefas",
  "Leads",
  "Pessoas",
  "Pessoas físicas",
  "Pessoas jurídicas",
  "Contatos",
  "Atividades no período",
  "Conversões no período",
  "Convertidas em cliente",
  "Taxa de conversão",
  "Em aberto",
  "Ganhas",
  "Perdidas",
  "Aceitas",
  "Recusadas",
  "Concluídas",
  "Criados hoje",
  "Por telefone",
  "Por vídeo",
  "Presenciais",
  "Negócios",
  "Campanhas",
  "Leads por Origem",
  "Valor do pipeline",
  "Valor ganho",
  "Valor enviado",
  "Valor aceito",
  "Ticket médio",
  "Taxa de aceitação",
  "Taxa de comparecimento",
  "Pessoas no período",
  "Oportunidades no período",
  "Propostas no período",
  "Visitas no período",
  "Criados nos últimos 7 dias",
  "Criados no mês",
]

describe("corPorTitulo", () => {
  it("devolve sempre a mesma cor para o mesmo título", () => {
    expect(corPorTitulo("Faturamento").cor).toBe(corPorTitulo("Faturamento").cor)
    expect(corPorTitulo("Contas Pagas").cor).toBe(corPorTitulo("Contas Pagas").cor)
  })

  it("ignora caixa e espaços na definição da cor", () => {
    expect(corPorTitulo("  contas pagas ").cor).toBe(corPorTitulo("Contas Pagas").cor)
  })

  it("usa apenas cores do tema Dracula", () => {
    for (const titulo of [...TITULOS_BI, ...TITULOS_CRM]) {
      expect(CORES_DRACULA).toContain(corPorTitulo(titulo).cor)
    }
  })

  it("gera fundo, borda e badge a partir da cor escolhida", () => {
    const estilo = corPorTitulo("Faturamento")

    expect(estilo.fundoClaro).toContain("linear-gradient")
    // Dracula background #282a36 = rgb(40, 42, 54)
    expect(estilo.fundoEscuro).toContain("rgba(40, 42, 54")
    expect(estilo.borda.startsWith("rgba(")).toBe(true)
    expect(estilo.fundoIcone.startsWith("rgba(")).toBe(true)
  })

  it("cores diferentes para títulos diferentes", () => {
    const cores = new Set(
      ["Faturamento", "Contas Pagas", "Descontos", "Devoluções", "Estornos"].map(
        (t) => corPorTitulo(t).cor
      )
    )
    expect(cores.size).toBeGreaterThan(1)
  })
})

describe("hashTitulo", () => {
  it("é estável e não depende de caixa", () => {
    expect(hashTitulo("Contas Pagas")).toBe(hashTitulo("contas pagas"))
    expect(hashTitulo("Contas Pagas")).not.toBe(hashTitulo("Contas a Pagar"))
  })
})

describe("iconePorTitulo", () => {
  it("escolhe um ícone representativo pelo título", () => {
    for (const titulo of [...TITULOS_BI, ...TITULOS_CRM]) {
      expect(iconePorTitulo(titulo)).toBeDefined()
    }
  })

  it("mantém o mesmo ícone para o mesmo título", () => {
    expect(iconePorTitulo("Contas Pagas")).toBe(iconePorTitulo("Contas Pagas"))
  })

  it("distingue títulos parecidos", () => {
    expect(iconePorTitulo("Pagamentos por banco")).not.toBe(
      iconePorTitulo("Pagamentos por fornecedor")
    )
    expect(iconePorTitulo("Pessoas físicas")).not.toBe(iconePorTitulo("Pessoas"))
  })

  it("usa o ícone do negócio quando o card fala de negócio", () => {
    expect(iconePorTitulo("Clientes com negócio")).toBe(iconePorTitulo("Negócios"))
    expect(iconePorTitulo("Clientes com negócio")).not.toBe(iconePorTitulo("Clientes"))
  })

  it("usa o ícone de campanha no card de campanhas", () => {
    expect(iconePorTitulo("Campanhas")).toBe(iconePorTitulo("Campanhas"))
    expect(iconePorTitulo("Campanhas")).not.toBe(iconePorTitulo("Clientes"))
  })
})
