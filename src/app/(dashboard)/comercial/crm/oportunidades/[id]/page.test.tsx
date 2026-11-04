// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, waitFor, within } from "@testing-library/react"
import DetalheOportunidadePage from "./page"
import { createFetchMock, renderPage, findCall, toastMock, navMock } from "@/test/harness"

const oportunidade = {
  id: 1,
  titulo: "Venda de malha 100% algodão",
  empresaNome: "Tecelagem Alpha",
  valorEstimado: "5000",
  probabilidade: 50,
  dataFechamentoPrevista: "2026-08-30",
  responsavelNome: "Tiago",
  descricao: "Cliente quer 5 toneladas de malha",
  status: "NOVO",
  contato: null,
  createdAt: "2026-07-01T10:00:00Z",
  propostas: [],
}

const oportunidadeComPropostas = {
  ...oportunidade,
  propostas: [
    {
      id: 10,
      titulo: "Orçamento Malha - Tecelagem Alpha",
      valor: "5000",
      status: "ENVIADA",
      createdAt: "2026-07-02T10:00:00Z",
    },
    {
      id: 11,
      titulo: "Orçamento Rev.2 - Malha",
      valor: "4800",
      status: "REVISAO",
      createdAt: "2026-07-05T10:00:00Z",
    },
  ],
}

const statuses = [
  {
    id: 1,
    nome: "NOVO",
    rotulo: "Novo",
    tipo: "OPORTUNIDADE",
    cor: "#3b82f6",
    ordem: 1,
    ativo: true,
  },
  {
    id: 2,
    nome: "NEGOCIACAO",
    rotulo: "Negociação",
    tipo: "OPORTUNIDADE",
    cor: "#f97316",
    ordem: 4,
    ativo: true,
  },
]

describe("DetalheOportunidadePage", () => {
  let fetchMock: ReturnType<typeof createFetchMock>

  beforeEach(() => {
    const handler = ({ method, url }: { method: string; url: string }) => {
      if (method === "GET" && url === "/api/admin/status?tipo=OPORTUNIDADE")
        return { json: statuses }
      if (method === "GET" && url === "/api/crm/oportunidades/1") return { json: oportunidade }
      if (method === "PUT" && url === "/api/crm/oportunidades/1") return { json: oportunidade }
      if (method === "DELETE" && url === "/api/crm/oportunidades/1") return { json: { ok: true } }
      return { json: null }
    }
    fetchMock = createFetchMock(handler)
    vi.stubGlobal("fetch", fetchMock.fn)
  })

  it("exibe os dados da oportunidade", async () => {
    navMock.setParams({ id: "1" })
    navMock.setPathname("/comercial/crm/oportunidades/1")
    renderPage(<DetalheOportunidadePage />)

    expect(
      await screen.findByRole("heading", { name: /Venda de malha 100% algodão/ })
    ).toBeInTheDocument()
    expect(screen.getAllByText("Tecelagem Alpha").length).toBeGreaterThan(0)
    expect(screen.getByText("R$ 5.000,00")).toBeInTheDocument()
    expect(screen.getByText("50%")).toBeInTheDocument()
    expect(screen.getByText("NOVO")).toBeInTheDocument()
    expect(screen.getByText("Nenhum contato vinculado")).toBeInTheDocument()
    expect(screen.getByText("Cliente quer 5 toneladas de malha")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument()
  })

  it("edita o status via select e confirma com PUT", async () => {
    navMock.setParams({ id: "1" })
    navMock.setPathname("/comercial/crm/oportunidades/1")
    const { container } = renderPage(<DetalheOportunidadePage />)

    fireEvent.click(await screen.findByRole("button", { name: "NOVO" }))

    const select = screen.getByRole("combobox")
    fireEvent.change(select, { target: { value: "NEGOCIACAO" } })

    const checkButton = container.querySelector("svg.lucide-check")!.closest("button")!
    fireEvent.click(checkButton)

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/oportunidades/1", "PUT")
      expect(call).toBeDefined()
      expect(call!.body).toEqual({ status: "NEGOCIACAO" })
    })
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Status atualizado"))
  })

  it("exclui a oportunidade após confirmação", async () => {
    navMock.setParams({ id: "1" })
    navMock.setPathname("/comercial/crm/oportunidades/1")
    renderPage(<DetalheOportunidadePage />)

    fireEvent.click(await screen.findByRole("button", { name: "Excluir" }))

    const dialog = screen.getByRole("dialog", { name: "Excluir oportunidade?" })
    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }))

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/oportunidades/1", "DELETE")
      expect(call).toBeDefined()
    })
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Oportunidade excluída"))
    expect(navMock.router.push).toHaveBeenCalledWith("/comercial/crm/oportunidades")
  })

  it("mostra oportunidade não encontrada", async () => {
    navMock.setParams({ id: "999" })
    navMock.setPathname("/comercial/crm/oportunidades/999")
    renderPage(<DetalheOportunidadePage />)

    expect(await screen.findByText("Oportunidade não encontrada")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Voltar" })).toHaveAttribute(
      "href",
      "/comercial/crm/oportunidades"
    )
  })

  it("exibe o grid de propostas vinculadas à oportunidade", async () => {
    const gridMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/admin/status?tipo=OPORTUNIDADE")
        return { json: statuses }
      if (method === "GET" && url === "/api/crm/oportunidades/1")
        return { json: oportunidadeComPropostas }
      return { json: null }
    })
    vi.stubGlobal("fetch", gridMock.fn)
    navMock.setParams({ id: "1" })
    navMock.setPathname("/comercial/crm/oportunidades/1")
    renderPage(<DetalheOportunidadePage />)

    expect(await screen.findByText("Propostas da Oportunidade")).toBeInTheDocument()
    expect(screen.getByText("(2)")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Orçamento Malha - Tecelagem Alpha" })).toHaveAttribute(
      "href",
      "/comercial/crm/propostas/10"
    )
    expect(screen.getByRole("link", { name: "Orçamento Rev.2 - Malha" })).toHaveAttribute(
      "href",
      "/comercial/crm/propostas/11"
    )
    expect(screen.getAllByText("R$ 5.000,00").length).toBeGreaterThan(0)
  })

  it('o botão "Nova Proposta" aponta para criar vinclado à oportunidade', async () => {
    const buttonMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/admin/status?tipo=OPORTUNIDADE")
        return { json: statuses }
      if (method === "GET" && url === "/api/crm/oportunidades/1")
        return { json: oportunidadeComPropostas }
      return { json: null }
    })
    vi.stubGlobal("fetch", buttonMock.fn)
    navMock.setParams({ id: "1" })
    navMock.setPathname("/comercial/crm/oportunidades/1")
    renderPage(<DetalheOportunidadePage />)

    await screen.findByText("Propostas da Oportunidade")
    expect(screen.getByRole("link", { name: /Nova Proposta/ })).toHaveAttribute(
      "href",
      "/comercial/crm/propostas/novo?oportunidadeId=1"
    )
  })

  it("exibe estado vazio quando a oportunidade não tem propostas", async () => {
    const emptyMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/admin/status?tipo=OPORTUNIDADE")
        return { json: statuses }
      if (method === "GET" && url === "/api/crm/oportunidades/1")
        return { json: { ...oportunidade, propostas: [] } }
      return { json: null }
    })
    vi.stubGlobal("fetch", emptyMock.fn)
    navMock.setParams({ id: "1" })
    navMock.setPathname("/comercial/crm/oportunidades/1")
    renderPage(<DetalheOportunidadePage />)

    expect(
      await screen.findByText("Nenhuma proposta vinculada a esta oportunidade.")
    ).toBeInTheDocument()
  })

  it("exibe os cards de faturamentos e pedidos de venda da oportunidade", async () => {
    const docsMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/admin/status?tipo=OPORTUNIDADE")
        return { json: statuses }
      if (method === "GET" && url === "/api/crm/oportunidades/1") {
        return {
          json: {
            ...oportunidade,
            faturamentos: [
              {
                id: 10,
                numero: "NF-001",
                status: "EMITIDO",
                origem: "MANUAL",
                total: 1250,
                dataEmissao: null,
                createdAt: "2026-09-01T10:00:00Z",
              },
              {
                id: 11,
                numero: "NF-002",
                status: "RECEBIDO",
                origem: "ERP",
                total: 850,
                dataEmissao: null,
                createdAt: "2026-09-02T10:00:00Z",
              },
            ],
            pedidosVenda: [
              {
                id: 20,
                numero: "PV-001",
                status: "ABERTO",
                origem: "MANUAL",
                total: 600,
                dataEmissao: null,
                createdAt: "2026-09-03T10:00:00Z",
              },
            ],
          },
        }
      }
      return { json: null }
    })
    vi.stubGlobal("fetch", docsMock.fn)
    navMock.setParams({ id: "1" })
    navMock.setPathname("/comercial/crm/oportunidades/1")
    renderPage(<DetalheOportunidadePage />)

    expect(await screen.findByText("Faturamentos")).toBeInTheDocument()
    expect(screen.getByText("NF-001")).toBeInTheDocument()
    expect(screen.getByText("NF-002")).toBeInTheDocument()
    expect(screen.getByText("PV-001")).toBeInTheDocument()
    expect(screen.getByText("R$ 2.100,00")).toBeInTheDocument()
    expect(screen.getAllByText("R$ 600,00").length).toBeGreaterThan(0)
    expect(screen.getByRole("link", { name: /Novo Faturamento/ })).toHaveAttribute(
      "href",
      "/comercial/crm/faturamentos/novo?oportunidadeId=1"
    )
    expect(screen.getByRole("link", { name: /Novo Pedido/ })).toHaveAttribute(
      "href",
      "/comercial/crm/pedidos-venda/novo?oportunidadeId=1"
    )
    expect(screen.getByRole("link", { name: /NF-001/ })).toHaveAttribute(
      "href",
      "/comercial/crm/faturamentos/10"
    )
    expect(screen.getByRole("link", { name: /PV-001/ })).toHaveAttribute(
      "href",
      "/comercial/crm/pedidos-venda/20"
    )
  })

  it("vincula um pedido do ERP na oportunidade", async () => {
    const erpMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/admin/status?tipo=OPORTUNIDADE")
        return { json: statuses }
      if (method === "GET" && url === "/api/crm/oportunidades/1")
        return { json: { ...oportunidade, empresaCnpj: "61.174.572/0001-81" } }
      if (
        method === "GET" &&
        url === "/api/crm/erp/pedidos?cnpj=61.174.572%2F0001-81&porPagina=30"
      ) {
        return {
          json: {
            paginacao: { total: 1, pagina: 1, por_pagina: 30, total_paginas: 1 },
            itens: [
              {
                empresa: "13",
                pedido: "00006979",
                cliente_cnpj: "61.174.572/0001-81",
                cliente_nome: "LINOFORTE MOVEIS",
                data_pedido: "2026-10-30",
                total_itens: 2,
                quantidade: 100,
                valor_total: 5200,
              },
            ],
          },
        }
      }
      if (method === "POST" && url === "/api/crm/oportunidades/1/vinculos") {
        return { status: 201, json: { id: 42, numero: "00006979" } }
      }
      return { json: null }
    })
    vi.stubGlobal("fetch", erpMock.fn)
    navMock.setParams({ id: "1" })
    navMock.setPathname("/comercial/crm/oportunidades/1")
    renderPage(<DetalheOportunidadePage />)

    const botoes = await screen.findAllByRole("button", { name: /Vincular do ERP/ })
    fireEvent.click(botoes[botoes.length - 1])

    const dialog = await screen.findByRole("dialog", { name: "Vincular pedido do ERP" })
    expect(await within(dialog).findByText("Pedido 00006979")).toBeInTheDocument()
    expect(within(dialog).getByText(/Só desta pessoa \(61.174.572\/0001-81\)/)).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole("button", { name: "Vincular" }))

    await waitFor(() => {
      const call = findCall(erpMock.calls, "/api/crm/oportunidades/1/vinculos", "POST")
      expect(call).toBeDefined()
      expect(call!.body).toEqual({ tipo: "PEDIDO", empresa: "13", pedido: "00006979" })
    })
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Pedido 00006979 vinculado"))
  })

  it("mostra erro do ERP ao listar documentos", async () => {
    const erpMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/admin/status?tipo=OPORTUNIDADE")
        return { json: statuses }
      if (method === "GET" && url === "/api/crm/oportunidades/1") return { json: oportunidade }
      if (method === "GET" && url.startsWith("/api/crm/erp/faturamentos")) {
        return { status: 503, json: { error: "api-microdata indisponível." } }
      }
      return { json: null }
    })
    vi.stubGlobal("fetch", erpMock.fn)
    navMock.setParams({ id: "1" })
    navMock.setPathname("/comercial/crm/oportunidades/1")
    renderPage(<DetalheOportunidadePage />)

    const botoes = await screen.findAllByRole("button", { name: /Vincular do ERP/ })
    fireEvent.click(botoes[0])

    const dialog = await screen.findByRole("dialog", { name: "Vincular faturamento do ERP" })
    expect(await within(dialog).findByText("api-microdata indisponível.")).toBeInTheDocument()
  })

  it("edita os campos da oportunidade e salva via PUT", async () => {
    const editMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/admin/status?tipo=OPORTUNIDADE")
        return { json: statuses }
      if (method === "GET" && url === "/api/crm/oportunidades/1") return { json: oportunidade }
      if (method === "GET" && url === "/api/usuarios/ativos?role=COMERCIAL,ADMIN,SUDO")
        return { json: [{ id: 3, name: "Tiago" }] }
      if (method === "PUT" && url === "/api/crm/oportunidades/1")
        return { json: { ...oportunidade, titulo: "Venda de malha revisada" } }
      return { json: null }
    })
    vi.stubGlobal("fetch", editMock.fn)
    navMock.setParams({ id: "1" })
    navMock.setPathname("/comercial/crm/oportunidades/1")
    renderPage(<DetalheOportunidadePage />)

    fireEvent.click(await screen.findByRole("button", { name: "Editar" }))

    const titulo = screen.getByLabelText("Título *")
    fireEvent.change(titulo, { target: { value: "Venda de malha revisada" } })
    fireEvent.change(screen.getByLabelText("Valor Estimado (R$)"), {
      target: { value: "7500" },
    })
    fireEvent.change(screen.getByLabelText("Probabilidade (%)"), { target: { value: "70" } })

    fireEvent.click(screen.getByRole("button", { name: "Salvar Alterações" }))

    await waitFor(() => {
      const call = findCall(editMock.calls, "/api/crm/oportunidades/1", "PUT")
      expect(call).toBeDefined()
      expect(call!.body).toMatchObject({
        titulo: "Venda de malha revisada",
        valorEstimado: "7500",
        probabilidade: 70,
      })
    })
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Oportunidade atualizada"))
  })

  it("abre em modo de edição quando vem com ?edit=true", async () => {
    const editMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/admin/status?tipo=OPORTUNIDADE")
        return { json: statuses }
      if (method === "GET" && url === "/api/crm/oportunidades/1") return { json: oportunidade }
      if (method === "GET" && url === "/api/usuarios/ativos?role=COMERCIAL,ADMIN,SUDO")
        return { json: [] }
      return { json: null }
    })
    vi.stubGlobal("fetch", editMock.fn)
    navMock.setParams({ id: "1" })
    navMock.setPathname("/comercial/crm/oportunidades/1")
    navMock.setSearchParams(new URLSearchParams("edit=true"))
    renderPage(<DetalheOportunidadePage />)

    expect(await screen.findByText("Editar Oportunidade")).toBeInTheDocument()
    expect(screen.getByLabelText("Título *")).toHaveValue("Venda de malha 100% algodão")
  })

  it("valida o título obrigatório na edição", async () => {
    const editMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/admin/status?tipo=OPORTUNIDADE")
        return { json: statuses }
      if (method === "GET" && url === "/api/crm/oportunidades/1") return { json: oportunidade }
      if (method === "GET" && url === "/api/usuarios/ativos?role=COMERCIAL,ADMIN,SUDO")
        return { json: [] }
      return { json: null }
    })
    vi.stubGlobal("fetch", editMock.fn)
    navMock.setParams({ id: "1" })
    navMock.setPathname("/comercial/crm/oportunidades/1")
    renderPage(<DetalheOportunidadePage />)

    fireEvent.click(await screen.findByRole("button", { name: "Editar" }))
    fireEvent.change(screen.getByLabelText("Título *"), { target: { value: "   " } })
    fireEvent.click(screen.getByRole("button", { name: "Salvar Alterações" }))

    expect(toastMock.error).toHaveBeenCalledWith("O título é obrigatório")
    expect(findCall(editMock.calls, "/api/crm/oportunidades/1", "PUT")).toBeUndefined()
  })
})
