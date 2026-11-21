// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest"
import { screen, fireEvent, waitFor, within } from "@testing-library/react"
import { createFetchMock, renderPage, findCall, navMock, toastMock } from "@/test/harness"
import NovoClientePage from "./page"

describe("NovoClientePage", () => {
  let fetchMock: ReturnType<typeof createFetchMock>

  beforeEach(() => {
    const handler = ({ method, url }: { method: string; url: string }) => {
      if (method === "GET" && url === "/api/crm/estados") {
        return { json: [{ id: 35, uf: "SP", nome: "São Paulo" }] }
      }
      if (method === "GET" && url === "/api/crm/cidades?estadoId=35") {
        return { json: [{ id: 1, nome: "São Paulo", estadoId: 35 }] }
      }
      if (method === "GET" && url === "/api/crm/segmentos") {
        return { json: [{ id: 1, nome: "Confecção de peças do vestuário", ativo: true }] }
      }
      if (method === "GET" && url === "/api/crm/consulta-cnpj?cnpj=12345678000190") {
        return {
          json: {
            apiData: {
              razao_social: "Tecelagem Alpha Ltda",
              nome_fantasia: "Alpha Confecções",
              situacao_cadastral: "Ativa",
              cnaes: [
                {
                  descricao: "Confecção de peças do vestuário",
                  is_principal: true,
                },
              ],
              logradouro: "Rua das Flores",
              numero: "100",
              bairro: "Centro",
              municipio: "São Paulo",
              uf: "SP",
              cep: "01000000",
              telefones: [{ ddd: "11", numero: "99999999" }],
            },
          },
        }
      }
      if (method === "GET" && url === "/api/crm/consulta-cnpj?cnpj=00000000000000") {
        return { json: { apiData: null } }
      }
      if (method === "POST" && url === "/api/clientes") return { status: 201, json: { id: 99 } }
      return { status: 404, json: { error: "Rota não mockada" } }
    }
    fetchMock = createFetchMock(handler)
    vi.stubGlobal("fetch", fetchMock.fn)
    navMock.setPathname("/comercial/clientes/novo")
    navMock.setParams({ id: "novo" })
  })

  it("renderiza o formulário de criação", () => {
    renderPage(<NovoClientePage />)
    expect(screen.getByRole("heading", { name: "Novo Cliente" })).toBeInTheDocument()
  })

  it("valida os campos obrigatórios antes de salvar", async () => {
    const ui = renderPage(<NovoClientePage />)
    fireEvent.submit(ui.container.querySelector("form")!)
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Nome fantasia é obrigatório"))
    expect(findCall(fetchMock.calls, "/api/clientes", "POST")).toBeUndefined()
  })

  it("cria via POST e redireciona", async () => {
    const ui = renderPage(<NovoClientePage />)
    const textboxes = within(ui.container).getAllByRole("textbox")
    fireEvent.change(textboxes[0], { target: { value: "Nova Firma" } })
    fireEvent.change(textboxes[1], { target: { value: "00.111.222/0001-33" } })
    fireEvent.submit(ui.container.querySelector("form")!)

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/clientes", "POST")
      expect(call).toBeDefined()
      expect(call!.body.nome).toBe("Nova Firma")
      expect(call!.body.cnpj).toBe("00.111.222/0001-33")
    })
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("Cliente cadastrado com sucesso!")
    )
    expect(navMock.router.push).toHaveBeenCalledWith("/comercial/clientes/99")
  })

  it("exige 14 dígitos ao consultar CNPJ", async () => {
    renderPage(<NovoClientePage />)
    fireEvent.change(screen.getByPlaceholderText("00.000.000/0000-00"), {
      target: { value: "123" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }))

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("CNPJ deve ter 14 dígitos"))
    expect(fetchMock.calls.some((c) => c.url.startsWith("/api/crm/consulta-cnpj"))).toBe(false)
  })

  it("consulta CNPJ e preenche os dados do cliente", async () => {
    renderPage(<NovoClientePage />)
    fireEvent.change(screen.getByPlaceholderText("00.000.000/0000-00"), {
      target: { value: "12.345.678/0001-90" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }))

    await waitFor(() => {
      expect(findCall(fetchMock.calls, "/api/crm/consulta-cnpj?cnpj=12345678000190")).toBeDefined()
      expect(screen.getByDisplayValue("Tecelagem Alpha Ltda")).toBeInTheDocument()
    })
    expect(screen.getByDisplayValue("Alpha Confecções")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Rua das Flores, 100, Centro")).toBeInTheDocument()
    expect(screen.getByDisplayValue("São Paulo")).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "SP - São Paulo" })).toBeInTheDocument()
    expect(screen.getByDisplayValue("Confecção de peças do vestuário")).toBeInTheDocument()
    expect(screen.getByDisplayValue("1199999999")).toBeInTheDocument()
    expect(screen.getByText(/Tecelagem Alpha Ltda/)).toBeInTheDocument()
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("Dados preenchidos automaticamente")
    )
  })

  it("mostra aviso quando o CNPJ consultado não é encontrado", async () => {
    renderPage(<NovoClientePage />)
    fireEvent.change(screen.getByPlaceholderText("00.000.000/0000-00"), {
      target: { value: "00.000.000/0000-00" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }))

    await waitFor(() =>
      expect(screen.getByText(/não encontrado na Receita Federal/)).toBeInTheDocument()
    )
    expect(toastMock.error).toHaveBeenCalledWith("CNPJ não encontrado na Receita Federal")
  })
})
