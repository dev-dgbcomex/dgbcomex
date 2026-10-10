import { describe, it, expect, vi, beforeEach } from "vitest"

const getLogoDaEmpresa = vi.fn()
const db = { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), execute: vi.fn() }

vi.mock("@/lib/db", () => ({ db }))
vi.mock("@/lib/branding", async () => {
  const real = await vi.importActual<typeof import("@/lib/branding")>("@/lib/branding")
  return { ...real, getLogoDaEmpresa: () => getLogoDaEmpresa() }
})

const originalFetch = globalThis.fetch

async function chamarRota() {
  const { GET } = await import("./route")
  return GET()
}

beforeEach(() => {
  vi.resetModules()
  getLogoDaEmpresa.mockReset()
  db.select.mockReset()
  globalThis.fetch = originalFetch
})

describe("/api/public/empresa/logo", () => {
  it("responde 404 quando não há logo cadastrado", async () => {
    getLogoDaEmpresa.mockResolvedValue(null)
    const res = await chamarRota()
    expect(res.status).toBe(404)
  })

  it("re-serve os bytes da imagem com cache público", async () => {
    getLogoDaEmpresa.mockResolvedValue("https://cdn.example/logo.png")
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "image/png" },
      })
    ) as unknown as typeof fetch

    const res = await chamarRota()
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("image/png")
    expect(res.headers.get("cache-control")).toContain("public")
  })

  it("recusa URL de host interno (proteção anti-SSRF)", async () => {
    getLogoDaEmpresa.mockResolvedValue("http://169.254.169.254/latest/meta-data")
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const res = await chamarRota()
    expect(res.status).toBe(404)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("recusa protocolo que não seja http(s)", async () => {
    getLogoDaEmpresa.mockResolvedValue("file:///etc/passwd")
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    expect((await chamarRota()).status).toBe(404)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("não vira proxy genérico: recusa resposta que não seja imagem", async () => {
    getLogoDaEmpresa.mockResolvedValue("https://drive.example/pagina")
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("<html>pagina do drive</html>", {
        headers: { "content-type": "text/html" },
      })
    ) as unknown as typeof fetch

    expect((await chamarRota()).status).toBe(404)
  })

  it("não exige sessão", async () => {
    // A rota é consumida por browser/crawler sem cookie; nenhuma import de auth.
    getLogoDaEmpresa.mockResolvedValue(null)
    const res = await chamarRota()
    expect(res.status).not.toBe(401)
  })
})