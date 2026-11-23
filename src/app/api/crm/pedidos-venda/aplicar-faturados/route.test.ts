// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { aplicarVerificacaoPedidoFaturado } from "@/lib/crm/verificar-pedido-faturado"
import { POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/crm/verificar-pedido-faturado", () => ({
  aplicarVerificacaoPedidoFaturado: vi.fn(),
}))

const session = { session: { user: { name: "Tiago", id: 1 } }, userId: 1 }

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/crm/pedidos-venda/aplicar-faturados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  )
}

describe("POST /api/crm/pedidos-venda/aplicar-faturados", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset().mockResolvedValue(session as any)
    vi.mocked(aplicarVerificacaoPedidoFaturado).mockReset()
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await post({ aplicar: true })
    expect(res.status).toBe(401)
  })

  it("exige aplicar true", async () => {
    const res = await post({})
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Informe aplicar: true para confirmar a atualização.")
  })

  it("aplica a verificação e retorna resultados", async () => {
    vi.mocked(aplicarVerificacaoPedidoFaturado).mockResolvedValue({
      pedidos: [
        {
          pedidoId: 1,
          numero: "PV-1",
          valorPedido: 5200,
          status: "FATURADO",
          faturamentoId: 7,
          nota: { numero: "NF-9", dataNota: "2026-11-20", valorTotal: 5200, empresa: "1", pedido: "PV-1", pedidoOrigem: "PV-1" },
          conversaoLead: { ok: true },
        },
      ],
      oportunidadeId: 10,
      valorOportunidade: 5200,
    })

    const res = await post({ oportunidadeId: 10, aplicar: true })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(vi.mocked(aplicarVerificacaoPedidoFaturado)).toHaveBeenCalledWith({
      pedidoIds: undefined,
      oportunidadeId: 10,
      statusPedido: undefined,
      autor: { id: 1, nome: "Tiago" },
    })
    expect(body.valorOportunidade).toBe(5200)
    expect(body.pedidos[0].status).toBe("FATURADO")
  })

  it("retorna 409 quando não há pedido vinculado", async () => {
    const error = new Error(
      "Vincule ou lance um pedido com o mesmo número de pedido do ERP."
    )
    vi.mocked(aplicarVerificacaoPedidoFaturado).mockRejectedValue(error)

    const res = await post({ oportunidadeId: 10, aplicar: true })
    expect(res.status).toBe(409)
  })
})
