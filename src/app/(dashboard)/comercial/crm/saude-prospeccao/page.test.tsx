// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { createFetchMock, findCall, navMock, renderPage, routeJson } from "@/test/harness"
import type { ClienteSaude as ClienteSaudeAcoes } from "@/lib/crm/acoes-prospeccao-saude"
import type { ClienteSaude as ClienteSaudeVisitas } from "@/lib/crm/visitas-saude"
import SaudeProspeccaoPage from "./page"

vi.setConfig({ testTimeout: 30000 })

const { exportCSV, exportMarkdown, exportPDFRelatorio } = vi.hoisted(() => ({
  exportCSV: vi.fn(),
  exportMarkdown: vi.fn(),
  exportPDFRelatorio: vi.fn(),
}))

vi.mock("@/lib/export-utils", () => ({ exportCSV, exportMarkdown, exportPDFRelatorio }))

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { name: "Admin", role: "ADMIN" } }, status: "authenticated" }),
}))

const comum = {
  id: 10,
  tipo: "cliente" as const,
  nome: "Cliente Alpha",
  documento: "12345678000190",
  segmento: "Têxtil",
  porte: "Médio",
  responsaveis: ["Maria"],
  statusOportunidades: ["NEGOCIADA"],
  totalOportunidades: 2,
  statusOportunidadeDominante: "NEGOCIADA",
  temContato: true,
  temProposta: true,
  temOportunidade: true,
  propostasNegociadas: 1,
  oportunidadesNegociadas: 1,
  valorEstimadoTotal: 125000,
  probabilidadeMedia: 60,
  pedidosVenda: 1,
  valorPedidosVenda: 30000,
  faturamentos: 1,
  valorFaturamento: 20000,
  scoreEsforco: 100,
  scoreEngajamento: 90,
}

const linhaVisitas: ClienteSaudeVisitas = {
  ...comum,
  statusVisitas: ["REALIZADA"],
  tiposVisita: ["PRESENCIAL"],
  totalVisitas: 3,
  visitasRealizadas: 2,
  visitasAgendadas: 1,
  visitasCanceladas: 0,
  ultimaVisita: "2026-11-10",
  proximaVisita: "2026-12-15",
  visitasComRelato: 2,
  visitasComCheckIn: 1,
  visitas: [
    {
      id: 11,
      dataVisita: "2026-11-10",
      hora: "10:00",
      tipo: "PRESENCIAL",
      status: "REALIZADA",
      relato: "Ata assinada com o cliente",
      checkInTime: null,
      checkOutTime: null,
      empresaNome: "Cliente Alpha",
      clienteNome: null,
      nomeAvulso: null,
      oportunidadeId: null,
      oportunidadeTitulo: null,
      oportunidadeStatus: null,
      oportunidadeValor: 0,
      oportunidadeProbabilidade: 0,
      propostaId: null,
      propostaTitulo: null,
      propostaStatus: null,
      contatoId: null,
      contatoNome: null,
      criadoPorNome: "Maria",
      enderecoTexto: null,
    },
  ],
}

const linhaAcoes: ClienteSaudeAcoes = {
  ...comum,
  statusAcoes: ["REALIZADA"],
  tiposAcao: ["PRESENCIAL"],
  totalAcoes: 4,
  acoesRealizadas: 3,
  acoesAgendadas: 1,
  acoesCanceladas: 0,
  ultimaAcao: "2026-11-11",
  proximaAcao: "2026-12-16",
  acoesComRelato: 3,
  acoesComCheckIn: 2,
  acoes: [
    {
      id: 12,
      dataAcao: "2026-11-11",
      hora: "11:00",
      tipo: "PRESENCIAL",
      status: "REALIZADA",
      relato: "Contato realizado",
      checkInTime: null,
      checkOutTime: null,
      empresaNome: "Cliente Alpha",
      clienteNome: null,
      nomeAvulso: null,
      oportunidadeId: null,
      oportunidadeTitulo: null,
      oportunidadeStatus: null,
      oportunidadeValor: 0,
      oportunidadeProbabilidade: 0,
      propostaId: null,
      propostaTitulo: null,
      propostaStatus: null,
      contatoId: null,
      contatoNome: null,
      criadoPorNome: "Maria",
      enderecoTexto: null,
    },
  ],
}

function mockRotas(visitas: unknown = [linhaVisitas], acoes: unknown = [linhaAcoes]) {
  return createFetchMock(
    routeJson({
      "GET /api/crm/visitas/dashboard/clientes": visitas,
      "GET /api/crm/visitas/dashboard/clientes?mine=true": visitas,
      "GET /api/crm/acoes-prospeccao/dashboard/clientes": acoes,
      "GET /api/crm/acoes-prospeccao/dashboard/clientes?mine=true": acoes,
    })
  )
}

describe("SaudeProspeccaoPage", () => {
  beforeEach(() => {
    navMock.setPathname("/comercial/crm/saude-prospeccao")
  })

  it("renderiza visitas e ações lado a lado na mesma linha", async () => {
    const fetchMock = mockRotas()
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<SaudeProspeccaoPage />)

    expect(screen.getByRole("heading", { name: /Saúde da Prospecção/ })).toBeInTheDocument()
    expect(await screen.findByText(/Visitas e ações lado a lado/i)).toBeInTheDocument()
    expect(await screen.findByRole("columnheader", { name: "Visitas R/A/C" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Ações R/A/C" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Última ação" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Próxima ação" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "STATUS OPORT." })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "VALOR OPORT." })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "PROB. OPORT." })).toBeInTheDocument()
    expect(
      screen.getByRole("button", {
        name: /Visitas R\/A\/C de Cliente Alpha: 2\/1\/0\. Ver lista/i,
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", {
        name: /Ações R\/A\/C de Cliente Alpha: 3\/1\/0\. Ver lista/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Analisar com IA/ })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Listar Leads/ })).toHaveAttribute(
      "href",
      "/comercial/crm/leads"
    )
    expect(findCall(fetchMock.calls, "/api/crm/visitas/dashboard/clientes")).toBeDefined()
    expect(findCall(fetchMock.calls, "/api/crm/acoes-prospeccao/dashboard/clientes")).toBeDefined()
  })

  it("exibe comercial e financeira no modal de conversão", async () => {
    const fetchMock = mockRotas()
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<SaudeProspeccaoPage />)

    const badge = await screen.findByRole("button", {
      name: /Conversão de Cliente Alpha: 75%, Alta\. Ver detalhes/,
    })
    expect(badge).toHaveAttribute("title", "Ver oportunidades, pedidos e faturamentos")
    fireEvent.click(badge)

    const dialog = await screen.findByRole("dialog")
    expect(
      within(dialog).getByRole("heading", { name: "Cliente Alpha — conversão" })
    ).toBeInTheDocument()
    expect(within(dialog).getByText("2 oportunidades vinculadas")).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        /Conversão comercial: mínimo\(50%, 1 pedidos ÷ 2 oportunidades vinculadas × 50%\) = 25%/
      )
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        /Conversão financeira: mínimo\(50%, 1 faturamentos ÷ 1 pedidos × 50%\) = 50%/
      )
    ).toBeInTheDocument()
    expect(within(dialog).getByText(/Conversão real: 25% \+ 50% = 75%/)).toBeInTheDocument()
  })

  it("não mostra visitas derivadas quando só há ações reais", async () => {
    const fetchMock = mockRotas([], [linhaAcoes])
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<SaudeProspeccaoPage />)

    await screen.findByRole("columnheader", { name: "Visitas R/A/C" })
    expect(
      screen.getByRole("button", {
        name: /Visitas R\/A\/C de Cliente Alpha: 0\/0\/0\. Ver lista/i,
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", {
        name: /Ações R\/A\/C de Cliente Alpha: 3\/1\/0\. Ver lista/i,
      })
    ).toBeInTheDocument()
  })

  it("abre as listas R/A/C de visitas e ações", async () => {
    const fetchMock = mockRotas()
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<SaudeProspeccaoPage />)

    fireEvent.click(
      await screen.findByRole("button", { name: /Visitas R\/A\/C de Cliente Alpha/i })
    )
    const visitasDialog = await screen.findByRole("dialog")
    expect(
      within(visitasDialog).getByRole("heading", { name: "Cliente Alpha — visitas R/A/C" })
    ).toBeInTheDocument()
    fireEvent.click(within(visitasDialog).getByRole("button", { name: "Fechar" }))

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole("button", { name: /Ações R\/A\/C de Cliente Alpha/i }))
    const acoesDialog = await screen.findByRole("dialog")
    expect(
      within(acoesDialog).getByRole("heading", { name: "Cliente Alpha — ações R/A/C" })
    ).toBeInTheDocument()
  })

  it("recarrega visitas e ações ao alternar para Minhas", async () => {
    const fetchMock = mockRotas()
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<SaudeProspeccaoPage />)

    await screen.findByText("Cliente Alpha")
    fireEvent.click(screen.getByRole("button", { name: /Minhas/ }))

    await waitFor(() =>
      expect(findCall(fetchMock.calls, "/api/crm/visitas/dashboard/clientes?mine=true")).toBeDefined()
    )
    expect(
      findCall(fetchMock.calls, "/api/crm/acoes-prospeccao/dashboard/clientes?mine=true")
    ).toBeDefined()
    expect(screen.getByRole("button", { name: /Minhas/ })).toHaveAttribute("aria-pressed", "true")
  })
})
