import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { usuarios } from "@/lib/db/schema/usuarios"
import { eq } from "drizzle-orm"
import { handleApiError } from "@/lib/api-error"
export const dynamic = "force-dynamic"

/** Ids válidos dos gráficos do detalhe de faturamento. Fica em paridade com o front. */
const GRAFICOS = ["mes", "clientes", "produtos", "participacao"] as const
type IdGrafico = (typeof GRAFICOS)[number]

function idsValidos(lista: unknown): IdGrafico[] {
  if (!Array.isArray(lista)) return []
  const validos = lista.filter((id): id is IdGrafico =>
    GRAFICOS.includes(id as IdGrafico)
  )
  return [...new Set(validos)]
}

export async function GET() {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const [user] = await db
      .select({ biOrdemGraficos: usuarios.biOrdemGraficos })
      .from(usuarios)
      .where(eq(usuarios.id, auth.userId))

    return NextResponse.json({ ids: idsValidos(user?.biOrdemGraficos ?? []) })
  } catch (error) {
    return handleApiError(error, "FaturamentoOrdemGraficosGet")
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const body = await req.json().catch(() => null)
    const ids = idsValidos(body?.ids)
    if (ids.length === 0) {
      return NextResponse.json({ error: "Lista de ids inválida" }, { status: 400 })
    }

    await db
      .update(usuarios)
      .set({ biOrdemGraficos: ids })
      .where(eq(usuarios.id, auth.userId))

    return NextResponse.json({ success: true, ids })
  } catch (error) {
    return handleApiError(error, "FaturamentoOrdemGraficosPut")
  }
}