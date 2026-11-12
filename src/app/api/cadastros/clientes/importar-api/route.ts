import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { clientes } from "@/lib/db/schema/clientes"
import { eq, or, sql, inArray } from "drizzle-orm"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { fieldMapping, uniqueKey, items } = await req.json()
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Nenhum item para importar" }, { status: 400 })
    }

    // uniqueKey is an API field name; translate to PDM field name
    const pdmKeyField = (fieldMapping[uniqueKey] as string) || uniqueKey

    // Mapeia todos os itens e coleta os valores de chave para verificacao em lote
    const mappedItems: Array<{
      mapped: Record<string, any>
      keyValue: string | null
      insertData: Record<string, any> | null
    }> = []

    for (const item of items) {
      const mapped: Record<string, any> = {}

      // Apply field mapping: apiField -> pdmField
      for (const [apiField, pdmField] of Object.entries(fieldMapping)) {
        if (item[apiField] !== undefined) {
          mapped[pdmField as string] = item[apiField]
        }
      }

      const keyValue = mapped[pdmKeyField] ? String(mapped[pdmKeyField]) : null

      // Parse fields for insertion
      const insertData: Record<string, any> = {}

      if (mapped.nome) insertData.nome = String(mapped.nome)
      if (mapped.cnpj) insertData.cnpj = String(mapped.cnpj)
      if (mapped.razaoSocial) insertData.razaoSocial = String(mapped.razaoSocial)
      if (mapped.email) insertData.email = String(mapped.email)
      if (mapped.telefone) insertData.telefone = String(mapped.telefone)
      if (mapped.contato) insertData.contato = String(mapped.contato)
      if (mapped.endereco) insertData.endereco = String(mapped.endereco)
      if (mapped.cidade) insertData.cidade = String(mapped.cidade)
      if (mapped.uf) insertData.uf = String(mapped.uf)
      if (mapped.idIntegracao) insertData.idIntegracao = String(mapped.idIntegracao)
      insertData.ativo = mapped.ativo === true || mapped.ativo === "true" || mapped.ativo === 1

      mappedItems.push({ mapped, keyValue, insertData: insertData.nome ? insertData : null })
    }

    // Verificacao de duplicatas em lote: uma consulta para todas as chaves
    const keyValues = mappedItems
      .map((m) => m.keyValue)
      .filter((v): v is string => v !== null)

    let existingKeys = new Set<string>()

    if (keyValues.length > 0) {
      const existing = await db
        .select({ idIntegracao: clientes.idIntegracao, cnpj: clientes.cnpj })
        .from(clientes)
        .where(
          or(
            inArray(clientes.idIntegracao, keyValues),
            inArray(clientes.cnpj, keyValues),
          ),
        )

      for (const row of existing) {
        if (row.idIntegracao) existingKeys.add(row.idIntegracao)
        if (row.cnpj) existingKeys.add(row.cnpj)
      }
    }

    let importados = 0
    let duplicatas = 0
    const toInsert: Record<string, any>[] = []

    for (const m of mappedItems) {
      if (!m.keyValue || existingKeys.has(m.keyValue)) {
        duplicatas++
        continue
      }

      if (!m.insertData) {
        duplicatas++
        continue
      }

      toInsert.push(m.insertData)
    }

    // Insercao em lote: uma consulta para todos os novos clientes
    if (toInsert.length > 0) {
      await db.insert(clientes).values(toInsert)
      importados = toInsert.length
    }

    return NextResponse.json({ importados, duplicatas })
  } catch (error) {
    console.error("[POST /api/cadastros/clientes/importar-api]", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
