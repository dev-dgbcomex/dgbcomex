// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { screen } from "@testing-library/react"
import { createFetchMock, renderPage } from "@/test/harness"
import { BiIntegracaoKpiCard } from "./bi-integracao-kpi-card"
import type { BiIntegracaoResumo } from "./bi-integracao-dashboard"

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

    const link = await screen.findByRole("link", { name: /Ver detalhes de Custos Administrativos Mensal/ })
    expect(link).toHaveAttribute("href", "/bi/integracoes/custos-administrativos")
  })

  it("mantém o faturamento apontando para a tela dele", async () => {
    mockExecutar(1000)
    renderPage(
      <BiIntegracaoKpiCard
        integracao={integracao({ nome: "Faturamento do Dia", baseUrl: "https://api.erp.local/faturamento-mensal" })}
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
