import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmVisitantes } from "@/lib/db/schema/crm-visitantes"
import { crmLeads } from "@/lib/db/schema/crm-leads"
import { usuarios } from "@/lib/db/schema/usuarios"
import { eq, desc, like, or, sql } from "drizzle-orm"
import { registrarLog, notificar } from "@/lib/notificar"
import { notificarAtividadeComercial } from "@/lib/crm/notificar-atividade"
import { inserirTimelineEvento } from "@/lib/crm-timeline"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")
    const status = searchParams.get("status")
    const empresaId = searchParams.get("empresaId")

    let conditions = []
    if (status) conditions.push(eq(crmVisitantes.status, status))
    if (empresaId) {
      conditions.push(
        or(eq(crmVisitantes.empresaId, parseInt(empresaId)), eq(crmVisitantes.pessoaId, parseInt(empresaId)))
      )
    }
    if (search) {
      conditions.push(
        or(
          like(crmVisitantes.nome, `%${search}%`),
          like(crmVisitantes.email, `%${search}%`),
          like(crmVisitantes.empresaNome, `%${search}%`)
        )
      )
    }

    const where =
      conditions.length > 0
        ? sql`${conditions.reduce((a: any, b: any) => sql`${a} AND ${b}`)}`
        : undefined

    const lista = await db
      .select({
        id: crmVisitantes.id,
        nome: crmVisitantes.nome,
        email: crmVisitantes.email,
        telefone: crmVisitantes.telefone,
        celular: crmVisitantes.celular,
        empresaNome: crmVisitantes.empresaNome,
        cargo: crmVisitantes.cargo,
        tipoPessoa: crmVisitantes.tipoPessoa,
        documento: crmVisitantes.documento,
        origem: crmVisitantes.origem,
        status: crmVisitantes.status,
        descricao: crmVisitantes.descricao,
        score: crmVisitantes.score,
        segmentoIa: crmVisitantes.segmentoIa,
        porteIa: crmVisitantes.porteIa,
        dataClassificacaoIa: crmVisitantes.dataClassificacaoIa,
        responsavelId: crmVisitantes.responsavelId,
        responsavelNome: usuarios.name,
        empresaId: crmVisitantes.empresaId,
        pessoaId: crmVisitantes.pessoaId,
        empresaNomeFantasia: crmLeads.nomeFantasia,
        empresaRazaoSocial: crmLeads.razaoSocial,
        createdAt: crmVisitantes.createdAt,
        updatedAt: crmVisitantes.updatedAt,
      })
      .from(crmVisitantes)
      .leftJoin(usuarios, eq(crmVisitantes.responsavelId, usuarios.id))
      .leftJoin(
        crmLeads,
        sql`${crmLeads.id} = COALESCE(${crmVisitantes.pessoaId}, ${crmVisitantes.empresaId})`
      )
      .where(where)
      .orderBy(desc(crmVisitantes.createdAt))

    return NextResponse.json(lista)
  } catch (error) {
    console.error("[GET /api/crm/visitantes]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const session = auth.session
    const userId = auth.userId

    const body = await req.json()

    const [novo] = await db
      .insert(crmVisitantes)
      .values({
        nome: body.nome,
        email: body.email || null,
        telefone: body.telefone || null,
        celular: body.celular || null,
        empresaNome: body.empresaNome || null,
        cargo: body.cargo || null,
        origem: body.origem || "OUTRO",
        documento: body.documento || null,
        descricao: body.descricao || null,
        responsavelId: body.responsavelId || userId,
        empresaId: body.empresaId || null,
        status: "NOVO",
      })
      .returning()

    await registrarLog({
      tipo: "CADASTRO",
      acao: "criar",
      descricao: `Visitante criado: ${novo.nome}`,
      entidade: "CrmVisitante",
      entidadeId: novo.id,
      usuarioNome: session.user.name,
    })

    if (novo.empresaId) {
      await inserirTimelineEvento({
        empresaId: novo.empresaId,
        tipo: "VISITANTE",
        descricao: `Visitante "${novo.nome}" foi vinculado a esta empresa`,
        metadados: { visitanteId: novo.id },
      })
    }

    await notificar(
      "VISITANTE_CRIADO",
      `Visitante criado: ${novo.nome}`,
      `/comercial/crm/visitantes/${novo.id}`,
      session.user.name
    )

    await notificarAtividadeComercial({
      acao: "cadastrou o visitante",
      entidade: "Visitante",
      registro: novo.nome,
      link: `/comercial/crm/visitantes/${novo.id}`,
      usuarioNome: session.user.name,
      usuarioId: userId,
    })

    return NextResponse.json(novo, { status: 201 })
  } catch (error) {
    console.error("[POST /api/crm/visitantes]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
