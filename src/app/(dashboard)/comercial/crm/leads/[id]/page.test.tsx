// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, waitFor, within } from "@testing-library/react"
import LeadDetailPage from "./page"
import { createFetchMock, renderPage, findCall, toastMock, navMock } from "@/test/harness"

const lead = {
  id: 1,
  tipoPessoa: "PJ",
  razaoSocial: "Tecelagem Alpha",
  nomeFantasia: "Alpha Confecções",
  cnpj: "12.345.678/0001-90",
  segmento: "Têxtil",
  porte: "ME",
  site: "",
  telefone: "(11) 3333-3333",
  celular: "",
  email: "contato@alpha.com",
  emailNf: "",
  endereco: "Rua das Rosas",
  numero: "100",
  complemento: "",
  bairro: "Centro",
  cidade: "São Paulo",
  uf: "SP",
  cep: "01000-000",
  observacoes: "",
  status: "QUALIFICADO",
  resumo: {
    oportunidades: 1,
    propostas: 1,
    visitas: 0,
    acoes: 2,
    valorPropostas: 0,
    valorOportunidades: 0,
  },
  resumoIa: null,
  sugestaoIa: null,
  createdAt: "2026-07-01T10:00:00Z",
  contatos: [
    { id: 3, nome: "Carlos Silva", cargo: "Comprador", email: "carlos@alpha.com", principal: true },
  ],
}

const representantes = [
  {
    id: 5,
    nome: "Representante Beta",
    cnpj: "11.222.333/0001-44",
    email: "beta@rep.com",
    telefone: "(11) 9999-9999",
    cidade: "Campinas",
    uf: "SP",
  },
]

const oportunidades = [
  { id: 20, titulo: "Oportunidade Grande", valorEstimado: 5000, status: "Novo", empresaId: 1 },
]

const orfaos = [{ id: 9, nome: "Contato Órfão", email: "orfao@x.com" }]

describe("LeadDetailPage", () => {
  let fetchMock: ReturnType<typeof createFetchMock>

  beforeEach(() => {
    const handler = ({
      method,
      url,
      body,
    }: {
      method: string
      url: string
      body?: { mensagens?: unknown[] }
    }) => {
      if (method === "GET" && url === "/api/crm/leads/1") return { json: lead }
      if (method === "GET" && url === "/api/crm/leads/1/representantes")
        return { json: representantes }
      if (method === "GET" && url === "/api/crm/oportunidades?empresaId=1")
        return { json: oportunidades }
      if (method === "GET" && url === "/api/crm/acoes-prospeccao?all=true&empresaId=1") {
        return {
          json: [
            {
              id: 40,
              tipo: "CONTATO",
              relato: "Visita técnica agendada",
              status: "PENDENTE",
              dataAcao: "2026-11-05T09:00:00Z",
            },
          ],
        }
      }
      if (method === "GET" && url === "/api/crm/visitas?all=true&empresaId=1") {
        return {
          json: [
            {
              id: 50,
              tipo: "VISITA",
              relato: "Visita de prospecção",
              status: "REALIZADA",
              dataVisita: "2026-11-06T10:00:00Z",
            },
          ],
        }
      }
      if (method === "POST" && url === "/api/crm/ia/timeline-chat") {
        return {
          json: {
            resposta: body?.mensagens?.length ? "Resposta da IA" : "Resumo gerado pela IA",
          },
        }
      }
      if (method === "GET" && url === "/api/crm/estados") {
        return { json: [{ id: 35, uf: "SP", nome: "São Paulo" }] }
      }
      if (method === "GET" && url === "/api/crm/cidades?estadoId=35") {
        return { json: [{ id: 1, nome: "São Paulo", estadoId: 35 }] }
      }
      if (method === "GET" && url === "/api/crm/timeline?pessoaId=1") return { json: [] }
      if (method === "GET" && url === "/api/crm/whatsapp?empresaId=1") return { json: [] }
      if (method === "PUT" && url === "/api/crm/leads/1") return { json: { ...lead } }
      if (method === "POST" && url === "/api/crm/leads/1/promover-cliente") {
        return {
          json: {
            lead: { ...lead, promovidaCliente: true, status: "CONVERTIDO_CLIENTE" },
            clienteId: 5,
            clienteCriado: true,
            resumo: {
              oportunidades: 1,
              propostas: 1,
              visitas: 0,
              acoes: 2,
              valorPropostas: 0,
              valorOportunidades: 0,
            },
          },
        }
      }
      if (method === "GET" && url === "/api/crm/contatos?orfao=true") return { json: orfaos }
      if (method === "PUT" && url === "/api/crm/contatos/9")
        return {
          json: {
            id: 9,
            nome: "Contato Órfão",
            email: "orfao@x.com",
            empresaId: 1,
            clienteId: null,
          },
        }
      if (method === "PUT" && url === "/api/crm/contatos/3")
        return {
          json: {
            id: 3,
            nome: "Carlos Silva",
            email: "carlos@alpha.com",
            empresaId: null,
            clienteId: null,
          },
        }
      return { json: null }
    }
    fetchMock = createFetchMock(handler)
    vi.stubGlobal("fetch", fetchMock.fn)
  })

  it("exibe os dados da lead com contatos, representantes, oportunidades e ações", async () => {
    navMock.setParams({ id: "1" })
    navMock.setPathname("/comercial/crm/leads/1")
    renderPage(<LeadDetailPage />)

    expect(await screen.findByRole("heading", { name: /Tecelagem Alpha/ })).toBeInTheDocument()
    expect(screen.getByText("PJ")).toBeInTheDocument()
    expect(screen.getAllByText("QUALIFICADO").length).toBeGreaterThan(0)

    expect(await screen.findByText("Carlos Silva")).toBeInTheDocument()
    expect(screen.getByText("Comprador")).toBeInTheDocument()
    expect(screen.getByText("Principal")).toBeInTheDocument()

    expect(await screen.findByText("Representante Beta")).toBeInTheDocument()
    expect(screen.getByText("11.222.333/0001-44")).toBeInTheDocument()

    expect(screen.getByText("Oportunidade Grande")).toBeInTheDocument()
    expect(screen.getAllByText("Ações").length).toBeGreaterThan(0)
    expect(screen.queryByRole("heading", { name: "Propostas" })).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Visitantes" })).not.toBeInTheDocument()
    expect(await screen.findByText("Nenhuma mensagem")).toBeInTheDocument()
  })

  it("exibe cards de ações e visitas com links e sem propostas", async () => {
    navMock.setParams({ id: "1" })
    navMock.setPathname("/comercial/crm/leads/1")
    renderPage(<LeadDetailPage />)

    expect(await screen.findByText("Visita técnica agendada")).toBeInTheDocument()
    expect(await screen.findByText("Visita de prospecção")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Visita técnica agendada/ })).toHaveAttribute(
      "href",
      "/comercial/crm/acoes-prospeccao/40"
    )
    expect(screen.getByRole("link", { name: /Visita de prospecção/ })).toHaveAttribute(
      "href",
      "/comercial/crm/visitas/50"
    )
    expect(screen.getByRole("link", { name: "Carlos Silva" })).toHaveAttribute(
      "href",
      "/comercial/crm/contatos/3"
    )
    expect(screen.getByRole("link", { name: "Representante Beta" })).toHaveAttribute(
      "href",
      "/comercial/representantes/5"
    )

    await waitFor(() => {
      expect(
        findCall(fetchMock.calls, "/api/crm/acoes-prospeccao?all=true&empresaId=1")
      ).toBeDefined()
      expect(findCall(fetchMock.calls, "/api/crm/visitas?all=true&empresaId=1")).toBeDefined()
      expect(findCall(fetchMock.calls, "/api/crm/propostas?empresaId=1")).toBeUndefined()
      expect(findCall(fetchMock.calls, "/api/crm/visitantes", "POST")).toBeUndefined()
    })
  })

  it("gera análise e envia pergunta sobre a timeline da lead", async () => {
    navMock.setParams({ id: "1" })
    navMock.setPathname("/comercial/crm/leads/1")
    renderPage(<LeadDetailPage />)

    await screen.findByRole("heading", { name: /Tecelagem Alpha/ })
    fireEvent.click(screen.getByRole("button", { name: "Gerar análise" }))

    expect(await screen.findByText("Resumo gerado pela IA")).toBeInTheDocument()
    const geracao = findCall(fetchMock.calls, "/api/crm/ia/timeline-chat", "POST")
    expect(geracao!.body).toEqual({ tipo: "lead", id: "1", mensagens: [] })

    fireEvent.change(screen.getByLabelText("Perguntar sobre a timeline"), {
      target: { value: "Qual o próximo passo?" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }))

    expect(await screen.findByText("Qual o próximo passo?")).toBeInTheDocument()
    expect(await screen.findByText("Resposta da IA")).toBeInTheDocument()
    const envios = fetchMock.calls.filter(
      (chamada) =>
        chamada.url === "/api/crm/ia/timeline-chat" &&
        chamada.method === "POST" &&
        chamada.body?.mensagens?.length
    )
    expect(envios[envios.length - 1]!.body).toEqual({
      tipo: "lead",
      id: "1",
      mensagens: [{ papel: "usuario", texto: "Qual o próximo passo?" }],
    })
  })

  it("edita a lead via PUT", async () => {
    navMock.setParams({ id: "1" })
    navMock.setPathname("/comercial/crm/leads/1")
    renderPage(<LeadDetailPage />)

    fireEvent.click(await screen.findByRole("button", { name: "Editar" }))

    const razaoInput = await screen.findByDisplayValue("Tecelagem Alpha")
    fireEvent.change(razaoInput, { target: { value: "Tecelagem Alpha Atualizada" } })

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/leads/1", "PUT")
      expect(call).toBeDefined()
      expect(call!.body).toEqual(
        expect.objectContaining({ razaoSocial: "Tecelagem Alpha Atualizada" })
      )
    })
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Lead atualizada"))
  })

  it("transforma a lead em cliente após confirmar o aviso", async () => {
    navMock.setParams({ id: "1" })
    navMock.setPathname("/comercial/crm/leads/1")
    renderPage(<LeadDetailPage />)

    fireEvent.click(await screen.findByRole("button", { name: "Tornar cliente" }))

    const dialog = screen.getByRole("dialog", { name: "Transformar em cliente?" })
    expect(dialog).toHaveTextContent("será arquivada")
    expect(dialog).toHaveTextContent("oportunidades, ações e visitas")
    fireEvent.click(within(dialog).getByRole("button", { name: "Transformar em cliente" }))

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/leads/1/promover-cliente", "POST")
      expect(call).toBeDefined()
    })
    await waitFor(() => expect(toastMock.success).toHaveBeenCalled())
  })

  it("não oferece exclusão da lead", async () => {
    navMock.setParams({ id: "1" })
    navMock.setPathname("/comercial/crm/leads/1")
    renderPage(<LeadDetailPage />)

    await screen.findByRole("heading", { name: /Tecelagem Alpha/ })
    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument()
  })

  it("vincular um contato órfão à lead", async () => {
    navMock.setParams({ id: "1" })
    navMock.setPathname("/comercial/crm/leads/1")
    renderPage(<LeadDetailPage />)

    const select = await screen.findByLabelText("Contatos sem vínculo")
    fireEvent.change(select, { target: { value: "9" } })
    fireEvent.click(screen.getByRole("button", { name: "Vincular" }))

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/contatos/9", "PUT")
      expect(call).toBeDefined()
      expect(call!.body).toEqual({ empresaId: 1 })
    })
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Contato vinculado"))
    expect(await screen.findByText("Contato Órfão")).toBeInTheDocument()
  })

  it("desvincula um contato da lead", async () => {
    navMock.setParams({ id: "1" })
    navMock.setPathname("/comercial/crm/leads/1")
    renderPage(<LeadDetailPage />)

    fireEvent.click(await screen.findByTitle("Desvincular contato"))

    await waitFor(() => {
      const call = findCall(fetchMock.calls, "/api/crm/contatos/3", "PUT")
      expect(call).toBeDefined()
      expect(call!.body).toEqual({ empresaId: null, clienteId: null })
    })
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Contato desvinculado"))
    await waitFor(() => expect(screen.queryByText("Carlos Silva")).not.toBeInTheDocument())
  })

  it("mostra lead não encontrada", async () => {
    navMock.setParams({ id: "999" })
    navMock.setPathname("/comercial/crm/leads/999")
    renderPage(<LeadDetailPage />)

    expect(await screen.findByText("Lead não encontrada")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Voltar" })).toHaveAttribute(
      "href",
      "/comercial/crm/leads"
    )
  })
})
