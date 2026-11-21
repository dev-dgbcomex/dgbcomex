import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmVisitantes } from "@/lib/db/schema/crm-visitantes"
import { crmLeads } from "@/lib/db/schema/crm-leads"
import { eq } from "drizzle-orm"
import { registrarLog, notificar, notificarDelecao } from "@/lib/notificar"
import { inserirTimelineEvento, excluirTimelineEventosEntidade } from "@/lib/crm-timeline"
import { handleApiError } from "@/lib/api-error"
import { excluirOportunidadeCascade } from "@/lib/crm-cascade"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { podeGerenciarTudo } from "@/lib/permissoes"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const [lead] = await db
      .select()
      .from(crmVisitantes)
      .where(eq(crmVisitantes.id, parseInt(id)))
      .limit(1)

    if (!lead) {
      return NextResponse.json({ error: "Visitante não encontrado" }, { status: 404 })
    }

    return NextResponse.json(lead)
  } catch (error) {
    return handleApiError(error, "GET /api/crm/visitantes/[id]")
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const session = auth.session

    const { id } = await params
    const body = await req.json()

    const [existente] = await db
      .select()
      .from(crmVisitantes)
      .where(eq(crmVisitantes.id, parseInt(id)))
      .limit(1)

    if (!existente) {
      return NextResponse.json({ error: "Visitante não encontrado" }, { status: 404 })
    }

    const values: Record<string, any> = { updatedAt: new Date() }
    if (body.nome !== undefined) values.nome = body.nome
    if (body.email !== undefined) values.email = body.email || null
    if (body.telefone !== undefined) values.telefone = body.telefone || null
    if (body.celular !== undefined) values.celular = body.celular || null
    if (body.empresaNome !== undefined) values.empresaNome = body.empresaNome || null
    if (body.cargo !== undefined) values.cargo = body.cargo || null
    if (body.origem !== undefined) values.origem = body.origem
    if (body.documento !== undefined) values.documento = body.documento || null
    if (body.status !== undefined) values.status = body.status
    if (body.descricao !== undefined) values.descricao = body.descricao || null
    if (body.responsavelId !== undefined) values.responsavelId = body.responsavelId
    if (body.empresaId !== undefined) values.empresaId = body.empresaId
    if (body.pessoaId !== undefined) values.pessoaId = body.pessoaId

    const [atualizado] = await db
      .update(crmVisitantes)
      .set(values)
      .where(eq(crmVisitantes.id, parseInt(id)))
      .returning()

    await registrarLog({
      tipo: "ATUALIZACAO",
      acao: "atualizar",
      descricao: `Visitante atualizado: ${atualizado.nome}`,
      entidade: "CrmVisitante",
      entidadeId: atualizado.id,
      usuarioNome: session.user.name,
    })

    if (body.status && body.status !== existente.status && atualizado.empresaId) {
      await inserirTimelineEvento({
        empresaId: atualizado.empresaId,
        tipo: "VISITANTE",
        descricao: `Visitante "${atualizado.nome}" mudou para "${body.status}"`,
        metadados: {
          visitanteId: atualizado.id,
          statusAnterior: existente.status,
          statusNovo: body.status,
        },
      })
    }

    // Se mudou para CONVERTIDO, criar lead automaticamente (só se não veio pessoaId no body)
    if (body.status === "CONVERTIDO" && body.status !== existente.status && !body.pessoaId) {
      const leadData: Record<string, any> = {
        nome: atualizado.nome || existente.nome,
        email: atualizado.email || existente.email,
        telefone: atualizado.telefone || existente.telefone,
        celular: atualizado.celular || existente.celular,
        responsavelId: atualizado.responsavelId || existente.responsavelId,
        tipoPessoa: atualizado.tipoPessoa || existente.tipoPessoa || "PF",
      }

      const doc = atualizado.documento || existente.documento
      if (doc) {
        if (leadData.tipoPessoa === "PF") leadData.cpf = doc
        else leadData.cnpj = doc
      }

      if (atualizado.empresaNome || existente.empresaNome) {
        leadData.razaoSocial = atualizado.empresaNome || existente.empresaNome
      }

      const [lead] = await db.insert(crmLeads).values(leadData).returning()

      // Vincular a lead criada ao lead
      await db
        .update(crmVisitantes)
        .set({ pessoaId: lead.id, updatedAt: new Date() })
        .where(eq(crmVisitantes.id, atualizado.id))

      await inserirTimelineEvento({
        empresaId: atualizado.empresaId!,
        tipo: "VISITANTE",
        descricao: `Visitante "${atualizado.nome}" convertido em lead (ID ${lead.id})`,
        metadados: { visitanteId: atualizado.id, leadId: lead.id },
      })
    }

    await notificar(
      "VISITANTE_ATUALIZADO",
      `Visitante atualizado: ${atualizado.nome}`,
      `/comercial/crm/visitantes/${atualizado.id}`,
      session.user.name
    )

    return NextResponse.json(atualizado)
  } catch (error) {
    return handleApiError(error, "PUT /api/crm/visitantes/[id]")
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    if (!podeGerenciarTudo(auth.session.user?.role)) {
      return NextResponse.json({ error: "Sem permissão para excluir" }, { status: 403 })
    }

    const { id } = await params
    const visitanteId = parseInt(id)
    await db.transaction(async (tx: any) => {
      const opors = await tx
        .select({ id: crmOportunidades.id })
        .from(crmOportunidades)
        .where(eq(crmOportunidades.leadId, visitanteId))
      for (const o of opors) {
        await excluirOportunidadeCascade(tx, o.id)
      }
      await excluirTimelineEventosEntidade(
        { tipo: "VISITANTE", campo: "visitanteId", id: visitanteId },
        tx
      )
      await excluirTimelineEventosEntidade({ tipo: "LEAD", campo: "leadId", id: visitanteId }, tx)
      await tx.delete(crmVisitantes).where(eq(crmVisitantes.id, visitanteId))
    })

    await notificarDelecao("Visitante CRM", id, auth.session.user.name)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, "DELETE /api/crm/visitantes/[id]")
  }
}
