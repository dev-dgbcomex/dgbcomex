// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { createFetchMock, findCall, renderPage, toastMock } from "@/test/harness"
import { TimelineIaChat } from "./timeline-ia-chat"

describe("TimelineIaChat", () => {
  let fetchMock: ReturnType<typeof createFetchMock>

  beforeEach(() => {
    fetchMock = createFetchMock(({ method, url, body }) => {
      if (method === "POST" && url === "/api/crm/ia/timeline-chat") {
        return {
          json: { resposta: body?.mensagens?.length ? "Resposta da IA" : "Análise gerada" },
        }
      }
      return { status: 404, json: { error: "Rota não mockada" } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
  })

  it("gera a análise da timeline", async () => {
    renderPage(<TimelineIaChat tipo="cliente" id="7" />)

    fireEvent.click(screen.getByRole("button", { name: "Gerar análise" }))

    expect(await screen.findByText("Análise gerada")).toBeInTheDocument()
    expect(findCall(fetchMock.calls, "/api/crm/ia/timeline-chat", "POST")!.body).toEqual({
      tipo: "cliente",
      id: "7",
      mensagens: [],
    })
  })

  it("envia perguntas mantendo o histórico da conversa", async () => {
    renderPage(<TimelineIaChat tipo="lead" id="3" />)

    const input = screen.getByLabelText("Perguntar sobre a timeline")
    fireEvent.change(input, { target: { value: "Primeira pergunta" } })
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }))

    expect(await screen.findByText("Primeira pergunta")).toBeInTheDocument()
    expect(await screen.findByText("Resposta da IA")).toBeInTheDocument()

    fireEvent.change(input, { target: { value: "Segunda pergunta" } })
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }))

    await waitFor(() => {
      const chamadas = fetchMock.calls.filter(
        (chamada) => chamada.url === "/api/crm/ia/timeline-chat" && chamada.method === "POST"
      )
      expect(chamadas).toHaveLength(2)
      expect(chamadas[1]!.body).toEqual({
        tipo: "lead",
        id: "3",
        mensagens: [
          { papel: "usuario", texto: "Primeira pergunta" },
          { papel: "ia", texto: "Resposta da IA" },
          { papel: "usuario", texto: "Segunda pergunta" },
        ],
      })
    })
  })

  it("mostra erro quando a API falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "falha" }), { status: 500 }))
    )

    renderPage(<TimelineIaChat tipo="cliente" id="7" />)
    fireEvent.click(screen.getByRole("button", { name: "Gerar análise" }))

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith("Erro ao gerar análise da timeline")
    )
  })
})
