import { and, asc, eq, isNotNull } from "drizzle-orm"
import { db } from "@/lib/db"
import type {
  CrmFaturamento,
  CrmFaturamentoItem,
  CrmPedidoVenda,
  CrmPedidoVendaItem,
} from "@/lib/db/schema"
import { crmFaturamentos } from "@/lib/db/schema/crm-faturamentos"
import { crmFaturamentoItens } from "@/lib/db/schema/crm-faturamento-itens"
import { crmPedidosVenda } from "@/lib/db/schema/crm-pedidos-venda"
import { crmPedidoVendaItens } from "@/lib/db/schema/crm-pedido-venda-itens"
import { requisitarErp } from "@/lib/erp/cliente"
import {
  STATUS_PEDIDO_ERP,
  statusPedidoParaCrm,
  type DocumentoErpItem,
  type FaturamentoErp,
  type PedidoErp,
  type TipoVinculoErp,
} from "@/lib/erp/tipos"
import { registrarLog } from "@/lib/log"
import { UNIDADES_MEDIDA, somarValoresTotais } from "@/lib/crm/documento-venda"
import { registrarEventoPedidoVenda } from "@/lib/crm/timeline-pedido"

type ItemEspelho = {
  produto: string
  codigo: string | null
  unidade: string
  quantidade: string | null
  valorUnitario: string | null
  valorTotal: string | null
}

export type ResultadoEspelhos = {
  verificados: number
  atualizados: number
  falhas: number
}

const LOTE_CONCORRENCIA = 5

export function unidadeCrm(unidade: string | null | undefined): string {
  const limpa = (unidade || "").trim().toUpperCase()
  if (limpa.startsWith("MT")) return "METROS"
  if (limpa.startsWith("KG")) return "KILOS"
  if (limpa.startsWith("PC")) return "PECAS"
  if (limpa.startsWith("UN")) return "UNIDADES"
  if ((UNIDADES_MEDIDA as readonly string[]).includes(limpa)) return limpa
  return "METROS"
}

export function itensParaCrm(itens: DocumentoErpItem[] | undefined): ItemEspelho[] {
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

export function itensParaCrmFaturamento(itens: DocumentoErpItem[] | undefined): ItemEspelho[] {
  return (itens || [])
    .filter((item) => item && (item.produto || item.descricao))
    .map((item) => {
      const totalItem = (item.valor_total ?? 0) + (item.acrescimo_desconto ?? 0)
      return {
        produto: (item.descricao || item.produto || "").trim().slice(0, 300),
        codigo: (item.produto || "").trim().slice(0, 100) || null,
        unidade: unidadeCrm(item.unidade),
        quantidade: item.quantidade != null ? String(item.quantidade) : null,
        valorUnitario: item.valor_unitario != null ? String(item.valor_unitario) : null,
        valorTotal: String(totalItem),
      }
    })
  }

export function statusErpSincronizado(statusErp: string | null | undefined): {
  statusErp: string
  statusErpCodigo: string | null
} {
  return {
    statusErp: statusPedidoParaCrm(statusErp),
    statusErpCodigo: statusErp ? String(statusErp) : null,
  }
}

function texto(valor: unknown): string {
  return valor == null ? "" : String(valor).trim()
}

function itensIguais(atual: CrmPedidoVendaItem[] | CrmFaturamentoItem[], proximo: ItemEspelho[]) {
  if (atual.length !== proximo.length) return false
  return proximo.every((item, indice) => {
    const registro = atual[indice]
    return (
      texto(registro.produto) === item.produto &&
      texto(registro.codigo) === texto(item.codigo) &&
      texto(registro.unidade) === item.unidade &&
      texto(registro.quantidade) === texto(item.quantidade) &&
      texto(registro.valorUnitario) === texto(item.valorUnitario) &&
      texto(registro.valorTotal) === texto(item.valorTotal)
    )
  })
}

function partesReferencia(referencia: string, tipo: TipoVinculoErp) {
  const partes = referencia.split("/").map((parte) => parte.trim())
  if (tipo === "PEDIDO" && partes.length === 2 && partes[0] && partes[1]) {
    return { empresa: partes[0], pedido: partes[1], nota: "" }
  }
  if (tipo === "FATURAMENTO" && partes.length === 3 && partes[0] && partes[1] && partes[2]) {
    return { empresa: partes[0], pedido: partes[1], nota: partes[2] }
  }
  return null
}

function caminhoDetalhe(
  tipo: TipoVinculoErp,
  partes: { empresa: string; pedido: string; nota: string }
) {
  if (tipo === "PEDIDO") {
    return `/crm/pedidos-faturados/${encodeURIComponent(partes.empresa)}/${encodeURIComponent(partes.pedido)}`
  }
  return `/crm/faturamentos/${encodeURIComponent(partes.empresa)}/${encodeURIComponent(partes.pedido)}/${encodeURIComponent(partes.nota)}`
}

async function atualizarPedido(pedido: CrmPedidoVenda): Promise<boolean> {
  const partes = pedido.referenciaExterna
    ? partesReferencia(pedido.referenciaExterna, "PEDIDO")
    : null
  if (!partes) return false

  const documento = await requisitarErp<PedidoErp>(caminhoDetalhe("PEDIDO", partes))
  const itens = itensParaCrm(documento.itens)
  const statusErp = documento.status || ""
  const dadosStatus = statusErpSincronizado(statusErp)
  const [itensAtuais, cabecalho] = await Promise.all([
    db
      .select()
      .from(crmPedidoVendaItens)
      .where(eq(crmPedidoVendaItens.pedidoVendaId, pedido.id))
      .orderBy(asc(crmPedidoVendaItens.id)),
    db.select().from(crmPedidosVenda).where(eq(crmPedidosVenda.id, pedido.id)).limit(1),
  ])
  const registro = cabecalho[0]
  if (!registro) return false

  const observacao = [
    `Pedido vinculado do ERP (${partes.empresa}/${documento.pedido ?? partes.pedido})`,
    documento.cliente_nome ? `cliente ${documento.cliente_nome}` : null,
    statusErp ? `status ERP: ${STATUS_PEDIDO_ERP[statusErp] || statusErp}` : null,
  ]
    .filter(Boolean)
    .join(" · ")
  const valores = {
    numero: documento.pedido ?? null,
    dataEmissao: documento.data_pedido || null,
    statusErp: dadosStatus.statusErp,
    statusErpCodigo: dadosStatus.statusErpCodigo,
    statusErpAtualizadoEm: new Date(),
    observacao,
    updatedAt: new Date(),
  }

  if (
    texto(registro.numero) === texto(valores.numero) &&
    texto(registro.dataEmissao) === texto(valores.dataEmissao) &&
    texto(registro.statusErp) === valores.statusErp &&
    texto(registro.statusErpCodigo) === valores.statusErpCodigo &&
    texto(registro.observacao) === observacao &&
    itensIguais(itensAtuais, itens)
  ) {
    return false
  }

  await db.transaction(async (tx: any) => {
    await tx.update(crmPedidosVenda).set(valores).where(eq(crmPedidosVenda.id, pedido.id))
    await tx
      .delete(crmPedidoVendaItens)
      .where(eq(crmPedidoVendaItens.pedidoVendaId, pedido.id))
    if (itens.length > 0) {
      await tx
        .insert(crmPedidoVendaItens)
        .values(itens.map((item) => ({ ...item, pedidoVendaId: pedido.id })))
    }
  })

  await registrarLog({
    tipo: "ATUALIZACAO",
    acao: "atualizar_erp",
    descricao: `Pedido do ERP ${pedido.referenciaExterna} atualizado na oportunidade #${pedido.oportunidadeId}`,
    entidade: "CrmPedidoVenda",
    entidadeId: pedido.id,
    usuarioNome: "sincronização ERP",
    dados: { itens: itens.length },
  })

  await registrarEventoPedidoVenda({
    pedidoVendaId: pedido.id,
    oportunidadeId: pedido.oportunidadeId,
    tipo: "SINCRONIZACAO_ERP",
    descricao: `Sincronização do ERP: status ERP ${texto(registro.statusErp) || "—"} → ${valores.statusErp || "—"}; status do CRM mantido em ${registro.status}, ${itens.length} item(ns)`,
    metadados: {
      statusCrm: registro.status,
      statusErpAntigo: registro.statusErp,
      statusErpNovo: valores.statusErp,
      statusErpCodigo: valores.statusErpCodigo,
      itens: itens.length,
      origem: "ERP",
    },
    chaveEvento: `sincronizacao-status-${pedido.id}-${valores.statusErp}-${valores.statusErpCodigo ?? "sem-codigo"}`,
  })

  return true
}

export async function criarPedidoEspelho(params: {
  oportunidadeId: number
  empresa: string
  pedidoReferencia: string
  pedidoDetalhe?: string
  documento?: PedidoErp
  usuarioNome?: string | null
}): Promise<{ id: number; numero: string | null; status: string | null; total: number }> {
  const { oportunidadeId, empresa, pedidoReferencia, pedidoDetalhe, documento: documentoFornecido, usuarioNome } = params
  const pedidoParaDetalhe = pedidoDetalhe ?? pedidoReferencia

  const pedidoErp = documentoFornecido ?? await requisitarErp<PedidoErp>(
    `/crm/pedidos-faturados/${encodeURIComponent(empresa)}/${encodeURIComponent(pedidoParaDetalhe)}`
  )
  const referencia = `${empresa}/${pedidoReferencia}`

  const [existente] = await db
    .select({ id: crmPedidosVenda.id })
    .from(crmPedidosVenda)
    .where(
      and(
        eq(crmPedidosVenda.origem, "ERP"),
        eq(crmPedidosVenda.referenciaExterna, referencia)
      )
    )
    .limit(1)

  if (existente) {
    throw new Error("Este pedido do ERP já está vinculado a uma oportunidade")
  }

  const itensPedido = itensParaCrm(pedidoErp.itens)
  const statusErp = pedidoErp.status || ""
  const dadosStatus = statusErpSincronizado(statusErp)
  const observacao = [
    `Pedido vinculado do ERP (${empresa}/${pedidoErp.pedido ?? pedidoReferencia})`,
    pedidoErp.cliente_nome ? `cliente ${pedidoErp.cliente_nome}` : null,
    statusErp ? `status ERP: ${STATUS_PEDIDO_ERP[statusErp] || statusErp}` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  const [created] = await db.transaction(async (tx: any) => {
    const [novo] = await tx
      .insert(crmPedidosVenda)
      .values({
        oportunidadeId,
        numero: pedidoReferencia,
        dataEmissao: pedidoErp.data_pedido || null,
        status: dadosStatus.statusErp,
        statusErp: dadosStatus.statusErp,
        statusErpCodigo: dadosStatus.statusErpCodigo,
        statusErpAtualizadoEm: new Date(),
        observacao,
        origem: "ERP",
        referenciaExterna: referencia,
      })
      .returning()

    if (itensPedido.length > 0) {
      await tx
        .insert(crmPedidoVendaItens)
        .values(itensPedido.map((item: any) => ({ ...item, pedidoVendaId: novo.id })))
    }

    return [novo]
  })

  const total = somarValoresTotais(itensPedido)

  await registrarLog({
    tipo: "CADASTRO",
    acao: "vincular_erp",
    descricao: `Pedido do ERP ${referencia} vinculado à oportunidade #${oportunidadeId}`,
    entidade: "CrmPedidoVenda",
    entidadeId: created.id,
    usuarioNome: usuarioNome ?? "sincronização ERP",
    dados: { referencia, clienteNome: pedidoErp.cliente_nome, itens: itensPedido.length },
  })

  await registrarEventoPedidoVenda({
    pedidoVendaId: created.id,
    oportunidadeId,
    tipo: "PEDIDO_VENDA",
    descricao: `Pedido do ERP ${referencia} vinculado à oportunidade com ${itensPedido.length} item(ns)`,
    metadados: { statusNovo: created.status, origem: "ERP", referenciaExterna: referencia },
    chaveEvento: `pedido-vinculo-erp-${created.id}`,
  })

  return { id: created.id, numero: pedidoReferencia, status: created.status ?? null, total }
}

async function atualizarFaturamento(faturamento: CrmFaturamento): Promise<boolean> {
  const partes = faturamento.referenciaExterna
    ? partesReferencia(faturamento.referenciaExterna, "FATURAMENTO")
    : null
  if (!partes) return false

  const documento = await requisitarErp<FaturamentoErp>(caminhoDetalhe("FATURAMENTO", partes))
  const itens = itensParaCrm(documento.itens)
  const [itensAtuais, cabecalho] = await Promise.all([
    db
      .select()
      .from(crmFaturamentoItens)
      .where(eq(crmFaturamentoItens.faturamentoId, faturamento.id))
      .orderBy(asc(crmFaturamentoItens.id)),
    db.select().from(crmFaturamentos).where(eq(crmFaturamentos.id, faturamento.id)).limit(1),
  ])
  const registro = cabecalho[0]
  if (!registro) return false

  const observacao = [
    `Faturamento vinculado do ERP (${faturamento.referenciaExterna})`,
    documento.cliente_nome ? `cliente ${documento.cliente_nome}` : null,
    documento.pedido_origem ? `pedido de origem ${documento.pedido_origem}` : null,
  ]
    .filter(Boolean)
    .join(" · ")
  const valores = {
    numero: documento.nr_nota ?? null,
    dataEmissao: documento.data_nota || documento.data_emissao || null,
    status: "EMITIDO",
    observacao,
    updatedAt: new Date(),
  }

  if (
    texto(registro.numero) === texto(valores.numero) &&
    texto(registro.dataEmissao) === texto(valores.dataEmissao) &&
    texto(registro.status) === valores.status &&
    texto(registro.observacao) === observacao &&
    itensIguais(itensAtuais, itens)
  ) {
    return false
  }

  await db.transaction(async (tx: any) => {
    await tx.update(crmFaturamentos).set(valores).where(eq(crmFaturamentos.id, faturamento.id))
    await tx
      .delete(crmFaturamentoItens)
      .where(eq(crmFaturamentoItens.faturamentoId, faturamento.id))
    if (itens.length > 0) {
      await tx
        .insert(crmFaturamentoItens)
        .values(itens.map((item) => ({ ...item, faturamentoId: faturamento.id })))
    }
  })

  await registrarLog({
    tipo: "ATUALIZACAO",
    acao: "atualizar_erp",
    descricao: `Faturamento do ERP ${faturamento.referenciaExterna} atualizado na oportunidade #${faturamento.oportunidadeId}`,
    entidade: "CrmFaturamento",
    entidadeId: faturamento.id,
    usuarioNome: "sincronização ERP",
    dados: { itens: itens.length },
  })

  return true
}

export async function atualizarEspelhosErp(tipo: TipoVinculoErp): Promise<ResultadoEspelhos> {
  const registros =
    tipo === "PEDIDO"
      ? await db
          .select()
          .from(crmPedidosVenda)
          .where(and(eq(crmPedidosVenda.origem, "ERP"), isNotNull(crmPedidosVenda.referenciaExterna)))
      : await db
          .select()
          .from(crmFaturamentos)
          .where(and(eq(crmFaturamentos.origem, "ERP"), isNotNull(crmFaturamentos.referenciaExterna)))

  let atualizados = 0
  let falhas = 0
  const atualizar = (registro: CrmPedidoVenda | CrmFaturamento) =>
    tipo === "PEDIDO"
      ? atualizarPedido(registro as CrmPedidoVenda)
      : atualizarFaturamento(registro as CrmFaturamento)

  for (let indice = 0; indice < registros.length; indice += LOTE_CONCORRENCIA) {
    const lote = registros.slice(indice, indice + LOTE_CONCORRENCIA)
    const resultados = await Promise.allSettled(
      lote.map((registro: CrmPedidoVenda | CrmFaturamento) => atualizar(registro))
    )
    for (const resultado of resultados) {
      if (resultado.status === "rejected") {
        falhas++
        console.error("[atualizarEspelhosErp]", resultado.reason)
      } else if (resultado.value) {
        atualizados++
      }
    }
  }

  return { verificados: registros.length, atualizados, falhas }
}
