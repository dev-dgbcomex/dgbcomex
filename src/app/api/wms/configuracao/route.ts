import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { wmsConfigIntegracao } from "@/lib/db/schema/wms-config-integracao"
import { eq } from "drizzle-orm"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const existente = await db
      .select()
      .from(wmsConfigIntegracao)
      .where(eq(wmsConfigIntegracao.nome, "api-microdata-wms"))
      .limit(1)

    if (existente.length === 0) {
      return NextResponse.json(
        { error: "Integração WMS não configurada" },
        { status: 404 }
      )
    }

    return NextResponse.json(existente[0])
  } catch (error) {
    console.error("Erro ao buscar integração WMS:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
