// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { fireEvent, screen, within } from "@testing-library/react"
import { createFetchMock, renderPage } from "@/test/harness"
import AcaoProspeccaoCronogramaModal from "./acao-prospeccao-cronograma"

vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="mapa-acoes" />,
}))

vi.mock("@/hooks/use-statuses", () => ({
  useStatuses: () => ({
    statuses: [],
    loading: false,
    getLabel: (nome: string) => (nome === "REALIZADA" ? "Realizada" : nome),
  }),
}))

const resposta = {
  viagem: {
    id: 7,
    titulo: "Viagem Sul",
    descricao: null,
    destinoCidade: "Florianópolis",
    destinoUf: "SC",
    dataInicio: "2026-11-20",
    dataFim: "2026-11-22",
    status: "EM_ANDAMENTO",
  },
  acoes: [
    {
      id: 11,
      nome: "Tecelagem Alfa",
      empresaId: 3,
      clienteId: null,
      dataAcao: "2026-11-20",
      hora: "09:00",
      tipo: "PRESENCIAL",
      status: "REALIZADA",
      enderecoTexto: "Rua A, 10 - Florianópolis/SC",
      checkInTime: "2026-11-20T12:00:00.000Z",
      checkOutTime: null,
      latitude: -27.59,
      longitude: -48.55,
      localizacaoFonte: "checkin",
      km: 0,
    },
  ],
  resumo: {
    total: 1,
    realizadas: 1,
    canceladas: 0,
    agendadas: 0,
    comLocalizacao: 1,
    comEndereco: 0,
    geocodificadas: 0,
    kmTotal: 12.5,
    kmSemLocalizacao: 0,
  },
}

describe("AcaoProspeccaoCronogramaModal", () => {
  it("mostra o cronograma de ações da viagem", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/crm/acoes-prospeccao/dashboard/viagem?viagemId=7") {
        return { status: 200, json: resposta }
      }
      return { status: 404, json: { error: `Rota não mockada: ${method} ${url}` } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    const onClose = vi.fn()
    renderPage(
      <AcaoProspeccaoCronogramaModal
        viagemId={7}
        viagemTitulo="Viagem Sul"
        open
        onClose={onClose}
      />
    )

    const link = await screen.findByRole("link", { name: "Tecelagem Alfa" })
    const dialog = screen.getByRole("dialog", { name: "Cronograma da Viagem" })
    expect(link).toHaveAttribute("href", "/comercial/crm/acoes-prospeccao/11")
    expect(within(dialog).getByText("12.5 km")).toBeInTheDocument()
    expect(within(dialog).getByTestId("mapa-acoes")).toBeInTheDocument()
    expect(within(dialog).getByText("Realizada")).toBeInTheDocument()

    fireEvent.click(link)
    expect(onClose).toHaveBeenCalled()
  })
})
