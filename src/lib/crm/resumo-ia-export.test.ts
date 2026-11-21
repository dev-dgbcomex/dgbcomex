// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { exportarResumosIA, type ResumoIAExportacao } from "./resumo-ia-export"

const { salvarPdf } = vi.hoisted(() => ({ salvarPdf: vi.fn() }))

vi.mock("jspdf", () => ({
  default: class {
    setFont() {
      return this
    }
    setFontSize() {
      return this
    }
    text() {
      return this
    }
    splitTextToSize(texto: string) {
      return String(texto).split("\n")
    }
    addPage() {
      return this
    }
    save = salvarPdf
  },
}))

const resumos: ResumoIAExportacao[] = [
  {
    id: 55,
    classificacao: "QUENTE",
    resumo: "Primeiro resumo com contato recente.",
    insights: "Insight um.",
    sugestoes: "Agendar visita.",
    motivoClassificacao: "Contato nos últimos 7 dias.",
    criadoPorNome: "Tiago",
    createdAt: "2026-11-20T10:00:00Z",
  },
  {
    id: 56,
    classificacao: "MORNO",
    resumo: "Segundo resumo com proposta aberta.",
    insights: null,
    sugestoes: "Atualizar proposta.",
    motivoClassificacao: null,
    criadoPorNome: null,
    createdAt: "2026-11-21T10:00:00Z",
  },
]

describe("exportarResumosIA", () => {
  let blobs: Blob[]
  let downloads: string[]

  beforeEach(() => {
    blobs = []
    downloads = []
    salvarPdf.mockClear()
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: vi.fn((blob: Blob) => {
          blobs.push(blob)
          return "blob:teste"
        }),
        revokeObjectURL: vi.fn(),
      })
    )
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download)
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("exporta Markdown em arquivo único", async () => {
    await exportarResumosIA({
      resumos,
      nomeEntidade: "Empresa Exemplo",
      formato: "md",
      modo: "unico",
    })

    expect(downloads).toEqual(["resumo-ia-empresa-exemplo.md"])
    const conteudo = await blobs[0]!.text()
    expect(conteudo).toContain("# Resumos IA — Empresa Exemplo")
    expect(conteudo).toContain("Resumo 1 — QUENTE")
    expect(conteudo).toContain("Primeiro resumo com contato recente.")
    expect(conteudo).toContain("Resumo 2 — MORNO")
  })

  it("exporta TXT em arquivos separados", async () => {
    await exportarResumosIA({
      resumos,
      nomeEntidade: "Empresa Exemplo",
      formato: "txt",
      modo: "separado",
    })

    expect(downloads).toEqual([
      "resumo-ia-empresa-exemplo-55.txt",
      "resumo-ia-empresa-exemplo-56.txt",
    ])
    expect(await blobs[0]!.text()).toContain("Primeiro resumo com contato recente.")
    expect(await blobs[1]!.text()).toContain("Segundo resumo com proposta aberta.")
  })

  it("exporta PDF único e separado", async () => {
    await exportarResumosIA({
      resumos,
      nomeEntidade: "Empresa Exemplo",
      formato: "pdf",
      modo: "unico",
    })

    expect(salvarPdf).toHaveBeenCalledTimes(1)
    expect(salvarPdf).toHaveBeenCalledWith("resumo-ia-empresa-exemplo.pdf")

    salvarPdf.mockClear()
    await exportarResumosIA({
      resumos,
      nomeEntidade: "Empresa Exemplo",
      formato: "pdf",
      modo: "separado",
    })

    expect(salvarPdf).toHaveBeenCalledTimes(2)
    expect(salvarPdf).toHaveBeenNthCalledWith(1, "resumo-ia-empresa-exemplo-55.pdf")
    expect(salvarPdf).toHaveBeenNthCalledWith(2, "resumo-ia-empresa-exemplo-56.pdf")
  })
})
