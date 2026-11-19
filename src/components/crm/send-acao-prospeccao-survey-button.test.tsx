// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { createFetchMock, findCall, renderPage, toastMock } from "@/test/harness"
import SendAcaoProspeccaoSurveyButton from "./send-acao-prospeccao-survey-button"

describe("SendAcaoProspeccaoSurveyButton", () => {
  beforeEach(() => {
    toastMock.success.mockClear()
    toastMock.error.mockClear()
  })

  it("abre o modal com os dados do contato e envia a pesquisa", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "POST" && url === "/api/crm/acoes-prospeccao/4/pesquisa") {
        return { status: 200, json: { success: true } }
      }
      return { status: 404, json: { error: `Rota não mockada: ${method} ${url}` } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(
      <SendAcaoProspeccaoSurveyButton
        acaoId={4}
        empresaNome="Tecelagem Alfa"
        contatoEmail="carlos@example.com"
        contatoNome="Carlos"
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Enviar Pesquisa" }))
    const dialog = await screen.findByRole("dialog", { name: "Enviar Pesquisa de Satisfação" })

    expect(screen.getByLabelText("E-mail do destinatário *")).toHaveValue("carlos@example.com")
    expect(screen.getByLabelText("Nome (opcional)")).toHaveValue("Carlos")

    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar Pesquisa" }))

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/acoes-prospeccao/4/pesquisa", "POST")
      expect(call?.body).toMatchObject({ email: "carlos@example.com", nome: "Carlos" })
      expect(toastMock.success).toHaveBeenCalledWith("Pesquisa enviada com sucesso!")
    })
  })
})
