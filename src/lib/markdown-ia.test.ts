import { describe, expect, it } from "vitest"
import { markdownIaParaTexto, normalizarMarkdownIa } from "./markdown-ia"

describe("normalizarMarkdownIa", () => {
  it("quebra tabela compactada em uma única linha", () => {
    const conteudo =
      "| Registro | Classe | Temp. | |---|---|---| | Alpha | AEC | FRIO | | Beta | BEC | QUENTE |"

    expect(normalizarMarkdownIa(conteudo)).toBe(
      "| Registro | Classe | Temp. |\n| --- | --- | --- |\n| Alpha | AEC | FRIO |\n| Beta | BEC | QUENTE |"
    )
  })

  it("transforma checklist sem traço em item de tarefa GFM", () => {
    expect(normalizarMarkdownIa("[ ] Agendar visita\n[x] Registrar ata")).toBe(
      "- [ ] Agendar visita\n- [x] Registrar ata"
    )
  })

  it("remove cerca de código Markdown e preserva tabela já válida", () => {
    const conteudo = "```markdown\n## Diagnóstico\n\n| Registro | Classe |\n| --- | --- |\n| Alpha | AEC |\n```"

    expect(normalizarMarkdownIa(conteudo)).toBe(
      "## Diagnóstico\n\n| Registro | Classe |\n| --- | --- |\n| Alpha | AEC |"
    )
  })

  it("converte Markdown em texto simples para PDF", () => {
    expect(markdownIaParaTexto("## Diagnóstico\n\n- [ ] Agendar visita\n\n**Atenção**")).toBe(
      "Diagnóstico\n\n[ ] Agendar visita\n\nAtenção"
    )
  })
})
