// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { verificarPedidoFaturado } from "@/lib/crm/verificar-pedido-faturado"
import { POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/crm/verificar-pedido-faturado", () => ({
  verificarPedidoFaturado: vi.fn(),
}))

const session = { session: { user: { name: "Tiago", id: 1 } }, userId: 1 }

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/crm/pedidos-venda/verificar-faturados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  )
}

describe("POST /api/crm/pedidos-venda/verificar-faturados", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset().mockResolvedValue(session as any)
    vi.mocked(verificarPedidoFaturado).mockReset()
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await post({})
    expect(res.status).toBe(401)
  })

  it("devolve preview do pedido vinculado e da nota do ERP", async () => {
    vi.mocked(verificarPedidoFaturado).mockResolvedValue({
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
      sincronizacao: { verificados: 3, atualizados: 1, falhas: 0 },
    })

    const res = await post({ oportunidadeId: 10 })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(vi.mocked(verificarPedidoFaturado)).toHaveBeenCalledWith(undefined, 10)
    expect(body.pedidos).toHaveLength(1)
    expect(body.pedidos[0]).toMatchObject({ pedidoId: 1, nota: { numero: "NF-9" } })
    expect(body.mensagem).toBeNull()
    expect(body.sincronizacao).toEqual({ verificados: 3, atualizados: 1, falhas: 0 })
  })

  it("avisa quando não há pedido vinculado", async () => {
    vi.mocked(verificarPedidoFaturado).mockResolvedValue({
      pedidos: [],
      mensagem: "Vincule ou lance um pedido com o mesmo número de pedido do ERP.",
      sincronizacao: { verificados: 0, atualizados: 0, falhas: 0 },
    })

    const res = await post({})
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pedidos).toHaveLength(0)
    expect(body.mensagem).toBe("Vincule ou lance um pedido com o mesmo número de pedido do ERP.")
  })
})
