// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { screen } from "@testing-library/react"
import { createFetchMock, renderPage } from "@/test/harness"
import { BiIntegracaoKpiCard } from "./bi-integracao-kpi-card"
import type { BiIntegracaoResumo } from "./bi-integracao-dashboard"
import { corPorTitulo, PALETA_DRACULA } from "@/lib/bi/estilo-card"

function integracao(over: Partial<BiIntegracaoResumo> = {}): BiIntegracaoResumo {
  return {
    id: 1,
    nome: "Custos Administrativos Mensal",
    baseUrl: "https://api.erp.local/custos-administrativos-mensal",
    tipoAuth: "login",
    ...over,
  }
}

function mockExecutar(valor: unknown = 170459.83) {
  const { fn } = createFetchMock(() => ({ status: 200, json: { Administrativo: valor } }))
  vi.stubGlobal("fetch", fn)
  return fn
}

describe("BiIntegracaoKpiCard — botão de detalhe", () => {
  it("aponta o custo administrativo para a tela nova", async () => {
    mockExecutar()
    renderPage(<BiIntegracaoKpiCard integracao={integracao()} />)

    const link = await screen.findByRole("link", {
      name: /Ver detalhes de Custos Administrativos Mensal/,
    })
    expect(link).toHaveAttribute("href", "/bi/integracoes/custos-administrativos")
  })

  it("mantém o faturamento apontando para a tela dele", async () => {
    mockExecutar(1000)
    renderPage(
      <BiIntegracaoKpiCard
        integracao={integracao({
          nome: "Faturamento do Dia",
          baseUrl: "https://api.erp.local/faturamento-mensal",
        })}
      />
    )

    const link = await screen.findByRole("link", { name: /Ver detalhes de Faturamento/ })
    expect(link).toHaveAttribute("href", "/bi/integracoes/faturamento")
  })

  it("não mostra botão em card que não tem tela de detalhe", async () => {
    mockExecutar(10)
    renderPage(
      <BiIntegracaoKpiCard
        integracao={integracao({ nome: "Desconto", baseUrl: "https://api.erp.local/desconto" })}
      />
    )

    await screen.findByText("Desconto")
    expect(screen.queryByRole("link", { name: /Ver detalhes de/ })).not.toBeInTheDocument()
  })
})

describe("BiIntegracaoKpiCard — cor e ícone", () => {
  it("aplica a cor do tema Dracula derivada do título", async () => {
    mockExecutar(10)
    renderPage(<BiIntegracaoKpiCard integracao={integracao()} />)

    const card = await screen.findByRole("button", { name: /Abrir detalhes de/ })
    const estilo = corPorTitulo("Custos Administrativos Mensal")

    expect(card.style.getPropertyValue("--card-realce")).toBe(estilo.cor)
    expect(card.style.getPropertyValue("--card-borda")).toBe(estilo.borda)
    expect(card.style.getPropertyValue("--card-fundo")).toContain("linear-gradient")
    expect(card.style.getPropertyValue("--card-fundo-escuro")).toContain("linear-gradient")
    expect(Object.values(PALETA_DRACULA)).toContain(estilo.cor)
  })

  it("mostra um pequeno ícone ao lado do título", async () => {
    mockExecutar(10)
    renderPage(<BiIntegracaoKpiCard integracao={integracao()} />)

    const titulo = await screen.findByRole("heading", { level: 3 })
    expect(titulo.textContent).toBe("Custos Administrativos Mensal")
    expect(titulo.querySelector("svg")).not.toBeNull()
  })
})
