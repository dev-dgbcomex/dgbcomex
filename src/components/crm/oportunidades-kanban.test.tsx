// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import OportunidadesKanban from "./oportunidades-kanban"
import { invalidarCacheStatuses } from "@/hooks/use-statuses"
import { createFetchMock, renderPage } from "@/test/harness"

const statusNovos = [
  {
    id: 1,
    nome: "NOVO",
    rotulo: "Novo",
    tipo: "OPORTUNIDADE",
    cor: "#3b82f6",
    ordem: 1,
    ativo: true,
    exibirKanban: true,
  },
  {
    id: 2,
    nome: "PROSPECCAO",
    rotulo: "Prospecção",
    tipo: "OPORTUNIDADE",
    cor: "#8b5cf6",
    ordem: 2,
    ativo: true,
    exibirKanban: false,
  },
  {
    id: 3,
    nome: "DESATIVADO",
    rotulo: "Desativado",
    tipo: "OPORTUNIDADE",
    cor: "#94a3b8",
    ordem: 3,
    ativo: false,
    exibirKanban: true,
  },
]

describe("OportunidadesKanban", () => {
  beforeEach(() => {
    invalidarCacheStatuses()
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/admin/status?tipo=OPORTUNIDADE")
        return { json: statusNovos }
      return { json: null }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
  })

  it("mostra apenas status ativos com exibição no kanban habilitada", async () => {
    renderPage(<OportunidadesKanban oportunidades={[]} />)

    expect(await screen.findByText("Novo")).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText("Prospecção")).not.toBeInTheDocument())
    expect(screen.queryByText("Desativado")).not.toBeInTheDocument()
  })

  it("usa as colunas do fallback quando não há status cadastrados", async () => {
    invalidarCacheStatuses()
    const fetchMock = createFetchMock(() => ({ json: null }))
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<OportunidadesKanban oportunidades={[]} />)

    expect(await screen.findByText("Novo")).toBeInTheDocument()
    expect(screen.getByText("Qualificação")).toBeInTheDocument()
    expect(screen.getByText("Perdido")).toBeInTheDocument()
  })
})
