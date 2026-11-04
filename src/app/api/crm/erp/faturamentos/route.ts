import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { ErroErp, requisitarErp } from "@/lib/erp/cliente"
import type { FaturamentoErp, ListaErp } from "@/lib/erp/tipos"

export const dynamic = "force-dynamic"

/** Lista os faturamentos (notas) do ERP para o CRM vincular numa pessoa/oportunidade. */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const params = req.nextUrl.searchParams
    const busca = params.get("busca")?.trim() || ""
    const cnpj = params.get("cnpj")?.trim() || ""
    const pagina = Math.max(1, parseInt(params.get("pagina") || "1"))
    const porPagina = Math.min(200, Math.max(1, parseInt(params.get("porPagina") || "50")))

    const query = new URLSearchParams()
    if (busca) query.set("busca", busca)
    if (cnpj) query.set("cnpj", cnpj)
    query.set("pagina", String(pagina))
    query.set("por_pagina", String(porPagina))

    const dados = await requisitarErp<ListaErp<FaturamentoErp>>(
      `/crm/faturamentos?${query.toString()}`
    )

    return NextResponse.json(dados)
  } catch (error) {
    if (error instanceof ErroErp) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[GET /api/crm/erp/faturamentos]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
