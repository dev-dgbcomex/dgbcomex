require("dotenv").config({ path: ".env.local" })
const fs = require("fs")
const path = require("path")
const postgres = require("postgres")
const ts = require("typescript")

function carregarMapeamento() {
  const arquivo = path.join(__dirname, "..", "src", "lib", "crm", "backfill-visitas-acoes.ts")
  const codigo = ts.transpileModule(fs.readFileSync(arquivo, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const modulo = { exports: {} }
  new Function("exports", "module", codigo)(modulo.exports, modulo)
  return modulo.exports
}

const map = carregarMapeamento()

const DATABASES = [
  { name: "neon", url: process.env.DATABASE_URL },
  { name: "warehouse_local", url: process.env.DATABASE_URL_LOCAL },
]

const args = process.argv.slice(2)
function argValue(flag) {
  const item = args.find((a) => a.startsWith(flag + "="))
  return item ? item.split("=")[1] : null
}
const onlyDb = argValue("--db")
const limit = Number(argValue("--limit") || 0)
const dryRun = args.includes("--dry-run")

if (!Number.isFinite(limit) || limit < 0) {
  console.error("--limit deve ser um número inteiro positivo")
  process.exit(1)
}

async function backfillBanco(db) {
  if (!db.url) {
    console.log(`[${db.name}] sem URL configurada, pulando`)
    return
  }

  const sql = postgres(db.url, { prepare: false, max: 1 })
  try {
    const antes = (await sql.unsafe(map.SQL_CONTAGENS))[0]
    const pendentes = await sql.unsafe(map.sqlVisitasPendentes(limit))

    console.log(
      `[${db.name}] visitas=${antes.visitas} acoes_com_origem=${antes.acoes} pendentes=${pendentes.length}`
    )

    if (dryRun) {
      console.log(`[${db.name}] dry-run: nada foi gravado`)
      return
    }

    await sql.begin(async (tx) => {
      const conflitos = await tx.unsafe(map.SQL_TOKENS_CONFLITANTES)
      if (conflitos.length > 0) {
        throw new Error(
          `Token de pesquisa já existe em outra ação: ${conflitos.map((c) => c.token).join(", ")}`
        )
      }

      const etapas = [
        ["acoes", map.sqlInserirAcoes(limit)],
        ["localizacoes", map.SQL_INSERIR_LOCALIZACOES],
        ["pesquisas", map.SQL_INSERIR_PESQUISAS],
        ["respostas", map.SQL_INSERIR_RESPOSTAS],
        ["timeline", map.SQL_INSERIR_TIMELINE],
      ]

      for (const [rotulo, query] of etapas) {
        const resultado = await tx.unsafe(query)
        console.log(`[${db.name}] ${rotulo}: ${resultado.count ?? 0} inserido(s)`)
      }
    })

    const depois = (await sql.unsafe(map.SQL_CONTAGENS))[0]
    console.log(
      `[${db.name}] total: acoes=${depois.acoes} localizacoes=${depois.localizacoes_acao} ` +
        `pesquisas=${depois.pesquisas_acao} respostas=${depois.respostas_acao} ` +
        `timeline=${depois.timeline_acao}`
    )

    const faltando = Number(depois.visitas) - Number(depois.acoes)
    if (faltando > 0) {
      console.warn(
        `[${db.name}] ${faltando} visita(s) ainda sem ação correspondente; ` +
          `rode novamente com --limit para processar em lotes`
      )
    }
  } finally {
    await sql.end()
  }
}

async function main() {
  console.log(
    dryRun
      ? "Backfill visitas → ações de prospecção (dry-run)"
      : "Backfill visitas → ações de prospecção (somente INSERT; visitas intactas)"
  )
  for (const db of DATABASES) {
    if (onlyDb && db.name !== onlyDb) continue
    await backfillBanco(db)
  }
}

main().catch((erro) => {
  console.error("Falha no backfill:", erro)
  process.exit(1)
})
