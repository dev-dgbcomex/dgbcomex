// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, waitFor, within } from "@testing-library/react"
import { CadastroStatus } from "./cadastro-status"
import { createFetchMock, findCall, renderPage, toastMock } from "@/test/harness"

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "1", role: "ADMIN" } } }),
}))

const statusOportunidade = {
  id: 1,
  nome: "FECHADO_GANHO",
  rotulo: "Ganho",
  tipo: "OPORTUNIDADE",
  cor: "#22c55e",
  ordem: 5,
  ativo: true,
  exibirKanban: true,
}

const statusProposta = {
  id: 2,
  nome: "ACEITA",
  rotulo: "Aceita",
  tipo: "PROPOSTA",
  cor: "#22c55e",
  ordem: 2,
  ativo: true,
  exibirKanban: true,
}

const statusAmostra = {
  id: 3,
  nome: "CANCELADO",
  rotulo: "",
  tipo: "AMOSTRA",
  cor: null,
  ordem: 2,
  ativo: false,
  exibirKanban: true,
}

const gatilhos = [
  {
    id: 10,
    statusId: 1,
    acao: "CRIAR_PEDIDO_VENDA",
    parametros: { observacao: "Pedido automático" },
    ativo: true,
  },
]

function handler() {
  return ({ method, url }: { method: string; url: string }) => {
    if (method === "GET" && url === "/api/admin/status?tipo=OPORTUNIDADE") {
      return { json: [statusOportunidade] }
    }
    if (method === "GET" && url === "/api/admin/status?tipo=PROPOSTA") {
      return { json: [statusProposta] }
    }
    if (method === "GET" && url === "/api/admin/status") {
      return { json: [statusOportunidade, statusProposta, statusAmostra] }
    }
    if (method === "POST" && url === "/api/admin/status") {
      return { status: 201, json: { ...statusOportunidade, id: 3, nome: "PENDENTE" } }
    }
    if (method === "DELETE" && url === "/api/admin/status") {
      return { json: { success: true } }
    }
    if (method === "GET" && url === "/api/admin/status/acoes?statusId=1") {
      return { json: gatilhos }
    }
    if (method === "POST" && url === "/api/admin/status/acoes") {
      return { status: 201, json: { id: 11, statusId: 1, acao: "VIRAR_CLIENTE" } }
    }
    if (method === "PUT" && url === "/api/admin/status/acoes") {
      return { json: { id: 10, statusId: 1, acao: "CRIAR_PEDIDO_VENDA", parametros: {} } }
    }
    return { json: null }
  }
}

describe("CadastroStatus", () => {
  let fetchMock: ReturnType<typeof createFetchMock>

  beforeEach(() => {
    fetchMock = createFetchMock(handler())
    vi.stubGlobal("fetch", fetchMock.fn)
  })

  it("lista os status filtrados pelo tipo informado", async () => {
    renderPage(<CadastroStatus tipoInicial="OPORTUNIDADE" />)

    expect(await screen.findByText("FECHADO_GANHO")).toBeInTheDocument()
    expect(screen.getByText("Ganho")).toBeInTheDocument()
    expect(findCall(fetchMock.calls, "/api/admin/status?tipo=OPORTUNIDADE")).toBeDefined()
  })

  it("mostra tipo, cor e a flag de kanban apenas nos tipos com quadro", async () => {
    renderPage(<CadastroStatus />)

    expect(await screen.findByText("FECHADO_GANHO")).toBeInTheDocument()
    const rowOportunidade = screen.getByText("FECHADO_GANHO").closest("tr")!
    expect(within(rowOportunidade).getByText("Oportunidade")).toBeInTheDocument()
    expect(within(rowOportunidade).getByText("#22c55e")).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Kanban" })).toBeInTheDocument()

    const rowProposta = screen.getByText("ACEITA").closest("tr")!
    expect(within(rowProposta).getByLabelText("Exibe no Kanban")).toBeInTheDocument()

    const rowAmostra = screen.getByText("CANCELADO").closest("tr")!
    expect(within(rowAmostra).queryByLabelText("Exibe no Kanban")).not.toBeInTheDocument()
    expect(within(rowAmostra).getByLabelText("Inativo")).toBeInTheDocument()
  })

  it("mostra estado vazio quando não há status", async () => {
    const emptyMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/admin/status") return { json: [] }
      return { status: 404, json: { error: "Rota não mockada" } }
    })
    vi.stubGlobal("fetch", emptyMock.fn)

    renderPage(<CadastroStatus />)

    expect(await screen.findByText("Nenhum status encontrado")).toBeInTheDocument()
  })

  it("exclui o status após a confirmação", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    renderPage(<CadastroStatus />)

    await screen.findByText("FECHADO_GANHO")
    fireEvent.click(screen.getByRole("button", { name: "Excluir status Ganho" }))

    expect(confirmSpy).toHaveBeenCalledWith("Tem certeza que deseja excluir este status?")
    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/admin/status", "DELETE")
      expect(call).toBeDefined()
      expect(call!.body).toEqual({ id: 1 })
    })
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Status excluído"))
    confirmSpy.mockRestore()
  })

  it("cria um status com o flag de kanban desmarcado", async () => {
    renderPage(<CadastroStatus tipoInicial="OPORTUNIDADE" />)

    await screen.findByText("FECHADO_GANHO")
    fireEvent.click(screen.getByRole("button", { name: /Novo Status/ }))

    fireEvent.change(screen.getByPlaceholderText("EX: PENDENTE"), {
      target: { value: "PENDENTE" },
    })
    fireEvent.change(screen.getByPlaceholderText("Ex: Pendente"), {
      target: { value: "Pendente" },
    })
    fireEvent.click(screen.getByRole("checkbox", { name: /Exibir no Kanban/ }))
    fireEvent.click(screen.getByRole("button", { name: "Criar" }))

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/admin/status", "POST")
      expect(call).toBeDefined()
      expect(call!.body).toMatchObject({
        nome: "PENDENTE",
        rotulo: "Pendente",
        tipo: "OPORTUNIDADE",
        exibirKanban: false,
      })
    })
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Status criado"))
  })

  it("cadastra um gatilho para o status selecionado", async () => {
    renderPage(<CadastroStatus tipoInicial="OPORTUNIDADE" />)

    await screen.findByText("FECHADO_GANHO")
    fireEvent.click(screen.getByRole("button", { name: "Gatilhos do status Ganho" }))

    const dialog = await screen.findByRole("dialog", { name: "Gatilhos do status" })
    expect(
      within(dialog).getByText("Cria um pedido de venda em aberto a partir da oportunidade.")
    ).toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText("Adicionar gatilho"), {
      target: { value: "VIRAR_CLIENTE" },
    })
    fireEvent.click(within(dialog).getByRole("button", { name: "Adicionar" }))

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/admin/status/acoes", "POST")
      expect(call).toBeDefined()
      expect(call!.body).toMatchObject({ statusId: 1, acao: "VIRAR_CLIENTE" })
    })
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Gatilho adicionado"))
  })
})
