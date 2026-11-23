import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  crmFaturamentos,
  crmFaturamentoItens,
  crmLeads,
  crmOportunidades,
  crmPedidosVenda,
  crmPedidoVendaItens,
} from "@/lib/db/schema"
import {
  criarOuAtualizarFaturamento,
  somaItensPedido,
  somaOportunidade,
} from "@/lib/crm/verificar-pedido-faturado"
import { criarPedidoEspelho, itensParaCrmFaturamento } from "@/lib/crm/erp-espelho"
import { processarAutomacaoCRM } from "@/lib/crm/automacoes-crm"
import { registrarLog } from "@/lib/notificar"
import { requisitarErp } from "@/lib/erp/cliente"
import type { FaturamentoErp, ListaErp, PedidoErp } from "@/lib/erp/tipos"
import type { NotaPrevista } from "@/lib/crm/verificar-pedido-faturado"

type NotaFaturada = {
  empresa: string | null
  pedido: string | null
  nr_nota: string | null
  serie: string | null
  clienteCnpj: string | null
  clienteNome: string | null
  dataNota: string | null
  dataEmissao: string | null
  valorNota: number
  valorTotal: number
  pedidoOrigem: string | null
}

export type PreviewVinculoFaturado = {
  notas: NotaFaturada[]
  pedidoErp: PedidoErp | null
  valorPedido: number
  valorOportunidadeAntes: number
  valorOportunidadeDepois: number
  jaVinculado: boolean
  pedidoExistente: { id: number; numero: string | null; referenciaExterna: string | null } | null
  mensagem: string | null
}

export type AplicarVinculacaoFaturadoResult = {
  pedidoId: number
  numero: string | null
  valorPedido: number
  status: string
  faturamentoId: number | null
  nota: NotaPrevista | null
  valorOportunidade: number
  conversaoLead: { ok: boolean; erro?: string }
  automacaoOportunidade: { ok: boolean; erro?: string }
}

function mapearNotaFaturada(nota: FaturamentoErp): NotaFaturada {
  return {
    empresa: nota.empresa ?? null,
    pedido: nota.pedido ?? null,
    nr_nota: nota.nr_nota ?? null,
    serie: nota.serie ?? null,
    clienteCnpj: nota.cliente_cnpj ?? null,
    clienteNome: nota.cliente_nome ?? null,
    dataNota: nota.data_nota ?? nota.data_emissao ?? null,
    dataEmissao: nota.data_nota ?? nota.data_emissao ?? null,
    valorNota: Number(nota.valor_nota ?? 0),
    valorTotal: Number(nota.valor_total ?? 0),
    pedidoOrigem: nota.pedido_origem ?? null,
  }
}

export async function buscarNotasFaturadasPorPedido(codigoPedido: string): Promise<ListaErp<FaturamentoErp>> {
  if (!codigoPedido) {
    throw new Error("Informe o código do pedido")
  }

  const codigoLimpo = codigoPedido.trim()

  // Estratégia 1: filtro pedido_origem no ERP
  try {
    const dados = await requisitarErp<ListaErp<FaturamentoErp>>(
      `/crm/faturamentos?pedido_origem=${encodeURIComponent(codigoLimpo)}&por_pagina=50`
    )
    const filtrados = dados.itens.filter(
      (n) => (n.pedido_origem || "").trim() === codigoLimpo
    )
    if (filtrados.length > 0) {
      return { ...dados, itens: filtrados }
    }
  } catch {
    // segue para estratégia 2
  }

  // Estratégia 2: busca sem filtro (paginada) e filtra client-side
  try {
    const dados = await requisitarErp<ListaErp<FaturamentoErp>>(
      `/crm/faturamentos?por_pagina=200`
    )
    const filtrados = dados.itens.filter(
      (n) => (n.pedido_origem || "").trim() === codigoLimpo
    )
    return { ...dados, itens: filtrados }
  } catch {
    // Estratégia 3: falha total — retorna vazio para não quebrar a tela
    return { paginacao: { total: 0, pagina: 1, por_pagina: 50, total_paginas: 0 }, itens: [] }
  }
}

export async function previewVincularFaturado(params: {
  oportunidadeId: number
  codigoPedido: string
}): Promise<PreviewVinculoFaturado> {
  const { oportunidadeId, codigoPedido } = params

  let notasLista: ListaErp<FaturamentoErp>
  try {
    notasLista = await buscarNotasFaturadasPorPedido(codigoPedido)
  } catch {
    notasLista = { paginacao: { total: 0, pagina: 1, por_pagina: 50, total_paginas: 0 }, itens: [] }
  }
  const notas = notasLista.itens.map(mapearNotaFaturada)

  if (notas.length === 0) {
    return {
      notas: [],
      pedidoErp: null,
      valorPedido: 0,
      valorOportunidadeAntes: 0,
      valorOportunidadeDepois: 0,
      jaVinculado: false,
      pedidoExistente: null,
      mensagem: "Não há faturamento no ERP para este pedido.",
    }
  }

  const primeiraNota = notas[0]
  const empresa = primeiraNota.empresa
  const pedidoDetalhe = primeiraNota.pedido ?? codigoPedido

  let pedidoErp: PedidoErp | null = null
  try {
    pedidoErp = await requisitarErp<PedidoErp>(
      `/crm/pedidos/${encodeURIComponent(empresa ?? "")}/${encodeURIComponent(pedidoDetalhe)}`
    )
  } catch {
    pedidoErp = null
  }

  const valorPedido = pedidoErp ? Number(pedidoErp.valor_total ?? primeiraNota.valorTotal) : primeiraNota.valorTotal

  const [existente] = await db
    .select({
      id: crmPedidosVenda.id,
      numero: crmPedidosVenda.numero,
      referenciaExterna: crmPedidosVenda.referenciaExterna,
      oportunidadeId: crmPedidosVenda.oportunidadeId,
    })
    .from(crmPedidosVenda)
    .where(
      and(
        eq(crmPedidosVenda.origem, "ERP"),
        eq(crmPedidosVenda.referenciaExterna, `${empresa}/${codigoPedido}`)
      )
    )
    .limit(1)

  const jaVinculado = Boolean(existente)
  const valorOportunidadeAntes = await somaOportunidade(oportunidadeId)
  const valorOportunidadeDepois = jaVinculado && existente!.oportunidadeId === oportunidadeId
    ? valorOportunidadeAntes
    : valorOportunidadeAntes + valorPedido

  let mensagem: string | null = null
  if (jaVinculado && existente!.oportunidadeId !== oportunidadeId) {
    mensagem = "Este pedido do ERP já está vinculado a outra oportunidade."
  } else if (jaVinculado) {
    mensagem = "Este pedido do ERP já está vinculado a esta oportunidade."
  }

  return {
    notas,
    pedidoErp,
    valorPedido,
    valorOportunidadeAntes,
    valorOportunidadeDepois,
    jaVinculado,
    pedidoExistente: existente
      ? { id: existente.id, numero: existente.numero, referenciaExterna: existente.referenciaExterna }
      : null,
    mensagem,
  }
}

export async function aplicarVinculacaoFaturado(params: {
  oportunidadeId: number
  codigoPedido: string
  nrNota?: string | null
  statusPedido?: "FATURADO" | "PARCIAL" | null
  usuarioNome: string | null
}): Promise<AplicarVinculacaoFaturadoResult> {
  const { oportunidadeId, codigoPedido, nrNota, statusPedido, usuarioNome } = params

  const notasLista = await buscarNotasFaturadasPorPedido(codigoPedido)
  if (notasLista.itens.length === 0) {
    throw new Error("Não há faturamento no ERP para este pedido.")
  }

  let notaErp = notasLista.itens.find((n) => n.nr_nota === nrNota) ?? notasLista.itens[0]
  if (notasLista.itens.length > 1 && !nrNota) {
    throw new Error("Informe o número da nota fiscal para vincular.")
  }

  const nota: NotaPrevista = {
    numero: notaErp.nr_nota ?? null,
    dataNota: notaErp.data_nota ?? notaErp.data_emissao ?? null,
    valorTotal: Number(notaErp.valor_total ?? 0),
    empresa: notaErp.empresa ?? null,
    pedido: notaErp.pedido ?? null,
    pedidoOrigem: notaErp.pedido_origem ?? null,
  }

  const empresa = nota.empresa ?? ""
  const pedidoReferencia = codigoPedido
  const pedidoDetalhe = nota.pedido || pedidoReferencia

  const [oportunidade] = await db
    .select({ id: crmOportunidades.id, empresaId: crmOportunidades.empresaId })
    .from(crmOportunidades)
    .where(eq(crmOportunidades.id, oportunidadeId))
    .limit(1)
  if (!oportunidade) {
    throw new Error("Oportunidade não encontrada")
  }

  let pedidoId: number
  let pedidoCriado = true
  let valorPedido: number

  const [existente] = await db
    .select({ id: crmPedidosVenda.id })
    .from(crmPedidosVenda)
    .where(
      and(
        eq(crmPedidosVenda.origem, "ERP"),
        eq(crmPedidosVenda.referenciaExterna, `${empresa}/${pedidoReferencia}`)
      )
    )
    .limit(1)

  if (existente) {
    if (existente.id) {
      const [oportunidadeVinculada] = await db
        .select({ oportunidadeId: crmPedidosVenda.oportunidadeId })
        .from(crmPedidosVenda)
        .where(eq(crmPedidosVenda.id, existente.id))
        .limit(1)
      if (oportunidadeVinculada?.oportunidadeId !== oportunidadeId) {
        throw new Error("Este pedido do ERP já está vinculado a outra oportunidade.")
      }
    }
    pedidoId = existente.id
    pedidoCriado = false
    valorPedido = await somaItensPedido(pedidoId)
  } else {
    const criado = await criarPedidoEspelho({
      oportunidadeId,
      empresa,
      pedidoReferencia,
      pedidoDetalhe,
      usuarioNome,
    })
    pedidoId = criado.id
    valorPedido = criado.total
  }

  const valorOportunidade = await somaOportunidade(oportunidadeId)
  await db
    .update(crmOportunidades)
    .set({ valorEstimado: valorOportunidade, updatedAt: new Date() })
    .where(eq(crmOportunidades.id, oportunidadeId))

  let statusPedidoFinal = statusPedido
  if (!statusPedidoFinal && nota) {
    statusPedidoFinal = nota.valorTotal >= valorPedido ? "FATURADO" : "PARCIAL"
  }

  if (statusPedidoFinal) {
    await db
      .update(crmPedidosVenda)
      .set({ status: statusPedidoFinal, updatedAt: new Date() })
      .where(eq(crmPedidosVenda.id, pedidoId))
  }

  let faturamentoId: number | null = null
  if (nota.numero && empresa) {
    const documentoErp = await requisitarErp<FaturamentoErp>(
      `/crm/faturamentos/${encodeURIComponent(empresa)}/${encodeURIComponent(pedidoDetalhe)}/${encodeURIComponent(nota.numero)}`
    )
    faturamentoId = await criarOuAtualizarFaturamento({
      oportunidadeId,
      pedidoVendaId: pedidoId,
      empresa,
      pedido: pedidoDetalhe,
      pedidoReferencia,
      pedidoErp: pedidoDetalhe,
      nota,
      itens: itensParaCrmFaturamento(documentoErp.itens ?? []),
      usuarioNome,
    })
  }

  let conversaoLead: AplicarVinculacaoFaturadoResult["conversaoLead"] = { ok: false }
  if (oportunidade.empresaId) {
    const [lead] = await db
      .select()
      .from(crmLeads)
      .where(eq(crmLeads.id, oportunidade.empresaId))
      .limit(1)
    if (lead && !lead.promovidaCliente) {
      try {
        const resultadoLead = await processarAutomacaoCRM({
          entidade: "LEAD",
          acao: "ALTERAR_STATUS",
          entidadeId: lead.id,
          statusNovo: "CONVERTIDO_CLIENTE",
          decisao: "CONVERTER",
          autor: { id: undefined, nome: usuarioNome ?? null },
        })
        conversaoLead = { ok: Boolean(resultadoLead.ok), erro: resultadoLead.ok ? undefined : "Lead não convertida" }
      } catch (erro) {
        conversaoLead = {
          ok: false,
          erro: erro instanceof Error ? erro.message : "Erro ao converter a lead",
        }
      }
    } else if (lead && lead.promovidaCliente) {
      conversaoLead = { ok: true }
    }
  }

  let automacaoOportunidade: AplicarVinculacaoFaturadoResult["automacaoOportunidade"] = { ok: false }
  try {
    const resultadoOportunidade = await processarAutomacaoCRM({
      entidade: "OPORTUNIDADE",
      acao: "ALTERAR_STATUS",
      entidadeId: oportunidadeId,
      statusNovo: "FECHADO_GANHO",
      valorEstimado: valorOportunidade,
      probabilidade: 100,
      autor: { id: undefined, nome: usuarioNome ?? null },
    })
    automacaoOportunidade = {
      ok: Boolean(resultadoOportunidade.ok),
      erro: resultadoOportunidade.ok ? undefined : resultadoOportunidade.decisaoPendente?.mensagem || "Oportunidade não fechada como ganha",
    }
  } catch (erro) {
    automacaoOportunidade = {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Erro ao fechar oportunidade como ganha",
    }
  }

  await registrarLog({
    tipo: "ATUALIZACAO",
    acao: "vincular_faturado",
    descricao: `Pedido do ERP ${empresa}/${pedidoReferencia} vinculado e faturamento da nota ${nota.numero ?? "-" } processado na oportunidade #${oportunidadeId}`,
    entidade: "CrmPedidoVenda",
    entidadeId: pedidoId,
    usuarioNome,
    dados: {
      pedidoId,
      codigoPedido,
      nrNota: nota.numero,
      valorPedido,
      status: statusPedidoFinal,
      faturamentoId,
      pedidoCriado,
    },
  })

  return {
    pedidoId,
    numero: pedidoReferencia,
    valorPedido,
    status: statusPedidoFinal ?? "ABERTO",
    faturamentoId,
    nota,
    valorOportunidade,
    conversaoLead,
    automacaoOportunidade,
  }
}
