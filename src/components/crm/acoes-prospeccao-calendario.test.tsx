// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest"
import { fireEvent, screen, within } from "@testing-library/react"
import { renderPage, navMock } from "@/test/harness"
import AcoesProspeccaoCalendario from "./acoes-prospeccao-calendario"

const hoje = new Date()
const mes = String(hoje.getMonth() + 1).padStart(2, "0")
const ano = hoje.getFullYear()

const acoes = [
  {
    id: 1,
    dataAcao: `${ano}-${mes}-15`,
    hora: "09:00",
    tipo: "PRESENCIAL",
    status: "AGENDADA",
    empresaNome: "Tecelagem Beta",
    clienteNome: null,
    nomeAvulso: null,
    empresaId: 5,
    clienteId: null,
    oportunidadeTitulo: "Pedido A",
    criadoPorNome: "Maria",
    endereco: "Rua X, 100",
    numero: null,
    complemento: null,
    bairro: "Centro",
    cidade: "São Paulo",
    uf: "SP",
  },
]

describe("AcoesProspeccaoCalendario", () => {
  beforeEach(() => {
    navMock.reset()
  })

  it("abre o dialog do dia ao clicar numa ação", async () => {
    renderPage(<AcoesProspeccaoCalendario acoes={acoes} />)

    fireEvent.click(screen.getByRole("button", { name: /1 ação\(ões\)/i }))

    const dialog = await screen.findByRole("dialog", { name: /15 de/i })
    expect(within(dialog).getByText("Tecelagem Beta")).toBeInTheDocument()
    expect(within(dialog).getByText(/Presencial/)).toBeInTheDocument()
    expect(within(dialog).getByRole("link", { name: "Abrir no Google Maps" })).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "Fechar" })).toBeInTheDocument()
  })

  it("navega para a ação ao clicar no item do dialog", async () => {
    renderPage(<AcoesProspeccaoCalendario acoes={acoes} />)

    fireEvent.click(screen.getByRole("button", { name: /1 ação\(ões\)/i }))
    const dialog = await screen.findByRole("dialog", { name: /15 de/i })
    fireEvent.click(within(dialog).getByText("Tecelagem Beta"))

    expect(navMock.router.push).toHaveBeenCalledWith("/comercial/crm/acoes-prospeccao/1")
  })

  it("abre o formulário novo com a data do dia", async () => {
    renderPage(<AcoesProspeccaoCalendario acoes={acoes} />)

    fireEvent.click(screen.getByRole("button", { name: /1 ação\(ões\)/i }))
    const dialog = await screen.findByRole("dialog", { name: /15 de/i })
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Nova Ação de Prospecção para/i })
    )

    expect(navMock.router.push).toHaveBeenCalledWith(
      `/comercial/crm/acoes-prospeccao/novo?data=${ano}-${mes}-15`
    )
  })
})
