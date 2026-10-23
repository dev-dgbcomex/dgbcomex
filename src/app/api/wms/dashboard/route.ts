import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { dashboard } from "@/lib/wms/repo"
import { erroWms } from "@/lib/wms/resposta-erro"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    return NextResponse.json(await dashboard())
  } catch (error) {
    return erroWms(error, "GET /api/wms/dashboard")
  }
}
