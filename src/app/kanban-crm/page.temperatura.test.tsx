// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen } from "@testing-library/react"
import { navMock, renderPage } from "@/test/harness"
import CRMKanbanStandalonePage from "./page"

vi.mock("@/app/(dashboard)/comercial/crm/temperatura/kanban/page", () => ({
  default: () => <div data-testid="kanban-temperatura" />,
}))

class BroadcastChannelMock {
  onmessage: ((event: MessageEvent) => void) | null = null
  onmessageerror: ((event: MessageEvent) => void) | null = null
  postMessage() {}
  close() {}
}

describe("CRMKanbanStandalonePage — Temperatura", () => {
  beforeEach(() => {
    vi.stubGlobal("BroadcastChannel", BroadcastChannelMock)
    navMock.setSearchParams({ tipo: "TEMPERATURA" })
  })

  it("renderiza o kanban de temperatura na janela separada", async () => {
    renderPage(<CRMKanbanStandalonePage />)

    expect(await screen.findByText("Kanban — Temperatura")).toBeInTheDocument()
    expect(screen.getByTestId("kanban-temperatura")).toBeInTheDocument()
  })
})
