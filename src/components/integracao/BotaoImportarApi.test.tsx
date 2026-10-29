// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { createFetchMock, renderPage } from "@/test/harness"
import BotaoImportarApi from "./BotaoImportarApi"

const INTEGRACOES = [
  {
    id: 14,
    nome: "api-microdata-wms-pedidos",
    baseUrl: "http://erp/wms/pedidos",
    telas: ["wms"],
    ativo: true,
    mapping: {},
  },
  {
    id: 15,
    nome: "api-microdata-wms-dashboard",
    baseUrl: "http://erp/wms/dashboard",
    telas: ["wms"],
    ativo: true,
    mapping: {},
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  const { fn } = createFetchMock(({ url }) => {
    if (url.startsWith("/api/integracao/listar")) return { json: INTEGRACOES }
    return { status: 404, json: { error: `Rota não mockada: ${url}` } }
  })
  vi.stubGlobal("fetch", fn)
})

describe("BotaoImportarApi", () => {
  it("mostra a integração que a tela está usando", () => {
    renderPage(
      <BotaoImportarApi
        tela="wms"
        integracao={{ id: 14, nome: "api-microdata-wms-pedidos" }}
      />
    )

    expect(screen.getByText("api-microdata-wms-pedidos")).toBeInTheDocument()
  })

  it("avisa quando a tela está sem integração", () => {
    renderPage(<BotaoImportarApi tela="wms" integracao={null} />)

    expect(screen.getByText("não encontrada")).toBeInTheDocument()
  })

  it("abre o modal com as integrações da tela e a que está em uso selecionada", async () => {
    renderPage(
      <BotaoImportarApi
        tela="wms"
        integracao={{ id: 14, nome: "api-microdata-wms-pedidos" }}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Importar via API" }))

    const emUso = await screen.findByRole("button", { name: /api-microdata-wms-pedidos/ })
    expect(emUso).toHaveTextContent("(em uso)")
    expect(
      screen.getByRole("button", { name: /api-microdata-wms-dashboard/ })
    ).toBeInTheDocument()
  })

  it("fecha o modal", async () => {
    renderPage(
      <BotaoImportarApi
        tela="wms"
        integracao={{ id: 14, nome: "api-microdata-wms-pedidos" }}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Importar via API" }))
    await screen.findByRole("button", { name: /api-microdata-wms-pedidos/ })

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }))
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /api-microdata-wms-dashboard/ })).not.toBeInTheDocument()
    })
  })
})
