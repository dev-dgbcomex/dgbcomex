// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { createFetchMock, navMock, renderPage } from "@/test/harness"
import SeparacoesPage from "./page"

const ordem = {
  id: 9,
  empresa: "13",
  pedido: "00005902",
  status: "EM_SEPARACAO",
  clienteCodigo: "1",
  clienteNome: "Cliente Teste",
  dataPedido: "2026-10-01",
  dataEntrega: "2026-10-20",
  observacao: null,
  motivoCancelamento: null,
  criadoPor: 1,
  iniciadoPor: 1,
  concluidoPor: null,
  canceladoPor: null,
  criadoEm: "2026-10-03T10:00:00Z",
  iniciadoEm: "2026-10-03T11:00:00Z",
  concluidoEm: null,
  canceladoEm: null,
  atualizadoEm: "2026-10-03T11:00:00Z",
  totalPecas: 2,
  totalMetros: 120.5,
  itensSeparados: 1,
  saldoMetros: 341.5,
  artigos: "BELGA",
}

const URL_LISTA = "/api/wms/separacoes?busca=&status=&limite=50&offset=0"
const URL_SITUACOES = "/api/wms/situacoes"

const situacoes = [
  { id: 1, codigo: "SEM_SEPARACAO", nome: "Sem separação", cor: "#94a3b8", ordem: 0, acao: "NENHUMA", perfis: [], ativo: true },
  { id: 2, codigo: "LIBERADO", nome: "Liberado", cor: "#f59e0b", ordem: 1, acao: "NENHUMA", perfis: [], ativo: true },
  { id: 3, codigo: "EM_SEPARACAO", nome: "Em separação", cor: "#2563eb", ordem: 2, acao: "CRIAR_ORDEM", perfis: [], ativo: true },
  { id: 4, codigo: "SEPARADO", nome: "Separado", cor: "#16a34a", ordem: 3, acao: "CONCLUIR_ORDEM", perfis: [], ativo: true },
  { id: 5, codigo: "CANCELADO", nome: "Cancelado", cor: "#ef4444", ordem: 4, acao: "CANCELAR_ORDEM", perfis: [], ativo: true },
]

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { role: "EXPEDICAO" } }, status: "authenticated" }),
}))

describe("WMS — ordens de separação", () => {
  beforeEach(() => {
    navMock.reset()
    navMock.setPathname("/wms/separacoes")
  })

  it("mostra as ordens no kanban por status", async () => {
    const fetchMock = createFetchMock(({ url }) =>
      url === URL_LISTA
        ? { json: { itens: [ordem], total: 1 } }
        : url === URL_SITUACOES
          ? { json: { itens: situacoes, total: situacoes.length } }
          : { status: 404, json: {} }
    )
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<SeparacoesPage />)

    expect(await screen.findByText("#9 · Pedido 00005902")).toBeTruthy()
    expect(screen.getByText("Cliente Teste")).toBeTruthy()
    expect(screen.getByText("2 pç")).toBeTruthy()
    expect(
      screen.getByText(
        (_, elemento) =>
          elemento?.tagName === "P" &&
          elemento.textContent?.trim() ===
            "120.5 m separados · saldo 341.5 m · Artigos: BELGA"
      )
    ).toBeTruthy()
  })

  it("mostra estado vazio quando não há ordens", async () => {
    const fetchMock = createFetchMock(({ url }) =>
      url === URL_LISTA
        ? { json: { itens: [], total: 0 } }
        : url === URL_SITUACOES
          ? { json: { itens: situacoes, total: situacoes.length } }
          : { status: 404, json: {} }
    )
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<SeparacoesPage />)

    expect(await screen.findByText("Nenhuma ordem de separação encontrada.")).toBeTruthy()
  })

  it("abre a ordem a partir do card do kanban", async () => {
    const fetchMock = createFetchMock(({ url }) =>
      url === URL_LISTA
        ? { json: { itens: [ordem], total: 1 } }
        : url === URL_SITUACOES
          ? { json: { itens: situacoes, total: situacoes.length } }
          : { status: 404, json: {} }
    )
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<SeparacoesPage />)

    const link = await screen.findByRole("link", { name: /#9 · Pedido 00005902/ })
    expect(link.getAttribute("href")).toBe("/wms/separacoes/9")
  })
})
