/**
 * Repositório do WMS no dgbcomex: apenas o mapeamento HTTP para a api-microdata.
 *
 * Não há conexão direta com o PostgreSQL local aqui (ver `src/lib/wms/cliente.ts`).
 * As rotas `/api/wms/*` autenticam o usuário e delegam para estas funções.
 */
import { requisitarWms } from "./cliente"
import type {
  ColetorDashboard,
  EstoqueDisponivelParaItem,
  NovaSeparacao,
  NovaSituacaoPedido,
  PecaEmAberto,
  PecaRef,
  WmsColetorPecaDisponivel,
  WmsColetorSeparacao,
  WmsColetorSeparacaoDetalhe,
  WmsDashboard,
  WmsGaveta,
  WmsPaginado,
  WmsPedido,
  WmsPedidoDetalhe,
  WmsPecaSeparacao,
  WmsSeparacao,
  WmsSeparacaoDetalhe,
  WmsSituacaoPedido,
} from "./tipos"

export type * from "./tipos"

const LIMITE_MAX = 500

function limitar(valor: number | undefined, padrao = 50): number {
  const n = valor ?? padrao
  return Math.min(Math.max(Math.trunc(n) || padrao, 1), LIMITE_MAX)
}

function paginar(params: URLSearchParams, limite?: number, offset?: number) {
  params.set("limite", String(limitar(limite)))
  params.set("offset", String(Math.max(offset ?? 0, 0)))
  return params
}

export async function dashboard(): Promise<WmsDashboard> {
  return requisitarWms<WmsDashboard>("/wms/dashboard")
}

export async function listarGavetas(opcoes: {
  busca?: string
  zona?: string
  limite?: number
  offset?: number
}): Promise<WmsPaginado<WmsGaveta>> {
  const params = paginar(
    new URLSearchParams({ busca: (opcoes.busca ?? "").trim(), zona: (opcoes.zona ?? "").trim() }),
    opcoes.limite,
    opcoes.offset
  )
  return requisitarWms<WmsPaginado<WmsGaveta>>(`/wms/gavetas?${params.toString()}`)
}

export async function listarPedidos(opcoes: {
  busca?: string
  statusSeparacao?: string
  arquivados?: boolean
  limite?: number
  offset?: number
}): Promise<WmsPaginado<WmsPedido>> {
  const params = paginar(
    new URLSearchParams({
      busca: (opcoes.busca ?? "").trim(),
      statusSeparacao: (opcoes.statusSeparacao ?? "").trim(),
    }),
    opcoes.limite,
    opcoes.offset
  )
  if (opcoes.arquivados) params.set("arquivados", "true")
  return requisitarWms<WmsPaginado<WmsPedido>>(`/wms/pedidos?${params.toString()}`)
}

export async function detalhePedido(
  empresa: string,
  pedido: string
): Promise<WmsPedidoDetalhe> {
  return requisitarWms<WmsPedidoDetalhe>(
    `/wms/pedidos/${encodeURIComponent(empresa)}/${encodeURIComponent(pedido)}`
  )
}

export async function listarSituacoes(opcoes: {
  ativo?: boolean
} = {}): Promise<WmsPaginado<WmsSituacaoPedido>> {
  const params = new URLSearchParams()
  if (opcoes.ativo != null) params.set("ativo", String(opcoes.ativo))
  const query = params.toString()
  return requisitarWms<WmsPaginado<WmsSituacaoPedido>>(
    `/wms/situacoes${query ? `?${query}` : ""}`
  )
}

export async function detalheSituacao(id: number): Promise<WmsSituacaoPedido> {
  return requisitarWms<WmsSituacaoPedido>(`/wms/situacoes/${id}`)
}

export async function criarSituacao(
  dados: NovaSituacaoPedido
): Promise<WmsSituacaoPedido> {
  return requisitarWms<WmsSituacaoPedido>("/wms/situacoes", {
    metodo: "POST",
    corpo: dados,
  })
}

export async function editarSituacao(
  id: number,
  dados: Partial<NovaSituacaoPedido>
): Promise<WmsSituacaoPedido> {
  return requisitarWms<WmsSituacaoPedido>(`/wms/situacoes/${id}`, {
    metodo: "PUT",
    corpo: dados,
  })
}

export async function excluirSituacao(id: number): Promise<void> {
  await requisitarWms(`/wms/situacoes/${id}`, { metodo: "DELETE" })
}

export async function moverPedidoSituacao(
  empresa: string,
  pedido: string,
  dados: {
    situacaoId: number
    observacao?: string | null
    usuarioId?: number | null
    cancelarOrdem?: boolean
  }
): Promise<WmsPedidoDetalhe> {
  return requisitarWms<WmsPedidoDetalhe>(
    `/wms/pedidos/${encodeURIComponent(empresa)}/${encodeURIComponent(pedido)}/situacao`,
    {
      metodo: "POST",
      corpo: {
        situacaoId: dados.situacaoId,
        observacao: dados.observacao,
        usuarioId: dados.usuarioId,
        cancelar_ordem: dados.cancelarOrdem ? true : false,
      },
    }
  )
}

export async function arquivarPedido(
  empresa: string,
  pedido: string
): Promise<WmsPedidoDetalhe> {
  return requisitarWms<WmsPedidoDetalhe>(
    `/wms/pedidos/${encodeURIComponent(empresa)}/${encodeURIComponent(pedido)}/arquivar`,
    { metodo: "POST", corpo: {} }
  )
}

export async function estoqueDisponivelParaItem(
  empresa: string,
  pedido: string,
  item: number
): Promise<EstoqueDisponivelParaItem> {
  return requisitarWms<EstoqueDisponivelParaItem>(
    `/wms/pedidos/${encodeURIComponent(empresa)}/${encodeURIComponent(pedido)}/itens/${item}/estoque-disponivel`
  )
}

export async function desarquivarPedido(
  empresa: string,
  pedido: string
): Promise<WmsPedidoDetalhe> {
  return requisitarWms<WmsPedidoDetalhe>(
    `/wms/pedidos/${encodeURIComponent(empresa)}/${encodeURIComponent(pedido)}/desarquivar`,
    { metodo: "POST", corpo: {} }
  )
}

export async function listarEstoque(opcoes: {
  busca?: string
  gaveta?: string
  subLote?: string
  aviso?: string
  cor?: string
  produto?: string
  limite?: number
  offset?: number
}): Promise<WmsPaginado<PecaEmAberto>> {
  const params = paginar(
    new URLSearchParams({
      busca: (opcoes.busca ?? "").trim(),
      gaveta: (opcoes.gaveta ?? "").trim(),
      subLote: (opcoes.subLote ?? "").trim(),
      aviso: (opcoes.aviso ?? "").trim(),
      cor: (opcoes.cor ?? "").trim(),
      produto: (opcoes.produto ?? "").trim(),
    }),
    opcoes.limite,
    opcoes.offset
  )
  return requisitarWms<WmsPaginado<PecaEmAberto>>(`/wms/estoque?${params.toString()}`)
}

export async function listarSeparacoes(opcoes: {
  status?: string
  busca?: string
  arquivadas?: boolean
  limite?: number
  offset?: number
}): Promise<WmsPaginado<WmsSeparacao>> {
  const params = paginar(
    new URLSearchParams({
      status: (opcoes.status ?? "").trim(),
      busca: (opcoes.busca ?? "").trim(),
    }),
    opcoes.limite,
    opcoes.offset
  )
  if (opcoes.arquivadas) params.set("arquivadas", "true")
  return requisitarWms<WmsPaginado<WmsSeparacao>>(`/wms/separacoes?${params.toString()}`)
}

export async function criarSeparacao(dados: NovaSeparacao): Promise<WmsSeparacao> {
  return requisitarWms<WmsSeparacao>("/wms/separacoes", { metodo: "POST", corpo: dados })
}

export async function detalheSeparacao(id: number): Promise<WmsSeparacaoDetalhe> {
  return requisitarWms<WmsSeparacaoDetalhe>(`/wms/separacoes/${id}`)
}

export async function iniciarSeparacao(
  id: number,
  usuarioId?: number | null
): Promise<WmsSeparacao> {
  return requisitarWms<WmsSeparacao>(`/wms/separacoes/${id}/iniciar`, {
    metodo: "POST",
    corpo: { usuarioId },
  })
}

export async function concluirSeparacao(
  id: number,
  usuarioId?: number | null,
  observacao?: string | null
): Promise<WmsSeparacao> {
  return requisitarWms<WmsSeparacao>(`/wms/separacoes/${id}/concluir`, {
    metodo: "POST",
    corpo: { usuarioId, observacao },
  })
}

export async function cancelarSeparacao(
  id: number,
  motivo?: string | null,
  usuarioId?: number | null
): Promise<WmsSeparacao> {
  return requisitarWms<WmsSeparacao>(`/wms/separacoes/${id}/cancelar`, {
    metodo: "POST",
    corpo: { motivo, usuarioId },
  })
}

export async function arquivarSeparacao(id: number): Promise<WmsSeparacao> {
  return requisitarWms<WmsSeparacao>(`/wms/separacoes/${id}/arquivar`, {
    metodo: "POST",
    corpo: {},
  })
}

export async function desarquivarSeparacao(id: number): Promise<WmsSeparacao> {
  return requisitarWms<WmsSeparacao>(`/wms/separacoes/${id}/desarquivar`, {
    metodo: "POST",
    corpo: {},
  })
}

export async function reabrirSeparacao(
  id: number,
  dados: { status?: string; usuarioId?: number | null; observacao?: string | null } = {}
): Promise<WmsSeparacao> {
  return requisitarWms<WmsSeparacao>(`/wms/separacoes/${id}/reabrir`, {
    metodo: "POST",
    corpo: {
      status: dados.status ?? "LIBERADO",
      usuarioId: dados.usuarioId,
      observacao: dados.observacao,
    },
  })
}

export async function pecasDoItem(
  separacaoId: number,
  item: number,
  opcoes: {
    busca?: string
    gaveta?: string
    subLote?: string
    aviso?: string
    campo?: string
    limite?: number
    offset?: number
  } = {}
): Promise<WmsPaginado<PecaEmAberto> & { item: Record<string, string | number | null> }> {
  const params = paginar(
    new URLSearchParams({
      busca: (opcoes.busca ?? "").trim(),
      gaveta: (opcoes.gaveta ?? "").trim(),
      subLote: (opcoes.subLote ?? "").trim(),
      aviso: (opcoes.aviso ?? "").trim(),
      campo: (opcoes.campo ?? "").trim(),
    }),
    opcoes.limite,
    opcoes.offset
  )
  return requisitarWms(
    `/wms/separacoes/${separacaoId}/itens/${item}/pecas?${params.toString()}`
  )
}

export async function adicionarPecas(
  separacaoId: number,
  dados: { item: number; pecas: PecaRef[]; usuarioId?: number | null }
): Promise<{ separacao: WmsSeparacao; adicionadas: number }> {
  return requisitarWms(`/wms/separacoes/${separacaoId}/pecas`, {
    metodo: "POST",
    corpo: dados,
  })
}

export async function removerPeca(
  separacaoId: number,
  pecaId: number,
  usuarioId?: number | null
): Promise<{ separacao: WmsSeparacao; removida: WmsPecaSeparacao }> {
  const params = new URLSearchParams()
  if (usuarioId != null) params.set("usuarioId", String(usuarioId))
  const query = params.toString()
  return requisitarWms(
    `/wms/separacoes/${separacaoId}/pecas/${pecaId}${query ? `?${query}` : ""}`,
    { metodo: "DELETE" }
  )
}

export type CargaPedidosEstado = {
  carga_completa: boolean
  contagem: number
  ultima_data: string | null
  atualizado_em: string | null
}

export async function obterEstadoCargaPedidos(): Promise<CargaPedidosEstado> {
  return requisitarWms<CargaPedidosEstado>("/wms/pedidos/carga/estado")
}

export async function executarCargaPedidos(
  dados: { forcar?: boolean; limite_dias?: number }
): Promise<{
  ok: boolean
  pedidos_lidos: number
  pedidos_inseridos: number
  pedidos_atualizados: number
  itens_inseridos: number
  itens_atualizados: number
}> {
  return requisitarWms("/wms/pedidos/carga", {
    metodo: "POST",
    corpo: dados,
  })
}

export async function listarSeparacoesColetor(
  opcoes: { limite?: number; offset?: number } = {}
): Promise<{ itens: WmsColetorSeparacao[]; total: number }> {
  const params = new URLSearchParams()
  if (opcoes.limite != null) params.set("limite", String(opcoes.limite))
  if (opcoes.offset != null) params.set("offset", String(opcoes.offset))
  const query = params.toString()
  return requisitarWms<{ itens: WmsColetorSeparacao[]; total: number }>(
    `/wms/coletor/separacoes${query ? `?${query}` : ""}`
  )
}

export async function detalheSeparacaoColetor(
  separacaoId: number
): Promise<WmsColetorSeparacaoDetalhe> {
  return requisitarWms<WmsColetorSeparacaoDetalhe>(
    `/wms/coletor/separacoes/${separacaoId}`
  )
}

export async function pecasDisponiveisParaColetor(
  separacaoId: number,
  item: number
): Promise<{ itens: WmsColetorPecaDisponivel[]; total: number }> {
  return requisitarWms<{ itens: WmsColetorPecaDisponivel[]; total: number }>(
    `/wms/coletor/separacoes/${separacaoId}/itens/${item}/pecas-disponiveis`
  )
}

export async function adicionarPecasColetor(
  separacaoId: number,
  dados: { item: number; pecas: { nroRolo: string; nroPeca: string; quantidade?: number }[] }
): Promise<{ ok: boolean; separacaoId: number }> {
  return requisitarWms<{ ok: boolean; separacaoId: number }>(
    `/wms/coletor/separacoes/${separacaoId}/pecas`,
    {
      metodo: "POST",
      corpo: {
        item: dados.item,
        pecas: dados.pecas.map((p) => ({
          nroRolo: p.nroRolo,
          nroPeca: p.nroPeca,
          quantidade: p.quantidade ?? 1,
        })),
      },
    }
  )
}

export async function gerarRomaneioColetor(
  separacaoId: number,
  dados: { usuarioId?: number | null } = {}
): Promise<{
  ok: boolean
  separacaoId: number
  romaneio: string | null
  pecasProcessadas: number
  pecas: Array<{
    itemSep: number
    nroRolo: string
    nroPeca: string
    romaneio: string | null
    incremento: number | null
  }>
}> {
  return requisitarWms<{
    ok: boolean
    separacaoId: number
    romaneio: string | null
    pecasProcessadas: number
    pecas: Array<{
      itemSep: number
      nroRolo: string
      nroPeca: string
      romaneio: string | null
      incremento: number | null
    }>
  }>(`/wms/coletor/separacoes/${separacaoId}/romanear`, {
    metodo: "POST",
    corpo: {
      usuarioId: dados.usuarioId,
    },
  })
}

export async function sincronizarColetor(): Promise<{
  ok: boolean
  processados: number
  erros: number
}> {
  return requisitarWms<{ ok: boolean; processados: number; erros: number }>(
    "/wms/coletor/sincronizar",
    { metodo: "POST" }
  )
}

export async function obterDashboardColetor(): Promise<ColetorDashboard> {
  return requisitarWms<ColetorDashboard>("/wms/coletor/dashboard")
}
