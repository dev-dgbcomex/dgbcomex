// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { renderPage } from "@/test/harness"
import AcaoProspeccaoRotaMapa from "./acao-prospeccao-rota-mapa"

vi.mock("leaflet", () => {
  const layer = {
    addTo: vi.fn(() => layer),
    bindPopup: vi.fn(() => layer),
    openPopup: vi.fn(() => layer),
  }

  return {
    default: {
      map: vi.fn(() => ({
        setView: vi.fn(),
        fitBounds: vi.fn(),
        invalidateSize: vi.fn(),
        flyTo: vi.fn(),
        remove: vi.fn(),
      })),
      tileLayer: vi.fn(() => layer),
      polyline: vi.fn(() => layer),
      divIcon: vi.fn(() => ({})),
      marker: vi.fn(() => layer),
      latLngBounds: vi.fn(() => ({})),
    },
  }
})

vi.mock("@/lib/crm/buscar-local", () => ({
  buscarLocal: vi.fn(async () => [
    { latitude: -23.55, longitude: -46.63, rotulo: "São Paulo" },
  ]),
  formatarCoordenadas: (latitude: number, longitude: number) =>
    `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
}))

describe("AcaoProspeccaoRotaMapa", () => {
  it("mostra estado vazio quando não há pontos", () => {
    renderPage(<AcaoProspeccaoRotaMapa pontos={[]} />)
    expect(
      screen.getByText("Nenhuma ação de prospecção com localização registrada")
    ).toBeInTheDocument()
  })

  it("renderiza o mapa e permite buscar um local", async () => {
    renderPage(
      <AcaoProspeccaoRotaMapa
        pontos={[
          {
            id: 1,
            latitude: -27.59,
            longitude: -48.55,
            rotulo: "Tecelagem Alfa",
          },
        ]}
      />
    )

    expect(screen.getByTestId("mapa-roteiro")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Buscar local no mapa"), {
      target: { value: "São Paulo" },
    })

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /São Paulo/ })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /São Paulo/ }))
    expect(screen.getByRole("status")).toHaveTextContent("São Paulo")
  })
})
