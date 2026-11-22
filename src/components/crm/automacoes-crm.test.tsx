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

  it("verifica, exibe notas e converte as leads confirmadas", async () => {
    const fetchMock = createFetchMock(({ url, body }) => {
      if (url === "/api/crm/pedidos-venda/verificar-faturados") {
        return {
          json: {
            candidatos: [
              {
                pedidoId: 1,
                numero: "PV-1",
                referenciaExterna: "1/PV-1",
                oportunidadeId: 10,
                oportunidadeTitulo: "Malha",
                leadId: 4,
                leadNome: "Malhas Brasil",
                jaConvertida: false,
                nota: "NF-9",
                dataNota: "2026-11-20",
              },
            ],
            sincronizacao: { verificados: 1, atualizados: 0, falhas: 0 },
          },
        }
      }
      if (url === "/api/crm/pedidos-venda/converter-faturados") {
        return { json: { convertidas: 1, falhas: 0 } }
      }
      return { status: 404, json: { error: "Rota não mockada" } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)
    const onConvertido = vi.fn()

    renderPage(
      <VerificarPedidosFaturados
        pedidoId={1}
        label="Verificar faturados"
        onConvertido={onConvertido}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Verificar faturados" }))

    expect(await screen.findByText("NF-9 (2026-11-20)")).toBeTruthy()
    expect(findCall(fetchMock.calls, "/api/crm/pedidos-venda/verificar-faturados", "POST")?.body).toEqual(
      { pedidoId: 1, oportunidadeId: undefined }
    )

    fireEvent.click(screen.getByRole("button", { name: /converter leads em clientes/i }))

    await waitFor(() =>
      expect(
        findCall(fetchMock.calls, "/api/crm/pedidos-venda/converter-faturados", "POST")?.body
      ).toEqual({ pedidoIds: [1] })
    )
    expect(toastMock.success).toHaveBeenCalledWith("1 lead(s) convertida(s) em cliente.")
    expect(onConvertido).toHaveBeenCalled()
  })
})
