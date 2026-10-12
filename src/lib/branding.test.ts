import { describe, it, expect } from "vitest"
import { readFileSync, existsSync, statSync } from "node:fs"
import { join } from "node:path"

const publicDir = join(process.cwd(), "public")
const ler = (arquivo: string) => readFileSync(join(publicDir, arquivo), "utf8")

/**
 * O favicon adaptativo é um SVG com media query e imagens **embutidas**. Sem o
 * teste, alguém troca de volta para `href="/logo.png"` e a aba fica vazia sem
 * ninguém perceber — foi exatamente o que aconteceu.
 */
describe("favicon adaptativo", () => {
  const svg = ler("favicon.svg")

  it("as imagens estão embutidas, não referenciadas", () => {
    // Chrome bloqueia recurso externo em favicon SVG.
    expect(svg).not.toMatch(/href="\/logo/)
    expect(svg.match(/data:image\/png;base64,/g)?.length).toBe(2)
  })

  it("alterna entre os dois logos conforme o tema", () => {
    expect(svg).toContain("prefers-color-scheme: dark")
    expect(svg).toContain("prefers-color-scheme: light")
    const blocoEscuro = svg.slice(svg.indexOf("prefers-color-scheme: dark"))
    expect(blocoEscuro).toContain(".claro")
    expect(blocoEscuro).toContain("display: none")
  })

  it("não está inchado a ponto de atrasar a aba", () => {
    // Os logos originais somam ~350 KB; embutidos em 128px ficam ~21 KB.
    expect(statSync(join(publicDir, "favicon.svg")).size).toBeLessThan(80 * 1024)
  })

  it("tem PNG de fallback e ícone quadrado para iOS", () => {
    for (const arquivo of ["favicon-claro.png", "favicon-escuro.png", "apple-icon.png"]) {
      expect(existsSync(join(publicDir, arquivo))).toBe(true)
    }
  })

  it("o favicon.ico padrão do Next foi removido", () => {
    // Se voltar, ele sobrescreve o SVG e a aba volta ao logo da Vercel.
    expect(existsSync(join(process.cwd(), "src", "app", "favicon.ico"))).toBe(false)
  })
})