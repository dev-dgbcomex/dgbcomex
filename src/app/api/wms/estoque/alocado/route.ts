import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { listarPecasAlocadas } from "@/lib/wms/repo"

export async function GET() {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    return NextResponse.json(await listarPecasAlocadas())
  } catch (error) {
    return handleApiError(error, "GET /api/wms/estoque/alocado")
  }
}
