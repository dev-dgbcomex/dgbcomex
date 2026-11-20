// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, waitFor } from "@testing-library/react"
import NovaAcaoProspeccaoPage from "./page"
import { createFetchMock, renderPage, findCall, toastMock, navMock } from "@/test/harness"

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { role: "ADMIN" } } }),
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

vi.mock("@/components/crm/quick-create-lead", () => ({
  QuickCreateLead: () => <button type="button">Nova Lead</button>,
}))
vi.mock("@/components/crm/quick-create-cliente", () => ({
  QuickCreateCliente: () => <button type="button">Novo Cliente</button>,
}))
vi.mock("@/components/crm/quick-create-contato", () => ({
  QuickCreateContato: () => <button type="button">Novo Contato</button>,
}))
vi.mock("@/components/crm/quick-create-oportunidade", () => ({
  QuickCreateOportunidade: () => <button type="button">Nova Oportunidade</button>,
}))
vi.mock("@/components/crm/quick-create-proposta", () => ({
  QuickCreateProposta: () => <button type="button">Nova Proposta</button>,
}))

function makeFetchMock(options?: { status?: number; total?: number }) {
  return createFetchMock(({ method, url }) => {
    if (method === "POST" && url === "/api/crm/acoes-prospeccao") {
      return {
        status: options?.status ?? 200,
        json:
          options?.status && options.status >= 400
            ? { error: "Erro ao criar ação" }
            : { acao: { id: 55 }, total: options?.total ?? 1 },
      }
    }
    if (method === "GET" && url.startsWith("/api/crm/acoes-prospeccao/conflictos?")) {
      return { json: { conflictos: [] } }
    }
    if (method === "GET" && url === "/api/crm/leads") return { json: [{ id: 1, razaoSocial: "Alpha" }] }
    if (method === "GET" && url === "/api/clientes") return { json: [{ id: 2, nome: "Lima" }] }
    if (method === "GET" && url === "/api/crm/oportunidades") return { json: [] }
    if (method === "GET" && url === "/api/crm/estados") return { json: [{ id: 1, uf: "SP" }] }
    return { json: [] }
  })
}

describe("NovaAcaoProspeccaoPage", () => {
  beforeEach(() => {
    navMock.setPathname("/comercial/crm/acoes-prospeccao/novo")
  })

  it("renderiza o seletor de entidade", async () => {
    vi.stubGlobal("fetch", makeFetchMock().fn)
    renderPage(<NovaAcaoProspeccaoPage />)

    expect(await screen.findByRole("heading", { name: "Quem você vai prospectar?" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Lead/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Cliente/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Avulsa/ })).toBeInTheDocument()
  })

  it("abre o formulário para pessoa e valida entidade", async () => {
    vi.stubGlobal("fetch", makeFetchMock().fn)
    renderPage(<NovaAcaoProspeccaoPage />)

    fireEvent.click(screen.getByRole("button", { name: /Lead/ }))

    expect(await screen.findByText("Lead (Negócio) *")).toBeInTheDocument()
    expect(screen.getByLabelText("Data da Ação")).toBeInTheDocument()
    expect(screen.getByLabelText("Hora")).toBeInTheDocument()
    expect(screen.getByLabelText("Tipo")).toBeInTheDocument()
    expect(screen.getByLabelText("Duração Estimada")).toBeInTheDocument()
    expect(screen.getByText("Endereço da Ação")).toBeInTheDocument()
    expect(screen.getByText("Fotos da Ação")).toBeInTheDocument()

    fireEvent.submit(document.querySelector("form")!)
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Lead é obrigatória"))
  })

  it("cria ação avulsa via POST", async () => {
    const fetchMock = makeFetchMock()
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<NovaAcaoProspeccaoPage />)

    fireEvent.click(screen.getByRole("button", { name: /Avulsa/ }))
    fireEvent.change(await screen.findByLabelText("Nome/Razão Social *"), {
      target: { value: "José da Silva" },
    })
    fireEvent.change(screen.getByLabelText("Viagem"), { target: { value: "9" } })
    fireEvent.submit(document.querySelector("form")!)

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/acoes-prospeccao", "POST")
      expect(call).toBeDefined()
      expect(call!.body).toMatchObject({
        empresaId: null,
        clienteId: null,
        nomeAvulso: "José da Silva",
        viagemId: 9,
        tipo: "PRESENCIAL",
      })
    })
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("Ação de Prospecção criada com sucesso")
    )
    await waitFor(() =>
      expect(navMock.router.push).toHaveBeenCalledWith("/comercial/crm/acoes-prospeccao")
    )
  })

  it("exige data final quando há recorrência", async () => {
    vi.stubGlobal("fetch", makeFetchMock().fn)
    renderPage(<NovaAcaoProspeccaoPage />)

    fireEvent.click(screen.getByRole("button", { name: /Avulsa/ }))
    fireEvent.change(await screen.findByLabelText("Nome/Razão Social *"), {
      target: { value: "Avulsa Recorrente" },
    })
    fireEvent.change(screen.getByLabelText("Frequência"), { target: { value: "semanal" } })
    fireEvent.submit(document.querySelector("form")!)

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith("Informe a data final da recorrência")
    )
  })

  it("mostra conflitos de agenda retornados pela API", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url.startsWith("/api/crm/acoes-prospeccao/conflictos?")) {
        return {
          json: {
            conflictos: [
              { id: 7, empresaNome: "Alpha", clienteNome: null, tipo: "PRESENCIAL" },
            ],
          },
        }
      }
      if (method === "GET" && url === "/api/crm/estados") return { json: [] }
      if (method === "GET") return { json: [] }
      return { json: null }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    renderPage(<NovaAcaoProspeccaoPage />)

    fireEvent.click(screen.getByRole("button", { name: /Avulsa/ }))
    fireEvent.change(await screen.findByLabelText("Nome/Razão Social *"), {
      target: { value: "Com conflito" },
    })
    fireEvent.change(screen.getByLabelText("Hora"), { target: { value: "10:00" } })

    await screen.findByText(/1 ação\(ões\) já agendada\(s\) neste horário/)
    expect(screen.getByText(/Alpha/)).toBeInTheDocument()
  })

  it("exibe erro da API ao salvar", async () => {
    vi.stubGlobal("fetch", makeFetchMock({ status: 400 }).fn)
    renderPage(<NovaAcaoProspeccaoPage />)

    fireEvent.click(screen.getByRole("button", { name: /Avulsa/ }))
    fireEvent.change(await screen.findByLabelText("Nome/Razão Social *"), {
      target: { value: "Falha" },
    })
    fireEvent.submit(document.querySelector("form")!)

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Erro ao criar ação"))
    expect(navMock.router.push).not.toHaveBeenCalled()
  })
})
