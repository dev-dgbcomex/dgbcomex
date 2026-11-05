/**
 * Dispara uma notificacao para os perfis globais (administradores) do sistema.
 *
 * Le a regra global em notificacao_regras (tipo 'TODOS'), cria as notificacoes
 * in-app para cada administrador ativo e envia o e-mail pelo SMTP do sistema.
 *
 * Uso:
 *   node scripts/enviar-notificacao-admins.js
 *   node scripts/enviar-notificacao-admins.js --db=local
 *   node scripts/enviar-notificacao-admins.js --mensagem="Mensagem" --dry-run
 */
const { neon } = require("@neondatabase/serverless")
const nodemailer = require("nodemailer")
const crypto = require("crypto")
const dotenv = require("dotenv")
const path = require("path")

dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") })

const ALGORITHM = "aes-256-gcm"
const SEPARATOR = ":"
const ROLES_PADRAO = ["ADMIN", "SUDO"]
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://pdmprotextil.vercel.app"

function getKey() {
  return crypto.createHash("sha256").update(process.env.ENCRYPTION_KEY).digest()
}

function decrypt(encrypted) {
  const parts = encrypted.split(SEPARATOR)
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

async function main() {
  const usarLocal = arg("db") === "local"
  const dryRun = process.argv.includes("--dry-run")
  const databaseUrl = usarLocal ? process.env.DATABASE_URL_LOCAL : process.env.DATABASE_URL
  const mensagem =
    arg("mensagem") ||
    "Teste de notificação — os administradores recebem todas as notificações do sistema"
  const tipo = arg("tipo") || "TESTE_NOTIFICACAO"
  const link = arg("link") || "/admin/notificacoes"

  if (!databaseUrl) {
    console.error(`Conexão não encontrada: ${usarLocal ? "DATABASE_URL_LOCAL" : "DATABASE_URL"}`)
    process.exit(1)
  }

  const sql = neon(databaseUrl)
  console.log(`Banco: ${usarLocal ? "warehouse local" : "Neon (principal)"}`)

  const regra = await sql`SELECT roles FROM notificacao_regras WHERE tipo = 'TODOS' LIMIT 1`
  const roles =
    regra.length > 0 && Array.isArray(regra[0].roles)
      ? regra[0].roles.map(String)
      : [...ROLES_PADRAO]
  console.log(`Perfis globais: ${roles.length > 0 ? roles.join(", ") : "(nenhum)"}`)

  if (roles.length === 0) {
    console.error("Nenhum perfil global configurado — nada a enviar.")
    process.exit(1)
  }

  const destinatarios = await sql`
    SELECT id, name, email, role FROM usuarios
    WHERE ativo = true AND role = ANY(${roles})
    ORDER BY role, name
  `

  console.log(`Destinatários ativos: ${destinatarios.length}`)
  for (const d of destinatarios) {
    console.log(`  - ${d.name} <${d.email}> (${d.role})`)
  }

  if (destinatarios.length === 0) {
    console.error("Nenhum usuário ativo com os perfis globais.")
    process.exit(1)
  }

  if (dryRun) {
    console.log("\n--dry-run: nada foi gravado nem enviado.")
    return
  }

  for (const d of destinatarios) {
    await sql`
      INSERT INTO notificacoes (tipo, mensagem, usuario_id, usuario_nome, link, lida, created_at)
      VALUES (${tipo}, ${mensagem}, ${d.id}, ${"Painel de notificações"}, ${link}, false, now())
    `
  }
  console.log(`\n${destinatarios.length} notificação(ões) in-app criada(s).`)

  const configs = await sql`SELECT * FROM email_config WHERE ativo = true LIMIT 1`
  if (configs.length === 0) {
    console.error("Nenhuma configuração de SMTP ativa — notificação criada, e-mail não enviado.")
    process.exit(1)
  }

  const cfg = configs[0]
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: decrypt(cfg.pass) },
  })

  const emails = destinatarios.map((d) => d.email).filter((e) => e && e.includes("@"))
  if (emails.length === 0) {
    console.error("Administradores sem e-mail válido — apenas notificação in-app criada.")
    process.exit(1)
  }

  const html = `<div style="font-family:Arial,sans-serif;padding:20px;max-width:600px">
<h2 style="color:#1e3a5f">PDM Têxtil</h2>
<p>${mensagem}</p>
<p><a href="${SITE_URL}${link}" style="background:#1e3a5f;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block">Ver detalhes</a></p>
<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
<p style="color:#94a3b8;font-size:12px">Sistema DGBCOMEX</p>
</div>`

  const info = await transporter.sendMail({
    from: `"${cfg.from_name || "PDM Têxtil"}" <${cfg.user}>`,
    to: emails.join(", "),
    subject: `[PDM Têxtil] ${mensagem}`,
    html,
  })
  transporter.close()

  console.log(
    `E-mail enviado para ${emails.length} administrador(es). Message ID: ${info.messageId}`
  )
}

main().catch((err) => {
  console.error("Erro:", err.message)
  process.exit(1)
})
