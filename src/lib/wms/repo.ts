import { alias } from "drizzle-orm/pg-core"
import { and, asc, count, desc, eq, sql } from "drizzle-orm"
import { dbLocal } from "@/lib/db/local"
import {
  wmsEnderecos,
  wmsEstoque,
  wmsMovimentos,
  type WmsEndereco,
  type WmsMovimento,
} from "@/lib/db/schema/wms"

export type PecaEmAberto = {
  empresa: string | null
  nro_rolo: string
  nro_peca: string
  produto: string | null
  categoria: string | null
  cor: string | null
  desenho: string | null
  variante: string | null
  largura: string | null
  metros: number | null
  peso: number | null
  situacao: string | null
  lote_interno: string | null
  data_entrada: string | null
}

export type NovaPeca = {
  empresa?: string | null
  nroRolo: string
  nroPeca: string
  produto?: string | null
  categoria?: string | null
  cor?: string | null
  desenho?: string | null
  variante?: string | null
  largura?: string | null
  metros?: number | null
  peso?: number | null
  situacao?: string | null
  loteInterno?: string | null
  dataEntrada?: string | null
}

export type NovoEndereco = {
  codigo: string
  tipo?: string
  zona?: string | null
  rua?: string | null
  predio?: string | null
  nivel?: string | null
  apto?: string | null
  capacidade?: number | null
  observacoes?: string | null
}

const LIMITE_MAX = 500

export async function listarEnderecos(): Promise<WmsEndereco[]> {
  return dbLocal.select().from(wmsEnderecos).orderBy(asc(wmsEnderecos.codigo))
}

export async function criarEndereco(dados: NovoEndereco): Promise<WmsEndereco> {
  const [novo] = await dbLocal
    .insert(wmsEnderecos)
    .values({
      codigo: dados.codigo.trim(),
      tipo: dados.tipo ?? "PULMAO",
      zona: dados.zona ?? null,
      rua: dados.rua ?? null,
      predio: dados.predio ?? null,
      nivel: dados.nivel ?? null,
      apto: dados.apto ?? null,
      capacidade: dados.capacidade != null ? String(dados.capacidade) : null,
      observacoes: dados.observacoes ?? null,
    })
    .returning()
  return novo
}

export async function criarPeca(enderecoId: number, peca: NovaPeca) {
  const [nova] = await dbLocal
    .insert(wmsEstoque)
    .values({
      enderecoId,
      empresa: peca.empresa ?? null,
      nroRolo: peca.nroRolo,
      nroPeca: peca.nroPeca,
      produto: peca.produto ?? null,
      categoria: peca.categoria ?? null,
      cor: peca.cor ?? null,
      desenho: peca.desenho ?? null,
      variante: peca.variante ?? null,
      largura: peca.largura ?? null,
      metros: peca.metros != null ? String(peca.metros) : null,
      peso: peca.peso != null ? String(peca.peso) : null,
      situacao: peca.situacao ?? null,
      loteInterno: peca.loteInterno ?? null,
      dataEntrada: peca.dataEntrada ?? null,
    })
    .onConflictDoNothing({ target: [wmsEstoque.nroRolo, wmsEstoque.nroPeca] })
    .returning()
  return nova ?? null
}

export async function registrarMovimento(dados: {
  tipo: string
  estoqueId?: number | null
  enderecoOrigemId?: number | null
  enderecoDestinoId?: number | null
  usuarioId?: number | null
  metros?: number | null
  peso?: number | null
  observacao?: string | null
}): Promise<WmsMovimento> {
  const [novo] = await dbLocal
    .insert(wmsMovimentos)
    .values({
      tipo: dados.tipo,
      estoqueId: dados.estoqueId ?? null,
      enderecoOrigemId: dados.enderecoOrigemId ?? null,
      enderecoDestinoId: dados.enderecoDestinoId ?? null,
      usuarioId: dados.usuarioId ?? null,
      metros: dados.metros != null ? String(dados.metros) : null,
      peso: dados.peso != null ? String(dados.peso) : null,
      observacao: dados.observacao ?? null,
    })
    .returning()
  return novo
}

export async function listarMovimentos(limite = 50) {
  const n = Math.min(Math.max(limite, 1), LIMITE_MAX)
  const origem = alias(wmsEnderecos, "origem")
  const destino = alias(wmsEnderecos, "destino")

  return dbLocal
    .select({
      id: wmsMovimentos.id,
      tipo: wmsMovimentos.tipo,
      estoqueId: wmsMovimentos.estoqueId,
      nroRolo: wmsEstoque.nroRolo,
      nroPeca: wmsEstoque.nroPeca,
      origem: origem.codigo,
      destino: destino.codigo,
      usuarioId: wmsMovimentos.usuarioId,
      metros: wmsMovimentos.metros,
      peso: wmsMovimentos.peso,
      observacao: wmsMovimentos.observacao,
      createdAt: wmsMovimentos.createdAt,
    })
    .from(wmsMovimentos)
    .leftJoin(wmsEstoque, eq(wmsMovimentos.estoqueId, wmsEstoque.id))
    .leftJoin(origem, eq(wmsMovimentos.enderecoOrigemId, origem.id))
    .leftJoin(destino, eq(wmsMovimentos.enderecoDestinoId, destino.id))
    .orderBy(desc(wmsMovimentos.createdAt))
    .limit(n)
}

export async function listarPecasEmAberto(opcoes: {
  busca?: string
  limite?: number
  offset?: number
}): Promise<PecaEmAberto[]> {
  const limite = Math.min(Math.max(opcoes.limite ?? 50, 1), LIMITE_MAX)
  const offset = Math.max(opcoes.offset ?? 0, 0)
  const busca = (opcoes.busca ?? "").trim()
  const filtro = busca
    ? sql`and (a.nro_rolo ilike ${"%" + busca + "%"} or a.produto ilike ${"%" + busca + "%"} or a.cor ilike ${"%" + busca + "%"} or a.lote_interno ilike ${"%" + busca + "%"})`
    : sql``

  const linhas = (await dbLocal.execute(sql`
    select
      a.empresa,
      a.nro_rolo,
      a.nro_peca,
      a.produto,
      a.categoria,
      a.cor,
      a.desenho,
      a.variante,
      a.largura,
      cast(a.metros as double precision) as metros,
      cast(a.peso as double precision) as peso,
      a.situacao,
      a.lote_interno,
      to_char(a.data_entrada, 'YYYY-MM-DD') as data_entrada
    from raw.cte_peca a
    where not exists (
      select 1 from raw.cte_baixa b
      where b.empresa = a.empresa
        and b.nro_rolo = a.nro_rolo
        and b.nro_peca = a.nro_peca
    )
      and a.nro_rolo_origem is null
      ${filtro}
    order by a.nro_rolo desc, a.nro_peca desc
    limit ${limite} offset ${offset}
  `)) as unknown as PecaEmAberto[]
  return linhas
}

export async function contarPecasEmAberto(busca = ""): Promise<number> {
  const texto = busca.trim()
  const filtro = texto
    ? sql`and (nro_rolo ilike ${"%" + texto + "%"} or produto ilike ${"%" + texto + "%"} or cor ilike ${"%" + texto + "%"} or lote_interno ilike ${"%" + texto + "%"})`
    : sql``

  const resultado = (await dbLocal.execute(sql`
    select count(*)::int as total
    from raw.cte_peca a
    where not exists (
      select 1 from raw.cte_baixa b
      where b.empresa = a.empresa
        and b.nro_rolo = a.nro_rolo
        and b.nro_peca = a.nro_peca
    )
      and a.nro_rolo_origem is null
      ${filtro}
  `)) as unknown as { total: number }[]
  return resultado[0]?.total ?? 0
}

export type WmsDashboard = {
  enderecos: number
  enderecosAtivos: number
  pecasAlocadas: number
  metrosAlocados: number
  pecasEmAberto: number
  movimentosHoje: number
}

export async function dashboard(): Promise<WmsDashboard> {
  const [totalEnderecos] = await dbLocal.select({ n: count() }).from(wmsEnderecos)
  const [ativos] = await dbLocal
    .select({ n: count() })
    .from(wmsEnderecos)
    .where(eq(wmsEnderecos.ativo, true))
  const [alocadas] = await dbLocal
    .select({ n: count(), metros: sql<number>`coalesce(sum(${wmsEstoque.metros}), 0)::float8` })
    .from(wmsEstoque)

  const [movHoje] = await dbLocal
    .select({ n: count() })
    .from(wmsMovimentos)
    .where(sql`${wmsMovimentos.createdAt} >= date_trunc('day', now())`)

  const emAberto = await contarPecasEmAberto()

  return {
    enderecos: totalEnderecos?.n ?? 0,
    enderecosAtivos: ativos?.n ?? 0,
    pecasAlocadas: alocadas?.n ?? 0,
    metrosAlocados: Number(alocadas?.metros ?? 0),
    pecasEmAberto: emAberto,
    movimentosHoje: movHoje?.n ?? 0,
  }
}

export async function listarPecasAlocadas() {
  return dbLocal
    .select({
      id: wmsEstoque.id,
      nroRolo: wmsEstoque.nroRolo,
      nroPeca: wmsEstoque.nroPeca,
      enderecoId: wmsEstoque.enderecoId,
      enderecoCodigo: wmsEnderecos.codigo,
      metros: wmsEstoque.metros,
      peso: wmsEstoque.peso,
    })
    .from(wmsEstoque)
    .innerJoin(wmsEnderecos, eq(wmsEstoque.enderecoId, wmsEnderecos.id))
    .orderBy(asc(wmsEnderecos.codigo), asc(wmsEstoque.nroRolo))
}

export async function buscarPeca(id: number) {
  const [linha] = await dbLocal.select().from(wmsEstoque).where(eq(wmsEstoque.id, id)).limit(1)
  return linha ?? null
}

export async function moverPeca(id: number, enderecoId: number) {
  const [linha] = await dbLocal
    .update(wmsEstoque)
    .set({ enderecoId, updatedAt: new Date() })
    .where(eq(wmsEstoque.id, id))
    .returning()
  return linha ?? null
}

export async function removerPeca(id: number) {
  const [linha] = await dbLocal.delete(wmsEstoque).where(eq(wmsEstoque.id, id)).returning()
  return linha ?? null
}

export async function pecaJaAlocada(nroRolo: string, nroPeca: string) {
  const [linha] = await dbLocal
    .select({ id: wmsEstoque.id, enderecoId: wmsEstoque.enderecoId })
    .from(wmsEstoque)
    .where(and(eq(wmsEstoque.nroRolo, nroRolo), eq(wmsEstoque.nroPeca, nroPeca)))
    .limit(1)
  return linha ?? null
}

export async function enderecoExiste(id: number) {
  const [linha] = await dbLocal
    .select({ id: wmsEnderecos.id })
    .from(wmsEnderecos)
    .where(eq(wmsEnderecos.id, id))
    .limit(1)
  return Boolean(linha)
}
