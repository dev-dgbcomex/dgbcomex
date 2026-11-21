// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  digitosDocumento,
  documentoEstaPontuado,
  formatarDocumento,
  validarDocumento,
} from "./documento"

describe("documento", () => {
  it("remove não dígitos", () => {
    expect(digitosDocumento("47.646.133/0001-01")).toBe("47646133000101")
  })

  it("pontua CNPJ informado sem pontuação", () => {
    expect(formatarDocumento("47646133000101", "CNPJ")).toBe("47.646.133/0001-01")
  })

  it("pontua CPF informado sem pontuação", () => {
    expect(formatarDocumento("12345678909", "CPF")).toBe("123.456.789-09")
  })

  it("infere o tipo pela quantidade de dígitos", () => {
    expect(formatarDocumento("12345678909")).toBe("123.456.789-09")
    expect(formatarDocumento("47646133000101")).toBe("47.646.133/0001-01")
  })

  it("reconhece documento já pontuado", () => {
    expect(documentoEstaPontuado("47.646.133/0001-01")).toBe(true)
    expect(documentoEstaPontuado("47646133000101")).toBe(false)
  })

  it("valida a quantidade de dígitos", () => {
    expect(validarDocumento("47646133000101", "CNPJ")).toBeNull()
    expect(validarDocumento("12345678909", "CPF")).toBeNull()
    expect(validarDocumento("123", "CNPJ")).toBe("CNPJ deve ter 14 dígitos")
    expect(validarDocumento("123", "CPF")).toBe("CPF deve ter 11 dígitos")
  })
})
