// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import AcaoProspeccaoLocationModal from "./acao-prospeccao-location-modal"
import { createFetchMock, findCall, renderPage } from "@/test/harness"

const localizacoes = [
  {
    id: 1,
    acaoId: 8,
    latitude: -23.55,
    longitude: -46.63,
    endereco: "Av. X, 100",
    observacao: "Estacionamento lateral",
    fotoUrl: null,
    tipo: "CHECKIN",
    criadoPor: 1,
    createdAt: "2026-08-10T12:00:00.000Z",
  },
]

function setup() {
  const onClose = vi.fn()
  const fetchMock = createFetchMock(({ method, url }) => {
    if (method === "GET" && url === "/api/crm/acoes-prospeccao/8/localizacoes") {
      return { status: 200, json: localizacoes }
    }
    if (method === "DELETE" && url === "/api/crm/acoes-prospeccao/8/localizacoes?localizacaoId=1") {
      return { status: 200, json: { ok: true } }
    }
    return { status: 404, json: { error: `Rota não mockada: ${method} ${url}` } }
  })
  vi.stubGlobal("fetch", fetchMock.fn)
  renderPage(
    <AcaoProspeccaoLocationModal
      acaoId={8}
      empresaNome="Tecelagem Alpha"
      open
      onClose={onClose}
    />
  )
  return { onClose, fetchMock }
}

describe("AcaoProspeccaoLocationModal", () => {
  it("lista as localizações com título acessível", async () => {
    setup()
    const dialog = await screen.findByRole("dialog", {
      name: "Localizações da Ação de Prospecção",
    })

    expect(await screen.findByText("-23.550000, -46.630000")).toBeInTheDocument()
    expect(screen.getByText("Av. X, 100")).toBeInTheDocument()
    expect(screen.getByText(/Estacionamento lateral/)).toBeInTheDocument()
    expect(within(dialog).getByText("Tecelagem Alpha")).toBeInTheDocument()
  })

  it("associa o label de Observação ao input", async () => {
    setup()
    await screen.findByText("-23.550000, -46.630000")
    expect(screen.getByLabelText("Observação (opcional)")).toBeInTheDocument()
  })

  it("exclui uma localização após confirmação", async () => {
    const { fetchMock } = setup()
    await screen.findByText("-23.550000, -46.630000")

    vi.spyOn(window, "confirm").mockReturnValue(true)
    fireEvent.click(screen.getByRole("button", { name: "Excluir localização" }))

    await waitFor(() => {
      expect(
        findCall(
          fetchMock.calls,
          "/api/crm/acoes-prospeccao/8/localizacoes?localizacaoId=1",
          "DELETE"
        )
      ).toBeTruthy()
    })
  })
})
