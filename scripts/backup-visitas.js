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
  escreverJson,
} = require("./lib-limpeza-visitas")

const onlyDb = argValue("--db")
const selo = new Date().toISOString().replace(/[:.]/g, "-")
const diretorio = path.join("backups", "visitas", selo)
fs.mkdirSync(diretorio, { recursive: true })

function normalizarContagem(linha) {
  return Object.fromEntries(Object.entries(linha).map(([chave, valor]) => [chave, Number(valor)]))
}

function iso(valor) {
  return valor instanceof Date ? valor.toISOString() : (valor ?? null)
}

function eh404(erro) {
  return erro?.code === 404 || erro?.status === 404 || erro?.response?.status === 404
}

async function backupBanco(db, manifesto) {
  if (onlyDb && db.name !== onlyDb) return null

  const sql = conectar(db)
  try {
    const [visitas, localizacoes, pesquisas, respostas, timeline, acoes, eventos, contagens] =
      await Promise.all([
        sql.unsafe(limpeza.SQL_VISITAS_BACKUP),
        sql.unsafe(limpeza.SQL_LOCALIZACOES_VISITA_BACKUP),
        sql.unsafe(limpeza.SQL_PESQUISAS_VISITA_BACKUP),
        sql.unsafe(limpeza.SQL_RESPOSTAS_VISITA_BACKUP),
        sql.unsafe(limpeza.SQL_TIMELINE_VISITA_BACKUP),
        sql.unsafe(limpeza.SQL_ACOES_VINCULADAS),
        sql.unsafe(limpeza.SQL_EVENTOS_VISITA),
        sql.unsafe(limpeza.SQL_CONTAGENS_LIMPEZA),
      ])

    const partes = [
      limpeza.sqlInserirRegistros("crm_visitas", limpeza.COLUNAS_VISITAS, visitas),
      limpeza.sqlInserirRegistros(
        "crm_visitas_localizacoes",
        limpeza.COLUNAS_LOCALIZACOES_VISITA,
        localizacoes
      ),
      limpeza.sqlInserirRegistros(
        "crm_pesquisas_satisfacao",
        limpeza.COLUNAS_PESQUISAS_VISITA,
        pesquisas
      ),
      limpeza.sqlInserirRegistros(
        "crm_pesquisas_respostas",
        limpeza.COLUNAS_RESPOSTAS_VISITA,
        respostas
      ),
      limpeza.sqlInserirRegistros(
        "crm_timeline_eventos",
        limpeza.COLUNAS_TIMELINE_VISITA,
        timeline
      ),
      limpeza.sqlResetarSequencia("crm_visitas", "id"),
      limpeza.sqlResetarSequencia("crm_visitas_localizacoes", "id"),
      limpeza.sqlResetarSequencia("crm_pesquisas_satisfacao", "id"),
      limpeza.sqlResetarSequencia("crm_pesquisas_respostas", "id"),
      limpeza.sqlResetarSequencia("crm_timeline_eventos", "id"),
    ]
      .filter(Boolean)
      .join("\n")

    const arquivo = `${db.name}.sql`
    fs.writeFileSync(path.join(diretorio, arquivo), partes, "utf8")

    manifesto.bancos[db.name] = {
      arquivo,
      sha256: sha256(partes),
      contagens: normalizarContagem(contagens[0] || {}),
      idsVisitas: visitas.map((linha) => Number(linha.id)),
      acoes: acoes.map((linha) => ({
        id: Number(linha.id),
        origemVisitaId: Number(linha.origem_visita_id),
        googleEventId: linha.google_event_id ?? null,
        updatedAt: iso(linha.updated_at),
      })),
      eventosIds: eventos.map((linha) => linha.google_event_id).filter(Boolean),
    }

    console.log(
      `[${db.name}] visitas=${visitas.length} localizacoes=${localizacoes.length} ` +
        `pesquisas=${pesquisas.length} respostas=${respostas.length} timeline=${timeline.length} ` +
        `acoes=${acoes.length} eventos=${manifesto.bancos[db.name].eventosIds.length}`
    )

    return manifesto.bancos[db.name].eventosIds
  } finally {
    await sql.end()
  }
}

async function backupGoogle(manifest, idsEventos) {
  const dbOrigem = DATABASES.find((db) => db.url)
  if (!dbOrigem) throw new Error("Nenhum banco com URL configurada para ler accounts")

  const sql = conectar(dbOrigem)
  const contas = await contasGoogle(sql)
  const dados = { contas: [], eventos: [], naoEncontrados: [], erros: [] }

  try {
    for (const conta of contas) {
      const infoConta = {
        id: Number(conta.id),
        userId: Number(conta.user_id),
        email: conta.email,
        nome: conta.nome,
        temRefreshToken: Boolean(conta.refresh_token),
      }
      try {
        const { calendar } = await clienteGoogle(conta)
        let encontrados = 0
        for (const eventId of idsEventos) {
          try {
            const resposta = await calendar.events.get({ calendarId: "primary", eventId })
            if (resposta.data) {
              dados.eventos.push({
                contaId: infoConta.id,
                contaEmail: infoConta.email,
                payload: resposta.data,
              })
              encontrados += 1
            }
            await new Promise((resolve) => setTimeout(resolve, 120))
          } catch (erro) {
            if (eh404(erro)) continue
            dados.erros.push({
              contaId: infoConta.id,
              eventId,
              mensagem: erro?.message || String(erro),
            })
          }
        }
        infoConta.status = "ok"
        infoConta.encontrados = encontrados
      } catch (erro) {
        infoConta.status = "erro"
        infoConta.mensagem = erro?.message || String(erro)
      }
      dados.contas.push(infoConta)
    }
  } finally {
    await sql.end()
  }

  const encontrados = new Set(dados.eventos.map((item) => item.payload?.id).filter(Boolean))
  dados.naoEncontrados = idsEventos.filter((eventId) => !encontrados.has(eventId))

  escreverJson(path.join(diretorio, "google-events.json"), dados)
  manifest.google = {
    contas: dados.contas.length,
    eventos: dados.eventos.length,
    naoEncontrados: dados.naoEncontrados.length,
    erros: dados.erros.length,
  }

  console.log(
    `google contas=${dados.contas.length} eventos=${dados.eventos.length} ` +
      `nao_encontrados=${dados.naoEncontrados.length} erros=${dados.erros.length}`
  )
}

async function main() {
  const manifest = {
    criadoEm: new Date().toISOString(),
    diretorio,
    bancos: {},
  }

  const idsEventos = new Set()
  for (const db of DATABASES) {
    const eventos = await backupBanco(db, manifest)
    for (const eventId of eventos || []) idsEventos.add(eventId)
  }

  await backupGoogle(manifest, [...idsEventos].sort())
  escreverJson(path.join(diretorio, "manifest.json"), manifest)
  console.log(`Backup pronto: ${diretorio}`)
}

main().catch((erro) => {
  console.error("Falha no backup de visitas:", erro)
  process.exit(1)
})
