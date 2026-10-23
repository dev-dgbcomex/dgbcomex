/**
 * Repositório do WMS no dgbcomex: apenas o mapeamento HTTP para a api-microdata.
 *
 * Não há conexão direta com o PostgreSQL local aqui (ver `src/lib/wms/cliente.ts`).
 * As rotas `/api/wms/*` autenticam o usuário e delegam para estas funções.
 */
import { requisitarWms } from "./cliente"
import type {
  NovaSeparacao,
  PecaEmAberto,
  PecaRef,
  WmsDashboard,
  WmsGaveta,
  WmsPaginado,
  WmsPedido,
  WmsPedidoDetalhe,
  WmsPecaSeparacao,
  WmsSeparacao,
  WmsSeparacaoDetalhe,
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

export async function pecasDoItem(
  separacaoId: number,
  item: number,
  opcoes: {
    busca?: string
    gaveta?: string
    subLote?: string
    aviso?: string
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
