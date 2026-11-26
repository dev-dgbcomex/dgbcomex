import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  crmFaturamentos,
  crmFaturamentoItens,
  crmLeads,
  crmOportunidades,
  crmPedidosVenda,
} from "@/lib/db/schema"
import {
  criarOuAtualizarFaturamento,
  garantirPedidoErpVinculado,
} from "@/lib/crm/verificar-pedido-faturado"
import {
  recalcularValorOportunidade,
  somaOportunidade,
} from "@/lib/crm/valor-oportunidade"
import { itensParaCrmFaturamento } from "@/lib/crm/erp-espelho"
import { processarAutomacaoCRM } from "@/lib/crm/automacoes-crm"
import { registrarLog } from "@/lib/notificar"
import { registrarEventoPedidoVenda } from "@/lib/crm/timeline-pedido"
import {
  buscarFaturamentosPorPedido,
  buscarPedidoFaturadoErp,
  buscarPedidosDaNotaErp,
  requisitarErp,
} from "@/lib/erp/cliente"
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

type PedidoExistente = {
  id: number
  numero: string | null
  referenciaExterna: string | null
  oportunidadeId: number
}

export type PreviewVinculoFaturado = {
  notas: NotaFaturada[]
  pedidosErp: PedidoErp[]
  valorPedido: number
  valorNota: number
  valorOportunidadeAntes: number
  valorOportunidadeDepois: number
  jaVinculado: boolean
  pedidosExistentes: PedidoExistente[]
  mensagem: string | null
}

export type AplicarVinculacaoFaturadoResult = {
  pedidoId: number
  numero: string | null
  pedidos: Array<{ id: number; numero: string | null; valorPedido: number }>
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

export async function buscarNotasFaturadasPorPedido(
  codigoPedido: string
): Promise<ListaErp<FaturamentoErp>> {
  if (!codigoPedido) {
    throw new Error("Informe o código do pedido")
  }
  return buscarFaturamentosPorPedido(codigoPedido)
}

async function carregarPedidosDaNota(
  empresa: string | null,
  pedido: string | null,
  nrNota: string | null
): Promise<PedidoErp[]> {
  if (!empresa || !pedido || !nrNota) return []
  const codigos = await buscarPedidosDaNotaErp(empresa, pedido, nrNota)
  const finais = codigos.length > 0 ? codigos : [pedido]
  return Promise.all(
    finais.map((codigo) => buscarPedidoFaturadoErp(empresa, codigo))
  )
}

export async function previewVincularFaturado(params: {
  oportunidadeId: number
  codigoPedido: string
}): Promise<PreviewVinculoFaturado> {
  const { oportunidadeId, codigoPedido } = params
  const notasLista = await buscarNotasFaturadasPorPedido(codigoPedido)
  const notas = notasLista.itens.map(mapearNotaFaturada)

  if (notas.length === 0) {
    return {
      notas: [],
      pedidosErp: [],
      valorPedido: 0,
      valorNota: 0,
      valorOportunidadeAntes: 0,
      valorOportunidadeDepois: 0,
      jaVinculado: false,
      pedidosExistentes: [],
      mensagem: "Não há faturamento no ERP para este pedido.",
    }
  }

  const primeiraNota = notas[0]
  const pedidosErp = await carregarPedidosDaNota(
    primeiraNota.empresa,
    primeiraNota.pedidoOrigem ?? primeiraNota.pedido,
    primeiraNota.nr_nota
  )
  const referencias = pedidosErp.map(
    (pedido) => `${pedidoEmpresa(pedido)}/${pedido.pedido_origem ?? pedido.pedido ?? ""}`
  )

  const existentes: PedidoExistente[] = referencias.length
    ? await db
        .select({
          id: crmPedidosVenda.id,
          numero: crmPedidosVenda.numero,
          referenciaExterna: crmPedidosVenda.referenciaExterna,
          oportunidadeId: crmPedidosVenda.oportunidadeId,
        })
        .from(crmPedidosVenda)
        .where(
          and(eq(crmPedidosVenda.origem, "ERP"), inArray(crmPedidosVenda.referenciaExterna, referencias))
        )
    : []

  const valorPedido = pedidosErp.reduce((total, pedido) => total + Number(pedido.valor_total ?? 0), 0)
  const valorNota = notas.reduce((total, nota) => total + nota.valorNota, 0)
  const valorOportunidadeAntes = await somaOportunidade(oportunidadeId)
  const jaVinculado = existentes.length > 0
  const valorPedidosNovos = pedidosErp.reduce((total, pedido, indice) => {
    const existente = existentes.find((item) => item.referenciaExterna === referencias[indice])
    if (existente) return total
    return total + Number(pedido.valor_total ?? 0)
  }, 0)
  const valorOportunidadeDepois = valorOportunidadeAntes + valorPedidosNovos

  const outraOportunidade = existentes.find((item) => item.oportunidadeId !== oportunidadeId)
  let mensagem: string | null = null
  if (outraOportunidade) {
    mensagem = "Um dos pedidos do ERP já está vinculado a outra oportunidade."
  } else if (jaVinculado) {
    mensagem = "Os pedidos do ERP já estão vinculados a esta oportunidade."
  } else if (pedidosErp.length > 1) {
    mensagem = `Esta nota fatura ${pedidosErp.length} pedidos; todos serão vinculados.`
  }

  return {
    notas,
    pedidosErp,
    valorPedido,
    valorNota,
    valorOportunidadeAntes,
    valorOportunidadeDepois,
    jaVinculado,
    pedidosExistentes: existentes,
    mensagem,
  }
}

function pedidoEmpresa(pedido: PedidoErp): string {
  return String(pedido.empresa ?? "").trim()
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

  const notaErp = notasLista.itens.find((nota) => nota.nr_nota === nrNota) ?? notasLista.itens[0]
  if (notasLista.itens.length > 1 && !nrNota) {
    throw new Error("Informe o número da nota fiscal para vincular.")
  }

  const empresa = notaErp.empresa ?? ""
  const pedidoInternoNota = notaErp.pedido ?? codigoPedido
  const pedidosDocumento = await carregarPedidosDaNota(
    empresa,
    notaErp.pedido_origem ?? pedidoInternoNota,
    notaErp.nr_nota ?? null
  )
  if (pedidosDocumento.length === 0) {
    throw new Error("Não foi possível ler os pedidos do ERP desta nota.")
  }

  const [oportunidade] = await db
    .select({
      id: crmOportunidades.id,
      empresaId: crmOportunidades.empresaId,
      clienteId: crmOportunidades.clienteId,
    })
    .from(crmOportunidades)
    .where(eq(crmOportunidades.id, oportunidadeId))
    .limit(1)
  if (!oportunidade) {
    throw new Error("Oportunidade não encontrada")
  }

  const pedidosVinculados: Array<{
    id: number
    numero: string | null
    status: string | null
    valorPedido: number
  }> = []
  for (const documento of pedidosDocumento) {
    const codigo = documento.pedido_origem ?? documento.pedido
    const vinculado = await garantirPedidoErpVinculado({
      oportunidadeId,
      empresa,
      pedido: codigo,
      usuarioNome,
    })
    pedidosVinculados.push({
      id: vinculado.id,
      numero: vinculado.numero,
      status: vinculado.status,
      valorPedido: vinculado.valorPedido,
    })
  }

  const nota: NotaPrevista = {
    numero: notaErp.nr_nota ?? null,
    dataNota: notaErp.data_nota ?? notaErp.data_emissao ?? null,
    valorTotal: Number(notaErp.valor_total ?? 0),
    empresa,
    pedido: notaErp.pedido ?? null,
    pedidoOrigem: notaErp.pedido_origem ?? null,
  }

  const documentoNota = await requisitarErp<FaturamentoErp>(
    `/crm/faturamentos/${encodeURIComponent(empresa)}/${encodeURIComponent(pedidoInternoNota)}/${encodeURIComponent(nota.numero ?? "")}`
  )

  const valorPedido = pedidosVinculados.reduce((total, item) => total + item.valorPedido, 0)
  const valorOportunidade = await recalcularValorOportunidade(oportunidadeId)

  const statusPedidoFinal =
    statusPedido ?? (nota.valorTotal >= valorPedido ? "FATURADO" : "PARCIAL")
  for (const pedido of pedidosVinculados) {
    await db
      .update(crmPedidosVenda)
      .set({ status: statusPedidoFinal, updatedAt: new Date() })
      .where(eq(crmPedidosVenda.id, pedido.id))
    if (pedido.status !== statusPedidoFinal) {
      await registrarEventoPedidoVenda({
        pedidoVendaId: pedido.id,
        oportunidadeId,
        empresaId: oportunidade.empresaId,
        clienteId: oportunidade.clienteId,
        tipo: "PEDIDO_VENDA",
        descricao: `Pedido ${pedido.numero ?? pedido.id} alterado de ${pedido.status ?? "—"} para ${statusPedidoFinal} ao vincular a nota ${nota.numero ?? "—"}`,
        metadados: {
          statusAntigo: pedido.status,
          statusNovo: statusPedidoFinal,
          notaNumero: nota.numero,
          origem: "CRM",
        },
        chaveEvento: `pedido-status-vinculo-${pedido.id}-${statusPedidoFinal}-${nota.numero ?? "sem-nota"}`,
      })
    }
  }

  const faturamentoId = await criarOuAtualizarFaturamento({
    oportunidadeId,
    pedidoVendaIds: pedidosVinculados.map((pedido) => pedido.id),
    empresa,
    pedido: pedidoInternoNota,
    pedidoReferencia: codigoPedido,
    pedidoErp: nota.pedido,
    nota,
    itens: itensParaCrmFaturamento(documentoNota.itens ?? []),
    usuarioNome,
  })

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
          contexto: { pedidoVendaId: pedidosVinculados[0]?.id ?? null },
        })
        conversaoLead = {
          ok: Boolean(resultadoLead.ok),
          erro: resultadoLead.ok ? undefined : "Lead não convertida",
        }
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

  let automacaoOportunidade: AplicarVinculacaoFaturadoResult["automacaoOportunidade"] = {
    ok: false,
  }
  try {
    const resultadoOportunidade = await processarAutomacaoCRM({
      entidade: "OPORTUNIDADE",
      acao: "ALTERAR_STATUS",
      entidadeId: oportunidadeId,
      statusNovo: "FECHADO_GANHO",
      valorEstimado: valorOportunidade,
      probabilidade: 100,
      autor: { id: undefined, nome: usuarioNome ?? null },
      contexto: { pedidoVendaIds: pedidosVinculados.map((pedido) => pedido.id) },
    })
    automacaoOportunidade = {
      ok: Boolean(resultadoOportunidade.ok),
      erro: resultadoOportunidade.ok
        ? undefined
        : resultadoOportunidade.decisaoPendente?.mensagem || "Oportunidade não fechada como ganha",
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
    descricao: `Nota ${nota.numero ?? "-"} vinculada na oportunidade #${oportunidadeId} com os pedidos ${pedidosVinculados
      .map((pedido) => pedido.numero ?? "-")
      .join(", ")}`,
    entidade: "CrmPedidoVenda",
    entidadeId: pedidosVinculados[0]?.id ?? 0,
    usuarioNome,
    dados: {
      codigoPedido,
      pedidos: pedidosVinculados.map((pedido) => pedido.id),
      nrNota: nota.numero,
      valorPedido,
      valorNota: nota.valorTotal,
      status: statusPedidoFinal,
      faturamentoId,
    },
  })

  return {
    pedidoId: pedidosVinculados[0]?.id ?? 0,
    numero: pedidosVinculados[0]?.numero ?? codigoPedido,
    pedidos: pedidosVinculados,
    valorPedido,
    status: statusPedidoFinal,
    faturamentoId,
    nota,
    valorOportunidade,
    conversaoLead,
    automacaoOportunidade,
  }
}
