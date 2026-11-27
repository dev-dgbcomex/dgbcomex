// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  exportarAnaliseIA,
  type AnaliseIAExportacao,
  type MensagemIAExportacao,
} from "./saude-prospeccao-ia-export"

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

const analise: AnaliseIAExportacao = {
  titulo: "Análise de saúde",
  analise: "## Diagnóstico\n\n| Registro | Classe | |---|---| | Alpha | AEC |",
  resumo: "Um registro AEC",
  criadoPorNome: "Admin",
  createdAt: "2026-11-27T10:00:00Z",
}

const mensagens: MensagemIAExportacao[] = [
  { papel: "usuario", conteudo: "Como melhorar?", createdAt: "2026-11-27T10:01:00Z" },
  {
    papel: "assistente",
    conteudo: "## Resposta\n\n[ ] Negociar proposta",
    createdAt: "2026-11-27T10:02:00Z",
  },
]

describe("exportarAnaliseIA", () => {
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

  it("exporta a conversa inteira em Markdown com tabela normalizada", async () => {
    await exportarAnaliseIA({
      analise,
      mensagens,
      formato: "md",
      escopo: "conversa",
    })

    expect(downloads).toEqual(["saude-prospeccao-ia-analise-de-saude-conversa.md"])
    const conteudo = await blobs[0]!.text()
    expect(conteudo).toContain("# Análise de saúde")
    expect(conteudo).toContain("| Registro | Classe |\n| --- | --- |\n| Alpha | AEC |")
    expect(conteudo).toContain("## Conversa")
    expect(conteudo).toContain("Como melhorar?")
    expect(conteudo).toContain("- [ ] Negociar proposta")
  })

  it("exporta apenas uma interação em Markdown, com a pergunta anterior", async () => {
    await exportarAnaliseIA({
      analise,
      mensagens,
      formato: "md",
      escopo: "interacao",
      indice: 1,
    })

    expect(downloads).toEqual(["saude-prospeccao-ia-analise-de-saude-interacao-1.md"])
    const conteudo = await blobs[0]!.text()
    expect(conteudo).toContain("# Interação 1 — Análise de saúde")
    expect(conteudo).toContain("## Pergunta")
    expect(conteudo).toContain("Como melhorar?")
    expect(conteudo).toContain("## Resposta")
    expect(conteudo).toContain("- [ ] Negociar proposta")
  })

  it("exporta conversa e interação em PDF", async () => {
    await exportarAnaliseIA({ analise, mensagens, formato: "pdf", escopo: "conversa" })
    expect(salvarPdf).toHaveBeenNthCalledWith(1, "saude-prospeccao-ia-analise-de-saude-conversa.pdf")

    await exportarAnaliseIA({
      analise,
      mensagens,
      formato: "pdf",
      escopo: "interacao",
      indice: 1,
    })
    expect(salvarPdf).toHaveBeenNthCalledWith(2, "saude-prospeccao-ia-analise-de-saude-interacao-1.pdf")
  })
})
