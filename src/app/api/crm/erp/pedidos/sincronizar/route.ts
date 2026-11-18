import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { ErroErp, requisitarErp } from "@/lib/erp/cliente"
import { atualizarEspelhosErp, type ResultadoEspelhos } from "@/lib/crm/erp-espelho"

export const dynamic = "force-dynamic"

/** Varre todos os pedidos do ERP no warehouse local e atualiza os espelhos já vinculados. */
export async function POST() {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const dados = await requisitarErp<{
      desde: string | null
      documentos: number
      itens: number
      espelhos?: ResultadoEspelhos
    }>("/crm/pedidos/sincronizar", { metodo: "POST" })
    const espelhos = await atualizarEspelhosErp("PEDIDO")

    return NextResponse.json({ ...dados, espelhos })
  } catch (error) {
    if (error instanceof ErroErp) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[POST /api/crm/erp/pedidos/sincronizar]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
