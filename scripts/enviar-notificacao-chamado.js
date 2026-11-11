/**
 * Envia notificações (in-app) e e-mails dos chamados abertos para a equipe da
 * fila do chamado e para os administradores.
 *
 * A fila é a área de `proc_areas`; o vínculo com as pessoas é feito pelo nome
 * da fila x perfil do usuário (fila "COMERCIAL" alcança o perfil COMERCIAL).
 * Administradores vêm da regra global em `notificacao_regras` (tipo 'TODOS').
 *
 * Uso:
 *   node scripts/enviar-notificacao-chamado.js --dry-run
 *   node scripts/enviar-notificacao-chamado.js --id=1
 *   node scripts/enviar-notificacao-chamado.js --incluir-solicitante
 *   node scripts/enviar-notificacao-chamado.js --db=local
 */
const postgres = require("postgres")
const nodemailer = require("nodemailer")
const crypto = require("crypto")
const dotenv = require("dotenv")
const path = require("path")

dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") })

const ALGORITHM = "aes-256-gcm"
const SEPARATOR = ":"
const ROLES_PADRAO = ["ADMIN", "SUDO"]
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dgbcomex.vercel.app"
const STATUS_FINALIZADOS = ["RESOLVIDO", "FECHADO", "CANCELADO"]

function getKey() {
  return crypto.createHash("sha256").update(process.env.ENCRYPTION_KEY).digest()
}

function decrypt(encrypted) {
  const parts = String(encrypted).split(SEPARATOR)
  if (parts.length !== 3) return encrypted
  const [ivHex, authTagHex, data] = parts
  try {
    const iv = Buffer.from(ivHex, "hex")
    const authTag = Buffer.from(authTagHex, "hex")
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
    decipher.setAuthTag(authTag)
    return decipher.update(data, "hex", "utf8") + decipher.final("utf8")
  } catch {
    return encrypted
  }
}

function arg(nome) {
  const prefixo = `--${nome}=`
  const achado = process.argv.slice(2).find((a) => a.startsWith(prefixo))
  return achado ? achado.slice(prefixo.length) : null
}

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, "")
    .toUpperCase()
}

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  const usarLocal = arg("db") === "local"
  const idEspecifico = arg("id")
  const incluirSolicitante = process.argv.includes("--incluir-solicitante")
  const databaseUrl = usarLocal ? process.env.DATABASE_URL_LOCAL : process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error(`Conexão não encontrada: ${usarLocal ? "DATABASE_URL_LOCAL" : "DATABASE_URL"}`)
    process.exit(1)
  }

  const sql = postgres(databaseUrl, { prepare: false })
  console.log(`Banco: ${usarLocal ? "warehouse local" : "Neon (principal)"}`)

  const regra = await sql`SELECT roles FROM notificacao_regras WHERE tipo = 'TODOS' LIMIT 1`
  const rolesGlobais =
    regra.length > 0 && Array.isArray(regra[0].roles) && regra[0].roles.length > 0
      ? regra[0].roles.map(String)
      : [...ROLES_PADRAO]
  console.log(`Administradores (perfis globais): ${rolesGlobais.join(", ")}`)

  const chamados = idEspecifico
    ? await sql`SELECT * FROM tickets WHERE id = ${Number(idEspecifico)}`
    : await sql`SELECT * FROM tickets WHERE ativo = true AND status NOT IN ${sql(STATUS_FINALIZADOS)} ORDER BY id`

  if (chamados.length === 0) {
    console.error("Nenhum chamado aberto encontrado.")
    await sql.end()
    process.exit(1)
  }

  const usuarios = await sql`SELECT id, name, email, role FROM usuarios WHERE ativo = true`
  const porId = new Map(usuarios.map((u) => [u.id, u]))

  const configs = await sql`SELECT * FROM email_config WHERE ativo = true LIMIT 1`
  const transporter = configs.length
    ? nodemailer.createTransport({
        host: configs[0].host,
        port: configs[0].port,
        secure: configs[0].port === 465,
        auth: { user: configs[0].user, pass: decrypt(configs[0].pass) },
      })
    : null

  let totalNotificacoes = 0
  let totalEnviados = 0

  for (const ticket of chamados) {
    const [area] = await sql`SELECT nome FROM proc_areas WHERE id = ${ticket.area_id}`
    const solicitante = porId.get(ticket.solicitante_id)
    const responsavel = porId.get(ticket.responsavel_id)
    const alvo = normalizar(area?.nome)

    const equipe = usuarios.filter((u) => alvo && normalizar(u.role) === alvo)
    const administradores = usuarios.filter((u) => rolesGlobais.includes(u.role))

    const excluidos = new Set([ticket.responsavel_id])
    if (!incluirSolicitante) excluidos.add(ticket.solicitante_id)

    const destinatarios = [...equipe, ...administradores].filter(
      (u, i, lista) => !excluidos.has(u.id) && lista.findIndex((o) => o.id === u.id) === i
    )

    const status = String(ticket.status).toLowerCase()
    const mensagem = `Chamado #${ticket.id} (${status}): ${ticket.titulo}`
    const link = `/chamados/${ticket.id}`

    console.log(`\n--- Chamado #${ticket.id}: ${ticket.titulo}`)
    console.log(`    Fila: ${area?.nome || "(sem fila)"} | Status: ${ticket.status} | Solicitante: ${solicitante?.name || "-"}`)
    console.log(`    Equipe da fila: ${equipe.map((u) => u.name).join(", ") || "(ninguém com esse perfil)"}`)
    console.log(`    Destinatários (${destinatarios.length}): ${destinatarios.map((u) => `${u.name} <${u.email}>`).join(", ") || "(ninguém)"}`)

    if (dryRun) continue

    for (const destinatario of destinatarios) {
      await sql`
        INSERT INTO notificacoes (tipo, mensagem, usuario_id, usuario_nome, link, lida, created_at)
        VALUES (${"CHAMADO"}, ${mensagem}, ${destinatario.id}, ${solicitante?.name || "Sistema"}, ${link}, false, now())
      `
      totalNotificacoes++
    }

    const emails = destinatarios.map((u) => u.email).filter((e) => e && e.includes("@"))
    if (!transporter || emails.length === 0) {
      console.log("    Sem SMTP ativo ou sem e-mail válido — só a notificação in-app foi criada.")
      continue
    }

    const html = `<div style="font-family:Arial,sans-serif;padding:20px;max-width:600px">
<h2 style="color:#1e3a5f">PDM Têxtil</h2>
<p>${mensagem}</p>
<p><a href="${SITE_URL}${link}" style="background:#1e3a5f;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block">Ver detalhes</a></p>
<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
<p style="color:#94a3b8;font-size:12px">Sistema DGBCOMEX</p>
</div>`

    try {
      const info = await transporter.sendMail({
        from: `"${configs[0].from_name || "PDM Têxtil"}" <${configs[0].user}>`,
        to: emails.join(", "),
        subject: `[PDM Têxtil] ${mensagem}`,
        html,
      })
      totalEnviados += emails.length
      console.log(`    E-mail enviado para ${emails.length} pessoa(s). Message ID: ${info.messageId}`)
    } catch (err) {
      console.error(`    Falha no envio do e-mail: ${err.message}`)
    }
  }

  if (transporter) transporter.close()
  await sql.end()

  if (dryRun) {
    console.log("\n--dry-run: nada foi gravado nem enviado.")
    return
  }

  console.log(`\n${totalNotificacoes} notificação(ões) in-app criada(s) e ${totalEnviados} e-mail(s) enviado(s).`)
}

main().catch((err) => {
  console.error("Erro:", err.message)
  process.exit(1)
})
