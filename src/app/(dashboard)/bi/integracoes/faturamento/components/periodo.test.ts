import { describe, it, expect } from "vitest"
import { descreverPeriodo } from "./utils"

describe("descreverPeriodo", () => {
  it("conta meses e dias por calendário, com o dia final incluído", () => {
    const p = descreverPeriodo("2026-08-01", "2026-10-10")
    expect(p?.intervalo).toBe("01/08/2026 a 10/10/2026")
    expect(p?.duracao).toBe("2 meses e 10 dias")
  })

  it("trata um único dia", () => {
    const p = descreverPeriodo("2026-03-15", "2026-03-15")
    expect(p?.intervalo).toBe("15/03/2026")
    expect(p?.duracao).toBe("1 dia")
  })

  it("fecha o ano da data-base sem perder os dias do dia final", () => {
    // 01/10/2025 a 09/10/2026 = 374 dias = 12 meses (365) + 9 dias.
    const p = descreverPeriodo("2025-10-01", "2026-10-09")
    expect(p?.duracao).toBe("12 meses e 9 dias")
  })

  it("desconta o mês quando o dia final é menor que o inicial", () => {
    // Mesmo mês: só os dias.
    expect(descreverPeriodo("2026-01-01", "2026-01-28")?.duracao).toBe("28 dias")
    // Menos de um mês no total: fica só em dias (17 de janeiro + 10 de fevereiro).
    expect(descreverPeriodo("2026-01-15", "2026-02-10")?.duracao).toBe("27 dias")
    // Com meses suficientes, o dia final menor apenas ajusta o resto do mês.
    expect(descreverPeriodo("2026-01-15", "2026-07-10")?.duracao).toBe("5 meses e 26 dias")
  })

  it("lida com fevereiro e ano bissexto", () => {
    expect(descreverPeriodo("2024-02-01", "2024-02-29")?.duracao).toBe("29 dias")
    expect(descreverPeriodo("2026-02-01", "2026-02-28")?.duracao).toBe("28 dias")
  })

  it("aceita o período padrão de 12 meses", () => {
    const p = descreverPeriodo("2025-10-01", "2026-10-09")
    expect(p?.meses).toBe(12)
    expect(p?.intervalo).toBe("01/10/2025 a 09/10/2026")
  })

  it("devolve null para data inválida", () => {
    expect(descreverPeriodo("", "2026-10-09")).toBeNull()
    expect(descreverPeriodo("2026-10-09", "")).toBeNull()
    expect(descreverPeriodo("lixo", "2026-10-09")).toBeNull()
  })
})