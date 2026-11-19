// @vitest-environment jsdom
import type { ReactNode } from "react"
import { describe, it, expect, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { createFetchMock, findCall, renderPage } from "@/test/harness"
import AcoesProspeccaoKanban from "./acoes-prospeccao-kanban"

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DragOverlay: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({ setNodeRef: () => {}, isOver: false }),
  PointerSensor: class {},
  TouchSensor: class {},
  useSensor: () => ({}),
  useSensors: () => [],
}))

vi.mock("@/hooks/use-statuses", () => ({
  useStatuses: () => ({
    statuses: [
      {
        id: 1,
        nome: "AGENDADA",
        rotulo: "Agendada",
        tipo: "ACAO_PROSPECCAO",
        cor: "#2563eb",
        ordem: 1,
        ativo: true,
        exibirKanban: true,
      },
      {
        id: 2,
        nome: "REALIZADA",
        rotulo: "Realizada",
        tipo: "ACAO_PROSPECCAO",
        cor: "#16a34a",
        ordem: 2,
        ativo: true,
        exibirKanban: true,
      },
    ],
    loading: false,
    getLabel: (nome: string) => nome,
  }),
}))

const acoes = [
  {
    id: 12,
    dataAcao: "2026-11-20",
    hora: "10:00",
    tipo: "PRESENCIAL",
    status: "AGENDADA",
    empresaNome: "Tecelagem Alfa",
    clienteNome: null,
    nomeAvulso: null,
    empresaId: 3,
    clienteId: null,
    oportunidadeTitulo: null,
    criadoPorNome: "João",
    endereco: "Rua A, 10",
    numero: "10",
    complemento: null,
    bairro: "Centro",
    cidade: "São Paulo",
    uf: "SP",
  },
]

describe("AcoesProspeccaoKanban", () => {
  it("altera o status da ação por teclado/select", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "PUT" && url === "/api/crm/acoes-prospeccao/12") {
        return { status: 200, json: { id: 12, status: "REALIZADA" } }
      }
      return { status: 404, json: { error: `Rota não mockada: ${method} ${url}` } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<AcoesProspeccaoKanban acoes={acoes} />)

    expect(screen.getByText("Tecelagem Alfa")).toBeInTheDocument()
    fireEvent.change(
      screen.getByRole("combobox", { name: "Alterar status de Tecelagem Alfa" }),
      { target: { value: "REALIZADA" } }
    )

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/acoes-prospeccao/12", "PUT")
      expect(call?.body).toMatchObject({ status: "REALIZADA" })
    })
  })

  it("mostra as ações agrupadas por status", () => {
    const fetchMock = createFetchMock(() => ({ status: 200, json: [] }))
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<AcoesProspeccaoKanban acoes={acoes} />)

    expect(screen.getAllByText("Agendada")[0]).toBeInTheDocument()
    expect(screen.getAllByText("Realizada")[0]).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Gerenciar localizações" })).toBeInTheDocument()
  })
})
