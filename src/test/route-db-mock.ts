import { vi } from "vitest"

const CHAIN_METHODS = [
  "select",
  "from",
  "where",
  "and",
  "or",
  "orderBy",
  "limit",
  "offset",
  "set",
  "values",
  "returning",
  "groupBy",
  "having",
  "innerJoin",
  "leftJoin",
  "rightJoin",
  "on",
  "onConflictDoNothing",
  "onConflictDoUpdate",
]

export function createQueryBuilder<T>(result: T): any {
  const builder: any = {}
  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn(() => builder)
  }
  builder.then = (resolve?: (value: T) => unknown) => Promise.resolve(result).then(resolve)
  builder.catch = (reject?: (reason: unknown) => unknown) => Promise.resolve(result).catch(reject)
  return builder
}

export function sqlParaTexto(valor: unknown): string {
  const visitado = new Set<object>()

  function percorrer(no: unknown): string {
    if (no === null || no === undefined) return ""
    if (typeof no === "string") return no
    if (typeof no !== "object") return String(no)
    if (visitado.has(no)) return ""
    visitado.add(no)

    const objeto = no as { queryChunks?: unknown; name?: unknown; value?: unknown }
    const partes: string[] = []
    if (typeof objeto.name === "string") partes.push(objeto.name)
    if (typeof objeto.value === "string") partes.push(objeto.value)
    if (Array.isArray(objeto.value)) partes.push(percorrer(objeto.value))
    if (objeto.queryChunks) partes.push(percorrer(objeto.queryChunks))
    if (Array.isArray(no)) {
      for (const item of no) partes.push(percorrer(item))
    }
    return partes.join(" ")
  }

  return percorrer(valor)
}

export function resetDb(db: any) {
  for (const key of ["select", "insert", "update", "delete", "execute"]) {
    if (typeof db[key]?.mockReset === "function") db[key].mockReset()
  }
}

export function createDbMock() {
  return {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
  }
}
