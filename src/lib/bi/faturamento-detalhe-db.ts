import type { Integracao } from "@/lib/db/schema/integracoes"

/**
 * Cache do detalhe do faturamento no IndexedDB do navegador.
 *
 * A tela de detalhe do card Faturamento usa a API do BI como fonte **ocasional**:
 * `estado` para saber se a base já existe, `carga`/`sync` para (re)construir ou
 * atualizar, e `faturamento-detalhe` para o dump inicial. O resto (filtros,
 * paginação, resumo) roda direto no cache local — o Neon não é consultado a cada
 * clica de filtro.
 *
 * Store `itens`: keyPath `chave` = `empresa|pedido|item|nr_nota` com índice por
 * `data_nota`; o `mergeDelta` faz upsert por chave e poda a régua da janela.
 * Store `meta`: guarda o último estado conhecido (`carga_completa`, `contagem`,
 * `ultima_data`) para o sync manter o watermark e para a tela saber se precisa
 * carregar.
 */

export interface ItemFaturamento {
  chave: string
  empresa: string
  pedido: string
  item: number
  nr_nota: string
  data_nota: string
  cliente: string
  nome_cliente: string
  cod_produto: string
  metros: number
  vr_unitario: number
  vr_total: number
  acres_desc: number
  peso: number
  vr_nota: number
  romaneio: string
  representante_codigo: string
  representante: string
}

export interface EstadoFaturamentoDetalhe {
  carga_completa: boolean
  contagem: number
  ultima_data: string | null
  janela_inicio: string
  janela_fim: string
}

export interface ResumoFaturamento {
  itens: number
  notas: number
  pedidos: number
  metros: number
  peso: number
  faturamento: number
}

export interface FiltrosFaturamento {
  data_inicio?: string
  data_fim?: string
  representante?: string
  cliente?: string
  produto?: string
}

export interface PaginacaoFaturamento {
  total: number
  pagina: number
  por_pagina: number
  total_paginas: number
}

export interface ConsultaFaturamento {
  resumo: ResumoFaturamento
  paginacao: PaginacaoFaturamento
  itens: Omit<ItemFaturamento, "chave">[]
}

const DB_NOME = "faturamento-detalhe-bi"
const DB_VERSAO = 1
const STORE_ITENS = "itens"
const STORE_META = "meta"
const KEY_META_ESTADO = "estado"
const META_NOME = "nome"

let dbAberto: Promise<IDBDatabase> | null = null

export function chaveDe(item: { empresa: string; pedido: string; item: number; nr_nota: string }): string {
  return `${item.empresa}|${item.pedido}|${item.item}|${item.nr_nota}`
}

function abrir(): Promise<IDBDatabase> {
  if (dbAberto) return dbAberto
  dbAberto = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOME, DB_VERSAO)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_ITENS)) {
        const store = db.createObjectStore(STORE_ITENS, { keyPath: "chave" })
        store.createIndex("data_nota", "data_nota", { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: META_NOME })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error("Banco bloqueado por outra aba"))
  })
  return dbAberto
}

function pedir(db: IDBDatabase, store: string, modo: IDBTransactionMode): IDBObjectStore {
  return db.transaction(store, modo).objectStore(store)
}

function pedirMais(store: IDBObjectStore): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result as unknown[])
    req.onerror = () => reject(req.error)
  })
}

function pedirTodos(db: IDBDatabase, store: string): Promise<unknown[]> {
  return pedirMais(pedir(db, store, "readonly"))
}

function operacao(store: IDBObjectStore, registro: unknown, tipo: "put" | "add"): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = store[tipo](registro)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

function transacao(
  db: IDBDatabase,
  stores: string[],
  modo: IDBTransactionMode,
  corpo: (tx: IDBTransaction) => Promise<void>
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, modo)
    corpo(tx).catch((erro) => {
      try {
        tx.abort()
      } catch {
        // já abortada
      }
      reject(erro)
    })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

function paraItem(linha: Record<string, unknown>): ItemFaturamento {
  return linha as unknown as ItemFaturamento
}

/** Substitui a base local (roda depois de uma carga completa na API). */
export async function substituirBase(itens: Omit<ItemFaturamento, "chave">[]): Promise<number> {
  const db = await abrir()
  const comChave = itens.map((item) => ({ ...item, chave: chaveDe(item) }))
  // Emite todas as gravações em rajada síncrona: aguardar entre puts deixaria a
  // transação autocommitar antes da última gravação (perda parcial).
  await transacao(db, [STORE_ITENS], "readwrite", (tx) => {
    const store = tx.objectStore(STORE_ITENS)
    store.clear()
    for (const item of comChave) store.put(item)
    return Promise.resolve()
  })
  return comChave.length
}

/** Aplica o delta vindo do sync: upsert por chave e poda da janela de 12 meses. */
export async function mergeDelta(
  itens: Omit<ItemFaturamento, "chave">[],
  janelaInicio: string,
  janelaFim: string
): Promise<number> {
  const db = await abrir()
  const comChave = itens.map((item) => ({ ...item, chave: chaveDe(item) }))
  await transacao(db, [STORE_ITENS], "readwrite", async (tx) => {
    const store = tx.objectStore(STORE_ITENS)
    for (const item of comChave) store.put(item)
    const todos = (await pedirMais(store)).map((linha: unknown) => paraItem(linha as Record<string, unknown>))
    const foraDaJanela = todos.filter(
      (item) => item.data_nota < janelaInicio || item.data_nota > janelaFim
    )
    for (const item of foraDaJanela) store.delete(item.chave)
  })
  return comChave.length
}

/** Grava o último estado conhecido (para guardar o watermark do sync no cliente). */
export async function salvarEstado(estado: EstadoFaturamentoDetalhe): Promise<void> {
  const db = await abrir()
  const registro = { [META_NOME]: KEY_META_ESTADO, estado }
  await transacao(db, [STORE_META], "readwrite", async (tx) => {
    await operacao(tx.objectStore(STORE_META), registro, "put")
  })
}

export async function estadoSalvo(): Promise<EstadoFaturamentoDetalhe | null> {
  const db = await abrir()
  const registros = await pedirTodos(db, STORE_META)
  const registro = registros.find((item) => (item as Record<string, unknown>)[META_NOME] === KEY_META_ESTADO)
  return (registro as { estado: EstadoFaturamentoDetalhe } | undefined)?.estado ?? null
}

export async function limpar(): Promise<void> {
  const db = await abrir()
  await transacao(db, [STORE_ITENS, STORE_META], "readwrite", async (tx) => {
    tx.objectStore(STORE_ITENS).clear()
    tx.objectStore(STORE_META).clear()
  })
}

function combinar(filtros: FiltrosFaturamento): (item: ItemFaturamento) => boolean {
  const inicio = filtros.data_inicio ?? ""
  const fim = filtros.data_fim ?? ""
  const representante = filtros.representante?.toLocaleLowerCase("pt-BR") ?? ""
  const cliente = filtros.cliente?.toLocaleLowerCase("pt-BR") ?? ""
  const produto = filtros.produto?.toLocaleLowerCase("pt-BR") ?? ""
  return (item) => {
    if (inicio && item.data_nota < inicio) return false
    if (fim && item.data_nota > fim) return false
    if (representante && !item.representante.toLocaleLowerCase("pt-BR").includes(representante))
      return false
    if (cliente && !item.nome_cliente.toLocaleLowerCase("pt-BR").includes(cliente)) return false
    if (produto && !item.cod_produto.toLocaleLowerCase("pt-BR").includes(produto)) return false
    return true
  }
}

function ordenar(a: ItemFaturamento, b: ItemFaturamento): number {
  if (a.data_nota !== b.data_nota) return a.data_nota < b.data_nota ? 1 : -1
  if (a.nr_nota !== b.nr_nota) return a.nr_nota < b.nr_nota ? 1 : -1
  return a.item - b.item
}

/** Consulta com os mesmos filtros/resumo/paginação da API, só que no IndexedDB. */
export async function consultar(
  filtros: FiltrosFaturamento,
  pagina = 1,
  porPagina = 100
): Promise<ConsultaFaturamento> {
  const db = await abrir()
  const todos = (await pedirTodos(db, STORE_ITENS)).map((linha: unknown) => paraItem(linha as Record<string, unknown>))
  const filtrados = todos.filter(combinar(filtros)).sort(ordenar)
  const resumo: ResumoFaturamento = {
    itens: filtrados.length,
    notas: new Set(filtrados.map((item) => `${item.empresa}|${item.nr_nota}`)).size,
    pedidos: new Set(filtrados.map((item) => `${item.empresa}|${item.pedido}`)).size,
    metros: filtrados.reduce((soma, item) => soma + (item.metros || 0), 0),
    peso: filtrados.reduce((soma, item) => soma + (item.peso || 0), 0),
    faturamento: filtrados.reduce(
      (soma, item) => soma + (item.vr_total || 0) + (item.acres_desc || 0),
      0
    ),
  }
  const paginaCorrigida = Math.max(1, pagina)
  const porPaginaCorrigido = Math.max(1, Math.min(porPagina, 500))
  const comeco = (paginaCorrigida - 1) * porPaginaCorrigido
  const itensPagina = filtrados
    .slice(comeco, comeco + porPaginaCorrigido)
    .map(({ chave, ...item }) => item as Omit<ItemFaturamento, "chave">)
  return {
    resumo,
    paginacao: {
      total: filtrados.length,
      pagina: paginaCorrigida,
      por_pagina: porPaginaCorrigido,
      total_paginas: filtrados.length ? Math.ceil(filtrados.length / porPaginaCorrigido) : 0,
    },
    itens: itensPagina,
  }
}

/** Opções dos filtros, espelhando `GET /faturamento-detalhe/opcoes`. */
export async function opcoes(): Promise<{ representantes: string[]; produtos: string[] }> {
  const db = await abrir()
  const todos = (await pedirTodos(db, STORE_ITENS)).map((linha: unknown) => paraItem(linha as Record<string, unknown>))
  const representantes = [...new Set(todos.map((item) => item.representante).filter(Boolean))].sort()
  const produtos = [...new Set(todos.map((item) => item.cod_produto).filter(Boolean))].sort()
  return { representantes, produtos }
}

/** Descobre se a integração lista o detalhe do faturamento (`/faturamento-detalhe/*`). */
export function eIntegracaoFaturamento(
  integracao: Pick<Integracao, "nome" | "baseUrl">
): boolean {
  return (
    /faturamento-detalhe/i.test(integracao.baseUrl) ||
    /faturamento/i.test(integracao.nome)
  )
}