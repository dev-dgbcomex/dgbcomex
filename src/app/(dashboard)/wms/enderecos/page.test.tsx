// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { createFetchMock, findCall, navMock, renderPage, toastMock } from "@/test/harness"
import EnderecosPage from "./page"

const enderecos = [
  {
    id: 1,
    codigo: "A-01-01",
    tipo: "PULMAO",
    zona: "Pulmão",
    rua: "01",
    predio: null,
    nivel: "01",
    apto: null,
    capacidade: "1500.00",
    ativo: true,
    observacoes: null,
  },
]

describe("WMS — endereços", () => {
  beforeEach(() => {
    navMock.reset()
    navMock.setPathname("/wms/enderecos")
    toastMock.success.mockClear()
  })

  it("lista os endereços cadastrados", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/wms/enderecos") return { json: enderecos }
      return { status: 404, json: {} }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<EnderecosPage />)

    expect(await screen.findByText("A-01-01")).toBeTruthy()
    expect(screen.getByText("PULMAO")).toBeTruthy()
    expect(screen.getByText("1500.00 m")).toBeTruthy()
  })

  it("cria um endereço e recarrega a lista", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/wms/enderecos") return { json: enderecos }
      if (method === "POST" && url === "/api/wms/enderecos") {
        return { status: 201, json: { ...enderecos[0], id: 2, codigo: "B-02-02" } }
      }
      return { status: 404, json: {} }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    const { container } = renderPage(<EnderecosPage />)
    await screen.findByText("A-01-01")

    fireEvent.click(screen.getByRole("button", { name: /Novo endereço/i }))
    const form = container.querySelector("form")!
    fireEvent.change(screen.getByLabelText(/Código/i), { target: { value: "B-02-02" } })
    fireEvent.submit(form)

    await waitFor(() => expect(toastMock.success).toHaveBeenCalled())
    const post = findCall(fetchMock.calls, "/api/wms/enderecos", "POST")
    expect(post?.body).toMatchObject({ codigo: "B-02-02", tipo: "PULMAO" })
  })

  it("exibe erro quando a API falha ao criar", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/wms/enderecos") return { json: [] }
      if (method === "POST" && url === "/api/wms/enderecos") {
        return { status: 400, json: { error: "Código do endereço é obrigatório" } }
      }
      return { status: 404, json: {} }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    const { container } = renderPage(<EnderecosPage />)
    await screen.findByText("Nenhum endereço cadastrado.")

    fireEvent.click(screen.getByRole("button", { name: /Novo endereço/i }))
    const codigo = screen.getByLabelText(/Código/i)
    fireEvent.change(codigo, { target: { value: "X" } })
    fireEvent.submit(container.querySelector("form")!)

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith("Código do endereço é obrigatório")
    )
  })
})
