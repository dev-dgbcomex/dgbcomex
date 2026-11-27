// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { createFetchMock, renderPage, routeJson, toastMock } from "@/test/harness"
import type { ClienteSaudeLeads } from "@/lib/crm/leads-saude"
import { AnaliseIaPanel } from "./analise-ia-panel"

const linha = {
  id: 10,
  tipo: "cliente" as const,
  nome: "Cliente Alpha",
  documento: "12345678000190",
  segmento: "Têxtil",
  porte: "Médio",
  responsaveis: ["Maria"],
  statusVisitas: ["REALIZADA"],
  statusAcoes: ["REALIZADA"],
  statusOportunidades: ["PROPOSTA"],
  tiposVisita: ["PRESENCIAL"],
  tiposAcao: ["PRESENCIAL"],
  totalVisitas: 2,
  totalAcoes: 3,
  visitasRealizadas: 1,
  visitasAgendadas: 1,
  visitasCanceladas: 0,
  acoesRealizadas: 2,
  acoesAgendadas: 1,
  acoesCanceladas: 0,
  ultimaVisita: "2026-11-10",
  proximaVisita: "2026-12-15",
  ultimaAcao: "2026-11-11",
  proximaAcao: "2026-12-16",
  visitasComRelato: 1,
  visitasComCheckIn: 1,
  acoesComRelato: 2,
  acoesComCheckIn: 1,
  temContato: true,
  temProposta: true,
  temOportunidade: true,
  propostasNegociadas: 1,
  oportunidadesNegociadas: 1,
  valorEstimadoTotal: 100000,
  probabilidadeMedia: 50,
  statusOportunidadeDominante: "PROPOSTA",
  pedidosVenda: 1,
  valorPedidosVenda: 20000,
  faturamentos: 1,
  valorFaturamento: 15000,
  scoreEsforco: 100,
  scoreEngajamento: 90,
  visitas: [],
  acoes: [],
} as ClienteSaudeLeads

const analise = {
  id: 77,
  titulo: "Análise de saúde da prospecção",
  analise: "## Diagnóstico\n\nEngajados com temperatura QUENTE.",
  resumo: "Engajados com temperatura QUENTE.",
  situacao: "ABERTA",
  provedor: "groq",
  modelo: "teste",
  criadoPorNome: "Admin",
  createdAt: "2026-11-22T10:00:00.000Z",
  enviadaEm: null,
}

function mockFetch() {
  return createFetchMock(
    routeJson({
      "GET /api/crm/saude-prospeccao/ia/analises": { analises: [] },
      "POST /api/crm/saude-prospeccao/ia/analises": { analise },
      "POST /api/crm/saude-prospeccao/ia/analises/77/mensagens": {
        mensagens: [
          { id: 1, analiseId: 77, papel: "usuario", conteudo: "Como melhorar?", dadosUsados: {}, createdAt: "2026-11-22T10:01:00.000Z" },
          { id: 2, analiseId: 77, papel: "assistente", conteudo: "## Resposta\n\nAgende proposta.", dadosUsados: {}, createdAt: "2026-11-22T10:01:01.000Z" },
        ],
      },
      "POST /api/crm/saude-prospeccao/ia/analises/77/concluir": { enviado: true, destinatario: "admin@teste.com" },
      "POST /api/crm/saude-prospeccao/ia/analises/preview": {
        payload: {
          titulo: "Análise de saúde da prospecção — 23/11/2026, 10:00:00",
          linhas: [{ id: 10, nome: "Cliente Alpha" }],
          filtros: { busca: "Alpha" },
        },
        mensagens: [
          { role: "system", content: "REGRAS_SISTEMA" },
          { role: "user", content: "Dados dos registros filtrados na tela: ...\n\nFaça uma análise..." },
        ],
        chave: { id: 3, provedor: "openai_compatible", nome: "NVIDIA Nemotron", modelo: "Nemotron 3.5 Super VL 120B A12B" },
        enviadoChars: 123,
        estTokensAprox: 31,
        compactacao: { total: 1, incluidos: 1, omitidos: 0 },
        fatiamentoPrevisto: null,
      },
    })
  )
}

describe("AnaliseIaPanel", () => {
  beforeEach(() => {
    toastMock.success.mockClear()
    toastMock.error.mockClear()
  })

  it("gera análise com as linhas filtradas e permite conversar e concluir", async () => {
    const fetchMock = mockFetch()
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<AnaliseIaPanel linhas={[linha]} filtros={{ busca: "Alpha" }} />)

    fireEvent.click(screen.getByRole("button", { name: /Analisar com IA/ }))
    const dialog = await screen.findByRole("dialog")
    expect(dialog.className).toContain("h-[92dvh]")
    expect(dialog.className).toContain("w-[calc(100%-1rem)]")
    expect(dialog.className).toContain("sm:max-w-[96rem]")
    expect(dialog.className).toContain("sm:p-5")

    const salvas = within(dialog).getByRole("complementary", { name: "Análises salvas" })
    expect(salvas.className).toContain("max-h-32")
    expect(salvas.className).toContain("lg:max-h-none")
    expect(within(dialog).getByRole("region", { name: "Análise e conversa" })).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar análise" }))
    expect(await screen.findByText(/Engajados com temperatura QUENTE/)).toBeInTheDocument()
    expect(toastMock.success).toHaveBeenCalledWith("Análise gerada com as regras do sistema")

    const body =
      fetchMock.calls.find(
        (call) => call.url === "/api/crm/saude-prospeccao/ia/analises" && call.method === "POST"
      )?.body ?? {}
    expect(body.linhas).toHaveLength(1)
    expect(body.linhas[0].nome).toBe("Cliente Alpha")
    expect(body.filtros).toEqual({ busca: "Alpha" })

    fireEvent.change(screen.getByRole("textbox", { name: "Pergunta para a IA" }), {
      target: { value: "Como melhorar?" },
    })
    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar" }))
    expect(await screen.findByText(/Agende proposta/)).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole("button", { name: /Concluir e enviar/ }))
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Conversa enviada por e-mail"))
  })

  it("mostra a prévia do envio à IA sem chamar a rota de análise", async () => {
    const fetchMock = mockFetch()
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<AnaliseIaPanel linhas={[linha]} filtros={{ busca: "Alpha" }} />)

    fireEvent.click(screen.getByRole("button", { name: /Analisar com IA/ }))
    const dialog = await screen.findByRole("dialog")

    fireEvent.click(within(dialog).getByRole("button", { name: /Ver envio à IA/ }))

    const previewCall = fetchMock.calls.find(
      (call) => call.url === "/api/crm/saude-prospeccao/ia/analises/preview" && call.method === "POST"
    )
    expect(previewCall).toBeDefined()
    expect(previewCall?.body.linhas).toHaveLength(1)
    expect(previewCall?.body.filtros).toEqual({ busca: "Alpha" })

    const analiseCall = fetchMock.calls.find(
      (call) => call.url === "/api/crm/saude-prospeccao/ia/analises" && call.method === "POST"
    )
    expect(analiseCall).toBeUndefined()

    expect(await screen.findByText(/Cliente Alpha/)).toBeInTheDocument()
    expect(await screen.findByText(/NVIDIA Nemotron/)).toBeInTheDocument()
    expect(await screen.findByText(/mensagens/)).toBeInTheDocument()
    expect(await screen.findByText(/1\/1 registros/)).toBeInTheDocument()
    expect(await screen.findByText(/Ocultar prévia/)).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole("button", { name: /Ocultar prévia/ }))
    expect(screen.queryByText(/Cliente Alpha/)).not.toBeInTheDocument()
  })

  it("informa ao usuário quando a análise foi gerada em fatias", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "POST" && url === "/api/crm/saude-prospeccao/ia/analises") {
        return {
          json: {
            analise,
            fatiamento: { total: 200, fatias: 5, incluidos: 200, omitidos: 0 },
          },
        }
      }
      return { json: { analises: [] } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<AnaliseIaPanel linhas={[linha]} filtros={{ busca: "Alpha" }} />)

    fireEvent.click(screen.getByRole("button", { name: /Analisar com IA/ }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar análise" }))

    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith(
        "Análise gerada em 5 fatias, mantendo o contexto entre elas"
      )
    )
  })

  it("mostra o número de fatias na prévia do envio", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "POST" && url === "/api/crm/saude-prospeccao/ia/analises/preview") {
        return {
          json: {
            payload: { titulo: "Prévia", linhas: [], filtros: {} },
            mensagens: [],
            chave: null,
            enviadoChars: 10,
            estTokensAprox: 2,
            compactacao: null,
            fatiamentoPrevisto: { total: 200, fatias: 5 },
          },
        }
      }
      return { json: { analises: [] } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<AnaliseIaPanel linhas={[linha]} filtros={{ busca: "Alpha" }} />)

    fireEvent.click(screen.getByRole("button", { name: /Analisar com IA/ }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: /Ver envio à IA/ }))

    expect(await screen.findByText(/Processamento em 5 fatias/)).toBeInTheDocument()
  })

  it("mostra orientação quando a IA rejeita o payload por tamanho", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "POST" && url === "/api/crm/saude-prospeccao/ia/analises") {
        return {
          status: 413,
          json: {
            error: "Dados demais para a IA processar de uma vez",
            detalhe: "Reduza os filtros ou o número de registros e tente novamente.",
          },
        }
      }
      return { json: { analises: [] } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<AnaliseIaPanel linhas={[linha]} filtros={{ busca: "Alpha" }} />)

    fireEvent.click(screen.getByRole("button", { name: /Analisar com IA/ }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar análise" }))

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        expect.stringContaining("Reduza os filtros ou o número de registros")
      )
    )
  })
})
