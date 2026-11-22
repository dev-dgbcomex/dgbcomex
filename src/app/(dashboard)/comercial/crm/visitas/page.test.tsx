// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, waitFor } from "@testing-library/react"
import VisitasPage from "./page"
import { createFetchMock, renderPage, findCall, toastMock, navMock } from "@/test/harness"

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { role: "ADMIN" } } }),
}))

const visitas = [
  {
    id: 1,
    dataVisita: "2026-07-01",
    hora: "10:00",
    tipo: "PRESENCIAL",
    status: "AGENDADA",
    empresaId: 1,
    clienteId: null,
    empresaNome: "Tecelagem Alpha",
    clienteNome: null,
    nomeAvulso: null,
    oportunidadeTitulo: "Venda de malha",
    criadoPorNome: "Tiago",
    endereco: "Rua das Rosas",
    numero: "100",
    cidade: "São Paulo",
    uf: "SP",
  },
  {
    id: 2,
    dataVisita: "2026-07-02",
    hora: null,
    tipo: "VIDEO",
    status: "REALIZADA",
    empresaId: null,
    clienteId: 5,
    empresaNome: null,
    clienteNome: "Confecções Lima",
    nomeAvulso: null,
    oportunidadeTitulo: null,
    criadoPorNome: null,
    endereco: null,
  },
]

const statusesVisita = [
  {
    id: 1,
    nome: "AGENDADA",
    rotulo: "Agendada",
    tipo: "VISITA",
    cor: "#3b82f6",
    ordem: 1,
    ativo: true,
  },
  {
    id: 2,
    nome: "REALIZADA",
    rotulo: "Realizada",
    tipo: "VISITA",
    cor: "#10b981",
    ordem: 3,
    ativo: true,
  },
]

function buildHandler() {
  return ({ method, url }: { method: string; url: string }) => {
    if (method === "PATCH" && url === "/api/crm/visitas/bulk") return { json: { ok: true } }
    if (method === "DELETE" && url === "/api/crm/visitas/bulk") return { json: { ok: true } }
    if (method !== "GET") return { json: null }
    if (url === "/api/admin/status?tipo=VISITA") return { json: statusesVisita }

    const u = new URL(url, "http://localhost")
    if (u.pathname === "/api/crm/visitas") {
      const status = u.searchParams.get("status")
      const porStatus = status ? visitas.filter((v) => v.status === status) : visitas
      if (u.searchParams.get("all") === "true") {
        if (u.searchParams.get("avulsas") === "true") return { json: [] }
        return { json: porStatus }
      }
      const q = (u.searchParams.get("q") || "").toLowerCase()
      const filtered = porStatus.filter(
        (v) =>
          !q ||
          v.empresaNome?.toLowerCase().includes(q) ||
          v.clienteNome?.toLowerCase().includes(q) ||
          v.oportunidadeTitulo?.toLowerCase().includes(q)
      )
      return { json: { data: filtered, total: filtered.length, totalPages: 1 } }
    }
    return { json: null }
  }
}

describe("VisitasPage", () => {
  let fetchMock: ReturnType<typeof createFetchMock>

  beforeEach(() => {
    fetchMock = createFetchMock(buildHandler())
    vi.stubGlobal("fetch", fetchMock.fn)
    navMock.setPathname("/comercial/crm/visitas")
  })

  it("abre no calendário por padrão", async () => {
    renderPage(<VisitasPage />)

    expect(await screen.findByRole("button", { name: "Próximo mês" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Calendário" })).toHaveClass("bg-blue-600")
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("renderiza a tabela de visitas com dados", async () => {
    renderPage(<VisitasPage />)
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))

    expect(await screen.findByRole("heading", { name: "Visitas" })).toBeInTheDocument()
    expect(await screen.findByText("Tecelagem Alpha")).toBeInTheDocument()
    expect(screen.getByText("Confecções Lima")).toBeInTheDocument()
    expect(screen.getByText("Presencial")).toBeInTheDocument()
    expect(screen.getByText("01/07/2026 10:00")).toBeInTheDocument()
    expect(screen.getAllByText("Agendada").length).toBeGreaterThan(0)
    expect(screen.getByText("1-2 de 2 visita(s)")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Nova Visita" })).toHaveAttribute(
      "href",
      "/comercial/crm/visitas/novo"
    )
  })

  it("carrega por padrão todas as visitas (sem mine)", async () => {
    renderPage(<VisitasPage />)
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))

    await screen.findByText("Tecelagem Alpha")
    await waitFor(() =>
      expect(findCall(fetchMock.calls, "/api/crm/visitas?page=1&limit=50", "GET")).toBeDefined()
    )
    expect(screen.getByRole("button", { name: "Todas" })).toHaveClass("bg-blue-600")
  })

  it("filtra as minhas visitas ao clicar em Minhas Visitas", async () => {
    renderPage(<VisitasPage />)
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))
    fireEvent.click(screen.getByRole("button", { name: /Minhas Visitas/ }))

    await screen.findByText("Tecelagem Alpha")
    await waitFor(() =>
      expect(
        findCall(fetchMock.calls, "/api/crm/visitas?page=1&limit=50&mine=true", "GET")
      ).toBeDefined()
    )
    expect(screen.getByRole("button", { name: /Minhas Visitas/ })).toHaveClass("bg-blue-600")
  })

  it("filtra a tabela por status ao clicar no botão superior", async () => {
    renderPage(<VisitasPage />)
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))
    await screen.findByText("Tecelagem Alpha")

    fireEvent.click(screen.getByRole("button", { name: "Realizada" }))

    await waitFor(() =>
      expect(
        findCall(
          fetchMock.calls,
          "/api/crm/visitas?page=1&limit=50&status=REALIZADA",
          "GET"
        )
      ).toBeDefined()
    )
    expect(await screen.findByText("Confecções Lima")).toBeInTheDocument()
    expect(screen.queryByText("Tecelagem Alpha")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Realizada" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  })

  it("filtra o calendário por status ao clicar no botão superior", async () => {
    renderPage(<VisitasPage />)
    await screen.findByRole("button", { name: "Próximo mês" })

    fireEvent.click(screen.getByRole("button", { name: "Realizada" }))

    await waitFor(() =>
      expect(
        findCall(fetchMock.calls, "/api/crm/visitas?all=true&status=REALIZADA", "GET")
      ).toBeDefined()
    )
    expect(await screen.findByText("1 visita(s)")).toBeInTheDocument()
  })

  it("limpa o filtro de status ao clicar em Todos", async () => {
    renderPage(<VisitasPage />)
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))
    await screen.findByText("Tecelagem Alpha")

    fireEvent.click(screen.getByRole("button", { name: "Realizada" }))
    await screen.findByText("Confecções Lima")
    fireEvent.click(screen.getByRole("button", { name: "Todos" }))

    expect(await screen.findByText("Tecelagem Alpha")).toBeInTheDocument()
    expect(screen.getByText("Confecções Lima")).toBeInTheDocument()
  })

  it("não mostra filtro de status no kanban", async () => {
    renderPage(<VisitasPage />)
    fireEvent.click(screen.getByRole("button", { name: "Kanban" }))

    expect(await screen.findByRole("button", { name: "Flutuar" })).toBeInTheDocument()
    expect(screen.queryByRole("group", { name: "Filtrar por status" })).not.toBeInTheDocument()
  })

  it("alterna para o kanban", async () => {
    const handler = buildHandler()
    const withStatus = ({ method, url }: { method: string; url: string }) => {
      if (method === "GET" && url === "/api/admin/status?tipo=VISITA")
        return { json: statusesVisita }
      return handler({ method, url })
    }
    const kanbanMock = createFetchMock(withStatus)
    vi.stubGlobal("fetch", kanbanMock.fn)

    renderPage(<VisitasPage />)

    fireEvent.click(screen.getByRole("button", { name: "Kanban" }))

    expect(await screen.findByRole("button", { name: "Flutuar" })).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(await screen.findByText("Tecelagem Alpha")).toBeInTheDocument()
  })

  it("altera status em massa via PATCH", async () => {
    renderPage(<VisitasPage />)
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))
    await screen.findByText("Tecelagem Alpha")

    const checkboxes = screen.getAllByRole("checkbox")
    fireEvent.click(checkboxes[1])
    fireEvent.click(checkboxes[2])

    expect(await screen.findByText("2 selecionada(s)")).toBeInTheDocument()
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "REALIZADA" } })

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/visitas/bulk", "PATCH")
      expect(call).toBeDefined()
      expect(call!.body).toEqual({ ids: [1, 2], status: "REALIZADA" })
    })
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("Status atualizado com sucesso")
    )
  })

  it("exclui visitas selecionadas em massa", async () => {
    renderPage(<VisitasPage />)
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))
    await screen.findByText("Tecelagem Alpha")

    const checkboxes = screen.getAllByRole("checkbox")
    fireEvent.click(checkboxes[1])
    fireEvent.click(checkboxes[2])

    fireEvent.click(await screen.findByRole("button", { name: "Excluir" }))

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/visitas/bulk", "DELETE")
      expect(call).toBeDefined()
      expect(call!.body).toEqual({ ids: [1, 2] })
    })
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("Visitas excluidas com sucesso")
    )
  })

  it("busca com debounce e filtra no servidor", async () => {
    renderPage(<VisitasPage />)
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))
    await screen.findByText("Tecelagem Alpha")

    fireEvent.change(screen.getByPlaceholderText("Buscar por pessoa, cliente ou oportunidade..."), {
      target: { value: "Tecelagem" },
    })

    await waitFor(
      () =>
        expect(
          findCall(fetchMock.calls, "/api/crm/visitas?page=1&limit=50&q=Tecelagem", "GET")
        ).toBeDefined(),
      { timeout: 2000 }
    )
    await waitFor(() => expect(screen.queryByText("Confecções Lima")).not.toBeInTheDocument())
    expect(screen.getByText("Tecelagem Alpha")).toBeInTheDocument()
  })

  it("expõe labels acessíveis para filtros de data e checkboxes", async () => {
    renderPage(<VisitasPage />)
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))
    await screen.findByText("Tecelagem Alpha")

    expect(screen.getByLabelText("Data inicial do período")).toBeInTheDocument()
    expect(screen.getByLabelText("Data final do período")).toBeInTheDocument()
    expect(screen.getByLabelText("Selecionar todas as visitas desta página")).toBeInTheDocument()
    expect(screen.getByLabelText("Selecionar visita de Tecelagem Alpha")).toBeInTheDocument()
    expect(screen.getByLabelText("Selecionar visita de Confecções Lima")).toBeInTheDocument()
  })

  it("mostra estado vazio", async () => {
    const empty = createFetchMock(({ url }) => ({
      json: url.includes("all=true") ? [] : { data: [], total: 0, totalPages: 0 },
    }))
    vi.stubGlobal("fetch", empty.fn)

    renderPage(<VisitasPage />)
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))

    expect(await screen.findByText("Nenhuma visita encontrada")).toBeInTheDocument()
  })
})
