// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, waitFor, within } from "@testing-library/react"
import CrmLeadsPage from "./page"
import { createFetchMock, renderPage, findCall, toastMock } from "@/test/harness"
import { listSmokeSpec } from "@/test/list-smoke-spec"

beforeEach(() => {
  localStorage.clear()
})

const leads = [
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
    totalOportunidades: 4,
    totalPedidos: 6,
    totalVisitas: 3,
    totalAcoes: 9,
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
    totalOportunidades: 2,
    totalPedidos: 5,
    totalVisitas: 1,
    totalAcoes: 8,
  },
]

describe("LeadsPage (tabela)", () => {
  beforeEach(() => {
    localStorage.setItem("leads-modo", "tabela")
  })

  listSmokeSpec({
    title: "LeadsPage",
    component: <CrmLeadsPage />,
    apiUrl: "/api/crm/leads",
    heading: "Leads (Negócios)",
    emptyText: "Nenhum lead encontrada",
    searchPlaceholder: "Buscar leads...",
    newLinkText: "Novo Lead",
    newHref: "/comercial/crm/leads/novo",
    editHref: (item) => `/comercial/crm/leads/${item.id}`,
    primaryField: "razaoSocial",
    data: leads,
    firstItemText: "Tecelagem Alpha",
    secondItemText: "Confecções Lima",
    matchQuery: "Tecelagem",
  })
})

describe("LeadsPage kanban", () => {
  let fetchMock: ReturnType<typeof createFetchMock>

  beforeEach(() => {
    localStorage.setItem("leads-modo", "tabela")
    const handler = ({ method, url }: { method: string; url: string }) => {
      if (method === "GET" && url === "/api/crm/leads") return { json: leads }
      return { json: null }
    }
    fetchMock = createFetchMock(handler)
    vi.stubGlobal("fetch", fetchMock.fn)
  })

  it("alterna para o kanban", async () => {
    renderPage(<CrmLeadsPage />)

    await screen.findByText("Tecelagem Alpha")
    fireEvent.click(screen.getByRole("button", { name: "Kanban" }))

    expect(await screen.findByRole("button", { name: "Flutuar" })).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.getByText("Tecelagem Alpha")).toBeInTheDocument()
  })
})

describe("LeadsPage cards", () => {
  let fetchMock: ReturnType<typeof createFetchMock>

  const registrosPorMetrica: Record<string, unknown[]> = {
    "/api/crm/oportunidades?all=true&empresaId=1": [
      {
        id: 11,
        titulo: "Malha penteada",
        descricao: "Lote de teste",
        status: "NOVO",
        valorEstimado: "1500.00",
        dataFechamentoPrevista: "2026-12-01",
      },
    ],
    "/api/crm/pedidos-venda?all=true&empresaId=1": [
      {
        id: 21,
        numero: "PV-021",
        oportunidadeId: 11,
        oportunidadeTitulo: "Malha penteada",
        status: "ABERTO",
        dataEmissao: "2026-11-20",
        total: "2200.00",
      },
    ],
    "/api/crm/visitas?all=true&empresaId=1": [
      { id: 31, relato: "Visita técnica", status: "REALIZADA", dataVisita: "2026-11-18" },
    ],
    "/api/crm/acoes-prospeccao?all=true&empresaId=1": [
      { id: 41, relato: "Ligação de prospecção", status: "CONCLUIDA", dataAcao: "2026-11-17" },
    ],
  }

  beforeEach(() => {
    localStorage.setItem("leads-modo", "cards")
    const handler = ({ method, url }: { method: string; url: string }) => {
      if (method === "GET" && url === "/api/crm/leads") return { json: leads }
      const registros = registrosPorMetrica[url]
      if (method === "GET" && registros) return { json: registros }
      return { json: null }
    }
    fetchMock = createFetchMock(handler)
    vi.stubGlobal("fetch", fetchMock.fn)
  })

  it("abre em cards e alterna para tabela e kanban", async () => {
    renderPage(<CrmLeadsPage />)

    await screen.findByText("Tecelagem Alpha")
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Flutuar" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Tecelagem Alpha" })).toBeInTheDocument()
    expect(screen.getByText("12.345.678/0001-90")).toBeInTheDocument()

    const card = screen.getByRole("link", { name: "Tecelagem Alpha" }).closest("article")!
    expect(within(card).getByText("Oportunidades")).toBeInTheDocument()
    expect(within(card).getByText("4")).toBeInTheDocument()
    expect(within(card).getByText("Pedidos")).toBeInTheDocument()
    expect(within(card).getByText("6")).toBeInTheDocument()
    expect(within(card).getByText("Visitas")).toBeInTheDocument()
    expect(within(card).getByText("3")).toBeInTheDocument()
    expect(within(card).getByText("Ações")).toBeInTheDocument()
    expect(within(card).getByText("9")).toBeInTheDocument()
    expect(within(card).queryByText("Responsável")).not.toBeInTheDocument()
    expect(within(card).getByText("Cadastro")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))
    expect(await screen.findByRole("table")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Kanban" }))
    expect(await screen.findByRole("button", { name: "Flutuar" })).toBeInTheDocument()
  })

  it("abre modais com os registros de cada indicador", async () => {
    renderPage(<CrmLeadsPage />)

    await screen.findByText("Tecelagem Alpha")

    const casos = [
      {
        botao: "Ver oportunidades de Tecelagem Alpha",
        titulo: "Oportunidades da lead",
        texto: "Malha penteada",
        url: "/api/crm/oportunidades?all=true&empresaId=1",
      },
      {
        botao: "Ver pedidos de Tecelagem Alpha",
        titulo: "Pedidos da lead",
        texto: "PV-021",
        url: "/api/crm/pedidos-venda?all=true&empresaId=1",
      },
      {
        botao: "Ver visitas de Tecelagem Alpha",
        titulo: "Visitas da lead",
        texto: "Visita técnica",
        url: "/api/crm/visitas?all=true&empresaId=1",
      },
      {
        botao: "Ver ações de Tecelagem Alpha",
        titulo: "Ações da lead",
        texto: "Ligação de prospecção",
        url: "/api/crm/acoes-prospeccao?all=true&empresaId=1",
      },
    ]

    for (const caso of casos) {
      fireEvent.click(screen.getByRole("button", { name: caso.botao }))

      expect(await screen.findByRole("dialog", { name: caso.titulo })).toBeInTheDocument()
      expect(await screen.findByText(caso.texto)).toBeInTheDocument()
      expect(findCall(fetchMock.calls, caso.url, "GET")).toBeDefined()

      fireEvent.click(screen.getByRole("button", { name: "Fechar" }))
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    }
  })

  it("aplica os filtros no modo cards", async () => {
    renderPage(<CrmLeadsPage />)

    await screen.findByText("Tecelagem Alpha")
    fireEvent.change(screen.getByPlaceholderText("Buscar leads..."), {
      target: { value: "Lima" },
    })

    expect(await screen.findByText("Confecções Lima")).toBeInTheDocument()
    expect(screen.queryByText("Tecelagem Alpha")).not.toBeInTheDocument()
  })
})

describe("LeadsPage tarja de cliente", () => {
  beforeEach(() => {
    localStorage.setItem("leads-modo", "tabela")
  })

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
      if (method === "GET" && url === "/api/crm/leads") return { json: [...leads, comTarja] }
      if (method === "POST" && url === "/api/crm/leads/1/promover-cliente") {
        return { json: { clienteId: 9, clienteCriado: true, resumo: {} } }
      }
      return { json: null }
    }
    fetchMock = createFetchMock(handler)
    vi.stubGlobal("fetch", fetchMock.fn)
  })

  it("esconde por padrão as leads com tarja", async () => {
    renderPage(<CrmLeadsPage />)

    expect(await screen.findByText("Tecelagem Alpha")).toBeInTheDocument()
    expect(screen.queryByText("Tecelagem Convertida")).not.toBeInTheDocument()
  })

  it("não oferece botão de excluir e oferece transformar em cliente", async () => {
    renderPage(<CrmLeadsPage />)

    await screen.findByText("Tecelagem Alpha")
    expect(screen.queryByTitle("Excluir")).not.toBeInTheDocument()
    expect(screen.getAllByTitle("Transformar em cliente").length).toBeGreaterThan(0)
  })

  it("transforma a lead em cliente após confirmar o aviso", async () => {
    renderPage(<CrmLeadsPage />)

    await screen.findByText("Tecelagem Alpha")
    fireEvent.click(screen.getAllByTitle("Transformar em cliente")[0])

    const dialog = screen.getByRole("dialog", { name: "Transformar em cliente?" })
    expect(dialog).toHaveTextContent("será arquivada")
    fireEvent.click(screen.getByRole("button", { name: "Transformar em cliente" }))

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/leads/1/promover-cliente", "POST")
      expect(call).toBeDefined()
    })
    await waitFor(() => expect(toastMock.success).toHaveBeenCalled())
  })

  it("mostra as leads com tarja quando o filtro é alterado", async () => {
    renderPage(<CrmLeadsPage />)

    await screen.findByText("Tecelagem Alpha")
    fireEvent.click(screen.getByRole("button", { name: "Com tarja" }))

    expect(await screen.findByText("Tecelagem Convertida")).toBeInTheDocument()
    expect(screen.queryByText("Tecelagem Alpha")).not.toBeInTheDocument()
  })
})

describe("LeadsPage visualização padrão", () => {
  let fetchMock: ReturnType<typeof createFetchMock>

  beforeEach(() => {
    const handler = ({ method, url }: { method: string; url: string }) => {
      if (method === "GET" && url === "/api/crm/leads") return { json: leads }
      return { json: null }
    }
    fetchMock = createFetchMock(handler)
    vi.stubGlobal("fetch", fetchMock.fn)
  })

  it("abre em cards por padrão e alterna para tabela", async () => {
    renderPage(<CrmLeadsPage />)

    await screen.findByText("Tecelagem Alpha")
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Tecelagem Alpha" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Tabela" }))
    expect(await screen.findByRole("table")).toBeInTheDocument()
    expect(localStorage.getItem("leads-modo")).toBe("tabela")
  })

  it("respeita a preferência de tabela salva", async () => {
    localStorage.setItem("leads-modo", "tabela")
    renderPage(<CrmLeadsPage />)

    expect(await screen.findByRole("table")).toBeInTheDocument()
    expect(fetchMock.calls.some((c) => c.url === "/api/crm/leads")).toBe(true)
  })
})
