import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmPropostas } from "@/lib/db/schema/crm-propostas"
import { crmPessoas } from "@/lib/db/schema/crm-pessoas"
import { crmContatos } from "@/lib/db/schema/crm-contatos"
import { clientes } from "@/lib/db/schema/clientes"
import { usuarios } from "@/lib/db/schema/usuarios"
import { crmFaturamentos } from "@/lib/db/schema/crm-faturamentos"
import { crmFaturamentoItens } from "@/lib/db/schema/crm-faturamento-itens"
import { crmPedidosVenda } from "@/lib/db/schema/crm-pedidos-venda"
import { crmPedidoVendaItens } from "@/lib/db/schema/crm-pedido-venda-itens"
import { eq, desc, sql } from "drizzle-orm"
import { registrarLog, notificar, notificarDelecao } from "@/lib/notificar"
import { handleApiError } from "@/lib/api-error"
import { excluirOportunidadeCascade } from "@/lib/crm-cascade"
import { processarAutomacaoCRM, type DecisaoAutomacao } from "@/lib/crm/automacoes-crm"
import { podeGerenciarTudo } from "@/lib/permissoes"
import { validarCamposObrigatoriosOportunidade } from "@/lib/crm/validacao-oportunidade"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const [oportunidade] = await db
      .select({
        id: crmOportunidades.id,
        titulo: crmOportunidades.titulo,
        descricao: crmOportunidades.descricao,
        valorEstimado: crmOportunidades.valorEstimado,
        status: crmOportunidades.status,
        leadId: crmOportunidades.leadId,
        empresaId: crmOportunidades.empresaId,
        empresaNome: crmPessoas.razaoSocial,
        empresaCnpj: crmPessoas.cnpj,
        clienteId: crmOportunidades.clienteId,
        clienteNome: clientes.nome,
        contatoId: crmOportunidades.contatoId,
        responsavelId: crmOportunidades.responsavelId,
        responsavelNome: usuarios.name,
        dataFechamentoPrevista: crmOportunidades.dataFechamentoPrevista,
        probabilidade: crmOportunidades.probabilidade,
        motivoPerda: crmOportunidades.motivoPerda,
        createdAt: crmOportunidades.createdAt,
        updatedAt: crmOportunidades.updatedAt,
      })
      .from(crmOportunidades)
      .leftJoin(crmPessoas, eq(crmOportunidades.empresaId, crmPessoas.id))
      .leftJoin(clientes, eq(crmOportunidades.clienteId, clientes.id))
      .leftJoin(usuarios, eq(crmOportunidades.responsavelId, usuarios.id))
      .where(eq(crmOportunidades.id, parseInt(id)))
      .limit(1)

    if (!oportunidade) {
      return NextResponse.json({ error: "Oportunidade não encontrada" }, { status: 404 })
    }

    const contatos = oportunidade.contatoId
      ? await db
          .select()
          .from(crmContatos)
          .where(eq(crmContatos.id, oportunidade.contatoId))
          .limit(1)
      : []

    const propostas = await db
      .select({
        id: crmPropostas.id,
        titulo: crmPropostas.titulo,
        valor: crmPropostas.valor,
        status: crmPropostas.status,
        dataEnvio: crmPropostas.dataEnvio,
        createdAt: crmPropostas.createdAt,
      })
      .from(crmPropostas)
      .where(eq(crmPropostas.oportunidadeId, parseInt(id)))
      .orderBy(desc(crmPropostas.createdAt))

    const opId = parseInt(id)

    const faturamentos = await db
      .select({
        id: crmFaturamentos.id,
        numero: crmFaturamentos.numero,
        status: crmFaturamentos.status,
        origem: crmFaturamentos.origem,
        referenciaExterna: crmFaturamentos.referenciaExterna,
        dataEmissao: crmFaturamentos.dataEmissao,
        createdAt: crmFaturamentos.createdAt,
        total: sql<number>`coalesce(sum(${crmFaturamentoItens.valorTotal}), 0)`,
      })
      .from(crmFaturamentos)
      .leftJoin(crmFaturamentoItens, eq(crmFaturamentoItens.faturamentoId, crmFaturamentos.id))
      .where(eq(crmFaturamentos.oportunidadeId, opId))
      .groupBy(crmFaturamentos.id)
      .orderBy(desc(crmFaturamentos.createdAt))

    const pedidosVenda = await db
      .select({
        id: crmPedidosVenda.id,
        numero: crmPedidosVenda.numero,
        status: crmPedidosVenda.status,
        origem: crmPedidosVenda.origem,
        referenciaExterna: crmPedidosVenda.referenciaExterna,
        dataEmissao: crmPedidosVenda.dataEmissao,
        createdAt: crmPedidosVenda.createdAt,
        total: sql<number>`coalesce(sum(${crmPedidoVendaItens.valorTotal}), 0)`,
      })
      .from(crmPedidosVenda)
      .leftJoin(crmPedidoVendaItens, eq(crmPedidoVendaItens.pedidoVendaId, crmPedidosVenda.id))
      .where(eq(crmPedidosVenda.oportunidadeId, opId))
      .groupBy(crmPedidosVenda.id)
      .orderBy(desc(crmPedidosVenda.createdAt))

    return NextResponse.json({
      ...oportunidade,
      contato: contatos[0] || null,
      propostas,
      faturamentos,
      pedidosVenda,
    })
  } catch (error) {
    return handleApiError(error, "GET /api/crm/oportunidades/[id]")
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
      .from(crmOportunidades)
      .where(eq(crmOportunidades.id, parseInt(id)))
      .limit(1)

    if (!existente) {
      return NextResponse.json({ error: "Oportunidade não encontrada" }, { status: 404 })
    }

    const statusDestino = body.status !== undefined ? body.status : existente.status
    const validacao = validarCamposObrigatoriosOportunidade({
      status: statusDestino,
      valorEstimado: body.valorEstimado !== undefined ? body.valorEstimado : existente.valorEstimado,
      probabilidade:
        body.probabilidade !== undefined ? body.probabilidade : existente.probabilidade,
    })

    if (!validacao.valido) {
      return NextResponse.json(
        {
          error: validacao.mensagem,
          validacaoObrigatoria: validacao,
        },
        { status: 409 }
      )
    }

    const statusAlterado = body.status !== undefined && body.status !== existente.status
    let automacao: Awaited<ReturnType<typeof processarAutomacaoCRM>> | undefined

    if (statusAlterado) {
      automacao = await processarAutomacaoCRM({
        entidade: "OPORTUNIDADE",
        entidadeId: existente.id,
        acao: "ALTERAR_STATUS",
        statusAnterior: existente.status,
        statusNovo: body.status,
        motivoPerda: body.motivoPerda,
        decisao: body.decisao as DecisaoAutomacao | undefined,
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

    const values: Record<string, any> = { updatedAt: new Date() }
    if (body.titulo !== undefined) values.titulo = body.titulo
    if (body.descricao !== undefined) values.descricao = body.descricao || null
    if (body.valorEstimado !== undefined) values.valorEstimado = body.valorEstimado || null
    if (body.leadId !== undefined) values.leadId = body.leadId
    if (body.empresaId !== undefined) values.empresaId = body.empresaId
    if (body.clienteId !== undefined) values.clienteId = body.clienteId
    if (body.contatoId !== undefined) values.contatoId = body.contatoId
    if (body.responsavelId !== undefined) values.responsavelId = body.responsavelId
    if (body.dataFechamentoPrevista !== undefined)
      values.dataFechamentoPrevista = body.dataFechamentoPrevista || null
    if (body.probabilidade !== undefined) values.probabilidade = body.probabilidade
    if (!statusAlterado && body.motivoPerda !== undefined) values.motivoPerda = body.motivoPerda || null

    const [atualizada] = await db
      .update(crmOportunidades)
      .set(values)
      .where(eq(crmOportunidades.id, parseInt(id)))
      .returning()

    if (!statusAlterado) {
      await registrarLog({
        tipo: "ATUALIZACAO",
        acao: "atualizar",
        descricao: `Oportunidade atualizada: ${atualizada.titulo}`,
        entidade: "CrmOportunidade",
        entidadeId: atualizada.id,
        usuarioNome: session.user.name,
      })

      await notificar(
        "OPORTUNIDADE_ATUALIZADA",
        `Oportunidade atualizada: ${atualizada.titulo}`,
        `/comercial/crm/oportunidades/${atualizada.id}`,
        session.user.name
      )
    }

    return NextResponse.json({
      ...atualizada,
      automacao,
      gatilhos: automacao?.gatilhos || { executadas: [], puladas: [], erros: [] },
    })
  } catch (error) {
    return handleApiError(error, "PUT /api/crm/oportunidades/[id]")
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
    await db.transaction((tx: any) => excluirOportunidadeCascade(tx, parseInt(id)))

    await notificarDelecao("Oportunidade CRM", id, auth.session.user.name)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, "DELETE /api/crm/oportunidades/[id]")
  }
}
