import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import {
  consultarPessoas,
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
      segmento: params.get("segmento"),
      usuario: params.get("usuario"),
    }

    const [relatorio, usuarios] = await Promise.all([
      consultarPessoas(filtros),
      listarUsuariosAtividade(),
    ])

    return NextResponse.json({ ...relatorio, usuarios })
  } catch (error) {
    return handleApiError(error, "GET /api/crm/relatorios/pessoas")
  }
}
