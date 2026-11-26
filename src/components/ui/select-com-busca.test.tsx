// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { fireEvent, screen, within } from "@testing-library/react"

import { renderPage } from "@/test/harness"
import { SelectComBusca, type OpcaoSelectBusca } from "./select-com-busca"

const OPCOES: OpcaoSelectBusca[] = [
  { value: "1", label: "São Paulo" },
  { value: "2", label: "Rio de Janeiro" },
  { value: "3", label: "Belo Horizonte", descricao: "Gerente" },
]

function renderSelect(over: Partial<React.ComponentProps<typeof SelectComBusca>> = {}) {
  const onChange = vi.fn()
  const onBuscaChange = vi.fn()
  renderPage(
    <SelectComBusca
      id="cliente"
      valor=""
      onChange={onChange}
      opcoes={OPCOES}
      ariaLabel="Cliente"
      placeholderBusca="Digite o nome do cliente..."
      {...over}
      onBuscaChange={over.onBuscaChange ?? onBuscaChange}
    />
  )
  return { onChange, onBuscaChange }
}

describe("SelectComBusca", () => {
  it("mantém o seletor nativo e filtra opções ignorando acento e caixa", () => {
    renderSelect()

    const select = screen.getByRole("combobox", { name: "Cliente" })
    expect(within(select).getAllByRole("option")).toHaveLength(4)

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar Cliente" }), {
      target: { value: "sao paulo" },
    })

    expect(within(select).getAllByRole("option")).toHaveLength(2)
    expect(within(select).getByRole("option", { name: "São Paulo" })).toBeInTheDocument()
    expect(screen.queryByText(/Nenhum resultado/)).not.toBeInTheDocument()
  })

  it("busca também pela descrição e avisa quando não há resultado", () => {
    renderSelect()

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar Cliente" }), {
      target: { value: "gerente" },
    })

    const select = screen.getByRole("combobox", { name: "Cliente" })
    expect(within(select).getAllByRole("option")).toHaveLength(2)
    expect(within(select).getByRole("option", { name: /Belo Horizonte/ })).toBeInTheDocument()

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar Cliente" }), {
      target: { value: "inexistente" },
    })

    expect(within(select).getAllByRole("option")).toHaveLength(1)
    expect(screen.getByText(/Nenhum resultado para “inexistente”/)).toBeInTheDocument()
  })

  it("devolve o valor escolhido e notifica a busca externa", () => {
    const { onChange, onBuscaChange } = renderSelect({ valor: "1" })

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar Cliente" }), {
      target: { value: "rio" },
    })
    expect(onBuscaChange).toHaveBeenCalledWith("rio")

    fireEvent.change(screen.getByRole("combobox", { name: "Cliente" }), {
      target: { value: "2" },
    })
    expect(onChange).toHaveBeenCalledWith("2")
  })
})
