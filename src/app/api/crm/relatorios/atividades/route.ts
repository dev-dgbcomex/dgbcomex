import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import {
  consultarAtividades,
  listarUsuariosAtividade,
  type FiltrosRelatorio,
} from "@/lib/crm/relatorios"

export const dynamic = "force-dynamic"

function filtros(req: NextRequest): FiltrosRelatorio {
  const params = req.nextUrl.searchParams
  return {
    periodo: params.get("periodo"),
    de: params.get("de"),
    ate: params.get("ate"),
    usuario: params.get("usuario"),
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const [relatorio, usuarios] = await Promise.all([
      consultarAtividades(filtros(req)),
      listarUsuariosAtividade(),
    ])

    return NextResponse.json({ ...relatorio, usuarios })
  } catch (error) {
    return handleApiError(error, "GET /api/crm/relatorios/atividades")
  }
}
