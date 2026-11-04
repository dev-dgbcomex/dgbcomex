// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { ErroErp, requisitarErp } from "@/lib/erp/cliente"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/erp/cliente", () => ({
  ErroErp: class ErroErp extends Error {
    status: number
    constructor(mensagem: string, status = 500) {
      super(mensagem)
      this.status = status
    }
  },
  requisitarErp: vi.fn(),
}))

const lista = {
  paginacao: { total: 1, pagina: 1, por_pagina: 50, total_paginas: 1 },
  itens: [
    {
      empresa: "13",
      pedido: "00006979",
      cliente_cnpj: "61.174.572/0001-81",
      cliente_nome: "LINOFORTE MOVEIS",
      data_pedido: "2026-10-30",
      total_itens: 2,
      quantidade: 100,
      valor_total: 5200,
    },
  ],
}

function get(query = "") {
  return GET(new NextRequest(`http://localhost/api/crm/erp/pedidos${query}`))
}

describe("GET /api/crm/erp/pedidos", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    vi.mocked(requisitarErp).mockReset()
    vi.mocked(requireAuth).mockResolvedValue({ userId: 1 } as any)
    vi.mocked(requisitarErp).mockResolvedValue(lista as any)
  })

  it("retorna 401 sem sessão", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 }) as any
    )
    const res = await get()
    expect(res.status).toBe(401)
  })

  it("devolve a lista de pedidos do ERP", async () => {
    const res = await get()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(lista)
    expect(requisitarErp).toHaveBeenCalledWith("/crm/pedidos?pagina=1&por_pagina=50")
  })

  it("repassa busca e cnpj para a api-microdata", async () => {
    await get("?busca=000069&cnpj=61.174.572%2F0001-81&pagina=2&porPagina=10")
    expect(requisitarErp).toHaveBeenCalledWith(
      "/crm/pedidos?busca=000069&cnpj=61.174.572%2F0001-81&pagina=2&por_pagina=10"
    )
  })

  it("repassa o erro da api-microdata com o status original", async () => {
    vi.mocked(requisitarErp).mockRejectedValue(new ErroErp("api-microdata indisponível.", 503))
    const res = await get()
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: "api-microdata indisponível." })
  })
})
