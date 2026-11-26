// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { OportunidadePedidoResumo } from "./oportunidade-pedido-resumo"

describe("OportunidadePedidoResumo", () => {
  it("mostra pedido faturado e o valor faturado", () => {
    render(
      <OportunidadePedidoResumo
        temPedidoVenda
        statusPedidoVenda="FATURADO"
        valorFaturado="773.60"
      />
    )

    expect(screen.getByText(/Pedido Faturado/)).toBeInTheDocument()
    expect(screen.getByText(/Faturado R\$\s*773,60/)).toBeInTheDocument()
  })

  it("mostra pedido parcial mesmo sem faturamento", () => {
    render(<OportunidadePedidoResumo statusPedidoVenda="PARCIAL" valorFaturado="0" />)

    expect(screen.getByText(/Pedido Parcial/)).toBeInTheDocument()
    expect(screen.getByText("Não faturado")).toBeInTheDocument()
  })

  it("indica quando não há pedido vinculado", () => {
    render(<OportunidadePedidoResumo temPedidoVenda={false} />)

    expect(screen.getByText("Sem pedido vinculado")).toBeInTheDocument()
  })
})
