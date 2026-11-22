import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmLeads } from "@/lib/db/schema/crm-leads"
import { clientes } from "@/lib/db/schema/clientes"
import { crmContatos } from "@/lib/db/schema/crm-contatos"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmPropostas } from "@/lib/db/schema/crm-propostas"
import { crmVisitas } from "@/lib/db/schema/crm-visitas"
import { crmAcoesProspeccao } from "@/lib/db/schema/crm-acoes-prospeccao"
import { eq, and, ne, sql } from "drizzle-orm"
import { registrarLog, notificar } from "@/lib/notificar"
import { processarAutomacaoCRM, type DecisaoAutomacao } from "@/lib/crm/automacoes-crm"
import { handleApiError } from "@/lib/api-error"
import { digitosDocumento, formatarDocumento, validarDocumento } from "@/lib/documento"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const [empresa] = await db
      .select()
      .from(crmLeads)
      .where(eq(crmLeads.id, parseInt(id)))
      .limit(1)

    if (!empresa) {
      return NextResponse.json({ error: "Lead não encontrada" }, { status: 404 })
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

    const [acoes] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(crmAcoesProspeccao)
      .where(eq(crmAcoesProspeccao.empresaId, empresa.id))

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
        acoes: acoes?.total || 0,
      },
    })
  } catch (error) {
    return handleApiError(error, "GET /api/crm/leads/[id]")
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
      .from(crmLeads)
      .where(eq(crmLeads.id, parseInt(id)))
      .limit(1)

    if (!existente) {
      return NextResponse.json({ error: "Lead não encontrada" }, { status: 404 })
    }

    const tipoPessoa = body.tipoPessoa ?? existente.tipoPessoa
    const cnpjDigitado = body.cnpj ? String(body.cnpj) : ""
    const cpfDigitado = body.cpf ? String(body.cpf) : ""

    const erroCnpj = tipoPessoa === "PJ" && cnpjDigitado ? validarDocumento(cnpjDigitado, "CNPJ") : null
    if (erroCnpj) return NextResponse.json({ error: erroCnpj }, { status: 400 })
    const erroCpf = tipoPessoa === "PF" && cpfDigitado ? validarDocumento(cpfDigitado, "CPF") : null
    if (erroCpf) return NextResponse.json({ error: erroCpf }, { status: 400 })

    const cnpj = body.cnpj !== undefined && cnpjDigitado ? formatarDocumento(cnpjDigitado, "CNPJ") : undefined
    const cpf = body.cpf !== undefined && cpfDigitado ? formatarDocumento(cpfDigitado, "CPF") : undefined

    if (cnpj) {
      const [duplicado] = await db
        .select({ id: crmLeads.id })
        .from(crmLeads)
        .where(
          and(
            sql`regexp_replace(${crmLeads.cnpj}, '\\D', '', 'g') = ${digitosDocumento(cnpj)}`,
            ne(crmLeads.id, parseInt(id))
          )
        )
        .limit(1)
      if (duplicado) {
        return NextResponse.json({ error: "CNPJ já cadastrado" }, { status: 409 })
      }
    }

    if (cpf) {
      const [duplicado] = await db
        .select({ id: crmLeads.id })
        .from(crmLeads)
        .where(
          and(
            sql`regexp_replace(${crmLeads.cpf}, '\\D', '', 'g') = ${digitosDocumento(cpf)}`,
            ne(crmLeads.id, parseInt(id))
          )
        )
        .limit(1)
      if (duplicado) {
        return NextResponse.json({ error: "CPF já cadastrado" }, { status: 409 })
      }
    }

    const statusAlterado = body.status !== undefined && body.status !== existente.status
    const arquivadoAlterado = body.arquivado !== undefined && body.arquivado !== existente.arquivado
    let automacao: Awaited<ReturnType<typeof processarAutomacaoCRM>> | undefined

    if (statusAlterado || arquivadoAlterado) {
      const decisaoArquivamento = body.arquivado ? "ARQUIVAR" : "DESARQUIVAR"
      automacao = await processarAutomacaoCRM({
        entidade: "LEAD",
        entidadeId: existente.id,
        acao: "ALTERAR_STATUS",
        statusAnterior: existente.status,
        statusNovo: body.status ?? existente.status,
        decisao: (body.decisao as DecisaoAutomacao | undefined) ?? decisaoArquivamento,
        autor: { id: auth.userId, nome: session.user.name },
        origem: "API",
      })
      if (!automacao.ok) {
        return NextResponse.json(
          {
            error: automacao.bloqueio || automacao.decisaoPendente?.mensagem || "Operação bloqueada",
            decisaoPendente: automacao.decisaoPendente,
            automacao,
          },
          { status: automacao.decisaoPendente ? 409 : 400 }
        )
      }
    }

    const values: Partial<typeof crmLeads.$inferInsert> = { updatedAt: new Date() }
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
    if (body.responsavelId !== undefined) values.responsavelId = body.responsavelId
    if (body.ativo !== undefined) values.ativo = body.ativo

    const [atualizada] = await db
      .update(crmLeads)
      .set(values)
      .where(eq(crmLeads.id, parseInt(id)))
      .returning()

    const nomeLead = atualizada.nome || atualizada.razaoSocial || "Lead"

    if (!statusAlterado && !arquivadoAlterado) {
      await registrarLog({
        tipo: "ATUALIZACAO",
        acao: "atualizar",
        descricao: `Lead atualizada: ${nomeLead}`,
        entidade: "CrmLead",
        entidadeId: atualizada.id,
        usuarioNome: session.user.name,
      })

      await notificar(
        "LEAD_ATUALIZADO",
        `Lead atualizada: ${nomeLead}`,
        `/comercial/crm/leads/${atualizada.id}`,
        session.user.name
      )
    }

    return NextResponse.json({ ...atualizada, automacao })
  } catch (error) {
    return handleApiError(error, "PUT /api/crm/leads/[id]")
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    return NextResponse.json(
      {
        error:
          "Leads não podem ser excluídas: o cadastro é referenciado por veículos, oportunidades, propostas e visitas. Para arquivar, transforme a lead em cliente.",
        fkError: true,
      },
      { status: 403 }
    )
  } catch (error) {
    return handleApiError(error, "DELETE /api/crm/leads/[id]")
  }
}
