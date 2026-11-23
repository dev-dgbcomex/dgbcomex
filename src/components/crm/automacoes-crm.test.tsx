// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { createFetchMock, findCall, renderPage, toastMock } from "@/test/harness"
import { DecisaoAutomacaoModal } from "./decisao-automacao-modal"
import { VerificarPedidosFaturados } from "./verificar-pedidos-faturados"

describe("DecisaoAutomacaoModal", () => {
  it("mostra as opções e devolve a escolha do usuário", () => {
    const onEscolher = vi.fn()
    const onCancel = vi.fn()

    renderPage(
      <DecisaoAutomacaoModal
        open
        titulo="Decisão necessária"
        mensagem="Escolha uma opção"
        opcoes={[
          { valor: "PERDER_LEAD", rotulo: "Perder lead" },
          { valor: "NOVA_OPORTUNIDADE", rotulo: "Manter qualificada" },
        ]}
        onEscolher={onEscolher}
        onCancel={onCancel}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /manter qualificada/i }))
    expect(onEscolher).toHaveBeenCalledWith("NOVA_OPORTUNIDADE")
  })
})

describe("VerificarPedidosFaturados", () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset?.()
    toastMock.success.mockClear()
    toastMock.error.mockClear()
    toastMock.info.mockClear()
  })

  it("verifica, exibe notas e aplica a verificação", async () => {
    const fetchMock = createFetchMock(({ url, body }) => {
      if (url === "/api/crm/pedidos-venda/verificar-faturados") {
        return {
          json: {
            pedidos: [
              {
                pedidoId: 1,
                numero: "PV-1",
                referenciaExterna: "1/PV-1",
                empresa: "1",
                oportunidadeId: 10,
                oportunidadeTitulo: "Malha",
                leadId: 4,
                leadNome: "Malhas Brasil",
                jaConvertida: false,
                valorAntes: 5200,
                valorDepois: 5200,
                nota: { numero: "NF-9", dataNota: "2026-11-20", valorTotal: 5200 },
                statusSugerido: "FATURADO",
                semNota: false,
              },
            ],
            mensagem: null,
            sincronizacao: { verificados: 1, atualizados: 0, falhas: 0 },
          },
        }
      }
      if (url === "/api/crm/pedidos-venda/aplicar-faturados") {
        return {
          json: {
            pedidos: [
              {
                pedidoId: 1,
                numero: "PV-1",
                valorPedido: 5200,
                status: "FATURADO",
                faturamentoId: 7,
                nota: { numero: "NF-9", dataNota: "2026-11-20", valorTotal: 5200 },
                conversaoLead: { ok: true },
              },
            ],
            oportunidadeId: 10,
            valorOportunidade: 5200,
          },
        }
      }
      return { status: 404, json: { error: "Rota não mockada" } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    const onConvertido = vi.fn()

    renderPage(
      <VerificarPedidosFaturados
        pedidoId={1}
        oportunidadeId={10}
        label="Verificar faturados"
        onConvertido={onConvertido}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Verificar faturados" }))

    expect(await screen.findByText(/NF-9 \(2026-11-20\)/)).toBeTruthy()
    expect(
      findCall(fetchMock.calls, "/api/crm/pedidos-venda/verificar-faturados", "POST")?.body
    ).toEqual({ pedidoIds: [1], oportunidadeId: 10 })

    fireEvent.click(screen.getByRole("button", { name: /Aplicar verificação/ }))

    await waitFor(() =>
      expect(
        findCall(fetchMock.calls, "/api/crm/pedidos-venda/aplicar-faturados", "POST")?.body
      ).toEqual({
        pedidoIds: [1],
        oportunidadeId: 10,
        aplicar: true,
        statusPedido: "PARCIAL",
      })
    )
    expect(toastMock.success).toHaveBeenCalledWith(
      "Pedido(s) verificado(s) e valor sincronizado com o ERP."
    )
    expect(onConvertido).toHaveBeenCalled()
  })
})
