// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SeletorTela } from "./seletor-tela"

const telas = [
  {
    id: "crm-relatorios",
    label: "CRM — Relatórios",
    href: "/comercial/crm/relatorios",
    module: "CRM",
  },
  {
    id: "crm-relatorio-clientes",
    label: "CRM — Relatório: Clientes",
    href: "/comercial/crm/relatorios/clientes",
    module: "CRM",
  },
  { id: "clientes", label: "Clientes", href: "/cadastros/clientes", module: "Cadastros" },
]

describe("SeletorTela", () => {
  it("filtra as telas pela busca, ignorando acentos", async () => {
    const user = userEvent.setup()
    render(<SeletorTela telas={telas} valor="" onChange={vi.fn()} />)

    await user.type(screen.getByLabelText("Buscar tela"), "relatorio")
    await user.click(screen.getByRole("combobox"))

    expect(screen.getByText("CRM — Relatórios")).toBeInTheDocument()
    expect(screen.getByText("CRM — Relatório: Clientes")).toBeInTheDocument()
    expect(screen.queryByText("Clientes")).not.toBeInTheDocument()
  })

  it("avisa quando nenhuma tela combina com a busca", async () => {
    const user = userEvent.setup()
    render(<SeletorTela telas={telas} valor="" onChange={vi.fn()} />)

    await user.type(screen.getByLabelText("Buscar tela"), "zzzz")
    await user.click(screen.getByRole("combobox"))

    expect(screen.getByText("Nenhuma tela encontrada")).toBeInTheDocument()
  })

  it("devolve o id da tela escolhida", () => {
    const onChange = vi.fn()
    render(<SeletorTela telas={telas} valor="" onChange={onChange} />)

    fireEvent.click(screen.getByRole("combobox"))
    fireEvent.click(screen.getByRole("option", { name: "CRM — Relatórios" }))

    expect(onChange).toHaveBeenCalledWith("crm-relatorios")
  })

  it("devolve o href quando a chave é href", () => {
    const onChange = vi.fn()
    render(<SeletorTela telas={telas} valor="" onChange={onChange} chave="href" />)

    fireEvent.click(screen.getByRole("combobox"))
    fireEvent.click(screen.getByRole("option", { name: "CRM — Relatórios" }))

    expect(onChange).toHaveBeenCalledWith("/comercial/crm/relatorios")
  })
})
