import { db } from "./db"
import { notificacoes, NewNotificacao } from "./db/schema/notificacoes"
import { notificacaoRegras } from "./db/schema/notificacao-regras"
import { usuarios } from "./db/schema/usuarios"
import { eq, inArray } from "drizzle-orm"
import { and } from "drizzle-orm"
import { sendEmail } from "./email"
import { registrarLog } from "./log"
import { urlBase } from "./branding"

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://dgbcomex.vercel.app")

/**
 * URL usada nos e-mails. O host da requisição tem prioridade: o
 * NEXT_PUBLIC_APP_URL apontava para outro host e os links das notificações
 * levavam para o sistema errado.
 */
async function urlDoSite(): Promise<string> {
  try {
    const base = await urlBase()
    return base.origin
  } catch {
    return SITE_URL
  }
}

function htmlNotificacao(mensagem: string, link: string | undefined, site: string) {
  return `<div style="font-family:Arial,sans-serif;padding:20px;max-width:600px">
<h2 style="color:#1e3a5f">PDM Têxtil</h2>
<p>${mensagem}</p>
${link ? `<p><a href="${site}${link}" style="background:#1e3a5f;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block">Ver detalhes</a></p>` : ""}
<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
<p style="color:#94a3b8;font-size:12px">Sistema DGBCOMEX</p>
</div>`
}

/**
 * Tipo reservado em `notificacao_regras`: os perfis listados aqui recebem
 * TODAS as notificações do sistema, mesmo as que não têm regra por tipo.
 * Configurável em Admin > Notificações.
 */
export const TIPO_REGRA_GLOBAL = "TODOS"

/** Perfis globais usados enquanto a regra "TODOS" não existir no banco. */
export const ROLES_GLOBAIS_PADRAO = ["ADMIN", "SUDO"]

export async function rolesNotificacaoGlobal(): Promise<string[]> {
  const regra = await db
    .select({ roles: notificacaoRegras.roles })
    .from(notificacaoRegras)
    .where(eq(notificacaoRegras.tipo, TIPO_REGRA_GLOBAL))
    .limit(1)

  if (regra.length === 0) return [...ROLES_GLOBAIS_PADRAO]
  return Array.isArray(regra[0].roles) ? regra[0].roles.map(String) : []
}

export async function notificar(
  tipo: string,
  mensagem: string,
  link?: string,
  usuarioNome?: string | null,
  roles?: string[],
  opcoes?: { excluirUsuarioId?: number | null; excluirUsuarioIds?: (number | null | undefined)[] }
) {
  let rolesFiltro: string[]

  if (roles !== undefined) {
    rolesFiltro = roles
  } else {
    const regra = await db
      .select({ roles: notificacaoRegras.roles })
      .from(notificacaoRegras)
      .where(eq(notificacaoRegras.tipo, tipo))
      .limit(1)
    rolesFiltro =
      regra.length > 0 && Array.isArray(regra[0].roles) ? regra[0].roles.map(String) : []
  }

  // Perfis globais (administradores) recebem tudo, mesmo sem regra do tipo.
  const rolesGlobais = await rolesNotificacaoGlobal()
  rolesFiltro = Array.from(new Set([...rolesFiltro, ...rolesGlobais]))

  if (rolesFiltro.length === 0) {
    return { usuariosNotificados: 0, emailsEnviados: 0, erroEmail: null as string | null }
  }

  const usuariosFiltrados = (await db
    .select({ id: usuarios.id, name: usuarios.name, email: usuarios.email })
    .from(usuarios)
    .where(and(eq(usuarios.ativo, true), inArray(usuarios.role, rolesFiltro)))) as {
    id: number
    name: string
    email: string
  }[]

  // Atividade do próprio usuário não é enviada para ele (ex.: notificar as outras contas).
  const excluidos = new Set(
    [opcoes?.excluirUsuarioId, ...(opcoes?.excluirUsuarioIds ?? [])].filter(
      (id): id is number => typeof id === "number"
    )
  )
  const usuariosNotificados = usuariosFiltrados.filter((u) => !excluidos.has(u.id))

  if (usuariosNotificados.length === 0) {
    return { usuariosNotificados: 0, emailsEnviados: 0, erroEmail: null as string | null }
  }

  const notificacoesData: NewNotificacao[] = usuariosNotificados.map((u) => ({
    tipo,
    mensagem,
    usuarioId: u.id,
    usuarioNome,
    link: link || null,
  }))

  await db.insert(notificacoes).values(notificacoesData)

  const emailsValidos = usuariosNotificados
    .map((u) => u.email)
    .filter((e): e is string => !!e && e.includes("@"))
  let emailsEnviados = 0
  let erroEmail: string | null = null
  if (emailsValidos.length > 0) {
    const result = await sendEmail({
      to: emailsValidos,
      subject: `[PDM Têxtil] ${mensagem}`,
      html: htmlNotificacao(mensagem, link, await urlDoSite()),
    })
    emailsEnviados = result.sent
    erroEmail = result.error ?? null
    if (result.error) {
      console.error(
        `[NOTIFICAR] Email enviado para ${result.sent} de ${emailsValidos.length} usuários. Erro: ${result.error}`
      )
    } else {
      console.log(`[NOTIFICAR] Email enviado com sucesso para ${result.sent} usuários`)
    }
  }

  return {
    usuariosNotificados: usuariosNotificados.length,
    emailsEnviados,
    erroEmail,
  }
}

/**
 * Notifica um usuário específico (notificação in-app + e-mail).
 * Usado quando o destinatário não pode ser deduzido por perfil, como o
 * solicitante de um chamado.
 */
export async function notificarUsuario(params: {
  usuarioId: number
  tipo: string
  mensagem: string
  link?: string
  usuarioNome?: string | null
}) {
  const [destinatario] = await db
    .select({ id: usuarios.id, name: usuarios.name, email: usuarios.email })
    .from(usuarios)
    .where(eq(usuarios.id, params.usuarioId))
    .limit(1)

  if (!destinatario) {
    return { notificado: false, emailEnviado: false, erroEmail: null as string | null }
  }

  await db.insert(notificacoes).values({
    tipo: params.tipo,
    mensagem: params.mensagem,
    usuarioId: destinatario.id,
    usuarioNome: params.usuarioNome || null,
    link: params.link || null,
  })

  const email = destinatario.email
  if (!email || !email.includes("@")) {
    return { notificado: true, emailEnviado: false, erroEmail: "Usuário sem e-mail válido" }
  }

  const result = await sendEmail({
    to: [email],
    subject: `[PDM Têxtil] ${params.mensagem}`,
    html: htmlNotificacao(params.mensagem, params.link, await urlDoSite()),
  })

  if (result.error) {
    console.error(`[NOTIFICAR] E-mail não enviado para ${destinatario.name}: ${result.error}`)
  }

  return {
    notificado: true,
    emailEnviado: result.sent > 0,
    erroEmail: result.error ?? null,
  }
}

/**
 * Envia uma notificação apenas para os perfis globais (administradores),
 * ignorando as regras por tipo.
 */
export async function notificarAdmins(
  tipo: string,
  mensagem: string,
  link?: string,
  usuarioNome?: string | null
) {
  const roles = await rolesNotificacaoGlobal()
  if (roles.length === 0) {
    return {
      usuariosNotificados: 0,
      emailsEnviados: 0,
      erroEmail: "Nenhum perfil global configurado em Admin > Notificações",
    }
  }
  return notificar(tipo, mensagem, link, usuarioNome, roles)
}

export async function notificarErro(contexto: string, erro: unknown, usuarioNome?: string | null) {
  const mensagem = erro instanceof Error ? erro.message : String(erro)
  const descricao = `[ERRO] ${contexto}: ${mensagem}`
  console.error(descricao)

  await registrarLog({ tipo: "ERRO", acao: "erro_sistema", descricao, usuarioNome })

  try {
    await notificar("ERRO_SISTEMA", descricao, undefined, usuarioNome, ["SUDO"])
  } catch (err) {
    console.error("[NOTIFICAR_ERRO] Falha ao notificar erro:", err)
  }
}

export async function notificarDelecao(
  entidade: string,
  entidadeLabel: string,
  usuarioNome?: string | null
) {
  const descricao = `Registro de ${entidade} "${entidadeLabel}" foi excluído por ${usuarioNome || "usuário desconhecido"}`
  await notificar("DELECAO", descricao, undefined, usuarioNome, ["SUDO"])
  await registrarLog({ tipo: "DELECAO", acao: "excluir", descricao, entidade, usuarioNome })
}

export { registrarLog }
