// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { fireEvent } from "@testing-library/react"
import { renderPage } from "@/test/harness"
import VincularFaturado from "./vincular-faturado"

const fetchMock = vi.fn()

beforeEach(() => {
  globalThis.fetch = fetchMock
  fetchMock.mockReset()
})

afterEach(() => {
  fetchMock.mockReset()
  delete (globalThis as { fetch?: typeof fetch }).fetch
})

describe("VincularFaturado", () => {
  it("renderiza botão e fecha o modal", async () => {
    const onOpenChange = vi.fn()
    const onClose = vi.fn()
    const onVinculado = vi.fn()
    const { container, getByRole } = renderPage(
      <VincularFaturado
        open={true}
        onOpenChange={onOpenChange}
        oportunidadeId={14}
        onClose={onClose}
        onVinculado={onVinculado}
      />
    )

    const botao = container.querySelector("button[aria-label='Vincular pedido já faturado no ERP']")
    expect(botao).toBeInTheDocument()

    fireEvent.click(botao!)
    expect(onOpenChange).toHaveBeenCalledWith(true)

    const fechar = getByRole("button", { name: /Fechar/ })
    expect(fechar).toBeInTheDocument()
    fireEvent.click(fechar)
    expect(onClose).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("mostra todos os pedidos do ERP que compõem a nota", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        notas: [
          {
            empresa: "13",
            pedido: "013541",
            nr_nota: "012754",
            serie: "1",
            clienteCnpj: "00.000.000/0001-00",
            clienteNome: "Cliente Teste",
            dataNota: "2026-11-13",
            dataEmissao: "2026-11-13",
            valorNota: 10162.37,
            valorTotal: 10162.37,
            pedidoOrigem: "00007046",
          },
        ],
        pedidosErp: [
          {
            empresa: "13",
            pedido: "00007046",
            pedido_origem: "00007046",
            valor_total: 9162.37,
          },
          {
            empresa: "13",
            pedido: "00007047",
            pedido_origem: "00007047",
            valor_total: 1000,
          },
        ],
        valorPedido: 10162.37,
        valorNota: 10162.37,
        valorOportunidadeAntes: 0,
        valorOportunidadeDepois: 10162.37,
        jaVinculado: false,
        pedidosExistentes: [],
        mensagem: "Esta nota fatura 2 pedidos; todos serão vinculados.",
      }),
    })

    const { getByRole, getByLabelText, findByText } = renderPage(
      <VincularFaturado
        open={true}
        onOpenChange={vi.fn()}
        oportunidadeId={14}
        onClose={vi.fn()}
        onVinculado={vi.fn()}
      />
    )

    fireEvent.change(getByLabelText("Código do pedido no ERP"), {
      target: { value: "00007046" },
    })
    fireEvent.click(getByRole("button", { name: /Buscar faturados/ }))

    expect(await findByText(/Pedido 00007046/)).toBeInTheDocument()
    expect(await findByText(/Pedido 00007047/)).toBeInTheDocument()
    expect(await findByText(/Valor dos pedidos:/)).toBeInTheDocument()
    expect(await findByText(/Pedidos do ERP que compõem esta nota:/)).toBeInTheDocument()
  })
})
