// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { screen } from "@testing-library/react"
import { renderPage } from "@/test/harness"
import { DadosLeadCard } from "./dados-lead-card"
import type { Lead } from "../../types"

const leadLonga = {
  id: 185,
  tipoPessoa: "PJ",
  razaoSocial: "Comercialização de Tecidos e Confecções do Vale do Paraíba Ltda",
  nomeFantasia: "Tecelagem Vale",
  cnpj: "12.345.678/0001-90",
  segmento: "Têxtil",
  porte: "ME",
  site: "https://www.exemplo-comercializacao-de-tecidos-e-confeccoes-vale-do-paraiba.com.br/institucional",
  telefone: "(11) 3333-3333",
  celular: "",
  email: "contato.institucional@exemplo-comercializacao-tecidos.com.br",
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
  contatos: [],
} as unknown as Lead

function renderCard() {
  return renderPage(
    <DadosLeadCard
      lead={leadLonga}
      form={{}}
      setForm={() => {}}
      editing={false}
      tipoPessoa="PJ"
      setTipoLead={() => {}}
      estadoId={null}
    />
  )
}

describe("DadosLeadCard", () => {
  it("envolve valores longos dentro do card (break-words) sem vazar", () => {
    renderCard()

    const card = screen.getByRole("heading", { name: "Dados da Lead (Negócio)" }).closest("div")
    expect(card).toHaveClass("min-w-0")

    const grade = screen.getByText("Razão Social").closest("div.grid")
    expect(grade).toHaveClass("break-words")

    expect(
      screen.getByText(/exemplo-comercializacao-de-tecidos-e-confeccoes-vale-do-paraiba/)
    ).toBeInTheDocument()
  })
})
