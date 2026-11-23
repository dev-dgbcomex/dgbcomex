import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  crmSaudeProspeccaoAnalises,
  type CrmSaudeProspeccaoAnalise,
} from "@/lib/db/schema/crm-saude-prospeccao-ia"

export const ROLES_VISUALIZACAO_ANALISES = ["ADMIN", "SUDO", "CRM"] as const

export function podeVerTodasAnalises(role: string | null | undefined) {
  return Boolean(role && (ROLES_VISUALIZACAO_ANALISES as readonly string[]).includes(role))
}

export async function carregarAnaliseAutorizada({
  id,
  userId,
  role,
}: {
  id: number
  userId: number
  role: string | null | undefined
}): Promise<CrmSaudeProspeccaoAnalise | null> {
  const [analise] = await db
    .select()
    .from(crmSaudeProspeccaoAnalises)
    .where(eq(crmSaudeProspeccaoAnalises.id, id))
    .limit(1)

  if (!analise) return null
  if (analise.criadoPor === userId || podeVerTodasAnalises(role)) return analise
  return null
}
