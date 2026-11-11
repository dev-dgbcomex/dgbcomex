import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmContatos } from "@/lib/db/schema/crm-contatos"
import { crmPessoas } from "@/lib/db/schema/crm-pessoas"
import { clientes } from "@/lib/db/schema/clientes"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmVisitas } from "@/lib/db/schema/crm-visitas"
import { crmWhatsappMensagens } from "@/lib/db/schema/crm-whatsapp"
import { eq } from "drizzle-orm"
import { notificar, registrarLog } from "@/lib/notificar"
import { handleApiError } from "@/lib/api-error"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const contatoId = parseInt(id)
    if (Number.isNaN(contatoId)) {
      return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 })
    }

    const [contato] = await db
      .select({
        id: crmContatos.id,
        nome: crmContatos.nome,
        cargo: crmContatos.cargo,
        email: crmContatos.email,
        telefone: crmContatos.telefone,
        celular: crmContatos.celular,
        whatsapp: crmContatos.whatsapp,
        principal: crmContatos.principal,
        observacoes: crmContatos.observacoes,
        empresaId: crmContatos.empresaId,
        empresaNome: crmPessoas.nome,
        empresaRazaoSocial: crmPessoas.razaoSocial,
        empresaNomeFantasia: crmPessoas.nomeFantasia,
        clienteId: crmContatos.clienteId,
        clienteNome: clientes.nome,
        createdAt: crmContatos.createdAt,
        updatedAt: crmContatos.updatedAt,
      })
      .from(crmContatos)
      .leftJoin(crmPessoas, eq(crmContatos.empresaId, crmPessoas.id))
      .leftJoin(clientes, eq(crmContatos.clienteId, clientes.id))
      .where(eq(crmContatos.id, contatoId))
      .limit(1)

    if (!contato) {
      return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 })
    }

    return NextResponse.json(contato)
  } catch (error) {
    return handleApiError(error, "GET /api/crm/contatos/[id]")
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
      .from(crmContatos)
      .where(eq(crmContatos.id, parseInt(id)))
      .limit(1)

    if (!existente) {
      return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 })
    }

    const values: Record<string, any> = { updatedAt: new Date() }
    if (body.nome !== undefined) values.nome = body.nome
    if (body.cargo !== undefined) values.cargo = body.cargo || null
    if (body.email !== undefined) values.email = body.email || null
    if (body.telefone !== undefined) values.telefone = body.telefone || null
    if (body.celular !== undefined) values.celular = body.celular || null
    if (body.whatsapp !== undefined) values.whatsapp = body.whatsapp || null
    if (body.principal !== undefined) values.principal = body.principal
    if (body.observacoes !== undefined) values.observacoes = body.observacoes || null
    if (body.empresaId !== undefined) {
      values.empresaId = body.empresaId ? parseInt(body.empresaId) : null
      if (body.empresaId) values.clienteId = null
    }
    if (body.clienteId !== undefined) {
      values.clienteId = body.clienteId ? parseInt(body.clienteId) : null
      if (body.clienteId) values.empresaId = null
    }

    const [atualizado] = await db
      .update(crmContatos)
      .set(values)
      .where(eq(crmContatos.id, parseInt(id)))
      .returning()

    await notificar(
      "CONTATO_ATUALIZADO",
      `Contato #${id} atualizado`,
      `/comercial/crm/contatos/${id}`,
      session.user.name
    )

    // Vínculo do contato com o cliente é registrado na atividade do cliente.
    const clienteApos = atualizado.clienteId ?? null
    const clienteAntes = existente.clienteId ?? null
    if (clienteApos !== clienteAntes && clienteApos) {
      await registrarLog({
        tipo: "ATUALIZACAO",
        acao: "vincular_contato",
        descricao: `Contato vinculado ao cliente: ${atualizado.nome}`,
        entidade: "CrmCliente",
        entidadeId: clienteApos,
        usuarioNome: session.user?.name,
      })
    } else if (clienteApos !== clienteAntes && clienteAntes) {
      await registrarLog({
        tipo: "ATUALIZACAO",
        acao: "desvincular_contato",
        descricao: `Contato desvinculado do cliente: ${atualizado.nome}`,
        entidade: "CrmCliente",
        entidadeId: clienteAntes,
        usuarioNome: session.user?.name,
      })
    }

    return NextResponse.json(atualizado)
  } catch (error) {
    return handleApiError(error, "PUT /api/crm/contatos/[id]")
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    if ((auth.session.user?.role ?? "") !== "ADMIN" && (auth.session.user?.role ?? "") !== "SUDO") {
      return NextResponse.json({ error: "Apenas administradores podem excluir" }, { status: 403 })
    }

    const { id } = await params
    const contatoId = parseInt(id)
    await db.transaction(async (tx: any) => {
      await tx
        .update(crmOportunidades)
        .set({ contatoId: null })
        .where(eq(crmOportunidades.contatoId, contatoId))
      await tx
        .update(crmVisitas)
        .set({ contatoId: null })
        .where(eq(crmVisitas.contatoId, contatoId))
      await tx
        .update(crmWhatsappMensagens)
        .set({ contatoId: null })
        .where(eq(crmWhatsappMensagens.contatoId, contatoId))
      await tx.delete(crmContatos).where(eq(crmContatos.id, contatoId))
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, "DELETE /api/crm/contatos/[id]")
  }
}
