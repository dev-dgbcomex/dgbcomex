require("dotenv").config({ path: ".env.local" })
const postgres = require("postgres")

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
const apply = args.includes("--apply")
const dryRun = !apply

function sqlStr(valor) {
  return `'${String(valor ?? "").replace(/'/g, "''")}'`
}
function jsonStr(valor) {
  return "'" + '"' + String(valor ?? "").replace(/'/g, "''") + '"' + "'"
}

function numero(valor) {
  const convertido = Number(valor)
  return Number.isFinite(convertido) ? convertido : 0
}

function dataPtBr(valor) {
  if (!valor) return "—"
  if (valor instanceof Date) {
    return `${String(valor.getUTCDate()).padStart(2, "0")}/${String(valor.getUTCMonth() + 1).padStart(2, "0")}/${valor.getUTCFullYear()}`
  }
  const textoValor = String(valor)
  const somenteData = textoValor.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (somenteData) return `${somenteData[3]}/${somenteData[2]}/${somenteData[1]}`
  const data = new Date(textoValor)
  return Number.isNaN(data.getTime()) ? "—" : data.toLocaleDateString("pt-BR")
}

function dentroPeriodo(valor, inicio) {
  if (!valor) return false
  const data = new Date(valor)
  return !Number.isNaN(data.getTime()) && data.getTime() >= inicio.getTime()
}

function faixaCanonicalSql(entidadeTipo, entidadeId) {
  const tabela = entidadeTipo === "cliente" ? "clientes" : "crm_leads"
  const cond =
    entidadeTipo === "cliente"
      ? `(o.cliente_id = ${entidadeId} or o.lead_id in (select id from crm_leads where cliente_id = ${entidadeId}))`
      : `o.lead_id = ${entidadeId}`
  return `
select case
  when exists (select 1 from crm_oportunidades o where ${cond} and o.status = 'NEGOCIACAO') then 'QUENTE'
  when exists (select 1 from crm_oportunidades o where ${cond} and o.status in ('FECHADO_GANHO','GANHO') and o.updated_at >= date_trunc('month', current_date)) then 'QUENTE'
  when exists (select 1 from crm_pedidos_venda pv inner join crm_oportunidades o on o.id = pv.oportunidade_id where ${cond} and coalesce(pv.data_emissao::timestamp, pv.created_at) >= date_trunc('month', current_date)) then 'QUENTE'
  when exists (select 1 from crm_oportunidades o where ${cond} and o.status = 'PROPOSTA') then 'MORNO'
  when exists (select 1 from crm_oportunidades o where ${cond} and o.status in ('FECHADO_GANHO','GANHO') and o.updated_at >= date_trunc('quarter', current_date)) then 'MORNO'
  when exists (select 1 from crm_pedidos_venda pv inner join crm_oportunidades o on o.id = pv.oportunidade_id where ${cond} and coalesce(pv.data_emissao::timestamp, pv.created_at) >= date_trunc('quarter', current_date)) then 'MORNO'
  else 'FRIO'
end as faixa`
}

function motivoTemperatura(faixa, oportunidades, pedidos) {
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const inicioTrimestre = new Date(hoje.getFullYear(), Math.floor(hoje.getMonth() / 3) * 3, 1)

  const negociacao = oportunidades.find((o) => o.status === "NEGOCIACAO")
  const proposta = oportunidades.find((o) => o.status === "PROPOSTA")
  const ganhoMes = oportunidades.find(
    (o) => (o.status === "FECHADO_GANHO" || o.status === "GANHO") && dentroPeriodo(o.updated_at, inicioMes)
  )
  const ganhoTrimestre = oportunidades.find(
    (o) => (o.status === "FECHADO_GANHO" || o.status === "GANHO") && dentroPeriodo(o.updated_at, inicioTrimestre)
  )
  const pedidoMes = pedidos.find((p) => dentroPeriodo(p.data_emissao ?? p.created_at, inicioMes))
  const pedidoTrimestre = pedidos.find((p) => dentroPeriodo(p.data_emissao ?? p.created_at, inicioTrimestre))

  switch (faixa) {
    case "QUENTE":
      if (negociacao) return `Oportunidade "${negociacao.titulo}" em NEGOCIAÇÃO`
      if (ganhoMes) return `Oportunidade "${ganhoMes.titulo}" ganha em ${dataPtBr(ganhoMes.updated_at)}`
      if (pedidoMes)
        return `Pedido de venda ${pedidoMes.numero} emitido em ${dataPtBr(pedidoMes.data_emissao ?? pedidoMes.created_at)} (status ${pedidoMes.status}); status do pedido não altera a faixa.`
      return "Negociação, ganho ou pedido de venda no mês corrente"
    case "MORNO":
      if (proposta) return `Oportunidade "${proposta.titulo}" em PROPOSTA`
      if (ganhoTrimestre) return `Oportunidade "${ganhoTrimestre.titulo}" ganha no trimestre corrente`
      if (pedidoTrimestre) return `Pedido de venda ${pedidoTrimestre.numero} no trimestre corrente`
      return "Proposta ou ganho/pedido no trimestre corrente"
    default:
      return "Sem oportunidade em NEGOCIAÇÃO ou PROPOSTA, ganho ou pedido de venda no mês/trimestre corrente"
  }
}

async function processarBanco(db) {
  const resumos = await db.unsafe(
    `select id, entidade_tipo, entidade_id, classificacao, motivo_classificacao, resumo from crm_resumos_ia order by id`
  )
  let total = 0
  let alterados = 0
  const erros = []
  const diffs = []

  for (const resumo of resumos) {
    total++
    const id = numero(resumo.id)
    const entidadeTipo = resumo.entidade_tipo
    const entidadeId = numero(resumo.entidade_id)
    const atualClassificacao = resumo.classificacao
    const atualMotivo = resumo.motivo_classificacao ?? null

    let novaClassificacao
    try {
      const [faixaRow] = await db.unsafe(faixaCanonicalSql(entidadeTipo, entidadeId))
      novaClassificacao = faixaRow.faixa || "FRIO"
    } catch (erro) {
      erros.push(`id ${id}: falha ao calcular faixa: ${String(erro)}`)
      continue
    }

    let oportunidades = []
    let pedidos = []
    try {
      const cond =
        entidadeTipo === "cliente"
          ? `(o.cliente_id = ${entidadeId} or o.lead_id in (select id from crm_leads where cliente_id = ${entidadeId}))`
          : `o.lead_id = ${entidadeId}`
      oportunidades = await db.unsafe(
        `select o.titulo, o.status, o.updated_at from crm_oportunidades o where ${cond} order by o.updated_at desc limit 10`
      )
      pedidos = await db.unsafe(
        `select pv.numero, pv.data_emissao, pv.status, pv.created_at from crm_pedidos_venda pv inner join crm_oportunidades o on o.id = pv.oportunidade_id where ${cond} order by coalesce(pv.data_emissao::timestamp, pv.created_at) desc limit 10`
      )
    } catch (erro) {
      erros.push(`id ${id}: falha ao buscar evidências: ${String(erro)}`)
      continue
    }

    const novoMotivo = motivoTemperatura(novaClassificacao, oportunidades, pedidos)

    if (novaClassificacao !== atualClassificacao || novoMotivo !== atualMotivo) {
      alterados++
      diffs.push({
        id,
        entidadeTipo,
        entidadeId,
        antes: { classificacao: atualClassificacao, motivo: atualMotivo },
        depois: { classificacao: novaClassificacao, motivo: novoMotivo },
      })
    }

    if (apply) {
      try {
        await db.unsafe("begin")
        await db.unsafe(
          `update crm_resumos_ia set classificacao = ${sqlStr(novaClassificacao)}, motivo_classificacao = ${novoMotivo ? sqlStr(novoMotivo) : "null"} where id = ${id}`
        )
        await db.unsafe(
           `update crm_timeline_eventos set descricao = ${sqlStr(`${novaClassificacao}: ${String(resumo.resumo ?? "").slice(0, 140)}`)}, metadados = jsonb_set(metadados, '{classificacao}', ${jsonStr(novaClassificacao)}) where tipo = 'RESUMO_IA' and metadados->>'resumoId' = '${id}'`
        )
        await db.unsafe("commit")
      } catch (erro) {
        await db.unsafe("rollback").catch(() => {})
        erros.push(`id ${id}: falha ao gravar: ${String(erro)}`)
      }
    }
  }

  return { total, alterados, diffs, erros }
}

;(async () => {
  const bancos = DATABASES.filter((b) => !onlyDb || b.name === onlyDb)
  if (bancos.length === 0) {
    console.error(`Banco não encontrado: ${onlyDb}`)
    process.exit(1)
  }

  let geralTotal = 0
  let geralAlterados = 0
  let geralErros = []

  for (const banco of bancos) {
    console.log(`\n== ${banco.name} (${dryRun ? "DRY-RUN" : "APLICAR"}) ==`)
    const sql = postgres(banco.url, { max: 1, prepare: false })
    try {
      const resultado = await processarBanco(sql)
      geralTotal += resultado.total
      geralAlterados += resultado.alterados
      geralErros = geralErros.concat(resultado.erros.map((e) => `${banco.name}: ${e}`))
      console.log(`total=${resultado.total} alterados=${resultado.alterados}`)
      for (const diff of resultado.diffs) {
        console.log(
          `id ${diff.id} [${diff.entidadeTipo}:${diff.entidadeId}] ${JSON.stringify(diff.antes.classificacao)} -> ${JSON.stringify(diff.depois.classificacao)} | ${diff.depois.motivo}`
        )
      }
      if (resultado.erros.length) {
        console.error(`erros ${banco.name}:`, resultado.erros)
      }
    } finally {
      await sql.end()
    }
  }

  console.log(`\nGeral: total=${geralTotal} alterados=${geralAlterados} erros=${geralErros.length}`)
  if (geralErros.length) {
    console.error(geralErros)
    process.exit(1)
  }
})().catch((erro) => {
  console.error(String(erro))
  process.exit(1)
})
