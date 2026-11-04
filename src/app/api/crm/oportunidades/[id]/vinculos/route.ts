import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { crmOportunidades } from "@/lib/db/schema/crm-oportunidades"
import { crmPessoas } from "@/lib/db/schema/crm-pessoas"
import { crmPedidosVenda } from "@/lib/db/schema/crm-pedidos-venda"
import { crmPedidoVendaItens } from "@/lib/db/schema/crm-pedido-venda-itens"
import { crmFaturamentos } from "@/lib/db/schema/crm-faturamentos"
import { crmFaturamentoItens } from "@/lib/db/schema/crm-faturamento-itens"
import { eq, and } from "drizzle-orm"
import { registrarLog } from "@/lib/notificar"
import { ErroErp, requisitarErp } from "@/lib/erp/cliente"
import {
  STATUS_PEDIDO_ERP,
  statusPedidoParaCrm,
  type DocumentoErpItem,
  type FaturamentoErp,
  type PedidoErp,
  type TipoVinculoErp,
} from "@/lib/erp/tipos"
import { UNIDADES_MEDIDA } from "@/lib/crm/documento-venda"

/**
 * Vincula um documento do ERP (pedido de venda ou faturamento) a uma oportunidade/pessoa.
 *
 * O documento continua morando no ERP: aqui fica o espelho (cabecalho + itens) para o CRM
 * mostrar pedidos e notas no histórico da oportunidade, com `origem = "ERP"` e a chave do
 * documento em `referencia_externa` (impede o mesmo documento ser vinculado duas vezes).
 */

function unidadeCrm(unidade: string | null | undefined): string {
  const limpa = (unidade || "").trim().toUpperCase()
  if (limpa.startsWith("MT")) return "METROS"
  if (limpa.startsWith("KG")) return "KILOS"
  if (limpa.startsWith("PC")) return "PECAS"
  if (limpa.startsWith("UN")) return "UNIDADES"
  if ((UNIDADES_MEDIDA as readonly string[]).includes(limpa)) return limpa
  return "METROS"
}

function itensParaCrm(itens: DocumentoErpItem[] | undefined) {
  return (itens || [])
    .filter((item) => item && (item.produto || item.descricao))
    .map((item) => ({
      produto: (item.produto || item.descricao || "").trim().slice(0, 300),
      codigo: (item.produto || "").trim().slice(0, 100) || null,
      unidade: unidadeCrm(item.unidade),
      quantidade: item.quantidade != null ? String(item.quantidade) : null,
      valorUnitario: item.valor_unitario != null ? String(item.valor_unitario) : null,
      valorTotal: item.valor_total != null ? String(item.valor_total) : null,
    }))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const session = auth.session

    const { id } = await params
    const oportunidadeId = parseInt(id)
    if (!oportunidadeId || Number.isNaN(oportunidadeId)) {
      return NextResponse.json({ error: "Oportunidade é obrigatória" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const tipo = String(body.tipo || "").toUpperCase() as TipoVinculoErp
    if (tipo !== "PEDIDO" && tipo !== "FATURAMENTO") {
      return NextResponse.json(
        { error: "Tipo de vínculo inválido (use PEDIDO ou FATURAMENTO)" },
        { status: 400 }
      )
    }

    const empresa = String(body.empresa || "").trim()
    const pedido = String(body.pedido || "").trim()
    const nota = String(body.nota || "").trim()
    if (!empresa || !pedido) {
      return NextResponse.json(
        { error: "Empresa e pedido do ERP são obrigatórios" },
        { status: 400 }
      )
    }
    if (tipo === "FATURAMENTO" && !nota) {
      return NextResponse.json({ error: "Número da nota é obrigatório" }, { status: 400 })
    }

    const [oportunidade] = await db
      .select({
        id: crmOportunidades.id,
        titulo: crmOportunidades.titulo,
        empresaId: crmOportunidades.empresaId,
        empresaNome: crmPessoas.razaoSocial,
        empresaCnpj: crmPessoas.cnpj,
      })
      .from(crmOportunidades)
      .leftJoin(crmPessoas, eq(crmOportunidades.empresaId, crmPessoas.id))
      .where(eq(crmOportunidades.id, oportunidadeId))
      .limit(1)

    if (!oportunidade) {
      return NextResponse.json({ error: "Oportunidade não encontrada" }, { status: 404 })
    }

    const referencia = tipo === "PEDIDO" ? `${empresa}/${pedido}` : `${empresa}/${pedido}/${nota}`

    const documento =
      tipo === "PEDIDO"
        ? await requisitarErp<PedidoErp>(
            `/crm/pedidos/${encodeURIComponent(empresa)}/${encodeURIComponent(pedido)}`
          )
        : await requisitarErp<FaturamentoErp>(
            `/crm/faturamentos/${encodeURIComponent(empresa)}/${encodeURIComponent(pedido)}/${encodeURIComponent(nota)}`
          )

    const clienteNome =
      tipo === "PEDIDO"
        ? (documento as PedidoErp).cliente_nome
        : (documento as FaturamentoErp).cliente_nome

    const itens = itensParaCrm(documento.itens)

    if (tipo === "PEDIDO") {
      const [existente] = await db
        .select({ id: crmPedidosVenda.id })
        .from(crmPedidosVenda)
        .where(
          and(eq(crmPedidosVenda.origem, "ERP"), eq(crmPedidosVenda.referenciaExterna, referencia))
        )
        .limit(1)

      if (existente) {
        return NextResponse.json(
          { error: "Este pedido do ERP já está vinculado a uma oportunidade" },
          { status: 409 }
        )
      }

      const pedidoErp = documento as PedidoErp
      const statusErp = pedidoErp.status || ""
      const [created] = await db.transaction(async (tx: any) => {
        const [novo] = await tx
          .insert(crmPedidosVenda)
          .values({
            oportunidadeId,
            numero: pedidoErp.pedido,
            dataEmissao: pedidoErp.data_pedido || null,
            status: statusPedidoParaCrm(statusErp),
            observacao: [
              `Pedido vinculado do ERP (${empresa}/${pedidoErp.pedido})`,
              clienteNome ? `cliente ${clienteNome}` : null,
              statusErp ? `status ERP: ${STATUS_PEDIDO_ERP[statusErp] || statusErp}` : null,
            ]
              .filter(Boolean)
              .join(" · "),
            origem: "ERP",
            referenciaExterna: referencia,
          })
          .returning()

        if (itens.length > 0) {
          await tx
            .insert(crmPedidoVendaItens)
            .values(itens.map((item: any) => ({ ...item, pedidoVendaId: novo.id })))
        }

        return [novo]
      })

      await registrarLog({
        tipo: "CADASTRO",
        acao: "vincular_erp",
        descricao: `Pedido do ERP ${referencia} vinculado à oportunidade "${oportunidade.titulo}"`,
        entidade: "CrmPedidoVenda",
        entidadeId: created.id,
        usuarioNome: session.user.name,
        dados: { referencia, clienteNome, itens: itens.length },
      })

      return NextResponse.json({ ...created, total: pedidoErp.valor_total }, { status: 201 })
    }

    const [existente] = await db
      .select({ id: crmFaturamentos.id })
      .from(crmFaturamentos)
      .where(
        and(eq(crmFaturamentos.origem, "ERP"), eq(crmFaturamentos.referenciaExterna, referencia))
      )
      .limit(1)

    if (existente) {
      return NextResponse.json(
        { error: "Este faturamento do ERP já está vinculado a uma oportunidade" },
        { status: 409 }
      )
    }

    const faturamentoErp = documento as FaturamentoErp
    const [created] = await db.transaction(async (tx: any) => {
      const [novo] = await tx
        .insert(crmFaturamentos)
        .values({
          oportunidadeId,
          numero: faturamentoErp.nr_nota,
          dataEmissao: faturamentoErp.data_nota || null,
          status: "EMITIDO",
          observacao: [
            `Faturamento vinculado do ERP (${referencia})`,
            clienteNome ? `cliente ${clienteNome}` : null,
            faturamentoErp.pedido_origem
              ? `pedido de origem ${faturamentoErp.pedido_origem}`
              : null,
          ]
            .filter(Boolean)
            .join(" · "),
          origem: "ERP",
          referenciaExterna: referencia,
        })
        .returning()

      if (itens.length > 0) {
        await tx
          .insert(crmFaturamentoItens)
          .values(itens.map((item: any) => ({ ...item, faturamentoId: novo.id })))
      }

      return [novo]
    })

    await registrarLog({
      tipo: "CADASTRO",
      acao: "vincular_erp",
      descricao: `Faturamento do ERP ${referencia} vinculado à oportunidade "${oportunidade.titulo}"`,
      entidade: "CrmFaturamento",
      entidadeId: created.id,
      usuarioNome: session.user.name,
      dados: { referencia, clienteNome, itens: itens.length },
    })

    return NextResponse.json({ ...created, total: faturamentoErp.valor_total }, { status: 201 })
  } catch (error) {
    if (error instanceof ErroErp) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[POST /api/crm/oportunidades/[id]/vinculos]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
