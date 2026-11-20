require("dotenv").config({ path: ".env.local" })

const crypto = require("crypto")
const fs = require("fs")
const path = require("path")
const ts = require("typescript")
const postgres = require("postgres")
const { google } = require("googleapis")

function carregarModulo(relativo) {
  const arquivo = path.join(__dirname, "..", relativo)
  const codigo = ts.transpileModule(fs.readFileSync(arquivo, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const modulo = { exports: {} }
  new Function("exports", "module", "require", codigo)(modulo.exports, modulo, require)
  return modulo.exports
}

const limpeza = carregarModulo("src/lib/crm/limpeza-visitas.ts")

const DATABASES = [
  { name: "neon", url: process.env.DATABASE_URL },
  { name: "warehouse_local", url: process.env.DATABASE_URL_LOCAL },
]

function argValue(flag) {
  const item = process.argv.slice(2).find((valor) => valor.startsWith(`${flag}=`))
  return item ? item.split("=").slice(1).join("=") : null
}

function conectar(db) {
  if (!db.url) throw new Error(`${db.name} sem URL configurada`)
  return postgres(db.url, { prepare: false, max: 1 })
}

async function contasGoogle(sql) {
  return sql.unsafe(limpeza.SQL_CONTAS_GOOGLE)
}

async function clienteGoogle(conta) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error("GOOGLE_CLIENT_ID/SECRET não configurados")

  const oauth = new google.auth.OAuth2(clientId, clientSecret)
  oauth.setCredentials({
    access_token: conta.access_token || undefined,
    refresh_token: conta.refresh_token || undefined,
    expiry_date: conta.expires_at ? Number(conta.expires_at) * 1000 : undefined,
  })

  const resposta = await oauth.getAccessToken()
  const token = typeof resposta === "string" ? resposta : resposta?.token
  if (!token) throw new Error(`Sem access token para a conta Google ${conta.id}`)

  oauth.setCredentials({ access_token: token, refresh_token: conta.refresh_token || undefined })
  return { accessToken: token, calendar: google.calendar({ version: "v3", auth: oauth }) }
}

function sha256(conteudo) {
  return crypto.createHash("sha256").update(conteudo).digest("hex")
}

function lerJson(arquivo) {
  return JSON.parse(fs.readFileSync(arquivo, "utf8"))
}

function escreverJson(arquivo, dados) {
  fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2))
}

module.exports = {
  carregarModulo,
  limpeza,
  DATABASES,
  argValue,
  conectar,
  contasGoogle,
  clienteGoogle,
  sha256,
  lerJson,
  escreverJson,
}
