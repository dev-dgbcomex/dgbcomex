import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmPessoas } from "@/lib/db/schema/crm-pessoas"
import { clientes } from "@/lib/db/schema/clientes"
import { crmContatos } from "@/lib/db/schema/crm-contatos"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmPropostas } from "@/lib/db/schema/crm-propostas"
import { crmVisitas } from "@/lib/db/schema/crm-visitas"
import { eq, and, ne, sql } from "drizzle-orm"
import { registrarLog, notificar } from "@/lib/notificar"
import { promoverPessoaParaCliente } from "@/lib/crm/promover-cliente"
import { handleApiError } from "@/lib/api-error"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const [empresa] = await db
      .select()
      .from(crmPessoas)
      .where(eq(crmPessoas.id, parseInt(id)))
      .limit(1)

    if (!empresa) {
      return NextResponse.json({ error: "Pessoa não encontrada" }, { status: 404 })
    }

    const contatos = await db
      .select()
      .from(crmContatos)
      .where(eq(crmContatos.empresaId, empresa.id))

    const [cliente] = empresa.clienteId
      ? await db
          .select({ id: clientes.id, nome: clientes.nome, cnpj: clientes.cnpj })
          .from(clientes)
          .where(eq(clientes.id, empresa.clienteId))
          .limit(1)
      : []

    const [oportunidades] = await db
      .select({
        total: sql<number>`count(*)::int`,
        valor: sql<number>`coalesce(sum(${crmOportunidades.valorEstimado}), 0)`,
      })
      .from(crmOportunidades)
      .where(eq(crmOportunidades.empresaId, empresa.id))

    const [propostas] = await db
      .select({
        total: sql<number>`count(*)::int`,
        valor: sql<number>`coalesce(sum(${crmPropostas.valor}), 0)`,
      })
      .from(crmPropostas)
      .where(eq(crmPropostas.empresaId, empresa.id))

    const [visitas] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(crmVisitas)
      .where(eq(crmVisitas.empresaId, empresa.id))

    return NextResponse.json({
      ...empresa,
      contatos,
      cliente: cliente || null,
      resumo: {
        oportunidades: oportunidades?.total || 0,
        valorOportunidades: Number(oportunidades?.valor || 0),
        propostas: propostas?.total || 0,
        valorPropostas: Number(propostas?.valor || 0),
        visitas: visitas?.total || 0,
      },
    })
  } catch (error) {
    return handleApiError(error, "GET /api/crm/pessoas/[id]")
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
      .from(crmPessoas)
      .where(eq(crmPessoas.id, parseInt(id)))
      .limit(1)

    if (!existente) {
      return NextResponse.json({ error: "Pessoa não encontrada" }, { status: 404 })
    }

    const cnpj = body.cnpj ? body.cnpj.replace(/[^a-zA-Z0-9]/g, "") : undefined
    const cpf = body.cpf ? body.cpf.replace(/[^0-9]/g, "") : undefined

    if (cnpj) {
      const [duplicado] = await db
        .select({ id: crmPessoas.id })
        .from(crmPessoas)
        .where(and(eq(crmPessoas.cnpj, cnpj), ne(crmPessoas.id, parseInt(id))))
        .limit(1)
      if (duplicado) {
        return NextResponse.json({ error: "CNPJ já cadastrado" }, { status: 409 })
      }
    }

    const values: Record<string, any> = { updatedAt: new Date() }
    if (body.tipoPessoa !== undefined) values.tipoPessoa = body.tipoPessoa
    if (body.nome !== undefined) values.nome = body.nome || null
    if (body.razaoSocial !== undefined) values.razaoSocial = body.razaoSocial || null
    if (body.nomeFantasia !== undefined) values.nomeFantasia = body.nomeFantasia || null
    if (body.cpf !== undefined) values.cpf = cpf || null
    if (body.cnpj !== undefined) values.cnpj = cnpj || null
    if (body.segmento !== undefined) values.segmento = body.segmento || null
    if (body.porte !== undefined) values.porte = body.porte || null
    if (body.site !== undefined) values.site = body.site || null
    if (body.telefone !== undefined) values.telefone = body.telefone || null
    if (body.celular !== undefined) values.celular = body.celular || null
    if (body.email !== undefined) values.email = body.email || null
    if (body.emailNf !== undefined) values.emailNf = body.emailNf || null
    if (body.endereco !== undefined) values.endereco = body.endereco || null
    if (body.numero !== undefined) values.numero = body.numero || null
    if (body.complemento !== undefined) values.complemento = body.complemento || null
    if (body.bairro !== undefined) values.bairro = body.bairro || null
    if (body.cidade !== undefined) values.cidade = body.cidade || null
    if (body.uf !== undefined) values.uf = body.uf || null
    if (body.cep !== undefined) values.cep = body.cep || null
    if (body.observacoes !== undefined) values.observacoes = body.observacoes || null
    if (body.status !== undefined) values.status = body.status
    if (body.responsavelId !== undefined) values.responsavelId = body.responsavelId
    if (body.ativo !== undefined) values.ativo = body.ativo

    const [atualizada] = await db
      .update(crmPessoas)
      .set(values)
      .where(eq(crmPessoas.id, parseInt(id)))
      .returning()

    const nomePessoa = atualizada.nome || atualizada.razaoSocial || "Pessoa"

    if (
      body.status === "CONVERTIDO_CLIENTE" &&
      existente.status !== "CONVERTIDO_CLIENTE" &&
      !atualizada.promovidaCliente
    ) {
      try {
        await promoverPessoaParaCliente({
          pessoaId: atualizada.id,
          usuarioId: auth.userId,
          usuarioNome: session.user.name,
          notificarEquipe: false,
        })
      } catch (err) {
        console.error("[sync-cliente]", err)
      }
    }

    await registrarLog({
      tipo: "ATUALIZACAO",
      acao: "atualizar",
      descricao: `Pessoa atualizada: ${nomePessoa}`,
      entidade: "CrmPessoa",
      entidadeId: atualizada.id,
      usuarioNome: session.user.name,
    })

    await notificar(
      "PESSOA_ATUALIZADA",
      `Pessoa atualizada: ${nomePessoa}`,
      `/comercial/crm/pessoas/${atualizada.id}`,
      session.user.name
    )

    return NextResponse.json(atualizada)
  } catch (error) {
    return handleApiError(error, "PUT /api/crm/pessoas/[id]")
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    return NextResponse.json(
      {
        error:
          "Pessoas não podem ser excluídas: o cadastro é referenciado por veículos, oportunidades, propostas e visitas. Para arquivar, transforme a pessoa em cliente.",
        fkError: true,
      },
      { status: 403 }
    )
  } catch (error) {
    return handleApiError(error, "DELETE /api/crm/pessoas/[id]")
  }
}
