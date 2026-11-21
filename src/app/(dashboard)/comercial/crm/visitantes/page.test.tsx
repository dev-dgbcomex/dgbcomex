// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, waitFor, within } from "@testing-library/react"
import CrmVisitantesPage from "./page"
import { createFetchMock, renderPage, findCall, toastMock } from "@/test/harness"
import { listSmokeSpec } from "@/test/list-smoke-spec"

const { sessionMock } = vi.hoisted(() => ({
  sessionMock: { data: { user: { role: "ADMIN" as string } } },
}))
vi.mock("next-auth/react", () => ({
  useSession: () => sessionMock,
}))

const visitantes = [
  {
    id: 1,
    nome: "João Pereira",
    email: "joao@email.com",
    celular: "(11) 91111-1111",
    empresaNome: null,
    tipoPessoa: "PJ",
    score: 80,
    origem: "SITE",
    status: "NOVO",
    responsavelNome: "Tiago",
    createdAt: "2026-07-01T10:00:00Z",
  },
  {
    id: 2,
    nome: "Maria Lima",
    email: null,
    celular: null,
    empresaNome: "Confecções Lima",
    tipoPessoa: "PF",
    score: 30,
    origem: "OUTRO",
    status: "PERDIDO",
    responsavelNome: null,
    createdAt: "2026-07-02T10:00:00Z",
  },
]

listSmokeSpec({
  title: "VisitantesPage",
  component: <CrmVisitantesPage />,
  apiUrl: "/api/crm/visitantes",
  heading: "Visitantes",
  emptyText: "Nenhum visitante encontrado",
  searchPlaceholder: "Buscar visitantes...",
  newLinkText: "Novo Visitante",
  newHref: "/comercial/crm/visitantes/novo",
  editHref: (item) => `/comercial/crm/visitantes/${item.id}`,
  primaryField: "nome",
  data: visitantes,
  firstItemText: "João Pereira",
  secondItemText: "Maria Lima",
  matchQuery: "João",
})

describe("VisitantesPage ações", () => {
  let fetchMock: ReturnType<typeof createFetchMock>

  beforeEach(() => {
    const handler = ({ method, url }: { method: string; url: string }) => {
      if (method === "GET" && url === "/api/crm/visitantes") return { json: [visitantes[0]] }
      if (method === "PUT" && url === "/api/crm/visitantes/1") return { json: { ok: true } }
      return { json: null }
    }
    fetchMock = createFetchMock(handler)
    vi.stubGlobal("fetch", fetchMock.fn)
  })

  it("altera o status do visitante pela ação Contatar", async () => {
    renderPage(<CrmVisitantesPage />)

    fireEvent.click(await screen.findByRole("button", { name: /^Contatar/ }))

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/visitantes/1", "PUT")
      expect(call).toBeDefined()
      expect(call!.body).toEqual({ status: "CONTATADO" })
    })
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("Visitante alterado para CONTATADO")
    )
  })

  it("alterna para o kanban", async () => {
    renderPage(<CrmVisitantesPage />)

    fireEvent.click(screen.getByRole("button", { name: "Kanban" }))

    expect(await screen.findByRole("button", { name: "Flutuar" })).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.getByText("João Pereira")).toBeInTheDocument()
  })
})

describe("VisitantesPage exclusão", () => {
  let fetchMock: ReturnType<typeof createFetchMock>

  beforeEach(() => {
    sessionMock.data.user.role = "ADMIN"
    const handler = ({ method, url }: { method: string; url: string }) => {
      if (method === "GET" && url === "/api/crm/visitantes") return { json: [visitantes[0]] }
      if (method === "DELETE" && url === "/api/crm/visitantes/1") return { json: { success: true } }
      return { json: null }
    }
    fetchMock = createFetchMock(handler)
    vi.stubGlobal("fetch", fetchMock.fn)
  })

  it("admin exclui visitante pela tabela via modal", async () => {
    renderPage(<CrmVisitantesPage />)

    fireEvent.click(await screen.findByRole("button", { name: /^Excluir João Pereira/ }))
    const dialog = screen.getByRole("dialog", { name: "Excluir visitante?" })
    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }))

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/visitantes/1", "DELETE")
      expect(call).toBeDefined()
    })
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith('Visitante "João Pereira" excluído')
    )
  })

  it.each(["COMERCIAL", "CRM"])("%s exclui visitante pela tabela via modal", async (role) => {
    sessionMock.data.user.role = role
    renderPage(<CrmVisitantesPage />)

    fireEvent.click(await screen.findByRole("button", { name: /^Excluir João Pereira/ }))
    const dialog = screen.getByRole("dialog", { name: "Excluir visitante?" })
    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }))

    await waitFor(() => {
      expect(findCall(fetchMock.calls, "/api/crm/visitantes/1", "DELETE")).toBeDefined()
    })
  })

  it("não mostra o botão de excluir para não-administradores", async () => {
    sessionMock.data.user.role = "VENDEDOR"
    renderPage(<CrmVisitantesPage />)

    await screen.findByText("João Pereira")
    expect(screen.queryByRole("button", { name: /^Excluir João Pereira/ })).not.toBeInTheDocument()
  })
})
