import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmAcoesProspeccao } from "@/lib/db/schema/crm-acoes-prospeccao"
import { crmAcoesProspeccaoPesquisas } from "@/lib/db/schema/crm-acoes-prospeccao-pesquisas"
import { crmPessoas } from "@/lib/db/schema/crm-pessoas"
import { clientes } from "@/lib/db/schema/clientes"
import { usuarios } from "@/lib/db/schema/usuarios"
import { eq, desc, and, gte } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(req.url)
    const filtro = searchParams.get("filtro") || "total"
    const mine = searchParams.get("mine")
    const isMine = mine === "true"

    const conditions: any[] = []
    if (isMine) conditions.push(eq(crmAcoesProspeccao.criadoPor, auth.userId))

    const now = new Date()
    const hoje = now.toISOString().split("T")[0]
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]

    let innerJoinPesquisa = false
    if (filtro === "realizadas") conditions.push(eq(crmAcoesProspeccao.status, "REALIZADA"))
    else if (filtro === "canceladas") conditions.push(eq(crmAcoesProspeccao.status, "CANCELADA"))
    else if (filtro === "agendadas") conditions.push(eq(crmAcoesProspeccao.status, "AGENDADA"))
    else if (filtro === "hoje") conditions.push(eq(crmAcoesProspeccao.dataAcao, hoje))
    else if (filtro === "este-mes") conditions.push(gte(crmAcoesProspeccao.dataAcao, inicioMes))
    else if (filtro === "pesquisas-respondidas") {
      innerJoinPesquisa = true
      conditions.push(eq(crmAcoesProspeccaoPesquisas.status, "RESPONDIDO"))
    } else if (filtro.startsWith("tipo-")) conditions.push(eq(crmAcoesProspeccao.tipo, filtro.slice(5)))
    else if (filtro.startsWith("status-"))
      conditions.push(eq(crmAcoesProspeccao.status, filtro.slice(7)))

    const where = conditions.length > 0 ? and(...conditions) : undefined

    let query = db
      .select({
        id: crmAcoesProspeccao.id,
        dataAcao: crmAcoesProspeccao.dataAcao,
        hora: crmAcoesProspeccao.hora,
        tipo: crmAcoesProspeccao.tipo,
        status: crmAcoesProspeccao.status,
        endereco: crmAcoesProspeccao.endereco,
        numero: crmAcoesProspeccao.numero,
        complemento: crmAcoesProspeccao.complemento,
        bairro: crmAcoesProspeccao.bairro,
        cidade: crmAcoesProspeccao.cidade,
        uf: crmAcoesProspeccao.uf,
        nomeAvulso: crmAcoesProspeccao.nomeAvulso,
        empresaId: crmAcoesProspeccao.empresaId,
        empresaNome: crmPessoas.razaoSocial,
        clienteId: crmAcoesProspeccao.clienteId,
        clienteNome: clientes.nome,
        criadoPorNome: usuarios.name,
        createdAt: crmAcoesProspeccao.createdAt,
      })
      .from(crmAcoesProspeccao)
      .leftJoin(crmPessoas, eq(crmAcoesProspeccao.empresaId, crmPessoas.id))
      .leftJoin(clientes, eq(crmAcoesProspeccao.clienteId, clientes.id))
      .leftJoin(usuarios, eq(crmAcoesProspeccao.criadoPor, usuarios.id))

    if (innerJoinPesquisa) {
      query = query
        .innerJoin(
          crmAcoesProspeccaoPesquisas,
          eq(crmAcoesProspeccaoPesquisas.acaoId, crmAcoesProspeccao.id)
        )
        .distinctOn([crmAcoesProspeccao.id])
    }

    const rows = await query.where(where).orderBy(desc(crmAcoesProspeccao.id)).limit(500)

    return NextResponse.json(
      rows.map((r: any) => ({
        id: r.id,
        dataAcao: r.dataAcao,
        hora: r.hora,
        tipo: r.tipo,
        status: r.status,
        endereco: r.endereco,
        numero: r.numero,
        complemento: r.complemento,
        bairro: r.bairro,
        cidade: r.cidade,
        uf: r.uf,
        nomeAvulso: r.nomeAvulso,
        empresaId: r.empresaId,
        empresaNome: r.empresaNome,
        clienteId: r.clienteId,
        clienteNome: r.clienteNome,
        criadoPorNome: r.criadoPorNome,
        createdAt: r.createdAt,
      }))
    )
  } catch (error) {
    console.error("[GET /api/crm/acoes-prospeccao/dashboard-lista]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
