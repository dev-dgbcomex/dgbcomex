const fs = require("fs")
const path = require("path")
const {
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
} = require("./lib-limpeza-visitas")

const googleLib = carregarModulo("src/lib/google-calendar.ts")

const backupDir = argValue("--backup")
if (!backupDir) {
  console.error("Informe --backup=<diretorio>")
  process.exit(1)
}

const manifest = lerJson(path.join(backupDir, "manifest.json"))
const googleEvents = lerJson(path.join(backupDir, "google-events.json"))
const onlyDb = argValue("--db")
const aplicar = process.argv.includes("--apply")

function normais(linha) {
  return Object.fromEntries(Object.entries(linha).map(([chave, valor]) => [chave, Number(valor)]))
}

function validarBackup() {
  for (const [nome, info] of Object.entries(manifest.bancos)) {
    if (onlyDb && nome !== onlyDb) continue
    const conteudo = fs.readFileSync(path.join(backupDir, info.arquivo), "utf8")
    if (sha256(conteudo) !== info.sha256) throw new Error(`Checksum divergente: ${info.arquivo}`)
  }
}

async function restaurarBanco(db, info) {
  const sql = conectar(db)
  try {
    await sql.begin(async (tx) => {
      const conteudo = fs.readFileSync(path.join(backupDir, info.arquivo), "utf8")
      if (conteudo.trim()) await tx.unsafe(conteudo)
      for (const comando of limpeza.sqlRestaurarVinculosAcoes(info.acoes || [])) {
        await tx.unsafe(comando)
      }
    })

    const [contagens] = await sql.unsafe(limpeza.SQL_CONTAGENS_LIMPEZA)
    const atual = normais(contagens)
    for (const [chave, esperado] of Object.entries(info.contagens)) {
      if (atual[chave] !== Number(esperado)) {
        throw new Error(`[${db.name}] ${chave}: esperado ${esperado}, encontrado ${atual[chave]}`)
      }
    }
    console.log(`[${db.name}] restaurado: ${JSON.stringify(atual)}`)
  } finally {
    await sql.end()
  }
}

async function restaurarGoogle() {
  const dbOrigem = DATABASES.find((db) => db.url)
  if (!dbOrigem) throw new Error("Nenhum banco com URL configurada para ler accounts")
  const sql = conectar(dbOrigem)
  let contas
  try {
    contas = await contasGoogle(sql)
  } finally {
    await sql.end()
  }

  const porId = new Map(contas.map((conta) => [Number(conta.id), conta]))
  const resultado = { restaurados: [], erros: [] }

  for (const item of googleEvents.eventos || []) {
    const conta = porId.get(Number(item.contaId))
    const payload = item.payload
    if (!conta || !payload?.id) {
      resultado.erros.push({
        eventId: payload?.id,
        mensagem: "Conta Google ou payload ausente no backup",
      })
      continue
    }
    try {
      const { accessToken } = await clienteGoogle(conta)
      await googleLib.restoreCalendarEvent(accessToken, payload)
      resultado.restaurados.push({ eventId: payload.id, contaId: Number(conta.id) })
      await new Promise((resolve) => setTimeout(resolve, 120))
    } catch (erro) {
      resultado.erros.push({
        eventId: payload.id,
        contaId: Number(conta.id),
        mensagem: erro?.message || String(erro),
      })
    }
  }

  escreverJson(path.join(backupDir, "restore-google.json"), resultado)
  console.log(`google restaurados=${resultado.restaurados.length} erros=${resultado.erros.length}`)
  if (resultado.erros.length > 0) {
    throw new Error("Falhas ao restaurar eventos do Google")
  }
}

async function main() {
  validarBackup()
  console.log(`Backup validado: ${backupDir}`)

  for (const db of DATABASES) {
    const info = manifest.bancos[db.name]
    if (!info || (onlyDb && db.name !== onlyDb)) continue
    if (!aplicar) {
      console.log(`[${db.name}] dry-run: ${info.idsVisitas.length} visita(s) seriam restauradas`)
      continue
    }
    await restaurarBanco(db, info)
  }

  if (!aplicar) {
    console.log(
      `google dry-run: ${(googleEvents.eventos || []).length} evento(s) seriam restaurados`
    )
    return
  }

  await restaurarGoogle()
  console.log("Restore concluído")
}

main().catch((erro) => {
  console.error("Falha no restore de visitas:", erro)
  process.exit(1)
})
