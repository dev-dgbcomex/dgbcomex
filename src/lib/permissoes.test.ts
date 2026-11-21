import { describe, expect, it } from "vitest"
import { podeGerenciarRegistro, podeGerenciarTudo } from "./permissoes"

describe("permissoes", () => {
  it("concede acesso total a administradores, comercial e CRM", () => {
    for (const role of ["ADMIN", "SUDO", "COMERCIAL", "CRM"]) {
      expect(podeGerenciarTudo(role)).toBe(true)
    }
  })

  it("mantém a restrição para os demais perfis", () => {
    for (const role of ["DEFAULT", "PCP", "TECELAGEM", undefined, null]) {
      expect(podeGerenciarTudo(role)).toBe(false)
    }
  })

  it("permite donos editarem seus registros", () => {
    expect(podeGerenciarRegistro("DEFAULT", 10, 10)).toBe(true)
    expect(podeGerenciarRegistro("DEFAULT", 11, 10)).toBe(false)
    expect(podeGerenciarRegistro("COMERCIAL", 11, 10)).toBe(true)
  })
})
