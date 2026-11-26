// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { renderPage } from "@/test/harness"
import { toastMock } from "@/test/harness"
import { VerificarPedidosFaturados } from "./verificar-pedidos-faturados"

const previewSemPedido = {
  pedidos: [],
  mensagem: "Vincule ou lance um pedido com o mesmo número de pedido do ERP.",
  sincronizacao: { verificados: 0, atualizados: 0, falhas: 0 },
}

const previewComNota = {
  pedidos: [
    {
      pedidoId: 1,
      numero: "00007075",
      referenciaExterna: "13/00007075",
      empresa: "13",
      oportunidadeId: 9,
      oportunidadeTitulo: "ORÇAMENTO UG",
      leadId: 17,
      leadNome: "U G INDUSTRIA DE COLCHOES DA AMAZONIA LTDA",
      jaConvertida: false,
      valorAntes: 58782,
      valorDepois: 58782,
      nota: { numero: "001234", dataNota: "2026-11-20", valorTotal: 58782 },
      statusSugerido: "FATURADO",
      semNota: false,
    },
  ],
  mensagem: null,
  sincronizacao: { verificados: 1, atualizados: 1, falhas: 0 },
}

const previewDuasOportunidades = {
  pedidos: [
    previewComNota.pedidos[0],
    {
      ...previewComNota.pedidos[0],
      pedidoId: 2,
      numero: "00007076",
      oportunidadeId: 10,
      oportunidadeTitulo: "ORÇAMENTO BETA",
    },
  ],
  mensagem: null,
  sincronizacao: { verificados: 2, atualizados: 2, falhas: 0 },
}

const aplicarResultado = {
  pedidos: [
    {
      pedidoId: 1,
      numero: "00007075",
      valorPedido: 58782,
      status: "FATURADO",
      faturamentoId: 7,
      nota: { numero: "001234", dataNota: "2026-11-20", valorTotal: 58782 },
      conversaoLead: { ok: true },
    },
  ],
  oportunidadeId: 9,
  valorOportunidade: 58782,
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.restoreAllMocks()
  toastMock.success.mockReset()
  toastMock.error.mockReset()
  fetchMock = vi.fn(async (_input: any, init?: RequestInit) => {
    const method = init?.method ?? "GET"
    const url = String(_input ?? "")
    if (url.endsWith("/api/crm/pedidos-venda/verificar-faturados") && method === "POST") {
      return { ok: true, json: async () => previewSemPedido }
    }
    if (url.endsWith("/api/crm/pedidos-venda/aplicar-faturados") && method === "POST") {
      return { ok: true, json: async () => aplicarResultado }
    }
    return { ok: false, json: async () => null }
  })
  vi.stubGlobal("fetch", fetchMock)
})

describe("VerificarPedidosFaturados", () => {
  it("avisa quando não há pedido vinculado à oportunidade", async () => {
    const { container } = renderPage(<VerificarPedidosFaturados oportunidadeId={9} />)
    fireEvent.click(container.querySelector("button")!)

    const dialog = await screen.findByRole("dialog", {
      name: "Verificar pedido faturado no ERP",
    })
    await screen.findByText(
      "Vincule ou lance um pedido com o mesmo número de pedido do ERP."
    )
    expect(screen.queryByRole("button", { name: /Aplicar verificação/ })).not.toBeInTheDocument()
  })

  it("mostra preview e aplica a verificação", async () => {
    fetchMock.mockImplementation(async (_input: any, init?: RequestInit) => {
      const method = init?.method ?? "GET"
      const url = String(_input ?? "")
      if (url.endsWith("/api/crm/pedidos-venda/verificar-faturados") && method === "POST") {
        return { ok: true, json: async () => previewComNota }
      }
      if (url.endsWith("/api/crm/pedidos-venda/aplicar-faturados") && method === "POST") {
        return { ok: true, json: async () => aplicarResultado }
      }
      return { ok: false, json: async () => null }
    })

    renderPage(<VerificarPedidosFaturados oportunidadeId={9} />)
    fireEvent.click(screen.getByRole("button", { name: "Verificar pedidos faturados" }))

    await screen.findByRole("dialog", { name: "Verificar pedido faturado no ERP" })
    await screen.findByText("00007075")
    await screen.findByText("ORÇAMENTO UG")
    await screen.findByText(/001234/)

    fireEvent.click(screen.getByRole("button", { name: /Aplicar verificação/ }))

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith(
        "Pedido(s) verificado(s) e valor sincronizado com o ERP."
      )
    })
  })

  it("aplica a verificação global sem restringir a uma oportunidade", async () => {
    fetchMock.mockImplementation(async (_input: any, init?: RequestInit) => {
      const method = init?.method ?? "GET"
      const url = String(_input ?? "")
      if (url.endsWith("/api/crm/pedidos-venda/verificar-faturados") && method === "POST") {
        return { ok: true, json: async () => previewDuasOportunidades }
      }
      if (url.endsWith("/api/crm/pedidos-venda/aplicar-faturados") && method === "POST") {
        return { ok: true, json: async () => aplicarResultado }
      }
      return { ok: false, json: async () => null }
    })

    renderPage(<VerificarPedidosFaturados pedidoIds={[1, 2]} />)
    fireEvent.click(screen.getByRole("button", { name: "Verificar pedidos faturados" }))

    await screen.findByText("ORÇAMENTO BETA")
    fireEvent.click(screen.getByRole("button", { name: /Aplicar verificação/ }))

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith(
        "Pedido(s) verificado(s) e valor sincronizado com o ERP."
      )
    })

    const chamadaAplicar = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input ?? "").endsWith("/api/crm/pedidos-venda/aplicar-faturados") &&
        init?.method === "POST"
    )
    const corpo = JSON.parse(String(chamadaAplicar?.[1]?.body ?? "{}"))
    expect(corpo).toMatchObject({ pedidoIds: [1, 2], aplicar: true })
    expect(corpo).not.toHaveProperty("oportunidadeId")
  })

  it("envia o status escolhido separadamente para cada pedido", async () => {
    const preview = {
      ...previewDuasOportunidades,
      pedidos: [
        previewComNota.pedidos[0],
        { ...previewComNota.pedidos[0], pedidoId: 2, numero: "00007076", statusSugerido: "PARCIAL" },
      ],
    }
    fetchMock.mockImplementation(async (_input: any, init?: RequestInit) => {
      const method = init?.method ?? "GET"
      const url = String(_input ?? "")
      if (url.endsWith("/api/crm/pedidos-venda/verificar-faturados") && method === "POST") {
        return { ok: true, json: async () => preview }
      }
      if (url.endsWith("/api/crm/pedidos-venda/aplicar-faturados") && method === "POST") {
        return { ok: true, json: async () => aplicarResultado }
      }
      return { ok: false, json: async () => null }
    })

    renderPage(<VerificarPedidosFaturados pedidoIds={[1, 2]} />)
    fireEvent.click(screen.getByRole("button", { name: "Verificar pedidos faturados" }))

    await screen.findByText("00007076")
    fireEvent.click(document.getElementById("status-1-parcial")!)
    fireEvent.click(document.getElementById("status-2-faturado")!)
    fireEvent.click(screen.getByRole("button", { name: /Aplicar verificação/ }))

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith(
        "Pedido(s) verificado(s) e valor sincronizado com o ERP."
      )
    })

    const chamadaAplicar = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input ?? "").endsWith("/api/crm/pedidos-venda/aplicar-faturados") &&
        init?.method === "POST"
    )
    const corpo = JSON.parse(String(chamadaAplicar?.[1]?.body ?? "{}"))
    expect(corpo.statusPorPedido).toEqual({ "1": "PARCIAL", "2": "FATURADO" })
  })
})
