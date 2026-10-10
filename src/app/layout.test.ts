import { describe, it, expect, vi, beforeEach } from "vitest"

const getLogoDaEmpresa = vi.fn()
const rotaLogo = "/api/public/empresa/logo"

vi.mock("@/lib/branding", async () => {
  const real = await vi.importActual<typeof import("@/lib/branding")>("@/lib/branding")
  return { ...real, getLogoDaEmpresa: () => getLogoDaEmpresa() }
})

describe("metadata da raiz", () => {
  beforeEach(() => {
    vi.resetModules()
    getLogoDaEmpresa.mockReset()
  })

  it("usa DGBCOMEX como título da aba", async () => {
    getLogoDaEmpresa.mockResolvedValue(null)
    const { generateMetadata } = await import("./layout")
    const metadata = await generateMetadata()
    expect(metadata.title).toBe("DGBCOMEX")
    expect(metadata.title).not.toContain("PDM")
  })

  it("define metadataBase para o Open Graph resolver imagens", async () => {
    getLogoDaEmpresa.mockResolvedValue(null)
    const { generateMetadata } = await import("./layout")
    const metadata = await generateMetadata()
    expect(metadata.metadataBase).toBeInstanceOf(URL)
  })

  it("usa o logo da empresa no ícone da aba e no compartilhamento", async () => {
    getLogoDaEmpresa.mockResolvedValue("https://drive.example/logo.png")
    const { generateMetadata } = await import("./layout")
    const metadata = await generateMetadata()

    const base = (metadata.metadataBase as URL).toString()
    const esperada = new URL(rotaLogo, base).toString()

    expect(metadata.icons?.icon).toBe(esperada)
    expect(metadata.icons?.apple).toBe(esperada)
    expect(metadata.openGraph?.images).toBeDefined()
    expect(metadata.twitter).toBeDefined()
  })

  it("omite os ícones quando não há logo cadastrado", async () => {
    getLogoDaEmpresa.mockResolvedValue(null)
    const { generateMetadata } = await import("./layout")
    const metadata = await generateMetadata()

    // Sem logo, o browser cai no favicon.ico estático do app.
    expect(metadata.icons?.icon).toBeUndefined()
    expect(metadata.openGraph?.images).toBeUndefined()
  })

  it("não quebra quando a leitura do logo falha", async () => {
    getLogoDaEmpresa.mockRejectedValue(new Error("banco fora"))
    const { generateMetadata } = await import("./layout")
    const metadata = await generateMetadata()
    expect(metadata.title).toBe("DGBCOMEX")
  })
})