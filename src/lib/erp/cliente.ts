/**
 * Cliente da api-microdata para os documentos do ERP que o CRM vincula.
 *
 * O dgbcomex não alcança o PostgreSQL local (`dgbcomex_warehouse`) em produção, então a
 * leitura da carga do ERP (pedidos de venda e faturamentos) passa pela api-microdata
 * (FastAPI, on-premise) — o mesmo caminho do WMS, com o mesmo usuário de serviço.
 *
 * Reaproveita o cliente HTTP da api-microdata que já existe para o WMS: a autenticação
 * (login + cache de token) é a mesma, o que muda é só o vocabulário do erro.
 */

import { ErroWms, requisitarWms, type OpcoesRequisicao } from "@/lib/wms/cliente"
import type { FaturamentoErp, ListaErp, PedidoErp } from "@/lib/erp/tipos"

export class ErroErp extends Error {
  readonly status: number

  constructor(mensagem: string, status: number) {
    super(mensagem)
    this.name = "ErroErp"
    this.status = status
  }
}

/** Chama a api-microdata e devolve o JSON; erro da API vira `ErroErp` com o status real. */
export async function requisitarErp<T>(
  caminho: string,
  opcoes: OpcoesRequisicao = {}
): Promise<T> {
  try {
    return await requisitarWms<T>(caminho, opcoes)
  } catch (erro) {
    if (erro instanceof ErroWms) {
      throw new ErroErp(erro.message, erro.status)
    }
    throw erro
  }
}

/** Pedido faturado não está no warehouse: a api-microdata lê direto do SQL Server. */
export async function buscarPedidoFaturadoErp(
  empresa: string | null,
  pedido: string | null
): Promise<PedidoErp> {
  if (!empresa || !pedido) {
    throw new Error("Empresa e pedido do ERP são obrigatórios")
  }
  return requisitarErp<PedidoErp>(
    `/crm/pedidos-faturados/${encodeURIComponent(empresa)}/${encodeURIComponent(pedido)}`
  )
}

/** Uma nota pode faturar vários pedidos; devolve todos os `nosso_pedido` da nota. */
export async function buscarPedidosDaNotaErp(
  empresa: string | null,
  pedido: string | null,
  nrNota: string | null
): Promise<string[]> {
  if (!empresa || !pedido || !nrNota) return []
  const resposta = await requisitarErp<{
    pedidos: string[]
  }>(
    `/crm/faturamentos/${encodeURIComponent(empresa)}/${encodeURIComponent(pedido)}/${encodeURIComponent(nrNota)}/pedidos`
  )
  return (resposta.pedidos ?? []).map((item) => String(item).trim()).filter(Boolean)
}

export async function buscarFaturamentosPorPedido(
  pedido: string
): Promise<ListaErp<FaturamentoErp>> {
  const codigo = pedido.trim()
  const vazia: ListaErp<FaturamentoErp> = {
    paginacao: { total: 0, pagina: 1, por_pagina: 50, total_paginas: 0 },
    itens: [],
  }
  if (!codigo) return vazia

  try {
    return await requisitarErp<ListaErp<FaturamentoErp>>(
      `/crm/faturamentos-por-pedido/${encodeURIComponent(codigo)}`
    )
  } catch (erro) {
    if (!(erro instanceof ErroErp && erro.status === 404)) return vazia
  }

  const filtrar = (itens: FaturamentoErp[]) =>
    itens.filter((nota) => (nota.pedido_origem ?? "").trim() === codigo)

  try {
    const filtradas = await requisitarErp<ListaErp<FaturamentoErp>>(
      `/crm/faturamentos?pedido_origem=${encodeURIComponent(codigo)}&por_pagina=500`
    )
    if (filtradas.itens.length > 0) {
      return { ...filtradas, itens: filtrar(filtradas.itens) }
    }
    const todas = await requisitarErp<ListaErp<FaturamentoErp>>(
      `/crm/faturamentos?por_pagina=500`
    )
    return { ...todas, itens: filtrar(todas.itens) }
  } catch {
    return vazia
  }
}
