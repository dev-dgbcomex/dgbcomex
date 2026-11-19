// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen } from "@testing-library/react"
import { createFetchMock, navMock, renderPage } from "@/test/harness"
import CRMKanbanStandalonePage from "./page"

vi.mock("@/components/crm/acoes-prospeccao-kanban", () => ({
  default: ({ acoes }: { acoes: unknown[] }) => <div data-testid="kanban-acoes">{acoes.length}</div>,
}))

class BroadcastChannelMock {
  onmessage: ((event: MessageEvent) => void) | null = null
  onmessageerror: ((event: MessageEvent) => void) | null = null
  postMessage() {}
  close() {}
}

describe("CRMKanbanStandalonePage — Ações de Prospecção", () => {
  beforeEach(() => {
    vi.stubGlobal("BroadcastChannel", BroadcastChannelMock)
    navMock.setSearchParams({ tipo: "ACAO_PROSPECCAO" })
  })

  it("carrega o kanban de ações de prospecção", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/crm/acoes-prospeccao?all=true") {
        return { json: [{ id: 1, status: "AGENDADA" }] }
      }
      return { json: [] }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<CRMKanbanStandalonePage />)

    expect(await screen.findByText("Kanban — Ações de Prospecção")).toBeInTheDocument()
    expect(await screen.findByTestId("kanban-acoes")).toHaveTextContent("1")
  })
})
