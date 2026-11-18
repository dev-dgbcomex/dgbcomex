import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { ErroErp, requisitarErp } from "@/lib/erp/cliente"

export const dynamic = "force-dynamic"

/** Carrega no warehouse local apenas os pedidos do ERP posteriores ao último já espelhado. */
export async function POST() {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const dados = await requisitarErp<{
      desde: string | null
      documentos: number
      itens: number
    }>("/crm/pedidos/sincronizar", { metodo: "POST" })

    return NextResponse.json(dados)
  } catch (error) {
    if (error instanceof ErroErp) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[POST /api/crm/erp/pedidos/sincronizar]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
