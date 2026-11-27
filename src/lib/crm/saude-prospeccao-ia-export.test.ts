// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  exportarAnaliseIA,
  type AnaliseIAExportacao,
  type MensagemIAExportacao,
} from "./saude-prospeccao-ia-export"

const { salvarPdf, autoTable, textos } = vi.hoisted(() => ({
  salvarPdf: vi.fn(),
  autoTable: vi.fn(),
  textos: [] as string[],
}))

vi.mock("jspdf", () => ({
  default: class {
    lastAutoTable = { finalY: 80 }
    setFont() {
      return this
    }
    setFontSize() {
      return this
    }
    setFillColor() {
      return this
    }
    setDrawColor() {
      return this
    }
    setTextColor() {
      return this
    }
    text(texto: string | string[]) {
      textos.push(...(Array.isArray(texto) ? texto : [texto]))
      return this
    }
    splitTextToSize(texto: string | string[]) {
      return Array.isArray(texto) ? texto : [texto]
    }
    rect() {
      return this
    }
    line() {
      return this
    }
    addPage() {
      return this
    }
    getNumberOfPages() {
      return 1
    }
    setPage() {
      return this
    }
    save = salvarPdf
  },
}))

vi.mock("jspdf-autotable", () => ({
  default: (doc: { lastAutoTable?: { finalY: number } }, opcoes: unknown) => {
    autoTable(doc, opcoes)
    doc.lastAutoTable = { finalY: 80 }
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
    conteudo:
      "## Resposta\n\n| Registro | Classe |\n| --- | --- |\n| Alpha | AEC |\n\n[ ] Negociar proposta",
    createdAt: "2026-11-27T10:02:00Z",
  },
]

describe("exportarAnaliseIA", () => {
  let blobs: Blob[]
  let downloads: string[]

  beforeEach(() => {
    blobs = []
    downloads = []
    textos.length = 0
    salvarPdf.mockClear()
    autoTable.mockClear()
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

  it("exporta conversa em PDF com tabelas, cabeçalho e rodapé", async () => {
    await exportarAnaliseIA({ analise, mensagens, formato: "pdf", escopo: "conversa" })

    expect(salvarPdf).toHaveBeenCalledWith("saude-prospeccao-ia-analise-de-saude-conversa.pdf")
    expect(autoTable).toHaveBeenCalledTimes(2)
    expect(autoTable.mock.calls[0]![1]).toMatchObject({
      head: [["Registro", "Classe"]],
      body: [["Alpha", "AEC"]],
      theme: "grid",
    })
    const conteudo = textos.join(" ")
    expect(conteudo).toContain("Conversa — Análise de saúde")
    expect(conteudo).toContain("Diagnóstico")
    expect(conteudo).toContain("[ ] Negociar proposta")
    expect(conteudo).toContain("Página 1 de 1")
  })

  it("exporta a resposta em PDF com a tabela da própria mensagem", async () => {
    await exportarAnaliseIA({
      analise,
      mensagens,
      formato: "pdf",
      escopo: "interacao",
      indice: 1,
    })

    expect(salvarPdf).toHaveBeenCalledWith("saude-prospeccao-ia-analise-de-saude-interacao-1.pdf")
    expect(autoTable).toHaveBeenCalledTimes(1)
    expect(autoTable.mock.calls[0]![1]).toMatchObject({
      head: [["Registro", "Classe"]],
      body: [["Alpha", "AEC"]],
    })
    expect(textos.join(" ")).toContain("Interação 1 — Análise de saúde")
  })
})
