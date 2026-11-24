// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { ErroErp } from "@/lib/erp/cliente"
import { POST } from "./route"
import {
  previewVincularFaturado,
  aplicarVinculacaoFaturado,
} from "@/lib/crm/vincular-faturado"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/crm/vincular-faturado", () => ({
  previewVincularFaturado: vi.fn(),
  aplicarVinculacaoFaturado: vi.fn(),
}))

const session = { session: { user: { name: "Tiago", id: 1 } }, userId: 1 }

function post(id: string, body: Record<string, unknown>) {
  return POST(
    new NextRequest(`http://localhost/api/crm/oportunidades/${id}/vincular-faturado`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) }
  )
}

describe("POST /api/crm/oportunidades/[id]/vincular-faturado", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset().mockResolvedValue(session as any)
    vi.mocked(previewVincularFaturado).mockReset()
    vi.mocked(aplicarVinculacaoFaturado).mockReset()
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await post("14", { codigoPedido: "00007046" })
    expect(res.status).toBe(401)
  })

  it("exige código do pedido", async () => {
    const res = await post("14", {})
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Informe o código do pedido de venda do ERP")
  })

  it("faz preview sem aplicar", async () => {
    vi.mocked(previewVincularFaturado).mockResolvedValue({
      notas: [],
      pedidosErp: [],
      valorPedido: 0,
      valorNota: 0,
      valorOportunidadeAntes: 0,
      valorOportunidadeDepois: 0,
      jaVinculado: false,
      pedidosExistentes: [],
      mensagem: null,
    })

    const res = await post("14", { codigoPedido: "00007046" })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(vi.mocked(previewVincularFaturado)).toHaveBeenCalledWith({
      oportunidadeId: 14,
      codigoPedido: "00007046",
    })
    expect(body.mensagem).toBeNull()
  })

  it("aplica o vínculo e retorna resultado", async () => {
    vi.mocked(aplicarVinculacaoFaturado).mockResolvedValue({
      pedidoId: 10,
      numero: "00007046",
      pedidos: [{ id: 10, numero: "00007046", valorPedido: 9162.37 }],
      valorPedido: 9162.37,
      status: "FATURADO",
      faturamentoId: 100,
      nota: { numero: "012754", dataNota: "2026-11-13", valorTotal: 9162.37, empresa: "13", pedido: "013541", pedidoOrigem: "00007046" },
      valorOportunidade: 9162.37,
      conversaoLead: { ok: true },
      automacaoOportunidade: { ok: true },
    })

    const res = await post("14", { codigoPedido: "00007046", nrNota: "012754", aplicar: true })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(vi.mocked(aplicarVinculacaoFaturado)).toHaveBeenCalledWith({
      oportunidadeId: 14,
      codigoPedido: "00007046",
      nrNota: "012754",
      statusPedido: null,
      usuarioNome: "Tiago",
    })
    expect(body.message).toBe("Pedido vinculado e faturamento processado")
    expect(body.pedidoId).toBe(10)
  })

  it("retorna 409 quando ErroErp diz pedido já vinculado", async () => {
    vi.mocked(aplicarVinculacaoFaturado).mockRejectedValue(
      new ErroErp("Este pedido do ERP já está vinculado a outra oportunidade.", 409)
    )

    const res = await post("14", { codigoPedido: "00007046", aplicar: true })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe("Este pedido do ERP já está vinculado a outra oportunidade.")
  })
})
