// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, waitFor } from "@testing-library/react"
import AcoesProspeccaoPage from "./page"
import { createFetchMock, renderPage, findCall, toastMock, navMock } from "@/test/harness"

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { role: "ADMIN" } } }),
}))

const acoes = [
  {
    id: 1,
    dataAcao: "2026-07-01",
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
    dataAcao: "2026-07-02",
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

const statuses = [
  {
    id: 1,
    nome: "AGENDADA",
    rotulo: "Agendada",
    tipo: "ACAO_PROSPECCAO",
    cor: "#3b82f6",
    ordem: 1,
    ativo: true,
  },
  {
    id: 2,
    nome: "REALIZADA",
    rotulo: "Realizada",
    tipo: "ACAO_PROSPECCAO",
    cor: "#10b981",
    ordem: 3,
    ativo: true,
  },
]

function buildHandler() {
  return ({ method, url }: { method: string; url: string }) => {
    if (method === "PATCH" && url === "/api/crm/acoes-prospeccao/bulk") return { json: { ok: true } }
    if (method === "DELETE" && url === "/api/crm/acoes-prospeccao/bulk") return { json: { ok: true } }
    if (method !== "GET") return { json: null }
    if (url === "/api/admin/status?tipo=ACAO_PROSPECCAO") return { json: statuses }

    const u = new URL(url, "http://localhost")
    if (u.pathname === "/api/crm/acoes-prospeccao") {
      const status = u.searchParams.get("status")
      const porStatus = status ? acoes.filter((v) => v.status === status) : acoes
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

describe("AcoesProspeccaoPage", () => {
  let fetchMock: ReturnType<typeof createFetchMock>

  beforeEach(() => {
    fetchMock = createFetchMock(buildHandler())
    vi.stubGlobal("fetch", fetchMock.fn)
    navMock.setPathname("/comercial/crm/acoes-prospeccao")
  })

  it("oferece atalho para Saúde da Prospecção", () => {
    renderPage(<AcoesProspeccaoPage />)

    expect(screen.getByRole("link", { name: "Saúde da Prospecção" })).toHaveAttribute(
      "href",
      "/comercial/crm/saude-prospeccao"
    )
  })

  it("abre no calendário por padrão", async () => {
    renderPage(<AcoesProspeccaoPage />)

    expect(await screen.findByRole("button", { name: "Próximo mês" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Calendário" })).toHaveClass("bg-blue-600")
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("renderiza a tabela de ações com dados", async () => {
    renderPage(<AcoesProspeccaoPage />)
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))

    expect(
      await screen.findByRole("heading", { name: "Ações de Prospecção" })
    ).toBeInTheDocument()
    expect(await screen.findByText("Tecelagem Alpha")).toBeInTheDocument()
    expect(screen.getByText("Confecções Lima")).toBeInTheDocument()
    expect(screen.getByText("Presencial")).toBeInTheDocument()
    expect(screen.getByText("01/07/2026 10:00")).toBeInTheDocument()
    expect(screen.getByText("1-2 de 2 ação(ões)")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Nova Ação de Prospecção" })).toHaveAttribute(
      "href",
      "/comercial/crm/acoes-prospeccao/novo"
    )
  })

  it("carrega por padrão todas as ações (sem mine)", async () => {
    renderPage(<AcoesProspeccaoPage />)
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))

    await screen.findByText("Tecelagem Alpha")
    await waitFor(() =>
      expect(
        findCall(fetchMock.calls, "/api/crm/acoes-prospeccao?page=1&limit=50", "GET")
      ).toBeDefined()
    )
    expect(screen.getByRole("button", { name: "Todas" })).toHaveClass("bg-blue-600")
  })

  it("filtra as minhas ações ao clicar em Minhas Ações", async () => {
    renderPage(<AcoesProspeccaoPage />)
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))
    fireEvent.click(screen.getByRole("button", { name: /Minhas Ações/ }))

    await screen.findByText("Tecelagem Alpha")
    await waitFor(() =>
      expect(
        findCall(
          fetchMock.calls,
          "/api/crm/acoes-prospeccao?page=1&limit=50&mine=true",
          "GET"
        )
      ).toBeDefined()
    )
    expect(screen.getByRole("button", { name: /Minhas Ações/ })).toHaveClass("bg-blue-600")
  })

  it("filtra a tabela por status ao clicar no botão superior", async () => {
    renderPage(<AcoesProspeccaoPage />)
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))
    await screen.findByText("Tecelagem Alpha")

    fireEvent.click(screen.getByRole("button", { name: "Realizada" }))

    await waitFor(() =>
      expect(
        findCall(
          fetchMock.calls,
          "/api/crm/acoes-prospeccao?page=1&limit=50&status=REALIZADA",
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
    renderPage(<AcoesProspeccaoPage />)
    await screen.findByRole("button", { name: "Próximo mês" })

    fireEvent.click(screen.getByRole("button", { name: "Realizada" }))

    await waitFor(() =>
      expect(
        findCall(
          fetchMock.calls,
          "/api/crm/acoes-prospeccao?all=true&status=REALIZADA",
          "GET"
        )
      ).toBeDefined()
    )
    expect(await screen.findByText("1 ação(ões) de prospecção")).toBeInTheDocument()
  })

  it("limpa o filtro de status ao clicar em Todos", async () => {
    renderPage(<AcoesProspeccaoPage />)
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))
    await screen.findByText("Tecelagem Alpha")

    fireEvent.click(screen.getByRole("button", { name: "Realizada" }))
    await screen.findByText("Confecções Lima")
    fireEvent.click(screen.getByRole("button", { name: "Todos" }))

    expect(await screen.findByText("Tecelagem Alpha")).toBeInTheDocument()
    expect(screen.getByText("Confecções Lima")).toBeInTheDocument()
  })

  it("não mostra filtro de status no kanban", async () => {
    renderPage(<AcoesProspeccaoPage />)
    fireEvent.click(screen.getByRole("button", { name: "Kanban" }))

    expect(await screen.findByRole("button", { name: "Flutuar" })).toBeInTheDocument()
    expect(screen.queryByRole("group", { name: "Filtrar por status" })).not.toBeInTheDocument()
  })

  it("alterna para o kanban com o tipo ACAO_PROSPECCAO", async () => {
    const handler = buildHandler()
    const withStatus = ({ method, url }: { method: string; url: string }) => {
      if (method === "GET" && url === "/api/admin/status?tipo=ACAO_PROSPECCAO")
        return { json: statuses }
      return handler({ method, url })
    }
    const kanbanMock = createFetchMock(withStatus)
    vi.stubGlobal("fetch", kanbanMock.fn)

    renderPage(<AcoesProspeccaoPage />)
    fireEvent.click(screen.getByRole("button", { name: "Kanban" }))

    expect(await screen.findByRole("button", { name: "Flutuar" })).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(await screen.findByText("Tecelagem Alpha")).toBeInTheDocument()
  })

  it("altera status em massa via PATCH", async () => {
    renderPage(<AcoesProspeccaoPage />)
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))
    await screen.findByText("Tecelagem Alpha")

    const checkboxes = screen.getAllByRole("checkbox")
    fireEvent.click(checkboxes[1])
    fireEvent.click(checkboxes[2])

    expect(await screen.findByText("2 selecionada(s)")).toBeInTheDocument()
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "REALIZADA" } })

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/acoes-prospeccao/bulk", "PATCH")
      expect(call).toBeDefined()
      expect(call!.body).toEqual({ ids: [1, 2], status: "REALIZADA" })
    })
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("Status atualizado com sucesso")
    )
  })

  it("exclui ações selecionadas em massa", async () => {
    renderPage(<AcoesProspeccaoPage />)
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))
    await screen.findByText("Tecelagem Alpha")

    const checkboxes = screen.getAllByRole("checkbox")
    fireEvent.click(checkboxes[1])
    fireEvent.click(checkboxes[2])

    fireEvent.click(await screen.findByRole("button", { name: "Excluir" }))

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/acoes-prospeccao/bulk", "DELETE")
      expect(call).toBeDefined()
      expect(call!.body).toEqual({ ids: [1, 2] })
    })
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("Ações de prospecção excluídas com sucesso")
    )
  })

  it("busca com debounce e filtra no servidor", async () => {
    renderPage(<AcoesProspeccaoPage />)
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))
    await screen.findByText("Tecelagem Alpha")

    fireEvent.change(screen.getByPlaceholderText("Buscar por pessoa, cliente ou oportunidade..."), {
      target: { value: "Tecelagem" },
    })

    await waitFor(
      () =>
        expect(
          findCall(
            fetchMock.calls,
            "/api/crm/acoes-prospeccao?page=1&limit=50&q=Tecelagem",
            "GET"
          )
        ).toBeDefined(),
      { timeout: 2000 }
    )
    await waitFor(() => expect(screen.queryByText("Confecções Lima")).not.toBeInTheDocument())
    expect(screen.getByText("Tecelagem Alpha")).toBeInTheDocument()
  })

  it("expõe labels acessíveis para filtros de data e checkboxes", async () => {
    renderPage(<AcoesProspeccaoPage />)
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))
    await screen.findByText("Tecelagem Alpha")

    expect(screen.getByLabelText("Data inicial do período")).toBeInTheDocument()
    expect(screen.getByLabelText("Data final do período")).toBeInTheDocument()
    expect(screen.getByLabelText("Selecionar todas as ações desta página")).toBeInTheDocument()
    expect(screen.getByLabelText("Selecionar ação de Tecelagem Alpha")).toBeInTheDocument()
    expect(screen.getByLabelText("Selecionar ação de Confecções Lima")).toBeInTheDocument()
  })

  it("mostra estado vazio", async () => {
    const empty = createFetchMock(({ url }) => ({
      json: url.includes("all=true") ? [] : { data: [], total: 0, totalPages: 0 },
    }))
    vi.stubGlobal("fetch", empty.fn)

    renderPage(<AcoesProspeccaoPage />)
    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))

    expect(await screen.findByText("Nenhuma ação de prospecção encontrada")).toBeInTheDocument()
  })
})
