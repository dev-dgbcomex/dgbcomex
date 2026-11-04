// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, waitFor } from "@testing-library/react"
import CrmPessoasPage from "./page"
import { createFetchMock, renderPage, findCall, toastMock } from "@/test/harness"
import { listSmokeSpec } from "@/test/list-smoke-spec"

const pessoas = [
  {
    id: 1,
    tipoPessoa: "PJ",
    razaoSocial: "Tecelagem Alpha",
    nomeFantasia: "Alpha Confecções",
    cnpj: "12.345.678/0001-90",
    segmento: "Têxtil",
    status: "QUALIFICADO",
    responsavelNome: "Tiago",
    createdAt: "2026-07-01T10:00:00Z",
  },
  {
    id: 2,
    tipoPessoa: "PJ",
    razaoSocial: "Confecções Lima",
    nomeFantasia: "Lima",
    cnpj: "98.765.432/0001-10",
    segmento: "Confecção",
    status: "NOVO",
    responsavelNome: null,
    createdAt: "2026-07-02T10:00:00Z",
  },
]

listSmokeSpec({
  title: "PessoasPage",
  component: <CrmPessoasPage />,
  apiUrl: "/api/crm/pessoas",
  heading: "Pessoas (Negócios)",
  emptyText: "Nenhuma pessoa encontrada",
  searchPlaceholder: "Buscar pessoas...",
  newLinkText: "Nova Pessoa",
  newHref: "/comercial/crm/pessoas/novo",
  editHref: (item) => `/comercial/crm/pessoas/${item.id}`,
  primaryField: "razaoSocial",
  data: pessoas,
  firstItemText: "Tecelagem Alpha",
  secondItemText: "Confecções Lima",
  matchQuery: "Tecelagem",
})

describe("PessoasPage kanban", () => {
  let fetchMock: ReturnType<typeof createFetchMock>

  beforeEach(() => {
    const handler = ({ method, url }: { method: string; url: string }) => {
      if (method === "GET" && url === "/api/crm/pessoas") return { json: pessoas }
      return { json: null }
    }
    fetchMock = createFetchMock(handler)
    vi.stubGlobal("fetch", fetchMock.fn)
  })

  it("alterna para o kanban", async () => {
    renderPage(<CrmPessoasPage />)

    await screen.findByText("Tecelagem Alpha")
    fireEvent.click(screen.getByRole("button", { name: "Kanban" }))

    expect(await screen.findByRole("button", { name: "Flutuar" })).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.getByText("Tecelagem Alpha")).toBeInTheDocument()
  })
})

describe("PessoasPage tarja de cliente", () => {
  const comTarja = {
    id: 3,
    tipoPessoa: "PJ",
    razaoSocial: "Tecelagem Convertida",
    cnpj: "11.111.111/0001-11",
    segmento: "Têxtil",
    status: "CONVERTIDO_CLIENTE",
    promovidaCliente: true,
    promovidoEm: "2026-07-10T10:00:00Z",
    promovidoPorNome: "Tiago",
    createdAt: "2026-06-01T10:00:00Z",
  }

  let fetchMock: ReturnType<typeof createFetchMock>

  beforeEach(() => {
    const handler = ({ method, url }: { method: string; url: string }) => {
      if (method === "GET" && url === "/api/crm/pessoas") return { json: [...pessoas, comTarja] }
      if (method === "POST" && url === "/api/crm/pessoas/1/promover-cliente") {
        return { json: { clienteId: 9, clienteCriado: true, resumo: {} } }
      }
      return { json: null }
    }
    fetchMock = createFetchMock(handler)
    vi.stubGlobal("fetch", fetchMock.fn)
  })

  it("esconde por padrão as pessoas com tarja", async () => {
    renderPage(<CrmPessoasPage />)

    expect(await screen.findByText("Tecelagem Alpha")).toBeInTheDocument()
    expect(screen.queryByText("Tecelagem Convertida")).not.toBeInTheDocument()
  })

  it("não oferece botão de excluir e oferece transformar em cliente", async () => {
    renderPage(<CrmPessoasPage />)

    await screen.findByText("Tecelagem Alpha")
    expect(screen.queryByTitle("Excluir")).not.toBeInTheDocument()
    expect(screen.getAllByTitle("Transformar em cliente").length).toBeGreaterThan(0)
  })

  it("transforma a pessoa em cliente após confirmar o aviso", async () => {
    renderPage(<CrmPessoasPage />)

    await screen.findByText("Tecelagem Alpha")
    fireEvent.click(screen.getAllByTitle("Transformar em cliente")[0])

    const dialog = screen.getByRole("dialog", { name: "Transformar em cliente?" })
    expect(dialog).toHaveTextContent("será arquivada")
    fireEvent.click(screen.getByRole("button", { name: "Transformar em cliente" }))

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/pessoas/1/promover-cliente", "POST")
      expect(call).toBeDefined()
    })
    await waitFor(() => expect(toastMock.success).toHaveBeenCalled())
  })

  it("mostra as pessoas com tarja quando o filtro é alterado", async () => {
    renderPage(<CrmPessoasPage />)

    await screen.findByText("Tecelagem Alpha")
    fireEvent.click(screen.getByRole("button", { name: "Com tarja" }))

    expect(await screen.findByText("Tecelagem Convertida")).toBeInTheDocument()
    expect(screen.queryByText("Tecelagem Alpha")).not.toBeInTheDocument()
  })
})
