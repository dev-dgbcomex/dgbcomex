import { describe, it, expect, vi, beforeEach } from "vitest"

const headersMock = vi.fn()

vi.mock("next/headers", () => ({ headers: () => headersMock() }))

beforeEach(() => {
  headersMock.mockReset()
  headersMock.mockResolvedValue(new Map() as never)
})

async function metadata() {
  const { generateMetadata } = await import("./layout")
  return generateMetadata()
}

describe("metadata da raiz", () => {
  it("usa DGBCOMEX como título e a nova descrição", async () => {
    headersMock.mockResolvedValue(
      new Map([
        ["host", "dgbcomex.vercel.app"],
        ["x-forwarded-proto", "https"],
      ]) as never
    )
    const m = await metadata()
    expect(m.title).toBe("DGBCOMEX")
    expect(m.description).toBe("Sistema de operações Comex")
  })

  it("monta as URLs no host real da requisição", async () => {
    // O host do request ganha do NEXT_PUBLIC_APP_URL: era o que apontava para
    // outro domínio e fazia o preview de compartilhamento sair sem logo.
    headersMock.mockResolvedValue(
      new Map([
        ["x-forwarded-host", "dgbcomex.vercel.app"],
        ["x-forwarded-proto", "https"],
      ]) as never
    )
    const m = await metadata()
    expect(m.metadataBase?.toString()).toContain("dgbcomex.vercel.app")
    expect(String(m.icons?.apple)).toContain("dgbcomex.vercel.app")
  })

  it("usa o favicon adaptativo e o logo para o compartilhamento", async () => {
    headersMock.mockResolvedValue(
      new Map([["host", "localhost"], ["x-forwarded-proto", "http"]]) as never
    )
    const m = await metadata()
    const icones = m.icons?.icon as { url: string; type: string }[]
    expect(icones[0].url).toContain("/favicon.svg")
    expect(icones[0].type).toBe("image/svg+xml")

    const og = m.openGraph?.images as { url: string }[]
    expect(og[0].url).toContain("/logodgbcomexpreto002.png")
    expect(m.twitter?.card).toBe("summary_large_image")
  })

  it("cai no ambiente quando não há host na requisição", async () => {
    headersMock.mockResolvedValue(new Map() as never)
    const m = await metadata()
    expect(m.metadataBase).toBeInstanceOf(URL)
    expect(m.title).toBe("DGBCOMEX")
  })
})