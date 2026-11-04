// @vitest-environment node
import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db", () => ({ db: {} }))

import { db } from "@/lib/db"
import { createQueryBuilder } from "@/test/route-db-mock"
import { consultarClientes, intervalosComparativos, resolverIntervalo } from "./relatorios"

describe("resolverIntervalo", () => {
  it("resolve o dia de hoje", () => {
    const intervalo = resolverIntervalo("dia")
    expect(intervalo.rotulo).toBe("Hoje")
    expect(intervalo.de.getHours()).toBe(0)
    expect(intervalo.de.getMinutes()).toBe(0)
    expect(intervalo.ate.getHours()).toBe(23)
    expect(intervalo.ate.getMinutes()).toBe(59)
  })

  it("resolve os últimos 7 dias", () => {
    const intervalo = resolverIntervalo("semana")
    expect(intervalo.rotulo).toBe("Últimos 7 dias")
    const diffDias = (intervalo.ate.getTime() - intervalo.de.getTime()) / (1000 * 60 * 60 * 24)
    expect(diffDias).toBeGreaterThan(5.9)
    expect(diffDias).toBeLessThan(7.1)
  })

  it("resolve o mês atual", () => {
    const intervalo = resolverIntervalo("mes")
    expect(intervalo.rotulo).toBe("Mês atual")
    expect(intervalo.de.getDate()).toBe(1)
  })

  it("resolve o período personalizado", () => {
    const intervalo = resolverIntervalo("periodo", "2026-11-01", "2026-11-03")
    expect(intervalo.de.getFullYear()).toBe(2026)
    expect(intervalo.de.getMonth()).toBe(10)
    expect(intervalo.de.getDate()).toBe(1)
    expect(intervalo.ate.getDate()).toBe(3)
    expect(intervalo.ate.getHours()).toBe(23)
    expect(intervalo.rotulo).toContain("2026")
  })

  it("usa o dia de hoje quando o período personalizado não tem datas", () => {
    const intervalo = resolverIntervalo("periodo")
    expect(intervalo.rotulo).toContain("a")
    expect(intervalo.de.getHours()).toBe(0)
  })

  it("devolve os intervalos comparativos de dia, semana e mês", () => {
    const comparativos = intervalosComparativos()
    expect(comparativos.dia.rotulo).toBe("Hoje")
    expect(comparativos.semana.rotulo).toBe("Últimos 7 dias")
    expect(comparativos.mes.rotulo).toBe("Mês atual")
  })
})

describe("consultarClientes", () => {
  it("agrega o negócio do cliente, direto e herdado das pessoas promovidas", async () => {
    const select = vi.fn()
    ;(db as any).select = select

    select
      .mockImplementationOnce(() =>
        createQueryBuilder([
          {
            id: 5,
            nome: "TecMais Ltda",
            cnpj: "12.345.678/0001-99",
            segmento: "Tecelagem",
            cidade: "Blumenau",
            uf: "SC",
            createdAt: new Date("2026-10-01T10:00:00Z"),
          },
          {
            id: 6,
            nome: "Sem Negócio Ltda",
            cnpj: "98.765.432/0001-11",
            segmento: null,
            cidade: null,
            uf: null,
            createdAt: new Date("2026-09-01T10:00:00Z"),
          },
        ])
      )
      .mockImplementationOnce(() =>
        createQueryBuilder([{ clienteId: 5, total: 2, emAberto: 1, valor: 8000 }])
      )
      .mockImplementationOnce(() =>
        createQueryBuilder([{ clienteId: 5, total: 1, aceitas: 1, valor: 5000 }])
      )
      .mockImplementationOnce(() => createQueryBuilder([{ clienteId: 5, total: 3, concluidas: 2 }]))
      .mockImplementationOnce(() => createQueryBuilder([{ clienteId: 5, total: 1 }]))

    const relatorio = await consultarClientes({ periodo: "semana" })

    expect(relatorio.cards.total).toBe(2)
    expect(relatorio.cards.comNegocio).toBe(1)
    expect(relatorio.cards.semNegocio).toBe(1)
    expect(relatorio.cards.oportunidades).toBe(2)
    expect(relatorio.cards.valorOportunidades).toBe(8000)
    expect(relatorio.cards.propostas).toBe(1)
    expect(relatorio.cards.valorPropostas).toBe(5000)
    expect(relatorio.cards.visitas).toBe(3)
    expect(relatorio.cards.pessoas).toBe(1)

    const linha = relatorio.linhas.find((l: any) => l.id === 5)!
    expect(linha.oportunidades).toBe(2)
    expect(linha.oportunidadesEmAberto).toBe(1)
    expect(linha.propostasAceitas).toBe(1)
    expect(linha.visitasConcluidas).toBe(2)
    expect(linha.local).toBe("Blumenau/SC")
  })
})
