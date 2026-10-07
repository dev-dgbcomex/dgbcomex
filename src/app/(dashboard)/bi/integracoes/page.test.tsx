// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { screen, waitFor, fireEvent } from "@testing-library/react"
import { createFetchMock, renderPage } from "@/test/harness"
import BiIntegracoesPage from "./page"

vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { name: "Admin" } }),
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

const integracoes = [
  {
    id: 1,
    nome: "Faturamento do Dia",
    baseUrl: "http://127.0.0.1:58245/faturamento/{data}",
    tipoAuth: "login",
    telas: ["bi"],
  },
  {
    id: 2,
    nome: "Custos Administrativos Anual",
    baseUrl: "http://127.0.0.1:58245/custos-administrativos-anual",
    tipoAuth: "login",
    telas: ["bi"],
  },
  {
    id: 3,
    nome: "Custos Administrativos Mensal",
    baseUrl: "http://127.0.0.1:58245/custos-administrativos-mensal",
    tipoAuth: "login",
    telas: ["bi"],
  },
  {
    id: 4,
    nome: "Contas Pagas",
    baseUrl: "http://127.0.0.1:58245/contas-pagas/{data}",
    tipoAuth: "login",
    telas: ["bi"],
  },
]

function montarFetch(handler: (params: { method: string; url: string }) => any) {
  return createFetchMock(({ method, url }) => {
    if (url === "/api/integracao/listar?tela=bi") {
      return { json: integracoes }
    }
    const corpo = handler({ method, url })
    if (corpo !== undefined)
      return { json: { success: true, status: 200, time: 1, responseBody: corpo } }
    return { status: 404, json: { error: `Rota não mockada: ${method} ${url}` } }
  })
}

const respostas = {
  1: {
    MesAtual: { Faturamento: 373631.58 },
    MesAnterior: { Faturamento: 1508833.55 },
    AnoAtual: { Faturamento: 7861871.64 },
    AnoAnterior: { Faturamento: 26430276.47 },
  },
  2: {
    Faturamento: { Total: 27522110.16, Media: 2293509.18 },
    Administrativo: { Total: 9906460.7, Media: 825538.39 },
    Porc_Administrativo: 0.3599,
  },
  3: {
    Faturamento: 373631.58,
    Administrativo: 0,
    Porc_Administrativo: 0,
    MesAnterior: {
      Faturamento: 1508833.55,
      Administrativo: 170459.83,
      Porc_Administrativo: 0.113,
    },
  },
  4: {
    MesAtual: { ContasPagas: 3347037.43 },
    MesAnterior: { ContasPagas: 3129000.0 },
    AnoAtual: { ContasPagas: 20000000.0 },
    AnoAnterior: { ContasPagas: 18500000.0 },
  },
}

describe("BiIntegracoesPage", () => {
  it("renderiza o heading", async () => {
    const fetchMock = montarFetch(({ url }) => {
      const id = Number(url.split("/")[3])
      return respostas[id as keyof typeof respostas]
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    const element = await BiIntegracoesPage()
    renderPage(element)
    expect(await screen.findByRole("heading", { name: /BI Integrações/ })).toBeInTheDocument()
  })

  it("lista integrações na tela bi e consulta cada card", async () => {
    const fetchMock = montarFetch(({ url }) => {
      const id = Number(url.split("/")[3])
      return respostas[id as keyof typeof respostas]
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    const element = await BiIntegracoesPage()
    renderPage(element)

    expect(await screen.findByText("Faturamento")).toBeInTheDocument()
    expect(screen.getByText("Média – Custo administrativo 12 meses")).toBeInTheDocument()
    expect(screen.getByText("Custos Administrativos Mensal")).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText("Faturamento mês atual")).toBeInTheDocument()
      expect(screen.getAllByText("R$ 373.631,58").length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText("R$ 2.293.509,18")).toBeInTheDocument()
      expect(screen.getByText("R$ 825.538,39")).toBeInTheDocument()
      expect(screen.getByText("R$ 9.906.460,70")).toBeInTheDocument()
      expect(screen.getByText("35,99%")).toBeInTheDocument()
      expect(screen.getByText("Custo administrativo do mês atual")).toBeInTheDocument()
      expect(screen.getByText("Mês anterior — custo administrativo")).toBeInTheDocument()
      expect(screen.getByText("Mês atual")).toBeInTheDocument()
      expect(screen.getAllByText("Mês anterior").length).toBeGreaterThanOrEqual(2)
      expect(screen.getAllByText("Ano atual").length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText("R$ 26.430.276,47")).toBeInTheDocument()
      expect(screen.getByText("R$ 3.347.037,43")).toBeInTheDocument()
      expect(screen.queryByText(/Armazenagem/)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      const calls = fetchMock.calls
      for (const id of [1, 2, 3, 4]) {
        expect(calls.some((c) => c.url.startsWith(`/api/integracao/${id}/executar`))).toBe(true)
      }
    })

    expect(screen.getByRole("button", { name: /Atualizar tudo/ })).toBeInTheDocument()
  })

  it("abre o modal de informações com explicações e valores", async () => {
    const fetchMock = montarFetch(({ url }) => {
      const id = Number(url.split("/")[3])
      return respostas[id as keyof typeof respostas]
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    const element = await BiIntegracoesPage()
    renderPage(element)

    await waitFor(() => {
      expect(screen.getByText("R$ 3.347.037,43")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Sobre Contas Pagas" }))

    expect(
      screen.getByText(/Quanto a empresa efetivamente pagou a fornecedores/)
    ).toBeInTheDocument()
    expect(screen.getByText("Valores por período")).toBeInTheDocument()
    expect(screen.getByText("Ano atual", { selector: "p.text-blue-600" })).toBeInTheDocument()
    expect(screen.getByText("Regras de Negócio")).toBeInTheDocument()
    expect(screen.getByText("Exemplos Práticos")).toBeInTheDocument()
    expect(screen.getByText(/pagou R\$ 150 mil a fornecedores/)).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText("Fechar informações"))
    expect(screen.queryByText("Valores por período")).not.toBeInTheDocument()
  })

  it("modal dos custos de 12 meses mostra total e média", async () => {
    const fetchMock = montarFetch(({ url }) => {
      const id = Number(url.split("/")[3])
      return respostas[id as keyof typeof respostas]
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    const element = await BiIntegracoesPage()
    renderPage(element)

    await waitFor(() => {
      expect(screen.getByText("R$ 2.293.509,18")).toBeInTheDocument()
    })

    fireEvent.click(
      screen.getByRole("button", { name: "Sobre Média – Custo administrativo 12 meses" })
    )

    expect(screen.getByText("Valores")).toBeInTheDocument()
    expect(screen.getByText("Faturamento total (12 meses)")).toBeInTheDocument()
    expect(screen.getByText("R$ 27.522.110,16")).toBeInTheDocument()
    expect(screen.getByText("Faturamento médio mensal")).toBeInTheDocument()
    expect(screen.getAllByText(/Total dos 12 meses ÷ 12/).length).toBeGreaterThan(0)
    expect(screen.getByText(/de cada R\$ 1 vendido, R\$ 0,36/)).toBeInTheDocument()
  })

  it("mostra botão de atualizar e 'i' em cada card", async () => {
    const fetchMock = montarFetch(({ url }) => {
      const id = Number(url.split("/")[3])
      return respostas[id as keyof typeof respostas]
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    const element = await BiIntegracoesPage()
    renderPage(element)

    await waitFor(() => {
      expect(screen.getByLabelText("Atualizar Faturamento do Dia")).toBeInTheDocument()
    })
    expect(screen.getByLabelText("Atualizar Custos Administrativos Anual")).toBeInTheDocument()
    expect(screen.getByLabelText("Atualizar Custos Administrativos Mensal")).toBeInTheDocument()
    expect(screen.getByLabelText("Atualizar Contas Pagas")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sobre Contas Pagas" })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Sobre Média – Custo administrativo 12 meses" })
    ).toBeInTheDocument()
  })

  it("mostra estado vazio quando não há integrações de bi", async () => {
    const fetchMock = createFetchMock(({ url }) => {
      if (url === "/api/integracao/listar?tela=bi") {
        return { json: [] }
      }
      return { status: 404, json: { error: `Rota não mockada: ${url}` } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    const element = await BiIntegracoesPage()
    renderPage(element)

    expect(await screen.findByText(/Nenhuma integração com a tela/)).toBeInTheDocument()
  })
})
