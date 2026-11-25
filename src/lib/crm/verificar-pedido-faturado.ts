import { and, eq, inArray, isNotNull } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  crmFaturamentos,
  crmFaturamentoItens,
  crmFaturamentoPedidos,
  crmLeads,
  crmOportunidades,
  crmPedidosVenda,
  crmPedidoVendaItens,
} from "@/lib/db/schema"
import { somarValoresTotais } from "@/lib/crm/documento-venda"
import {
  recalcularValorOportunidade,
  somaOportunidade,
} from "@/lib/crm/valor-oportunidade"
import {
  atualizarEspelhosErp,
  criarPedidoEspelho,
  itensParaCrm,
  itensParaCrmFaturamento,
} from "@/lib/crm/erp-espelho"
import { processarAutomacaoCRM } from "@/lib/crm/automacoes-crm"
import { registrarLog } from "@/lib/notificar"
import {
  buscarFaturamentosPorPedido,
  buscarPedidoFaturadoErp,
  buscarPedidosDaNotaErp,
  requisitarErp,
} from "@/lib/erp/cliente"
import type { FaturamentoErp, ListaErp } from "@/lib/erp/tipos"

type Autor = { id?: number | null; nome?: string | null }

export type NotaPrevista = {
  numero: string | null
  dataNota: string | null
  valorTotal: number
  empresa: string | null
  pedido: string | null
  pedidoOrigem: string | null
}

type PedidoPrevio = {
  pedidoId: number
  numero: string | null
  referenciaExterna: string | null
  empresa: string | null
  oportunidadeId: number
  oportunidadeTitulo: string | null
  leadId: number | null
  leadNome: string | null
  jaConvertida: boolean
  valorAntes: number
  valorDepois: number
  nota: NotaPrevista | null
  statusSugerido: "FATURADO" | "PARCIAL" | null
  semNota: boolean
}

type PreviewResultado = {
  pedidos: PedidoPrevio[]
  mensagem: string | null
  sincronizacao: { verificados: number; atualizados: number; falhas: number }
}

type AplicarPedidoResultado = {
  pedidoId: number
  numero: string | null
  valorPedido: number
  status: string
  faturamentoId: number | null
  nota: NotaPrevista | null
  conversaoLead: { ok: boolean; erro?: string }
}

type AplicarResultado = {
  pedidos: AplicarPedidoResultado[]
  oportunidadeId: number | null
  valorOportunidade: number
  oportunidades: Array<{ oportunidadeId: number; valorEstimado: number }>
}

function chavePedido(referencia: string | null | undefined): string | null {
  const partes = (referencia || "").split("/").map((p) => p.trim())
  if (partes.length < 2 || !partes[0] || !partes[1]) return null
  return `${partes[0]}/${partes[1]}`
}

async function obterPedidosVinculados(
  pedidoIds?: number[],
  oportunidadeId?: number
): Promise<Array<{ id: number; numero: string | null; referenciaExterna: string | null; oportunidadeId: number; oportunidadeTitulo: string | null; leadId: number | null; leadNome: string | null; jaConvertida: boolean }>> {
  const condicoes = [eq(crmPedidosVenda.origem, "ERP"), isNotNull(crmPedidosVenda.referenciaExterna)]
  if (pedidoIds && pedidoIds.length > 0) {
    condicoes.push(inArray(crmPedidosVenda.id, pedidoIds))
  }
  if (oportunidadeId) {
    condicoes.push(eq(crmPedidosVenda.oportunidadeId, oportunidadeId))
  }

  return db
    .select({
      id: crmPedidosVenda.id,
      numero: crmPedidosVenda.numero,
      referenciaExterna: crmPedidosVenda.referenciaExterna,
      oportunidadeId: crmOportunidades.id,
      oportunidadeTitulo: crmOportunidades.titulo,
      leadId: crmLeads.id,
      leadNome: crmLeads.nome,
      jaConvertida: crmLeads.promovidaCliente,
    })
    .from(crmPedidosVenda)
    .innerJoin(crmOportunidades, eq(crmPedidosVenda.oportunidadeId, crmOportunidades.id))
    .leftJoin(crmLeads, eq(crmOportunidades.empresaId, crmLeads.id))
    .where(and(...condicoes))
}

export async function garantirPedidoErpVinculado(params: {
  oportunidadeId: number
  empresa: string | null
  pedido: string | null
  usuarioNome: string | null
}): Promise<{
  id: number
  numero: string | null
  referenciaExterna: string | null
  valorPedido: number
}> {
  const { oportunidadeId, empresa, pedido, usuarioNome } = params
  if (!empresa || !pedido) {
    throw new Error("Empresa e pedido do ERP são obrigatórios")
  }
  const referencia = `${empresa}/${pedido}`

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
        eq(crmPedidosVenda.referenciaExterna, referencia)
      )
    )
    .limit(1)

  if (existente) {
    if (existente.oportunidadeId !== oportunidadeId) {
      throw new Error("Este pedido do ERP já está vinculado a outra oportunidade.")
    }
    return {
      id: existente.id,
      numero: existente.numero,
      referenciaExterna: existente.referenciaExterna,
      valorPedido: await somaItensPedido(existente.id),
    }
  }

  const documento = await buscarPedidoFaturadoErp(empresa, pedido)
  const criado = await criarPedidoEspelho({
    oportunidadeId,
    empresa,
    pedidoReferencia: pedido,
    documento,
    usuarioNome,
  })
  return {
    id: criado.id,
    numero: criado.numero,
    referenciaExterna: referencia,
    valorPedido: criado.total,
  }
}

export async function somaItensPedido(pedidoVendaId: number): Promise<number> {
  const itens = await db
    .select()
    .from(crmPedidoVendaItens)
    .where(eq(crmPedidoVendaItens.pedidoVendaId, pedidoVendaId))
  return somarValoresTotais(itens)
}

export { somaOportunidade } from "@/lib/crm/valor-oportunidade"

async function obterNotaERP(pedidoNumero: string | null): Promise<NotaPrevista | null> {
  if (!pedidoNumero) return null
  const resposta = await buscarFaturamentosPorPedido(pedidoNumero)
  const nota = resposta.itens?.[0]
  if (!nota) return null
  return {
    numero: nota.nr_nota ?? null,
    dataNota: nota.data_nota ?? nota.data_emissao ?? null,
    valorTotal: Number(nota.valor_total ?? 0),
    empresa: nota.empresa ?? null,
    pedido: nota.pedido ?? null,
    pedidoOrigem: nota.pedido_origem ?? null,
  }
}

export async function verificarPedidoFaturado(
  pedidoIds?: number[],
  oportunidadeId?: number
): Promise<PreviewResultado> {
  const pedidos = await obterPedidosVinculados(pedidoIds, oportunidadeId)
  if (pedidos.length === 0) {
    return {
      pedidos: [],
      mensagem:
        "Vincule ou lance um pedido com o mesmo número de pedido do ERP.",
      sincronizacao: { verificados: 0, atualizados: 0, falhas: 0 },
    }
  }

  const valoresAntes = new Map<number, number>()
  for (const pedido of pedidos) {
    valoresAntes.set(pedido.id, await somaItensPedido(pedido.id))
  }

  const sincronizacao = await atualizarEspelhosErp("PEDIDO")

  const previsoes: PedidoPrevio[] = []
  for (const pedido of pedidos) {
    const chave = chavePedido(pedido.referenciaExterna)
    const nota = chave ? await obterNotaERP(pedido.numero) : null
    const valorAntes = valoresAntes.get(pedido.id) ?? 0
    const valorDepois = await somaItensPedido(pedido.id)

    let statusSugerido: "FATURADO" | "PARCIAL" | null = null
    let semNota = true
    if (nota) {
      semNota = false
      statusSugerido = nota.valorTotal >= valorDepois ? "FATURADO" : "PARCIAL"
    }

    previsoes.push({
      pedidoId: pedido.id,
      numero: pedido.numero,
      referenciaExterna: pedido.referenciaExterna,
      empresa: chave ? chave.split("/")[0] : null,
      oportunidadeId: pedido.oportunidadeId,
      oportunidadeTitulo: pedido.oportunidadeTitulo,
      leadId: pedido.leadId,
      leadNome: pedido.leadNome || null,
      jaConvertida: Boolean(pedido.jaConvertida),
      valorAntes,
      valorDepois,
      nota: nota
        ? {
            numero: nota.numero,
            dataNota: nota.dataNota,
            valorTotal: nota.valorTotal,
            empresa: nota.empresa,
            pedido: nota.pedido,
            pedidoOrigem: nota.pedidoOrigem,
          }
        : null,
      statusSugerido,
      semNota,
    })
  }

  return { pedidos: previsoes, mensagem: null, sincronizacao }
}

export async function criarOuAtualizarFaturamento(
  params: {
    oportunidadeId: number
    pedidoVendaIds: number[]
    empresa: string | null
    pedido: string | null
    pedidoReferencia?: string | null
    pedidoErp?: string | null
    nota: NotaPrevista
    itens: ReturnType<typeof itensParaCrm>
    usuarioNome: string | null
  }
): Promise<number> {
  const {
    oportunidadeId,
    pedidoVendaIds,
    empresa,
    pedido,
    pedidoReferencia,
    pedidoErp,
    nota,
    itens,
    usuarioNome,
  } = params
  const ids = Array.from(new Set(pedidoVendaIds.filter((id) => Number.isFinite(id))))
  const pedidoVendaId = ids[0] ?? null
  const pedidoReferenciaFinal = pedidoReferencia ?? pedido ?? null
  const referencia = empresa && pedidoReferenciaFinal && nota.numero
    ? `${empresa}/${pedidoReferenciaFinal}/${nota.numero}`
    : null

  const existente = referencia
    ? await db
        .select({ id: crmFaturamentos.id })
        .from(crmFaturamentos)
        .where(
          and(
            eq(crmFaturamentos.origem, "ERP"),
            eq(crmFaturamentos.referenciaExterna, referencia)
          )
        )
        .limit(1)
    : []

  const observacao = [
    `Faturamento vinculado do ERP (${referencia})`,
    nota.numero ? `nota ${nota.numero}` : null,
    ids.length > 1 ? `${ids.length} pedidos faturados` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  const sincronizarVinculos = async (faturamentoId: number) => {
    await db
      .delete(crmFaturamentoPedidos)
      .where(eq(crmFaturamentoPedidos.faturamentoId, faturamentoId))
    if (ids.length > 0) {
      await db
        .insert(crmFaturamentoPedidos)
        .values(ids.map((id) => ({ faturamentoId, pedidoVendaId: id })))
        .onConflictDoNothing()
    }
  }

  if (existente[0]) {
    await db
      .update(crmFaturamentos)
      .set({
        pedidoVendaId,
        numero: nota.numero ?? null,
        dataEmissao: nota.dataNota ?? null,
        status: "EMITIDO",
        observacao,
        updatedAt: new Date(),
      })
      .where(eq(crmFaturamentos.id, existente[0].id))

    await sincronizarVinculos(existente[0].id)

    await db
      .delete(crmFaturamentoItens)
      .where(eq(crmFaturamentoItens.faturamentoId, existente[0].id))
    if (itens.length > 0) {
      await db.insert(crmFaturamentoItens).values(
        itens.map((item) => ({ ...item, faturamentoId: existente[0].id }))
      )
    }

    await registrarLog({
      tipo: "ATUALIZACAO",
      acao: "atualizar_faturamento_erp",
      descricao: `Faturamento do ERP ${referencia} atualizado e vinculado aos pedidos ${ids.join(", ")}`,
      entidade: "CrmFaturamento",
      entidadeId: existente[0].id,
      usuarioNome,
      dados: { referencia, pedidoVendaIds: ids, itens: itens.length },
    })
    return existente[0].id
  }

  const [criado] = await db
    .insert(crmFaturamentos)
    .values({
      oportunidadeId,
      pedidoVendaId,
      numero: nota.numero ?? null,
      dataEmissao: nota.dataNota ?? null,
      status: "EMITIDO",
      observacao,
      origem: "ERP",
      referenciaExterna: referencia ?? null,
    })
    .returning()

  await sincronizarVinculos(criado.id)

  if (itens.length > 0) {
    await db.insert(crmFaturamentoItens).values(
      itens.map((item) => ({ ...item, faturamentoId: criado.id }))
    )
  }

  await registrarLog({
    tipo: "CADASTRO",
    acao: "vincular_faturamento_erp",
    descricao: `Faturamento do ERP ${referencia} vinculado à oportunidade ${oportunidadeId} e aos pedidos ${ids.join(", ")}`,
    entidade: "CrmFaturamento",
    entidadeId: criado.id,
    usuarioNome,
    dados: { referencia, oportunidadeId, pedidoVendaIds: ids, itens: itens.length },
  })
  return criado.id
}

export async function aplicarVerificacaoPedidoFaturado(
  params: {
    pedidoIds?: number[]
    oportunidadeId?: number
    statusPedido?: "FATURADO" | "PARCIAL"
    autor?: Autor
  }
): Promise<AplicarResultado> {
  const { pedidoIds, oportunidadeId, statusPedido, autor } = params
  const usuarioNome = autor?.nome ?? null

  await atualizarEspelhosErp("PEDIDO")

  const pedidos = await obterPedidosVinculados(pedidoIds, oportunidadeId)
  if (pedidos.length === 0) {
    throw new Error(
      "Vincule ou lance um pedido com o mesmo número de pedido do ERP."
    )
  }

  const oportunidadesIds = Array.from(new Set(pedidos.map((p) => p.oportunidadeId)))
  const resultados: AplicarPedidoResultado[] = []
  const oportunidades: AplicarResultado["oportunidades"] = []

  for (const oportunidadeIdAtual of oportunidadesIds) {
    const pedidosOportunidade = pedidos.filter((p) => p.oportunidadeId === oportunidadeIdAtual)
    const [oportunidade] = await db
      .select({ id: crmOportunidades.id, empresaId: crmOportunidades.empresaId })
      .from(crmOportunidades)
      .where(eq(crmOportunidades.id, oportunidadeIdAtual))
      .limit(1)
    if (!oportunidade) continue

    const notasProcessadas = new Map<
      string,
      { faturamentoId: number | null; status: "FATURADO" | "PARCIAL"; nota: NotaPrevista }
    >()

    for (const pedido of pedidosOportunidade) {
      const valorPedido = await somaItensPedido(pedido.id)
      const chave = chavePedido(pedido.referenciaExterna)
      const nota = chave ? await obterNotaERP(pedido.numero) : null

      let statusPedidoFinal = statusPedido
      let faturamentoId: number | null = null

      if (nota && chave) {
        const chaveNota = `${nota.empresa ?? ""}/${nota.numero ?? ""}`
        let processada = notasProcessadas.get(chaveNota)

        if (!processada) {
          const [empresaErp, pedidoErp] = chave.split("/")
          const codigosNota = await buscarPedidosDaNotaErp(
            empresaErp,
            pedidoErp,
            nota.numero
          )
          const codigosFinais = codigosNota.length > 0 ? codigosNota : [pedido.numero ?? pedidoErp]

          const vinculados: Array<{ id: number; valorPedido: number }> = []
          for (const codigo of codigosFinais) {
            vinculados.push(
              await garantirPedidoErpVinculado({
                oportunidadeId: oportunidadeIdAtual,
                empresa: empresaErp,
                pedido: codigo,
                usuarioNome,
              })
            )
          }
          const pedidoIdsNota = vinculados.map((item) => item.id)
          const valorPedidosNota = vinculados.reduce((total, item) => total + item.valorPedido, 0)

          const pedidoDetalhe = nota.pedido ?? pedidoErp
          const documentoErp = await requisitarErp<FaturamentoErp>(
            `/crm/faturamentos/${encodeURIComponent(empresaErp)}/${encodeURIComponent(pedidoDetalhe)}/${encodeURIComponent(nota.numero ?? "")}`
          )
          faturamentoId = await criarOuAtualizarFaturamento({
            oportunidadeId: oportunidadeIdAtual,
            pedidoVendaIds: pedidoIdsNota,
            empresa: empresaErp,
            pedido: pedidoErp,
            pedidoReferencia: pedidoErp,
            pedidoErp: pedidoDetalhe,
            nota,
            itens: itensParaCrmFaturamento(documentoErp.itens ?? []),
            usuarioNome,
          })

          const statusNota = nota.valorTotal >= valorPedidosNota ? "FATURADO" : "PARCIAL"
          for (const id of pedidoIdsNota) {
            await db
              .update(crmPedidosVenda)
              .set({ status: statusNota, updatedAt: new Date() })
              .where(eq(crmPedidosVenda.id, id))
          }

          processada = { faturamentoId, status: statusNota, nota }
          notasProcessadas.set(chaveNota, processada)
        }

        faturamentoId = processada.faturamentoId
        statusPedidoFinal ??= processada.status
      }

      if (statusPedidoFinal) {
        await db
          .update(crmPedidosVenda)
          .set({ status: statusPedidoFinal, updatedAt: new Date() })
          .where(eq(crmPedidosVenda.id, pedido.id))
      }

      let conversaoLead: AplicarPedidoResultado["conversaoLead"] = { ok: false }
      const leadId = oportunidade.empresaId
      if (leadId) {
        const [lead] = await db
          .select()
          .from(crmLeads)
          .where(eq(crmLeads.id, leadId))
          .limit(1)
        if (lead && !lead.promovidaCliente) {
          try {
            await processarAutomacaoCRM({
              entidade: "LEAD",
              acao: "ALTERAR_STATUS",
              entidadeId: leadId,
              statusNovo: "CONVERTIDO_CLIENTE",
              decisao: "CONVERTER",
              autor,
            })
            conversaoLead = { ok: true }
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

      await registrarLog({
        tipo: "ATUALIZACAO",
        acao: "verificar_pedido_faturado",
        descricao: `Pedido do ERP ${pedido.referenciaExterna} verificado e valor sincronizado na oportunidade ${oportunidadeIdAtual}`,
        entidade: "CrmPedidoVenda",
        entidadeId: pedido.id,
        usuarioNome,
        dados: {
          pedidoId: pedido.id,
          valorPedido,
          status: statusPedidoFinal,
          nota: nota?.numero ?? null,
        },
      })

      resultados.push({
        pedidoId: pedido.id,
        numero: pedido.numero,
        valorPedido,
        status: statusPedidoFinal ?? "ABERTO",
        faturamentoId,
        nota: nota
          ? {
              numero: nota.numero,
              dataNota: nota.dataNota,
              valorTotal: nota.valorTotal,
              empresa: nota.empresa,
              pedido: nota.pedido,
              pedidoOrigem: nota.pedidoOrigem,
            }
          : null,
        conversaoLead,
      })
    }

    const valorOportunidade = await recalcularValorOportunidade(oportunidadeIdAtual)
    oportunidades.push({ oportunidadeId: oportunidadeIdAtual, valorEstimado: valorOportunidade })

    await processarAutomacaoCRM({
      entidade: "OPORTUNIDADE",
      acao: "ALTERAR_STATUS",
      entidadeId: oportunidadeIdAtual,
      statusNovo: "FECHADO_GANHO",
      valorEstimado: valorOportunidade,
      probabilidade: 100,
      autor,
    })
  }

  const oportunidadeIdFinal = oportunidadesIds[0] ?? null
  const valorOportunidadeFinal = oportunidadeIdFinal ? await somaOportunidade(oportunidadeIdFinal) : 0

  return {
    pedidos: resultados,
    oportunidadeId: oportunidadeIdFinal,
    valorOportunidade: valorOportunidadeFinal,
    oportunidades,
  }
}
