import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import {
  consultarOportunidades,
  listarUsuariosAtividade,
  type FiltrosRelatorio,
} from "@/lib/crm/relatorios"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const params = req.nextUrl.searchParams
    const filtros: FiltrosRelatorio = {
      periodo: params.get("periodo"),
      de: params.get("de"),
      ate: params.get("ate"),
      status: params.get("status"),
      usuario: params.get("usuario"),
    }

    const [relatorio, usuarios] = await Promise.all([
      consultarOportunidades(filtros),
      listarUsuariosAtividade(),
    ])

    return NextResponse.json({ ...relatorio, usuarios })
  } catch (error) {
    return handleApiError(error, "GET /api/crm/relatorios/oportunidades")
  }
}
