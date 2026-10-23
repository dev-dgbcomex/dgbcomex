/**
 * Repositório do WMS no dgbcomex: apenas o mapeamento HTTP para a api-microdata.
 *
 * Não há conexão direta com o PostgreSQL local aqui (ver `src/lib/wms/cliente.ts`).
 * As rotas `/api/wms/*` autenticam o usuário e delegam para estas funções.
 */
import { requisitarWms } from "./cliente"
import type {
  NovoEndereco,
  NovoMovimento,
  PecaEmAberto,
  WmsDashboard,
  WmsEndereco,
  WmsMovimento,
  WmsPecaAlocada,
} from "./tipos"

export type {
  NovaPeca,
  NovoEndereco,
  NovoMovimento,
  PecaEmAberto,
  WmsDashboard,
  WmsEndereco,
  WmsMovimento,
  WmsPecaAlocada,
} from "./tipos"

const LIMITE_MAX = 500

export async function listarEnderecos(): Promise<WmsEndereco[]> {
  return requisitarWms<WmsEndereco[]>("/wms/enderecos")
}

export async function criarEndereco(dados: NovoEndereco): Promise<WmsEndereco> {
  return requisitarWms<WmsEndereco>("/wms/enderecos", { metodo: "POST", corpo: dados })
}

export async function listarPecasEmAberto(opcoes: {
  busca?: string
  limite?: number
  offset?: number
}): Promise<{ itens: PecaEmAberto[]; total: number }> {
  const limite = Math.min(Math.max(opcoes.limite ?? 50, 1), LIMITE_MAX)
  const offset = Math.max(opcoes.offset ?? 0, 0)
  const busca = (opcoes.busca ?? "").trim()
  const params = new URLSearchParams({
    busca,
    limite: String(limite),
    offset: String(offset),
  })
  return requisitarWms<{ itens: PecaEmAberto[]; total: number }>(
    `/wms/estoque?${params.toString()}`
  )
}

export async function listarPecasAlocadas(): Promise<WmsPecaAlocada[]> {
  return requisitarWms<WmsPecaAlocada[]>("/wms/estoque/alocado")
}

export async function listarMovimentos(limite = 50): Promise<WmsMovimento[]> {
  const n = Math.min(Math.max(limite, 1), LIMITE_MAX)
  return requisitarWms<WmsMovimento[]>(`/wms/movimentos?limite=${n}`)
}

export async function registrarMovimento(
  dados: NovoMovimento
): Promise<{ movimento: WmsMovimento; peca?: unknown }> {
  return requisitarWms<{ movimento: WmsMovimento; peca?: unknown }>("/wms/movimentos", {
    metodo: "POST",
    corpo: dados,
  })
}

export async function dashboard(): Promise<WmsDashboard> {
  return requisitarWms<WmsDashboard>("/wms/dashboard")
}
