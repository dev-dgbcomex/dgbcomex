import { describe, it, expect } from "vitest"
import { DIAS_PARA_RECONSTRUIR, decidirPlano, diasEntre } from "./faturamento-base"

const HOJE = "2026-10-14"

const neon = (over: Partial<Parameters<typeof decidirPlano>[0]["estadoNeon"]> = {}) => ({
  carga_completa: true,
  contagem: 20_000,
  ultima_data: "2026-10-14",
  ...over,
})

const local = (over: Partial<{ carga_completa: boolean; contagem: number; ultima_data: string | null }> = {}) => ({
  carga_completa: true,
  contagem: 20_000,
  ultima_data: "2026-10-14",
  ...over,
})

describe("diasEntre", () => {
  it("conta dias inteiros e aceita a data anterior", () => {
    expect(diasEntre("2026-10-13", HOJE)).toBe(1)
    expect(diasEntre("2026-10-14", HOJE)).toBe(0)
    expect(diasEntre("2026-10-15", HOJE)).toBe(-1)
    // Month jump: September has 30 days.
    expect(diasEntre("2026-09-14", HOJE)).toBe(30)
    expect(diasEntre("2026-10-01", HOJE)).toBe(13)
  })
})

describe("decidirPlano sem base no navegador", () => {
  it("carrega do ERP quando o Neon não tem nada", () => {
    const { plano, motivo } = decidirPlano({
      estadoNeon: neon({ carga_completa: false, contagem: 0, ultima_data: null }),
      cacheLocal: null,
      hoje: HOJE,
    })
    expect(plano).toBe("carga")
    expect(motivo).toMatch(/Neon está vazia/)
  })

  it("carrega do ERP quando o Neon tem carga marcada mas contagem zero", () => {
    // Estado inconsistente: `carga_completa` de uma carga antiga, tabela esvaziada.
    const { plano } = decidirPlano({
      estadoNeon: neon({ carga_completa: true, contagem: 0, ultima_data: null }),
      cacheLocal: local({ carga_completa: false, contagem: 0, ultima_data: null }),
      hoje: HOJE,
    })
    expect(plano).toBe("carga")
  })

  it("baixa o espelho do Neon quando ele tem dado", () => {
    const { plano, motivo } = decidirPlano({
      estadoNeon: neon(),
      cacheLocal: null,
      hoje: HOJE,
    })
    expect(plano).toBe("usar-neon")
    expect(motivo).toMatch(/20\.000 itens/)
  })

  it("tenta o espelho quando a API não responde, sem ir ao ERP", () => {
    const { plano } = decidirPlano({ estadoNeon: null, cacheLocal: null, hoje: HOJE })
    expect(plano).toBe("usar-neon")
  })

  it("trata um cache local marcado como completo mas vazio como base ausente", () => {
    const { plano } = decidirPlano({
      estadoNeon: neon(),
      cacheLocal: local({ carga_completa: true, contagem: 0 }),
      hoje: HOJE,
    })
    expect(plano).toBe("usar-neon")
  })
})

describe("decidirPlano com base no navegador", () => {
  it("não pede nada quando o Neon está em dia", () => {
    const { plano, motivo } = decidirPlano({
      estadoNeon: neon({ ultima_data: HOJE }),
      cacheLocal: local(),
      hoje: HOJE,
    })
    expect(plano).toBe("pronto")
    expect(motivo).toMatch(/em dia/)
  })

  it("aceita o watermark de amanhã sem inventar atraso", () => {
    const { plano } = decidirPlano({
      estadoNeon: neon({ ultima_data: "2026-10-15" }),
      cacheLocal: local(),
      hoje: HOJE,
    })
    expect(plano).toBe("pronto")
  })

  it("busca só o delta quando faltam poucos dias", () => {
    const { plano, motivo } = decidirPlano({
      estadoNeon: neon({ ultima_data: "2026-10-12" }),
      cacheLocal: local(),
      hoje: HOJE,
    })
    expect(plano).toBe("sync")
    expect(motivo).toMatch(/2 dias/)
  })

  it("recarrega quando o atraso passa do limite", () => {
    const { plano, motivo } = decidirPlano({
      estadoNeon: neon({ ultima_data: "2026-09-20" }),
      cacheLocal: local(),
      hoje: HOJE,
    })
    expect(plano).toBe("carga")
    expect(motivo).toMatch(/24 dias atrás/)
  })

  it("usa o limite informado em vez do padrão", () => {
    const args = {
      estadoNeon: neon({ ultima_data: "2026-10-10" }),
      cacheLocal: local(),
      hoje: HOJE,
    }
    expect(decidirPlano({ ...args }).plano).toBe("sync")
    expect(decidirPlano({ ...args, diasParaReconstruir: 2 }).plano).toBe("carga")
    expect(DIAS_PARA_RECONSTRUIR).toBe(7)
  })

  it("recarrega quando o Neon some com o navegador cheio", () => {
    const { plano, motivo } = decidirPlano({
      estadoNeon: neon({ carga_completa: false, contagem: 0, ultima_data: null }),
      cacheLocal: local(),
      hoje: HOJE,
    })
    expect(plano).toBe("carga")
    expect(motivo).toMatch(/não existe mais/)
  })

  it("não mexe no ERP quando a API não responde", () => {
    const { plano, motivo } = decidirPlano({
      estadoNeon: null,
      cacheLocal: local(),
      hoje: HOJE,
    })
    expect(plano).toBe("pronto")
    expect(motivo).toMatch(/não respondeu/)
  })
})
