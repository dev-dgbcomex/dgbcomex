import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { sincronizarColetor } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    return NextResponse.json(await sincronizarColetor())
  } catch (error) {
    return erroWms(error, "POST /api/wms/coletor/sincronizar")
  }
}
