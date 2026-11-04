// @vitest-environment node
import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db", () => ({ db: {} }))

import { intervalosComparativos, resolverIntervalo } from "./relatorios"

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
