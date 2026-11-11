import { db } from "@/lib/db"
import { procAreas } from "@/lib/db/schema/processos"
import { usuarios } from "@/lib/db/schema/usuarios"
import { eq } from "drizzle-orm"
import { notificar, notificarUsuario } from "@/lib/notificar"

export async function notificarChamado(params: {
  tipo: string
  mensagem: string
  link: string
  usuarioId: number
  usuarioNome?: string | null
}) {
  if (!params.usuarioId) return
  await notificarUsuario({
    usuarioId: params.usuarioId,
    tipo: params.tipo,
    mensagem: params.mensagem,
    link: params.link,
    usuarioNome: params.usuarioNome,
  })
}

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, "")
    .toUpperCase()
}

/**
 * Perfis (roles) dos usuários que pertencem à fila do chamado.
 *
 * A fila é uma área de `proc_areas` e não tem vínculo direto com usuários, então
 * o vínculo é feito pelo nome: a fila "COMERCIAL" alcança o perfil COMERCIAL.
 * Nomes sem correspondência não alcançam ninguém — os administradores globais
 * continuam recebendo (eles são somados pelo motor de notificações).
 */
export async function rolesDaFila(areaId: number): Promise<string[]> {
  const [area] = await db
    .select({ nome: procAreas.nome })
    .from(procAreas)
    .where(eq(procAreas.id, areaId))
    .limit(1)

  if (!area?.nome) return []

  const alvo = normalizarTexto(area.nome)
  const roles: { role: string }[] = await db
    .select({ role: usuarios.role })
    .from(usuarios)
    .where(eq(usuarios.ativo, true))

  return Array.from(
    new Set(
      roles
        .map((u: { role: string }) => u.role)
        .filter((role: string) => normalizarTexto(role) === alvo)
    )
  )
}

/**
 * Notifica a equipe da fila do chamado e os administradores (notificação in-app
 * + e-mail). Quem executou a ação e quem abriu o chamado podem ser excluídos
 * para não receber o aviso da própria ação.
 */
export async function notificarEquipeChamado(params: {
  tipo: string
  mensagem: string
  link: string
  areaId: number
  usuarioNome?: string | null
  excluirUsuarioIds?: (number | null | undefined)[]
}) {
  const roles = await rolesDaFila(params.areaId)

  return notificar(
    params.tipo,
    params.mensagem,
    params.link,
    params.usuarioNome,
    roles,
    { excluirUsuarioIds: params.excluirUsuarioIds }
  )
}
