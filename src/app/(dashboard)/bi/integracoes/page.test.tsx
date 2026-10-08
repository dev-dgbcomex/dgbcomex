// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { screen, waitFor, fireEvent } from "@testing-library/react"
import { createFetchMock, renderPage, toastMock } from "@/test/harness"
import { exportCSV, exportPDFRelatorio } from "@/lib/export-utils"
import BiIntegracoesPage from "./page"

vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { name: "Admin" } }),
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/export-utils", () => ({
  exportCSV: vi.fn(),
  exportPDF: vi.fn(),
  exportPDFRelatorio: vi.fn(),
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

function montarFetch(handler: (params: { method: string; url: string }) => any, ordemIds: number[] = []) {
  return createFetchMock(({ method, url }) => {
    if (url === "/api/integracao/listar?tela=bi") {
      return { json: integracoes }
    }
    if (url === "/api/integracao/ordem") {
      if (method === "GET") return { json: { ids: ordemIds } }
      if (method === "PUT") return { json: { success: true } }
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

  it("cards enriquecidos mostram 3 dias no diário e o mês nos programados", async () => {
    const lista = [
      {
        id: 11,
        nome: "Faturamento Dia (diário)",
        baseUrl: "http://127.0.0.1:58245/faturamento-dia/{data}",
        tipoAuth: "login",
        telas: ["bi"],
      },
      {
        id: 12,
        nome: "Contas a Receber Programado",
        baseUrl: "http://127.0.0.1:58245/contas-receber-programado",
        tipoAuth: "login",
        telas: ["bi"],
      },
      {
        id: 13,
        nome: "Contas a Pagar Programado",
        baseUrl: "http://127.0.0.1:58245/contas-pagar-programado",
        tipoAuth: "login",
        telas: ["bi"],
      },
    ]
    const corpos: Record<number, unknown> = {
      11: { Faturamento: 405873.56, Ontem: 1508833.55, Anteontem: 987654.32 },
      12: { QtdeDoc: 876, ValorTotal: 3339914.63, QtdeDocMes: 310, ValorTotalMes: 1234567.89 },
      13: { QtdeDoc: 112, ValorTotal: 3863206.88, QtdeDocMes: 45, ValorTotalMes: 765432.1 },
    }
    const fetchMock = createFetchMock(({ method, url }) => {
      if (url === "/api/integracao/listar?tela=bi") return { json: lista }
      if (url === "/api/integracao/ordem") {
        if (method === "GET") return { json: { ids: [] } }
        if (method === "PUT") return { json: { success: true } }
      }
      const execucao = url.match(/\/api\/integracao\/(\d+)\/executar/)
      if (execucao) {
        return {
          json: { success: true, status: 200, time: 1, responseBody: corpos[Number(execucao[1])] },
        }
      }
      return { status: 404, json: { error: `Rota não mockada: ${method} ${url}` } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    const element = await BiIntegracoesPage()
    renderPage(element)

    await waitFor(() => {
      expect(screen.getByText("Hoje")).toBeInTheDocument()
      expect(screen.getByText("Ontem")).toBeInTheDocument()
      expect(screen.getByText("Anteontem")).toBeInTheDocument()
      expect(screen.getByText("R$ 405.873,56")).toBeInTheDocument()
      expect(screen.getByText("R$ 1.508.833,55")).toBeInTheDocument()
      expect(screen.getByText("R$ 987.654,32")).toBeInTheDocument()
      expect(screen.getByText("Títulos a receber no mês")).toBeInTheDocument()
      expect(screen.getByText("A receber no mês")).toBeInTheDocument()
      expect(screen.getByText("R$ 1.234.567,89")).toBeInTheDocument()
      expect(screen.getByText("Títulos a pagar no mês")).toBeInTheDocument()
      expect(screen.getByText("A pagar no mês")).toBeInTheDocument()
      expect(screen.getByText("R$ 765.432,10")).toBeInTheDocument()
      expect(screen.getByText("310")).toBeInTheDocument()
      expect(screen.getByText("45")).toBeInTheDocument()
    })
  })

  it("aplica a ordem salva pelo usuário e permite reordenar com as setas", async () => {
    const fetchMock = montarFetch(
      ({ url }) => {
        const id = Number(url.split("/")[3])
        return respostas[id as keyof typeof respostas]
      },
      [3, 1, 4, 2]
    )
    vi.stubGlobal("fetch", fetchMock.fn)
    const element = await BiIntegracoesPage()
    renderPage(element)

    await waitFor(() => {
      const titulos = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)
      expect(titulos).toEqual([
        "Custos Administrativos Mensal",
        "Faturamento",
        "Contas Pagas",
        "Média – Custo administrativo 12 meses",
      ])
    })

    fireEvent.click(screen.getByLabelText("Mover Custos Administrativos Mensal para baixo"))

    await waitFor(() => {
      const titulos = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)
      expect(titulos).toEqual([
        "Faturamento",
        "Custos Administrativos Mensal",
        "Contas Pagas",
        "Média – Custo administrativo 12 meses",
      ])
    })

    await waitFor(() => {
      const put = fetchMock.calls.find((c) => c.url === "/api/integracao/ordem" && c.method === "PUT")
      expect(put).toBeDefined()
      expect(put!.body.ids).toEqual([1, 3, 4, 2])
      expect(toastMock.success).toHaveBeenCalledWith("Ordem dos cards salva")
    })
  })

  it("abre o modal ao clicar no card e oferece exportar CSV/PDF", async () => {
    const fetchMock = montarFetch(({ url }) => {
      const id = Number(url.split("/")[3])
      return respostas[id as keyof typeof respostas]
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    const element = await BiIntegracoesPage()
    renderPage(element)

    await waitFor(() => {
      expect(screen.getByText("Faturamento mês atual")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Faturamento"))

    expect(screen.getByText("Valores por período")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Exportar CSV" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Exportar PDF" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Exportar CSV" }))
    expect(exportCSV).toHaveBeenCalledTimes(1)
    const [nome, colunas, linhas] = vi.mocked(exportCSV).mock.calls[0]
    expect(nome).toBe("Faturamento")
    expect(colunas[0]).toBe("Período")
    expect(linhas.length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: "Exportar PDF" }))
    expect(exportPDFRelatorio).toHaveBeenCalledTimes(1)
    expect(exportPDFRelatorio).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Faturamento", filename: "Faturamento" })
    )
  })
})
