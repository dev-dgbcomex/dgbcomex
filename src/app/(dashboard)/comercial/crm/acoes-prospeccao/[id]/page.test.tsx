// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, waitFor } from "@testing-library/react"
import DetalheAcaoProspeccaoPage from "./page"
import { propostaVinculadaAcaoProspeccaoVisivel } from "./actions"
import { createFetchMock, renderPage, findCall, toastMock, navMock } from "@/test/harness"

vi.mock("./actions", () => ({
  propostaVinculadaAcaoProspeccaoVisivel: vi.fn(async () => true),
}))

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "1", role: "ADMIN" } } }),
}))

vi.mock("@/components/crm/acao-prospeccao-report-button", () => ({
  default: () => <button>Gerar Relatório</button>,
}))

vi.mock("@/components/crm/send-acao-prospeccao-survey-button", () => ({
  default: () => <button>Enviar Pesquisa</button>,
}))

vi.mock("@/components/crm/vincular-acao-prospeccao-modal", () => ({
  default: () => <div>Modal de Vínculo</div>,
}))

vi.mock("@/components/crm/photo-upload", () => ({
  default: () => <div>Fotos da Ação</div>,
}))

vi.mock("@/components/crm/relato-templates", () => ({
  RelatoTemplateSelector: () => <div>Modelos de Relato</div>,
}))

vi.mock("@/components/crm/rich-text-editor", () => ({
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="Relato" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

vi.mock("@/components/crm/viagem-select", () => ({
  ViagemSelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select aria-label="Viagem" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Sem viagem</option>
      <option value="9">Viagem Norte</option>
    </select>
  ),
}))

vi.mock("@/components/ui/creatable-select", () => ({
  CreatableSelect: ({
    valueNome,
    onChange,
    placeholder,
  }: {
    valueNome: string | null
    onChange: (id: number | null, nome: string | null) => void
    placeholder?: string
  }) => (
    <input
      aria-label={placeholder || "Seleção"}
      value={valueNome || ""}
      onChange={(e) => onChange(null, e.target.value)}
    />
  ),
}))

vi.mock("@/components/crm/quick-create-oportunidade", () => ({
  QuickCreateOportunidade: () => <button type="button">Nova Oportunidade</button>,
}))
vi.mock("@/components/crm/quick-create-proposta", () => ({
  QuickCreateProposta: () => <button type="button">Nova Proposta</button>,
}))
vi.mock("@/components/crm/quick-create-contato", () => ({
  QuickCreateContato: () => <button type="button">Novo Contato</button>,
}))
vi.mock("@/components/crm/select-uf", () => ({
  SelectUf: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select aria-label="UF" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">UF</option>
      <option value="SP">SP</option>
    </select>
  ),
}))
vi.mock("@/components/crm/select-cidade", () => ({
  SelectCidade: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="Cidade" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

const acao = {
  id: 42,
  criadoPor: 1,
  criadoPorNome: "Tiago",
  nomeAvulso: null,
  empresaId: 7,
  empresaNome: "Tecelagem Alpha",
  clienteId: null,
  clienteNome: null,
  oportunidadeId: 3,
  oportunidadeTitulo: "Venda de malha",
  contatoId: 8,
  contatoNome: "Ana",
  contatoEmail: "ana@alpha.com",
  viagemId: 9,
  viagemTitulo: "Viagem Norte",
  representanteId: null,
  representanteNome: null,
  propostaId: 11,
  propostaTitulo: "Proposta 11",
  dataAcao: "2026-07-01",
  hora: "10:00",
  tipo: "PRESENCIAL",
  status: "AGENDADA",
  motivoCancelamento: null,
  duracaoEstimada: 60,
  endereco: "Rua das Rosas",
  numero: "100",
  complemento: null,
  bairro: "Centro",
  cidade: "São Paulo",
  uf: "SP",
  cep: "01000-000",
  relato: "<p>Relato</p>",
  fotos: ["https://example.com/foto.jpg"],
  googleEventId: null,
  checkInTime: null,
  checkOutTime: null,
  checkInLat: null,
  checkInLng: null,
  checkOutLat: null,
  checkOutLng: null,
}

const statuses = [
  {
    id: 1,
    nome: "AGENDADA",
    rotulo: "Agendada",
    tipo: "ACAO_PROSPECCAO",
    cor: "#3b82f6",
    ordem: 1,
    ativo: true,
  },
  {
    id: 2,
    nome: "REALIZADA",
    rotulo: "Realizada",
    tipo: "ACAO_PROSPECCAO",
    cor: "#10b981",
    ordem: 3,
    ativo: true,
  },
]

function buildHandler() {
  return ({ method, url }: { method: string; url: string }) => {
    if (method === "GET" && url === "/api/admin/status?tipo=ACAO_PROSPECCAO")
      return { json: statuses }
    if (method === "GET" && url === "/api/crm/acoes-prospeccao/42") return { json: acao }
    if (method === "GET" && url === "/api/crm/estados") return { json: [{ id: 1, uf: "SP" }] }
    if (method === "GET" && url === "/api/crm/oportunidades") return { json: [] }
    if (method === "PUT" && url === "/api/crm/acoes-prospeccao/42") return { json: acao }
    if (method === "DELETE" && url === "/api/crm/acoes-prospeccao/42") return { json: { ok: true } }
    if (method === "POST" && url === "/api/crm/acoes-prospeccao/42/check") return { json: acao }
    if (method === "GET" && url.startsWith("/api/crm/leads/7")) {
      return { json: { contatos: [{ id: 8, nome: "Ana" }] } }
    }
    if (method === "GET" && url.startsWith("/api/crm/acoes-prospeccao/conflictos?")) {
      return { json: { conflictos: [] } }
    }
    return { json: null }
  }
}

describe("DetalheAcaoProspeccaoPage", () => {
  let fetchMock: ReturnType<typeof createFetchMock>

  beforeEach(() => {
    fetchMock = createFetchMock(buildHandler())
    vi.stubGlobal("fetch", fetchMock.fn)
    navMock.setPathname("/comercial/crm/acoes-prospeccao/42")
    navMock.setParams({ id: "42" })
    vi.mocked(propostaVinculadaAcaoProspeccaoVisivel).mockResolvedValue(true)
  })

  it("carrega os dados da ação", async () => {
    renderPage(<DetalheAcaoProspeccaoPage />)

    expect(
      await screen.findByRole("heading", { name: /Ação de Prospecção — Tecelagem Alpha/ })
    ).toBeInTheDocument()
    expect(await screen.findByText("Venda de malha")).toBeInTheDocument()
    expect(screen.getByText("Viagem Norte")).toBeInTheDocument()
    expect(screen.getByText("Ana")).toBeInTheDocument()
    expect(screen.getByText("Rua das Rosas")).toBeInTheDocument()
    expect(screen.getByText("Proposta 11")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Fazer Check-in" })).toBeInTheDocument()
  })

  it("oculta proposta quando a visibilidade é negada", async () => {
    vi.mocked(propostaVinculadaAcaoProspeccaoVisivel).mockResolvedValue(false)
    renderPage(<DetalheAcaoProspeccaoPage />)

    await screen.findByRole("heading", { name: /Ação de Prospecção — Tecelagem Alpha/ })
    await waitFor(() =>
      expect(propostaVinculadaAcaoProspeccaoVisivel).toHaveBeenCalledWith("ADMIN")
    )
    expect(screen.queryByText("Proposta 11")).not.toBeInTheDocument()
  })

  it("entra em edição e salva via PUT", async () => {
    renderPage(<DetalheAcaoProspeccaoPage />)

    fireEvent.click(await screen.findByRole("button", { name: "Editar" }))
    expect(await screen.findByLabelText("Status")).toHaveValue("AGENDADA")
    expect(screen.getByLabelText("Data da Ação")).toHaveValue("2026-07-01")

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "REALIZADA" } })
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/acoes-prospeccao/42", "PUT")
      expect(call).toBeDefined()
      expect(call!.body).toMatchObject({ status: "REALIZADA" })
    })
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Ação de Prospecção atualizada"))
  })

  it("exclui a ação após confirmação", async () => {
    renderPage(<DetalheAcaoProspeccaoPage />)

    fireEvent.click(await screen.findByRole("button", { name: "Excluir" }))
    const botoes = screen.getAllByRole("button", { name: "Excluir" })
    fireEvent.click(botoes[botoes.length - 1])

    await waitFor(() =>
      expect(findCall(fetchMock.calls, "/api/crm/acoes-prospeccao/42", "DELETE")).toBeDefined()
    )
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Ação de Prospecção excluída"))
    await waitFor(() =>
      expect(navMock.router.push).toHaveBeenCalledWith("/comercial/crm/acoes-prospeccao")
    )
  })

  it("registra check-in", async () => {
    renderPage(<DetalheAcaoProspeccaoPage />)

    fireEvent.click(await screen.findByRole("button", { name: "Fazer Check-in" }))

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/acoes-prospeccao/42/check", "POST")
      expect(call).toBeDefined()
      expect(call!.body).toMatchObject({ tipo: "check_in", latitude: null, longitude: null })
    })
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Check-in registrado!"))
  })

  it("mostra estado de não encontrado", async () => {
    const missing = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/crm/acoes-prospeccao/42")
        return { status: 404, json: { error: "Não encontrado" } }
      if (method === "GET" && url === "/api/admin/status?tipo=ACAO_PROSPECCAO")
        return { json: statuses }
      return { json: null }
    })
    vi.stubGlobal("fetch", missing.fn)

    renderPage(<DetalheAcaoProspeccaoPage />)

    expect(await screen.findByText("Ação de Prospecção não encontrada")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Voltar" })).toHaveAttribute(
      "href",
      "/comercial/crm/acoes-prospeccao"
    )
  })
})
