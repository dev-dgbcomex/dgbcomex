import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { podeColetarWms } from "@/lib/wms/permissoes"
import { obterDashboardColetor } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    if (!podeColetarWms(auth.session.user?.role)) {
      return NextResponse.json(
        { error: "Seu perfil não pode acessar o coletor" },
        { status: 403 }
      )
    }

    return NextResponse.json(await obterDashboardColetor())
  } catch (error) {
    return erroWms(error, "GET /api/wms/coletor/dashboard")
  }
}
