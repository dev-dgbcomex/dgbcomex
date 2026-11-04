import { db } from "@/lib/db"
import { crmPessoas } from "@/lib/db/schema/crm-pessoas"
import { crmContatos } from "@/lib/db/schema/crm-contatos"
import { eq, inArray, or } from "drizzle-orm"

/**
 * Relacionamentos do cliente no CRM.
 *
 * O cliente pode ter vindo de uma ou mais pessoas do CRM (promovidas pelo
 * botão "Tornar cliente") e pode ter contatos próprios. Os vínculos diretos
 * (cliente_id) e os herdados das pessoas são equivalentes para o CRM: o
 * negócio do cliente é tudo o que foi feito com ele ou com as pessoas que
 * viraram ele.
 */

/** Ids das pessoas do CRM que foram promovidas a este cliente. */
export async function idsPessoasDoCliente(clienteId: number): Promise<number[]> {
  const linhas: any[] = await db
    .select({ id: crmPessoas.id })
    .from(crmPessoas)
    .where(eq(crmPessoas.clienteId, clienteId))

  return linhas.map((linha: any) => linha.id)
}

/** Cliente ao qual a pessoa do CRM foi promovida (null se ainda for só lead). */
export async function clienteIdDaPessoa(empresaId?: number | null): Promise<number | null> {
  if (!empresaId) return null

  const linhas: any[] = await db
    .select({ clienteId: crmPessoas.clienteId })
    .from(crmPessoas)
    .where(eq(crmPessoas.id, empresaId))
    .limit(1)

  return linhas[0]?.clienteId ?? null
}

/** Ids dos contatos do cliente (diretos ou herdados das pessoas promovidas). */
export async function idsContatosDoCliente(clienteId: number): Promise<number[]> {
  const pessoas = await idsPessoasDoCliente(clienteId)

  const condicoes: any[] = [eq(crmContatos.clienteId, clienteId)]
  if (pessoas.length > 0) condicoes.push(inArray(crmContatos.empresaId, pessoas))

  const linhas: any[] = await db
    .select({ id: crmContatos.id })
    .from(crmContatos)
    .where(or(...condicoes))

  return linhas.map((linha: any) => linha.id)
}
