// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { createFetchMock, renderPage } from "@/test/harness"
import { FaturamentoCharts } from "./faturamento-charts"
import { topPorFaturamento, topPorProduto } from "./utils"
import type { GrupoFaturamento } from "./types"

const CHAVE_CACHE = "faturamento_graficos_ordem"
const ROTA = "/api/integracao/ordem-graficos"

function grupo(over: Partial<GrupoFaturamento> = {}): GrupoFaturamento {
  return {
    chave_nf: "1|1",
    empresa: "1",
    nr_nota: "1",
    cliente: "C1",
    nome_cliente: "Cliente A",
    representante: "Ana",
    representante_codigo: "7",
    data_nota: "2026-01-10",
    romaneio: "ROM-1",
    vr_nota: 100,
    itens: [
      {
        empresa: "1",
        pedido: "P1",
        item: 1,
        nr_nota: "1",
        data_nota: "2026-01-10",
        cliente: "C1",
        nome_cliente: "Cliente A",
        cod_produto: "PRD-A",
        metros: 10,
        vr_unitario: 10,
        vr_total: 100,
        acres_desc: 0,
        peso: 2,
        vr_nota: 100,
        romaneio: "ROM-1",
        representante_codigo: "7",
        representante: "Ana",
      },
    ],
    totalItens: 1,
    totalMetros: 10,
    totalPeso: 2,
    totalVrTotal: 100,
    totalAcresDesc: 0,
    faturamento: 100,
    ...over,
  }
}

const GRUPOS = [
  grupo({ chave_nf: "1|1", nr_nota: "1", nome_cliente: "Cliente A", data_nota: "2026-01-10", faturamento: 100, totalVrTotal: 100 }),
  grupo({ chave_nf: "1|2", nr_nota: "2", nome_cliente: "Cliente B", data_nota: "2026-02-10", faturamento: 300, totalVrTotal: 300 }),
  grupo({
    chave_nf: "1|3",
    nr_nota: "3",
    nome_cliente: "Cliente C",
    data_nota: "2026-03-10",
    faturamento: 300,
    totalVrTotal: 300,
    representante: "Bruno",
  }),
]

const TITULO_MES = "Faturamento e metragem por mês"
const TITULO_CLIENTES = "Faturamento e metragem por cliente (top 8)"
const TITULO_PRODUTOS = "Faturamento e metragem por produto (top 8)"
const TITULO_PARTICIPACAO = "Participação por representante"

function titulosOrdem(): string[] {
  return screen
    .getAllByRole("heading", { level: 3 })
    .map((h) => h.textContent ?? "")
}

/** API da ordem: por padrão responde lista vazia (usuário sem preferência salva). */
function mockOrdem(ids: string[] = [], status = 200) {
  const fetchMock = createFetchMock(({ url }) => {
    if (url === ROTA) return { status, json: { ids } }
    return { json: null }
  })
  vi.stubGlobal("fetch", fetchMock.fn)
  return fetchMock
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockOrdem()
})

describe("gráficos do faturamento", () => {
  it("mostra os 5 KPIs e os 4 gráficos", () => {
    renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={400}
        totalItens={2}
        totalNotas={2}
        totalMetros={20}
        totalPeso={4}
      />
    )

    expect(screen.getByText("Faturamento")).toBeTruthy()
    expect(screen.getByText("Ticket médio")).toBeTruthy()
    expect(titulosOrdem()).toEqual([
      "Faturamento e metragem por mês",
      "Faturamento e metragem por cliente (top 8)",
      "Faturamento e metragem por produto (top 8)",
      "Participação por representante",
    ])
  })

  it("dá legenda à pizza com cor, representante e percentual", () => {
    renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={700}
        totalItens={3}
        totalNotas={3}
        totalMetros={30}
        totalPeso={6}
      />
    )

    const legenda = screen.getByRole("list", { name: /participação por representante/i })
    // A legenda lista os representantes com a fatia de cada um em %.
    expect(within(legenda).getByText("Ana")).toBeTruthy()
    expect(within(legenda).getByText("Bruno")).toBeTruthy()
    expect(within(legenda).getByText("42.9%")).toBeTruthy()
  })

  it("não lista produto na legenda — a pizza é por representante", () => {
    renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={700}
        totalItens={3}
        totalNotas={3}
        totalMetros={30}
        totalPeso={6}
      />
    )

    const legenda = screen.getByRole("list", { name: /participação por representante/i })
    expect(within(legenda).queryByText("PRD-A")).toBeNull()
  })

  it("reordena os gráficos pelas setas do teclado", () => {
    renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={400}
        totalItens={2}
        totalNotas={2}
        totalMetros={20}
        totalPeso={4}
      />
    )

    const antes = titulosOrdem()
    fireEvent.click(screen.getByRole("button", { name: "Mover Participação por representante para cima" }))

    const depois = titulosOrdem()
    expect(depois).not.toEqual(antes)
    expect(depois[2]).toBe("Participação por representante")
  })

  it("persiste a ordem escolhida no servidor, não só no navegador", async () => {
    const fetchMock = mockOrdem()
    renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={400}
        totalItens={2}
        totalNotas={2}
        totalMetros={20}
        totalPeso={4}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Mover Participação por representante para cima" }))

    await waitFor(() => {
      const put = fetchMock.calls.find((c) => c.method === "PUT")
      expect(put).toBeTruthy()
      expect(put?.url).toBe(ROTA)
      expect(put?.body).toEqual({ ids: ["mes", "clientes", "participacao", "produtos"] })
    })
  })

  it("usa a ordem salva no servidor quando existe", async () => {
    mockOrdem(["produtos", "mes"])
    localStorage.setItem(CHAVE_CACHE, JSON.stringify(["participacao", "clientes"]))

    renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={400}
        totalItens={2}
        totalNotas={2}
        totalMetros={20}
        totalPeso={4}
      />
    )

    // O servidor manda: o cache local diferente é ignorado.
    await waitFor(() => expect(titulosOrdem()[0]).toBe("Faturamento e metragem por produto (top 8)"))
    expect(titulosOrdem()).toEqual([
      "Faturamento e metragem por produto (top 8)",
      "Faturamento e metragem por mês",
      "Faturamento e metragem por cliente (top 8)",
      "Participação por representante",
    ])
  })

  it("cai no cache local quando a API falha, sem quebrar a tela", async () => {
    mockOrdem([], 500)
    localStorage.setItem(CHAVE_CACHE, JSON.stringify(["participacao", "produtos"]))

    renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={400}
        totalItens={2}
        totalNotas={2}
        totalMetros={20}
        totalPeso={4}
      />
    )

    await waitFor(() => expect(titulosOrdem()[0]).toBe("Participação por representante"))
  })

  it("descarta cache local corrompido e mantém a ordem padrão", async () => {
    mockOrdem([], 500)
    localStorage.setItem(CHAVE_CACHE, "isto não é json")

    renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={400}
        totalItens={2}
        totalNotas={2}
        totalMetros={20}
        totalPeso={4}
      />
    )

    await waitFor(() => expect(titulosOrdem()[0]).toBe("Faturamento e metragem por mês"))
    expect(localStorage.getItem(CHAVE_CACHE)).toBeNull()
  })

  it("ignora ids desconhecidos numa preferência antiga", async () => {
    mockOrdem(["produtos", "grafico-removido"])
    renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={400}
        totalItens={2}
        totalNotas={2}
        totalMetros={20}
        totalPeso={4}
      />
    )

    await waitFor(() => expect(titulosOrdem()[0]).toBe("Faturamento e metragem por produto (top 8)"))
    // Os que faltavam entram no fim, sem buraco na grade.
    expect(titulosOrdem()).toHaveLength(4)
  })

  it("não renderiza os gráficos quando não há notas", () => {
    renderPage(
      <FaturamentoCharts
        grupos={[]}
        faturamentoTotal={0}
        totalItens={0}
        totalNotas={0}
        totalMetros={0}
        totalPeso={0}
      />
    )

    expect(screen.getByText("Ticket médio")).toBeTruthy()
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull()
  })

  it("oferece handle de arraste em todos os gráficos", () => {
    renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={400}
        totalItens={2}
        totalNotas={2}
        totalMetros={20}
        totalPeso={4}
      />
    )

    const alvos = [
      "Faturamento e metragem por mês",
      "Faturamento e metragem por cliente (top 8)",
      "Faturamento e metragem por produto (top 8)",
      "Participação por representante",
    ]
    for (const titulo of alvos) {
      expect(screen.getByLabelText(`Arrastar ${titulo} para reordenar`)).toBeTruthy()
    }
  })

  it("não deixa mover o primeiro para cima nem o último para baixo", () => {
    renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={400}
        totalItens={2}
        totalNotas={2}
        totalMetros={20}
        totalPeso={4}
      />
    )

    expect(screen.getByRole("button", { name: `Mover ${TITULO_MES} para cima` })).toHaveProperty("disabled", true)
    expect(
      screen.getByRole("button", { name: `Mover ${TITULO_PARTICIPACAO} para baixo` })
    ).toHaveProperty("disabled", true)
  })

  it("mantém os quatro cards com a mesma altura", () => {
    renderPage(
      <FaturamentoCharts
        grupos={GRUPOS}
        faturamentoTotal={700}
        totalItens={3}
        totalNotas={3}
        totalMetros={30}
        totalPeso={6}
      />
    )

    // `auto-rows-fr` + `h-full` fazem o card esticar até a altura do vizinho mais alto.
    const grade = screen.getByRole("heading", { level: 3, name: TITULO_MES }).closest("div.grid")
    expect(grade?.className).toContain("auto-rows-fr")

    for (const titulo of [TITULO_MES, TITULO_CLIENTES, TITULO_PRODUTOS, TITULO_PARTICIPACAO]) {
      const card = screen.getByRole("heading", { level: 3, name: titulo }).closest("div.rounded-xl")
      expect(card?.className).toContain("h-full")
      // O corpo do gráfico precisa poder crescer, senão a pizza com legenda desalinha.
      const corpo = card?.querySelector(".min-h-0.flex-1")
      expect(corpo).toBeTruthy()
      // E precisa de altura mínima: `height="100%"` num pai sem altura intrínseca
      // colapsa para zero e o gráfico fica pequeno.
      expect(corpo?.className).toContain("min-h-[260px]")
    }
  })

  it("soma faturamento e metragem nos gráficos de cliente e produto", () => {
    // Extraído para `utils` justamente para ser testável: no jsdom o recharts não
    // desenha as barras (sem dimensões), então o DOM não serve para checar os dados.
    const porCliente = topPorFaturamento(
      (grupo) => ({ chave: grupo.nome_cliente, rotulo: grupo.nome_cliente }),
      GRUPOS
    )
    expect(porCliente.map((s) => s.rotulo)).toEqual(["Cliente B", "Cliente C", "Cliente A"])
    expect(porCliente[0]).toMatchObject({ faturamento: 300, metros: 10 })

    const porProduto = topPorProduto(GRUPOS)
    // Todos os grupos do teste usam o mesmo produto, então as séries somam. O valor
    // por produto sai do item (vr_total + acres_desc), não do total da nota.
    expect(porProduto).toHaveLength(1)
    expect(porProduto[0]).toMatchObject({ produto: "PRD-A", faturamento: 300, metros: 30 })
  })

  it("limita em 8 e ordena por faturamento", () => {
    const muitos = Array.from({ length: 12 }, (_, i) =>
      grupo({
        chave_nf: `1|${i}`,
        nr_nota: String(i),
        nome_cliente: `C${i}`,
        faturamento: (i + 1) * 10,
      })
    )
    const serie = topPorFaturamento(
      (grupo) => ({ chave: grupo.nome_cliente, rotulo: grupo.nome_cliente }),
      muitos
    )
    expect(serie).toHaveLength(8)
    expect(serie[0].faturamento).toBe(120)
    expect(serie[7].faturamento).toBe(50)
  })
})