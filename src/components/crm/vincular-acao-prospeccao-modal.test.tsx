// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import VincularAcaoProspeccaoModal from "./vincular-acao-prospeccao-modal"
import { createFetchMock, findCall, renderPage } from "@/test/harness"

function setup() {
  const onClose = vi.fn()
  const onLinked = vi.fn()
  const fetchMock = createFetchMock(({ method, url }) => {
    if (method === "GET" && url === "/api/clientes") {
      return { status: 200, json: [{ id: 1, nome: "Cliente Alpha" }] }
    }
    if (method === "GET" && url === "/api/crm/leads") {
      return { status: 200, json: [{ id: 2, razaoSocial: "Pessoa Beta" }] }
    }
    if (method === "GET" && url === "/api/crm/estados") {
      return { status: 200, json: [] }
    }
    if (method === "PUT" && url === "/api/crm/acoes-prospeccao/8") {
      return { status: 200, json: { id: 8 } }
    }
    return { status: 404, json: { error: `Rota não mockada: ${method} ${url}` } }
  })
  vi.stubGlobal("fetch", fetchMock.fn)
  renderPage(
    <VincularAcaoProspeccaoModal acaoId={8} open onClose={onClose} onLinked={onLinked} />
  )
  return { onClose, onLinked, fetchMock }
}

describe("VincularAcaoProspeccaoModal", () => {
  it("vincula um cliente existente à ação avulsa", async () => {
    const { onClose, onLinked, fetchMock } = setup()

    fireEvent.click(screen.getByRole("button", { name: /Vincular a um cliente existente/ }))
    await screen.findByText("Cliente Alpha")
    fireEvent.change(screen.getByRole("combobox", { name: "Selecione o Cliente" }), {
      target: { value: "1" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Vincular" }))

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/acoes-prospeccao/8", "PUT")
      expect(call?.body).toMatchObject({ clienteId: 1, empresaId: null, nomeAvulso: null })
    })
    expect(onLinked).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it("vincula uma lead existente à ação avulsa", async () => {
    const { fetchMock } = setup()

    fireEvent.click(screen.getByRole("button", { name: /Vincular a uma lead/ }))
    await screen.findByText("Pessoa Beta")
    fireEvent.change(screen.getByRole("combobox", { name: "Selecione a Lead" }), {
      target: { value: "2" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Vincular" }))

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/acoes-prospeccao/8", "PUT")
      expect(call?.body).toMatchObject({ empresaId: 2, nomeAvulso: null })
      expect(call?.body).not.toHaveProperty("clienteId")
    })
  })
})
