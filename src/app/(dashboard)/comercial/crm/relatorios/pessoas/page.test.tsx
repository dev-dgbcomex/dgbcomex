// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { screen, fireEvent, waitFor } from "@testing-library/react"
import { specRelatorioCrm } from "@/test/relatorio-page-spec"
import { createFetchMock, renderPage } from "@/test/harness"
import RelatorioPessoasPage from "./page"

const payload = {
  periodo: {
    de: "2026-10-28T00:00:00.000Z",
    ate: "2026-11-04T23:59:59.999Z",
    rotulo: "Últimos 7 dias",
  },
  cards: {
    total: 2,
    pessoasFisicas: 1,
    pessoasJuridicas: 1,
    convertidasEmCliente: 1,
    comSegmento: 1,
  },
  linhas: [
    {
      id: 1,
      dataHora: "2026-11-02T13:30:00.000Z",
      nome: "Maria Souza",
      tipoPessoa: "PF",
      documento: "12345678901",
      segmento: "Têxtil",
      cidade: "São Paulo/SP",
      status: "ATIVO",
      responsavel: "Tiago",
      clienteVinculado: true,
      promovidaCliente: true,
      promovidoEm: "2026-11-03T14:00:00.000Z",
      promovidoPorNome: "Tiago",
    },
    {
      id: 2,
      dataHora: "2026-11-03T09:00:00.000Z",
      nome: "TecMais Ltda",
      tipoPessoa: "PJ",
      documento: "11222333000181",
      segmento: "Confecção",
      cidade: "Campinas/SP",
      status: "ATIVO",
      responsavel: "Ana",
      clienteVinculado: false,
      promovidaCliente: false,
      promovidoEm: null,
      promovidoPorNome: null,
    },
  ],
  usuarios: [{ id: 1, nome: "Tiago" }],
}

specRelatorioCrm(
  {
    titulo: "Pessoas",
    endpoint: "/api/crm/relatorios/pessoas",
    payload,
    textos: [
      "Pessoas no período",
      "Pessoas físicas",
      "Pessoas jurídicas",
      "Convertidas em cliente",
      "Maria Souza",
      "TecMais Ltda",
    ],
  },
  RelatorioPessoasPage
)

describe("Relatório de Pessoas - tarja de cliente", () => {
  it("mostra a tarja, a data da conversão e quem promovou", async () => {
    const fetchMock = createFetchMock(({ url }) => {
      if (url.startsWith("/api/crm/relatorios/pessoas")) return { status: 200, json: payload }
      return { status: 404, json: { error: "Rota não mockada" } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<RelatorioPessoasPage />)

    expect(await screen.findByText("Maria Souza")).toBeInTheDocument()
    expect(screen.getByText("Tarja")).toBeInTheDocument()
    expect(screen.getByText("Virou cliente em")).toBeInTheDocument()
    expect(screen.getByText("Promovido por")).toBeInTheDocument()
    expect(screen.getAllByText("Sim").length).toBeGreaterThan(0)
  })

  it("filtra por tarja de cliente", async () => {
    const fetchMock = createFetchMock(({ url }) => {
      if (url.startsWith("/api/crm/relatorios/pessoas")) return { status: 200, json: payload }
      return { status: 404, json: { error: "Rota não mockada" } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<RelatorioPessoasPage />)

    const select = await screen.findByLabelText("Tarja de cliente")
    fireEvent.change(select, { target: { value: "com" } })

    await waitFor(() => {
      const chamada = fetchMock.calls.find((c) => c.url.includes("tarja=com"))
      expect(chamada).toBeDefined()
    })
  })
})
