import { notificar } from "@/lib/notificar"

export const TIPO_ATIVIDADE_COMERCIAL = "ATIVIDADE_COMERCIAL"

export type AtividadeComercial = {
  /** Ação realizada, ex.: "criou a pessoa" */
  acao: string
  /** Entidade afetada, ex.: "Pessoa", "Oportunidade", "Visita" */
  entidade: string
  /** Nome do registro afetado */
  registro?: string | null
  /** Link da tela do registro */
  link: string
  /** Usuário que realizou a ação */
  usuarioNome?: string | null
  /** Id do usuário que realizou a ação (não recebe a própria notificação) */
  usuarioId?: number | null
}

/**
 * Notifica as demais contas comerciais sobre uma atividade no CRM.
 * A notificação aparece no sistema de notificações e também é enviada por e-mail.
 * Os perfis que recebem são configurados em Admin › Notificações (tipo ATIVIDADE_COMERCIAL).
 * Falhas de notificação nunca interrompem a operação que originou a atividade.
 */
export async function notificarAtividadeComercial(atividade: AtividadeComercial) {
  const autor = atividade.usuarioNome || "Uma conta comercial"
  const detalhe = atividade.registro ? ` "${atividade.registro}"` : ""
  const mensagem = `${autor} ${atividade.acao}${detalhe} (${atividade.entidade})`

  try {
    const resultado = await notificar(
      TIPO_ATIVIDADE_COMERCIAL,
      mensagem,
      atividade.link,
      atividade.usuarioNome || null,
      undefined,
      { excluirUsuarioId: atividade.usuarioId ?? null }
    )
    return resultado
  } catch (erro) {
    console.error("[ATIVIDADE_COMERCIAL] Falha ao notificar:", erro)
    return { usuariosNotificados: 0 }
  }
}
