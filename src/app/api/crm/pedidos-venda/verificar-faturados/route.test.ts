// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { atualizarEspelhosErp } from "@/lib/crm/erp-espelho"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { POST } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }))
vi.mock("@/lib/crm/erp-espelho", () => ({ atualizarEspelhosErp: vi.fn() }))

const session = { session: { user: { name: "Tiago" } }, userId: 1 }

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
    resetDb(db)
    vi.mocked(requireAuth).mockReset().mockResolvedValue(session as any)
    vi.mocked(atualizarEspelhosErp).mockReset().mockResolvedValue({
      verificados: 3,
      atualizados: 1,
      falhas: 0,
    })
  })

  it("retorna 401 sem autenticação", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await post({})
    expect(res.status).toBe(401)
  })

  it("só devolve pedidos com nota de faturamento no ERP", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(
        createQueryBuilder([
          {
            pedidoId: 1,
            numero: "PV-1",
            referenciaExterna: "1/PV-1",
            oportunidadeId: 10,
            oportunidadeTitulo: "Malha",
            leadId: 4,
            leadNome: "Malhas Brasil",
            leadRazaoSocial: null,
            jaConvertida: false,
          },
          {
            pedidoId: 2,
            numero: "PV-2",
            referenciaExterna: "1/PV-2",
            oportunidadeId: 11,
            oportunidadeTitulo: "Outra",
            leadId: 5,
            leadNome: "Outra lead",
            leadRazaoSocial: null,
            jaConvertida: false,
          },
        ])
      )
      .mockReturnValueOnce(
        createQueryBuilder([
          { numero: "NF-9", dataEmissao: "2026-11-20", referenciaExterna: "1/PV-1" },
        ])
      )

    const res = await post({})
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.candidatos).toHaveLength(1)
    expect(body.candidatos[0]).toMatchObject({ pedidoId: 1, nota: "NF-9" })
    expect(body.sincronizacao).toEqual({ verificados: 3, atualizados: 1, falhas: 0 })
  })
})
