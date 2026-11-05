/**
 * Configura o SMTP do sistema (tabela email_config) usando as credenciais
 * GMAIL_USER / GMAIL_APP_PASSWORD do .env.local, nos dois bancos
 * (Neon principal e warehouse local). A senha e gravada criptografada
 * (aes-256-gcm), igual ao formato lido por src/lib/crypto.ts.
 *
 * Uso:
 *   node scripts/configurar-smtp.js
 *   node scripts/configurar-smtp.js --from="PDM - DGBCOMEX"
 *   node scripts/configurar-smtp.js --db=local
 */
const postgres = require("postgres")
const nodemailer = require("nodemailer")
const crypto = require("crypto")
const dotenv = require("dotenv")
const path = require("path")

dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") })

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const SEPARATOR = ":"

function getKey() {
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error("ENCRYPTION_KEY não encontrada no .env.local")
  return crypto.createHash("sha256").update(key).digest()
}

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  const authTag = cipher.getAuthTag().toString("hex")
  return `${iv.toString("hex")}${SEPARATOR}${authTag}${SEPARATOR}${encrypted}`
}

function arg(nome) {
  const prefixo = `--${nome}=`
  const achado = process.argv.slice(2).find((a) => a.startsWith(prefixo))
  return achado ? achado.slice(prefixo.length) : null
}

async function main() {
  const user = arg("user") || process.env.GMAIL_USER
  const pass = arg("pass") || process.env.GMAIL_APP_PASSWORD
  const host = arg("host") || "smtp.gmail.com"
  const port = Number(arg("port") || 587)
  const fromName = arg("from") || "PDM - DGBCOMEX"
  const somenteLocal = process.argv.includes("--db=local")

  if (!user || !pass) {
    console.error(
      "Credenciais ausentes: defina GMAIL_USER e GMAIL_APP_PASSWORD no .env.local (ou use --user/--pass)."
    )
    process.exit(1)
  }

  console.log(`Testando SMTP ${host}:${port} ...`)
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
  try {
    await transporter.verify()
    console.log("✓ Credenciais válidas")
  } catch (err) {
    transporter.close()
    console.error(`✗ Falha na autenticação: ${err.message}`)
    process.exit(1)
  }
  transporter.close()

  const passCriptografado = encrypt(pass)
  const bancos = somenteLocal
    ? [{ nome: "warehouse local", url: process.env.DATABASE_URL_LOCAL }]
    : [
        { nome: "Neon (principal)", url: process.env.DATABASE_URL },
        { nome: "warehouse local", url: process.env.DATABASE_URL_LOCAL },
      ]

  for (const banco of bancos) {
    if (!banco.url) {
      console.error(`Conexão ausente para ${banco.nome}`)
      continue
    }
    const sql = postgres(banco.url, { prepare: false })
    const existentes = await sql`SELECT id FROM email_config WHERE ativo = true ORDER BY id`
    if (existentes.length === 0) {
      await sql`
        INSERT INTO email_config (host, port, "user", pass, from_name, ativo)
        VALUES (${host}, ${port}, ${user}, ${passCriptografado}, ${fromName}, true)
      `
    } else {
      await sql`
        UPDATE email_config SET host = ${host}, port = ${port}, "user" = ${user},
          pass = ${passCriptografado}, from_name = ${fromName}, ativo = true
        WHERE id = ${existentes[0].id}
      `
      if (existentes.length > 1) {
        await sql`DELETE FROM email_config WHERE id <> ${existentes[0].id} AND ativo = true`
      }
    }
    const atual =
      await sql`SELECT id, host, port, "user", from_name, ativo FROM email_config WHERE ativo = true ORDER BY id`
    console.log(`✓ ${banco.nome}: ${JSON.stringify(atual)}`)
    await sql.end()
  }

  console.log("Configuração de SMTP concluída.")
}

main().catch((err) => {
  console.error("Erro:", err.message)
  process.exit(1)
})
