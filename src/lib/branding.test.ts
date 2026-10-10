import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

/**
 * O favicon adaptativo é um SVG com media query: sem o teste, alguém remove o
 * `<style>` e o DGBCOMEX volta a sumir no tema escuro sem ninguém perceber.
 */
describe("favicon adaptativo", () => {
  const caminho = join(process.cwd(), "public", "favicon.svg")
  const svg = existsSync(caminho) ? readFileSync(caminho, "utf8") : ""

  it("o arquivo existe", () => {
    expect(existsSync(caminho)).toBe(true)
  })

  it("alterna entre os dois logos conforme o tema", () => {
    expect(svg).toContain("prefers-color-scheme: dark")
    expect(svg).toContain("prefers-color-scheme: light")
  })

  it("esconde o logo preto no tema escuro e o branco no tema claro", () => {
    const blocoEscuro = svg.slice(svg.indexOf("prefers-color-scheme: dark"))
    expect(blocoEscuro).toContain(".tema-claro")
    expect(blocoEscuro).toContain("display: none")
  })

  it("aponta para os dois arquivos que existem em public/", () => {
    for (const arquivo of ["logoAltaBranco.png", "logodgbcomexpreto002.png"]) {
      expect(svg).toContain(`/${arquivo}`)
      expect(existsSync(join(process.cwd(), "public", arquivo))).toBe(true)
    }
  })

  it("o favicon.ico padrão do Next foi removido", () => {
    // Se voltar, ele sobrescreve o SVG e a aba volta a mostrar o logo da Vercel.
    expect(existsSync(join(process.cwd(), "src", "app", "favicon.ico"))).toBe(false)
  })
})