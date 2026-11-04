import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { consultarHistoricoPromocao } from "@/lib/crm/historico-promocao"

export const dynamic = "force-dynamic"

/** Histórico de conversão: de qual pessoa do CRM este cliente veio. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const clienteId = parseInt(id)
    if (!clienteId || Number.isNaN(clienteId)) {
      return NextResponse.json({ error: "Cliente é obrigatório" }, { status: 400 })
    }

    const historico = await consultarHistoricoPromocao(clienteId)
    return NextResponse.json({ historico })
  } catch (error) {
    return handleApiError(error, "GET /api/clientes/[id]/historico")
  }
}
