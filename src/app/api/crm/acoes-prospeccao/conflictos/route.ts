import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmAcoesProspeccao } from "@/lib/db/schema/crm-acoes-prospeccao"
import { crmPessoas } from "@/lib/db/schema/crm-pessoas"
import { clientes } from "@/lib/db/schema/clientes"
import { eq, and } from "drizzle-orm"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(req.url)
    const dataAcao = searchParams.get("dataAcao")
    const hora = searchParams.get("hora")
    const excludeId = searchParams.get("excludeId")

    if (!dataAcao || !hora) {
      return NextResponse.json({ conflictos: [] })
    }

    const conditions = [
      eq(crmAcoesProspeccao.dataAcao, dataAcao),
      eq(crmAcoesProspeccao.hora, hora),
      eq(crmAcoesProspeccao.status, "AGENDADA"),
    ]

    if (excludeId) {
      const { ne } = await import("drizzle-orm")
      conditions.push(ne(crmAcoesProspeccao.id, parseInt(excludeId)))
    }

    const conflictos = await db
      .select({
        id: crmAcoesProspeccao.id,
        dataAcao: crmAcoesProspeccao.dataAcao,
        hora: crmAcoesProspeccao.hora,
        tipo: crmAcoesProspeccao.tipo,
        empresaNome: crmPessoas.razaoSocial,
        clienteNome: clientes.nome,
      })
      .from(crmAcoesProspeccao)
      .leftJoin(crmPessoas, eq(crmAcoesProspeccao.empresaId, crmPessoas.id))
      .leftJoin(clientes, eq(crmAcoesProspeccao.clienteId, clientes.id))
      .where(and(...conditions))

    return NextResponse.json({ conflictos })
  } catch (error) {
    console.error("[GET /api/crm/acoes-prospeccao/conflictos]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
