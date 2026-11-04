// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { screen } from "@testing-library/react"
import type { ComponentType } from "react"
import { createFetchMock, renderPage } from "@/test/harness"

export type ConfigSpecRelatorio = {
  /** Texto do h1 da tela */
  titulo: string
  /** Endpoint chamado pelo relatório */
  endpoint: string
  /** Resposta mockada da API */
  payload: Record<string, unknown>
  /** Textos que precisam aparecer na tela */
  textos: string[]
}

/**
 * Spec padrão das telas de relatório do CRM (cards + filtros + tabela).
 */
export function specRelatorioCrm(config: ConfigSpecRelatorio, Pagina: ComponentType) {
  describe(`Relatório CRM - ${config.titulo}`, () => {
    it("renderiza filtros, cards e listagem do relatório", async () => {
      const fetchMock = createFetchMock(({ url }) => {
        if (url.startsWith(config.endpoint)) return { status: 200, json: config.payload }
        return { status: 404, json: { error: "Rota não mockada" } }
      })
      vi.stubGlobal("fetch", fetchMock.fn)

      renderPage(<Pagina />)

      expect(screen.getByRole("heading", { name: config.titulo })).toBeInTheDocument()
      expect(screen.getByText("Filtros")).toBeInTheDocument()

      for (const texto of config.textos) {
        expect((await screen.findAllByText(texto)).length).toBeGreaterThan(0)
      }

      const chamada = fetchMock.calls.find((c) => c.url.startsWith(config.endpoint))
      expect(chamada).toBeDefined()
      expect(chamada?.url).toContain("periodo=semana")
    })

    it("mostra erro quando a API falha", async () => {
      const fetchMock = createFetchMock(() => ({ status: 500, json: { error: "erro" } }))
      vi.stubGlobal("fetch", fetchMock.fn)

      renderPage(<Pagina />)

      expect(
        await screen.findByText("Erro ao carregar o relatório", {}, { timeout: 5000 })
      ).toBeInTheDocument()
    })
  })
}
