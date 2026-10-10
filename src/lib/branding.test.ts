import { describe, it, expect } from "vitest"
import { escolherEmpresa, urlBase, ROTA_LOGO } from "./branding"

describe("branding", () => {
  it("escolhe a empresa marcada como default", () => {
    const escolhida = escolherEmpresa([
      { nome: "A", isDefault: false },
      { nome: "B", isDefault: true },
    ])
    expect(escolhida?.nome).toBe("B")
  })

  it("cai no primeiro cadastro quando ninguém é default", () => {
    const escolhida = escolherEmpresa([
      { nome: "A", isDefault: false },
      { nome: "B", isDefault: false },
    ])
    expect(escolhida?.nome).toBe("A")
  })

  it("devolve null quando não há empresa cadastrada", () => {
    expect(escolherEmpresa([])).toBeNull()
  })

  it("usa NEXT_PUBLIC_APP_URL como base", () => {
    const anterior = process.env.NEXT_PUBLIC_APP_URL
    process.env.NEXT_PUBLIC_APP_URL = "https://exemplo.vercel.app"
    expect(urlBase().toString()).toContain("exemplo.vercel.app")
    if (anterior === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = anterior
  })

  it("não quebra com URL inválida no ambiente", () => {
    const anterior = process.env.NEXT_PUBLIC_APP_URL
    process.env.NEXT_PUBLIC_APP_URL = "nao-e-url"
    expect(urlBase()).toBeInstanceOf(URL)
    if (anterior === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = anterior
  })

  it("expõe a rota pública do logo", () => {
    expect(ROTA_LOGO).toBe("/api/public/empresa/logo")
  })
})