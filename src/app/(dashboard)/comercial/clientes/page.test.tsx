// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest"
import { screen, fireEvent, waitFor, within } from "@testing-library/react"
import ClientesPage from "./page"
import { listSmokeSpec } from "@/test/list-smoke-spec"
import { createFetchMock, renderPage, findCall, toastMock } from "@/test/harness"

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { role: "ADMIN" } } }),
}))

beforeEach(() => {
  localStorage.clear()
})

const dados = [
  {
    id: 1,
    nome: "Tecidos Silva",
    cnpj: "11.222.333/0001-44",
    razaoSocial: "Tecidos Silva Ltda",
    email: "contato@tecidos.com",
    telefone: "(11) 4000-0000",
    cidade: "São Paulo",
    uf: "SP",
    totalOportunidades: 3,
    totalPedidos: 5,
    totalVisitas: 2,
    totalAcoes: 7,
  },
  {
    id: 2,
    nome: "Química Alfa",
    cnpj: "55.666.777/0001-88",
    razaoSocial: "Química Alfa S/A",
    email: "vendas@quimicaalfa.com",
    telefone: "(11) 5555-9999",
    cidade: "Campinas",
    uf: "SP",
    totalOportunidades: 1,
    totalPedidos: 4,
    totalVisitas: 6,
    totalAcoes: 8,
  },
]

listSmokeSpec({
  title: "ClientesComercialPage",
  component: <ClientesPage />,
  apiUrl: "/api/clientes",
  heading: "Clientes",
  emptyText: "Nenhum cliente encontrado",
  searchPlaceholder: "Buscar por nome, CNPJ, razão social, contato, email, telefone ou cidade...",
  newLinkText: "Novo Cliente",
  newHref: "/comercial/clientes/novo",
  editHref: (item) => `/comercial/clientes/${item.id}`,
  editLinkText: "Editar",
  primaryField: "nome",
  data: dados,
  firstItemText: "Tecidos Silva",
  secondItemText: "Química Alfa",
  matchQuery: "silva",
})

describe("ClientesComercialPage - cards", () => {
  it("mostra as contagens de relacionamento no lugar de solicitações e amostras", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/clientes") return { json: dados }
      return { status: 404, json: { error: "Rota não mockada" } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<ClientesPage />)
    const card = (await screen.findByText("Tecidos Silva")).closest<HTMLElement>("div.rounded-lg")!

    expect(within(card).getByText("Oportunidades")).toBeInTheDocument()
    expect(within(card).getByText("3")).toBeInTheDocument()
    expect(within(card).getByText("Pedidos")).toBeInTheDocument()
    expect(within(card).getByText("5")).toBeInTheDocument()
    expect(within(card).getByText("Visitas")).toBeInTheDocument()
    expect(within(card).getByText("2")).toBeInTheDocument()
    expect(within(card).getByText("Ações")).toBeInTheDocument()
    expect(within(card).getByText("7")).toBeInTheDocument()
    expect(within(card).queryByText("Solicitações")).not.toBeInTheDocument()
    expect(within(card).queryByText("Amostras")).not.toBeInTheDocument()
  })
})

describe("ClientesComercialPage - excluir", () => {
  beforeEach(() => {
    toastMock.success.mockClear()
    toastMock.error.mockClear()
  })

  it("exclui um cliente via modal de confirmação", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/clientes") return { json: dados }
      if (method === "DELETE" && url === "/api/clientes/1") return { json: { success: true } }
      return { status: 404, json: { error: "Rota não mockada" } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<ClientesPage />)
    await screen.findByText("Tecidos Silva")

    const excluir = screen.getAllByRole("button").find((b) => b.textContent?.includes("Excluir"))
    expect(excluir).toBeTruthy()
    fireEvent.click(excluir!)

    const dialog = await screen.findByRole("dialog", { name: "Excluir cliente?" })
    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }))

    await waitFor(() => {
      expect(findCall(fetchMock.calls, "/api/clientes/1", "DELETE")).toBeTruthy()
    })
    expect(toastMock.success).toHaveBeenCalledWith("Cliente excluído com sucesso")
    await waitFor(() => {
      expect(screen.queryByText("Tecidos Silva")).not.toBeInTheDocument()
    })
    expect(screen.getByText("Química Alfa")).toBeInTheDocument()
  })

  it("mostra toast de erro quando a exclusão falha", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/clientes") return { json: dados }
      if (method === "DELETE" && url === "/api/clientes/1")
        return { status: 500, json: { error: "Erro interno do servidor" } }
      return { status: 404, json: { error: "Rota não mockada" } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<ClientesPage />)
    await screen.findByText("Tecidos Silva")

    const excluir = screen.getAllByRole("button").find((b) => b.textContent?.includes("Excluir"))
    fireEvent.click(excluir!)

    const dialog = await screen.findByRole("dialog", { name: "Excluir cliente?" })
    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }))

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("Erro interno do servidor")
    })
    expect(screen.getByText("Tecidos Silva")).toBeInTheDocument()
  })
})

describe("ClientesComercialPage - visualização e busca de CNPJ", () => {
  let fetchMock: ReturnType<typeof createFetchMock>

  beforeEach(() => {
    const handler = ({ method, url }: { method: string; url: string }) => {
      if (method === "GET" && url === "/api/clientes") return { json: dados }
      if (method === "GET" && url === "/api/crm/consulta-cnpj?cnpj=12345678000190") {
        return {
          json: {
            apiData: {
              cnpj: "12345678000190",
              razao_social: "Tecelagem Alpha Ltda",
              nome_fantasia: "Alpha Confecções",
              situacao_cadastral: "Ativa",
              logradouro: "Rua das Flores",
              municipio: "São Paulo",
              uf: "SP",
            },
            clientes: [],
            crmPessoas: [],
            representantes: [],
          },
        }
      }
      if (method === "POST" && url === "/api/clientes") return { json: { id: 3 } }
      return { json: null }
    }
    fetchMock = createFetchMock(handler)
    vi.stubGlobal("fetch", fetchMock.fn)
  })

  it("abre em cards por padrão e alterna para tabela", async () => {
    renderPage(<ClientesPage />)
    await screen.findByText("Tecidos Silva")
    expect(screen.queryByRole("table")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))
    expect(await screen.findByRole("table")).toBeInTheDocument()
    expect(screen.getByText("Tecidos Silva")).toBeInTheDocument()
    expect(localStorage.getItem("clientes-modo")).toBe("tabela")

    fireEvent.click(screen.getByRole("button", { name: "Cards" }))
    await waitFor(() => expect(screen.queryByRole("table")).not.toBeInTheDocument())
  })

  it("mantém a visualização em tabela quando salva", async () => {
    localStorage.setItem("clientes-modo", "tabela")
    renderPage(<ClientesPage />)
    expect(await screen.findByRole("table")).toBeInTheDocument()
  })

  it("busca CNPJ para cliente, cria e recarrega a lista", async () => {
    renderPage(<ClientesPage />)
    await screen.findByText("Tecidos Silva")

    fireEvent.click(screen.getByRole("button", { name: "Buscar CNPJ" }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText("CNPJ"), {
      target: { value: "12.345.678/0001-90" },
    })
    fireEvent.click(within(dialog).getByRole("button", { name: "Consultar" }))
    fireEvent.click(await within(dialog).findByRole("button", { name: "Criar Cliente" }))

    await waitFor(() => {
      const post = findCall(fetchMock.calls, "/api/clientes", "POST")
      expect(post).toBeDefined()
      expect(post!.body.nome).toBe("Alpha Confecções")
      const gets = fetchMock.calls.filter((c) => c.method === "GET" && c.url === "/api/clientes")
      expect(gets.length).toBeGreaterThanOrEqual(2)
    })
  })
})
