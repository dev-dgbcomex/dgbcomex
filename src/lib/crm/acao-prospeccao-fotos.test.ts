import { describe, it, expect } from "vitest"
import { normalizeAcaoProspeccaoFotos } from "./acao-prospeccao-fotos"

describe("normalizeAcaoProspeccaoFotos", () => {
  it("aceita strings e objetos", () => {
    expect(
      normalizeAcaoProspeccaoFotos([
        "https://example.com/um.jpg",
        { url: "https://example.com/dois.jpg", descricao: "Fachada" },
      ])
    ).toEqual([
      { url: "https://example.com/um.jpg", descricao: "" },
      { url: "https://example.com/dois.jpg", descricao: "Fachada" },
    ])
  })

  it("descarta itens inválidos e valores não-array", () => {
    expect(normalizeAcaoProspeccaoFotos([null, 42, { descricao: "sem url" }])).toEqual([])
    expect(normalizeAcaoProspeccaoFotos(undefined)).toEqual([])
    expect(normalizeAcaoProspeccaoFotos("https://example.com/um.jpg")).toEqual([])
  })
})
