// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { fireEvent, screen, within } from "@testing-library/react"

import { renderPage } from "@/test/harness"
import { FiltroCombo, type OpcaoFiltro } from "./filtro-combo"

const OPCOES: OpcaoFiltro[] = [
  { rotulo: "BANCO SANTANDER", codigo: "033", ocorrencias: 118, valor: 1_683_509 },
  { rotulo: "BANCO DO BRASIL", codigo: "001", ocorrencias: 71, valor: 946_281 },
  { rotulo: "BANCO BLU", codigo: "BLU", ocorrencias: 14, valor: 551_127 },
]

function combo(over: Partial<React.ComponentProps<typeof FiltroCombo>> = {}) {
  const onChange = vi.fn()
  renderPage(
    <FiltroCombo
      id="cp-banco"
      rotulo="Banco"
      opcoes={OPCOES}
      valor=""
      onChange={onChange}
      formatarValor={(v) => `R$ ${v}`}
      {...over}
    />
  )
  return { onChange }
}

describe("FiltroCombo", () => {
  it("abre com as opções do relatório, com código e valor", () => {
    combo()

    fireEvent.click(screen.getByLabelText("Abrir opções de Banco"))
    const lista = screen.getByRole("listbox", { name: "Banco" })

    expect(within(lista).getAllByRole("option")).toHaveLength(3)
    expect(within(lista).getByText(/BANCO BLU/)).toBeInTheDocument()
    expect(within(lista).getByText("BLU")).toBeInTheDocument()
    expect(within(lista).getByText("R$ 551127")).toBeInTheDocument()
  })

  it("digitar autocompleta ignorando acento e caixa", () => {
    combo()

    fireEvent.change(screen.getByRole("combobox", { name: "Banco" }), {
      target: { value: "santander" },
    })
    expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(1)

    fireEvent.change(screen.getByRole("combobox", { name: "Banco" }), { target: { value: "bl" } })
    expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(1)
    expect(within(screen.getByRole("listbox")).getByRole("option")).toHaveTextContent("BANCO BLU")
  })

  it("acha pelo código, não só pelo nome", () => {
    combo()

    fireEvent.change(screen.getByRole("combobox", { name: "Banco" }), { target: { value: "033" } })
    expect(within(screen.getByRole("listbox")).getByRole("option")).toHaveTextContent(
      "BANCO SANTANDER"
    )
  })

  it("escolher marca a opção e devolve o valor", () => {
    const { onChange } = combo()

    fireEvent.click(screen.getByLabelText("Abrir opções de Banco"))
    fireEvent.click(screen.getByRole("option", { name: /BANCO BLU/ }))

    expect(onChange).toHaveBeenCalledWith("BANCO BLU")
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })

  it("a opção já escolhida aparece marcada e pode ser desmarcada", () => {
    const { onChange } = combo({ valor: "BANCO BLU" })

    fireEvent.click(screen.getByLabelText("Abrir opções de Banco"))
    expect(screen.getByRole("option", { name: /BANCO BLU/ })).toHaveAttribute("aria-selected", "true")

    fireEvent.click(screen.getByRole("option", { name: /BANCO BLU/ }))
    expect(onChange).toHaveBeenCalledWith("")
  })

  it("navega com o teclado e escolhe com Enter", () => {
    const { onChange } = combo()
    const campo = screen.getByRole("combobox", { name: "Banco" })

    fireEvent.keyDown(campo, { key: "ArrowDown" }) // abre
    fireEvent.keyDown(campo, { key: "ArrowDown" }) // foca a primeira
    fireEvent.keyDown(campo, { key: "ArrowDown" }) // foca a segunda
    fireEvent.keyDown(campo, { key: "Enter" })

    expect(onChange).toHaveBeenCalledWith("BANCO DO BRASIL")
  })

  it("Escape fecha a lista sem escolher", () => {
    const { onChange } = combo()
    const campo = screen.getByRole("combobox", { name: "Banco" })

    fireEvent.change(campo, { target: { value: "blu" } })
    fireEvent.keyDown(campo, { key: "Escape" })

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it("diz quando não há opção no recorte", () => {
    combo()

    fireEvent.change(screen.getByRole("combobox", { name: "Banco" }), { target: { value: "zzz" } })
    expect(screen.getByText("Nenhuma opção no recorte")).toBeInTheDocument()
  })

  it("limpa a seleção pelo botão do campo", () => {
    const { onChange } = combo({ valor: "BANCO SANTANDER" })

    expect(screen.getByRole("combobox", { name: "Banco" })).toHaveValue("BANCO SANTANDER")
    fireEvent.click(screen.getByLabelText("Limpar filtro Banco"))

    expect(onChange).toHaveBeenCalledWith("")
  })

  it("a seleção que sumiu do recorte é removida", () => {
    // Trocar de mês muda a lista de opções; uma seleção que não existe mais não pode
    // ficar marcada — nem ficar filtrando a lista para sempre.
    const onChange = vi.fn()
    const { rerender } = renderPage(
      <FiltroCombo
        id="cp-banco"
        rotulo="Banco"
        opcoes={OPCOES}
        valor="BANCO BLU"
        onChange={onChange}
      />
    )

    rerender(
      <FiltroCombo
        id="cp-banco"
        rotulo="Banco"
        opcoes={OPCOES.slice(0, 1)}
        valor="BANCO BLU"
        onChange={onChange}
      />
    )

    expect(onChange).toHaveBeenCalledWith("")
  })
})
