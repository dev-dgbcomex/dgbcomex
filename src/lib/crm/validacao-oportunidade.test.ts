import { describe, it, expect } from "vitest"
import { validarCamposObrigatoriosOportunidade, statusExigeCamposObrigatorios } from "./validacao-oportunidade"

describe("validarCamposObrigatoriosOportunidade", () => {
  it("isenta NOVO e QUALIFICACAO", () => {
    for (const status of ["NOVO", "QUALIFICACAO", "novo", "qualificacao"]) {
      const resultado = validarCamposObrigatoriosOportunidade({ status })
      expect(resultado.valido).toBe(true)
      expect(resultado.campos).toEqual([])
    }
  })

  it("exige campos para PROPOSTA, NEGOCIACAO, ganho e perdido", () => {
    for (const status of ["PROPOSTA", "NEGOCIACAO", "FECHADO_GANHO", "GANHO", "FECHADO_PERDIDO"]) {
      const resultado = validarCamposObrigatoriosOportunidade({
        status,
        valorEstimado: null,
        probabilidade: null,
      })
      expect(resultado.valido).toBe(false)
      expect(resultado.campos).toEqual(["valorEstimado", "probabilidade"])
    }
  })

  it("aceita valorEstimado e probabilidade maiores que 1", () => {
    const resultado = validarCamposObrigatoriosOportunidade({
      status: "PROPOSTA",
      valorEstimado: 10.01,
      probabilidade: 2,
    })
    expect(resultado.valido).toBe(true)
  })

  it("rejeita valorEstimado igual a 1", () => {
    const resultado = validarCamposObrigatoriosOportunidade({
      status: "PROPOSTA",
      valorEstimado: 1,
      probabilidade: 50,
    })
    expect(resultado.valido).toBe(false)
    expect(resultado.campos).toEqual(["valorEstimado"])
  })

  it("rejeita probabilidade igual a 1", () => {
    const resultado = validarCamposObrigatoriosOportunidade({
      status: "NEGOCIACAO",
      valorEstimado: 100,
      probabilidade: 1,
    })
    expect(resultado.valido).toBe(false)
    expect(resultado.campos).toEqual(["probabilidade"])
  })
})

describe("statusExigeCamposObrigatorios", () => {
  it("retorna false para status ausente e isentos", () => {
    expect(statusExigeCamposObrigatorios(null)).toBe(false)
    expect(statusExigeCamposObrigatorios(undefined)).toBe(false)
    expect(statusExigeCamposObrigatorios("NOVO")).toBe(false)
    expect(statusExigeCamposObrigatorios("QUALIFICACAO")).toBe(false)
  })

  it("retorna true para demais statuses", () => {
    expect(statusExigeCamposObrigatorios("PROPOSTA")).toBe(true)
    expect(statusExigeCamposObrigatorios("PERSONALIZADO")).toBe(true)
  })
})
