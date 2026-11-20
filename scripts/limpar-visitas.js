const fs = require("fs")
const path = require("path")
const {
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

const backupDir = argValue("--backup")
if (!backupDir) {
  console.error("Informe --backup=<diretorio>")
  process.exit(1)
}

const manifest = lerJson(path.join(backupDir, "manifest.json"))
const googleEvents = lerJson(path.join(backupDir, "google-events.json"))
const onlyDb = argValue("--db")
const aplicar = process.argv.includes("--apply")
const forcar = process.argv.includes("--force")

function eh404(erro) {
  return erro?.code === 404 || erro?.status === 404 || erro?.response?.status === 404
}

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

async function conferirBanco(db, info) {
  const sql = conectar(db)
  try {
    const [ids, contagens] = await Promise.all([
      sql.unsafe(limpeza.SQL_IDS_VISITAS),
      sql.unsafe(limpeza.SQL_CONTAGENS_LIMPEZA),
    ])
    const atuais = ids.map((linha) => Number(linha.id)).sort((a, b) => a - b)
    const esperados = [...info.idsVisitas].sort((a, b) => a - b)
    if (JSON.stringify(atuais) !== JSON.stringify(esperados)) {
      throw new Error(`[${db.name}] IDs de visitas mudaram desde o backup`)
    }
    const contagem = normais(contagens[0] || {})
    for (const chave of [
      "localizacoes_visita",
      "pesquisas_visita",
      "respostas_visita",
      "timeline_visita",
    ]) {
      if (contagem[chave] !== info.contagens[chave]) {
        throw new Error(`[${db.name}] contagem ${chave} mudou desde o backup`)
      }
    }
    console.log(
      `[${db.name}] conferido: visitas=${contagem.visitas} acoes_com_origem=${contagem.acoes_com_origem}`
    )
  } finally {
    await sql.end()
  }
}

async function apagarEventos() {
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
  const resultado = { removidos: [], naoEncontrados: [], erros: [] }

  for (const item of googleEvents.eventos || []) {
    const conta = porId.get(Number(item.contaId))
    const eventId = item.payload?.id
    if (!conta || !eventId) {
      resultado.erros.push({ eventId, mensagem: "Conta Google ou id do evento ausente no backup" })
      continue
    }
    try {
      const { calendar } = await clienteGoogle(conta)
      await calendar.events.delete({ calendarId: "primary", eventId })
      resultado.removidos.push({ eventId, contaId: Number(conta.id) })
      await new Promise((resolve) => setTimeout(resolve, 120))
    } catch (erro) {
      if (eh404(erro)) {
        resultado.naoEncontrados.push({ eventId, contaId: Number(conta.id) })
      } else {
        resultado.erros.push({
          eventId,
          contaId: Number(conta.id),
          mensagem: erro?.message || String(erro),
        })
      }
    }
  }

  escreverJson(path.join(backupDir, "resultado-google.json"), resultado)
  console.log(
    `google removidos=${resultado.removidos.length} nao_encontrados=${resultado.naoEncontrados.length} erros=${resultado.erros.length}`
  )
  if (resultado.erros.length > 0 && !forcar) {
    throw new Error("Falhas ao apagar eventos do Google; use --force para seguir mesmo assim")
  }
  return resultado
}

async function limparBanco(db, info) {
  const sql = conectar(db)
  try {
    await sql.begin(async (tx) => {
      for (const comando of limpeza.sqlLimparVisitas(info.idsVisitas)) {
        await tx.unsafe(comando)
      }
    })
    const [contagens] = await sql.unsafe(limpeza.SQL_CONTAGENS_LIMPEZA)
    const contagem = normais(contagens)
    const pendencias = Object.entries(contagem).filter(([, valor]) => valor !== 0)
    if (pendencias.length > 0) {
      throw new Error(
        `[${db.name}] sobraram dados: ${JSON.stringify(Object.fromEntries(pendencias))}`
      )
    }
    console.log(`[${db.name}] limpo: todas as contagens de visita em zero`)
  } finally {
    await sql.end()
  }
}

async function main() {
  validarBackup()
  console.log(`Backup validado: ${backupDir}`)

  for (const db of DATABASES) {
    const info = manifest.bancos[db.name]
    if (!info || (onlyDb && db.name !== onlyDb)) continue
    await conferirBanco(db, info)
  }

  if (!aplicar) {
    console.log("Dry-run: nada foi apagado")
    return
  }

  await apagarEventos()

  for (const db of DATABASES) {
    const info = manifest.bancos[db.name]
    if (!info || (onlyDb && db.name !== onlyDb)) continue
    await limparBanco(db, info)
  }
}

main().catch((erro) => {
  console.error("Falha na limpeza de visitas:", erro)
  process.exit(1)
})
