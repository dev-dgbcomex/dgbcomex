import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { PromocaoErro, promoverPessoaParaCliente } from "@/lib/crm/promover-cliente"
import { handleApiError } from "@/lib/api-error"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const session = auth.session

    const { id } = await params
    const resultado = await promoverPessoaParaCliente({
      pessoaId: parseInt(id),
      usuarioId: auth.userId,
      usuarioNome: session.user.name,
    })

    return NextResponse.json(resultado)
  } catch (error) {
    if (error instanceof PromocaoErro) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return handleApiError(error, "POST /api/crm/pessoas/[id]/promover-cliente")
  }
}
