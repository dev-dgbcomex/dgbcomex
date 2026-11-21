// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest"
import { screen, fireEvent, waitFor } from "@testing-library/react"
import BuscarCnpjModal from "./buscar-cnpj-modal"
import { createFetchMock, findCall, renderPage, toastMock } from "@/test/harness"

const apiData = {
  cnpj: "12345678000190",
  razao_social: "Tecelagem Alpha Ltda",
  nome_fantasia: "Alpha Confecções",
  situacao_cadastral: "Ativa",
  cnae_principal_descricao: "Confecção de peças do vestuário",
  logradouro: "Rua das Flores",
  numero: "100",
  bairro: "Centro",
  municipio: "São Paulo",
  uf: "SP",
  telefones: [{ ddd: "11", numero: "99999999" }],
}

const consultaUrl = "/api/crm/consulta-cnpj?cnpj=12345678000190"

describe("BuscarCnpjModal - cliente", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("exige 14 dígitos antes de consultar", async () => {
    const fetchMock = createFetchMock(() => ({ json: null }))
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<BuscarCnpjModal tipo="cliente" onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText("CNPJ"), { target: { value: "123" } })
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }))

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("CNPJ deve ter 14 dígitos"))
    expect(fetchMock.calls).toHaveLength(0)
  })

  it("consulta o CNPJ e mostra cliente existente com link para a ficha", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === consultaUrl) {
        return {
          json: {
            apiData,
            clientes: [
              { id: 7, nome: "Alpha Confecções", razaoSocial: "Tecelagem Alpha Ltda" },
            ],
            crmPessoas: [],
            representantes: [],
          },
        }
      }
      return { json: null }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<BuscarCnpjModal tipo="cliente" onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText("CNPJ"), {
      target: { value: "12.345.678/0001-90" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }))

    const link = await screen.findByRole("link", { name: /Tecelagem Alpha Ltda/ })
    expect(link).toHaveAttribute("href", "/comercial/clientes/7")
    expect(screen.getByText(/Cliente\(s\) já cadastrado\(s\)/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Criar Cliente/ })).not.toBeInTheDocument()
  })

  it("cria cliente via POST com os dados da Receita Federal", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === consultaUrl) {
        return { json: { apiData, clientes: [], crmPessoas: [], representantes: [] } }
      }
      if (method === "POST" && url === "/api/clientes") return { json: { id: 12 } }
      return { json: null }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    const onCreated = vi.fn()
    const onClose = vi.fn()
    renderPage(<BuscarCnpjModal tipo="cliente" onClose={onClose} onCreated={onCreated} />)

    fireEvent.change(screen.getByLabelText("CNPJ"), {
      target: { value: "12345678000190" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }))
    fireEvent.click(await screen.findByRole("button", { name: "Criar Cliente" }))

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/clientes", "POST")
      expect(call).toBeDefined()
      expect(call!.body).toEqual({
        nome: "Alpha Confecções",
        cnpj: "12.345.678/0001-90",
        razaoSocial: "Tecelagem Alpha Ltda",
        segmento: "Confecção de peças do vestuário",
        endereco: "Rua das Flores, 100, Centro",
        cidade: "São Paulo",
        uf: "SP",
        telefone: "1199999999",
      })
    })
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith('Cliente "Alpha Confecções" criado com sucesso')
    )
    expect(onCreated).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})
