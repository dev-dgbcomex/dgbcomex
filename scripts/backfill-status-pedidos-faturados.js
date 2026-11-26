const fs = require("node:fs")
const path = require("node:path")
const { Pool } = require("pg")
const ts = require("typescript")

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") })

const SQL_PEDIDOS = `
select pv.id, pv.oportunidade_id, pv.numero, pv.status,
       coalesce(sum(pi.valor_total), 0)::float8 as total_pedido
from crm_pedidos_venda pv
left join crm_pedido_venda_itens pi on pi.pedido_venda_id = pv.id
group by pv.id, pv.oportunidade_id, pv.numero, pv.status
order by pv.id
`

const SQL_FATURAMENTOS = `
with vinculos as (
  select distinct pedido_venda_id, id as faturamento_id
  from crm_faturamentos
  where pedido_venda_id is not null
  union
  select pedido_venda_id, faturamento_id
  from crm_faturamento_pedidos
)
select v.pedido_venda_id, f.id, f.status,
       coalesce((
         select sum(fi.valor_total)
         from crm_faturamento_itens fi
         where fi.faturamento_id = f.id
       ), 0)::float8 as valor_total
from vinculos v
join crm_faturamentos f on f.id = v.faturamento_id
order by v.pedido_venda_id, f.id
`

const ROTULOS = { FATURADO: "Faturado", PARCIAL: "Parcial" }
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

function carregarHelper() {
  const arquivo = path.join(__dirname, "..", "src", "lib", "crm", "backfill-status-pedidos.ts")
  const fonte = fs.readFileSync(arquivo, "utf8")
  const transpilado = ts.transpileModule(fonte, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const modulo = { exports: {} }
  new Function("module", "exports", transpilado)(modulo, modulo.exports)
  return modulo.exports
}

function lerArgs() {
  const args = process.argv.slice(2)
  const alvo = args.find((arg) => arg.startsWith("--db="))?.split("=")[1] || "all"
  if (!["neon", "local", "all"].includes(alvo)) {
    throw new Error("--db deve ser neon, local ou all")
  }
  return { aplicar: args.includes("--apply"), alvo }
}

async function processarBanco(banco, planejar, aplicar) {
  const pool = new Pool({ connectionString: banco.url, max: 1 })
  try {
    console.log(`\n[${banco.nome}] consultando pedidos e faturamentos...`)
    const [pedidos, faturamentos] = await Promise.all([
      pool.query(SQL_PEDIDOS),
      pool.query(SQL_FATURAMENTOS),
    ])
    const pedidosNormalizados = pedidos.rows.map((pedido) => ({
      id: Number(pedido.id),
      status: pedido.status,
      totalPedido: pedido.total_pedido,
      oportunidadeId: pedido.oportunidade_id ?? null,
      numero: pedido.numero,
    }))
    const faturamentosNormalizados = faturamentos.rows.map((faturamento) => ({
      id: Number(faturamento.id),
      pedidoVendaId: Number(faturamento.pedido_venda_id),
      status: faturamento.status,
      valorTotal: faturamento.valor_total,
    }))
    const planos = planejar(pedidosNormalizados, faturamentosNormalizados)

    if (planos.length === 0) {
      console.log(`[${banco.nome}] nenhum pedido precisa de correção`)
      return 0
    }

    const porId = new Map(
      pedidosNormalizados.map((pedido) => [pedido.id, pedido])
    )
    for (const plano of planos) {
      const pedido = porId.get(plano.pedidoVendaId)
      const numero = pedido?.numero ? ` (${pedido.numero})` : ""
      console.log(
        `[${banco.nome}] pedido ${plano.pedidoVendaId}${numero}: ${plano.statusAtual || "sem status"} → ${plano.statusNovo} | faturado ${moeda.format(plano.totalFaturado)} / pedido ${moeda.format(plano.totalPedido)} | notas ${plano.faturamentoIds.join(", ")}`
      )
    }

    if (!aplicar) {
      console.log(`[${banco.nome}] simulação: ${planos.length} pedido(s) seriam corrigidos`)
      return planos.length
    }

    const client = await pool.connect()
    let corrigidos = 0
    try {
      await client.query("BEGIN")
      for (const plano of planos) {
        const pedido = porId.get(plano.pedidoVendaId)
        const atualizado = await client.query(
          `update crm_pedidos_venda
              set status = $2, updated_at = now()
            where id = $1
              and coalesce(status, '') = coalesce($3, '')`,
          [plano.pedidoVendaId, plano.statusNovo, plano.statusAtual]
        )
        if (atualizado.rowCount === 0) {
          console.log(`[${banco.nome}] pedido ${plano.pedidoVendaId} ignorado: status mudou`)
          continue
        }

        const chaveEvento = `pedido-status-backfill-${plano.pedidoVendaId}-${plano.statusNovo}`
        const descricao = `Status do pedido ajustado para ${ROTULOS[plano.statusNovo]}: ${moeda.format(plano.totalFaturado)} faturados de ${moeda.format(plano.totalPedido)}.`
        const metadados = {
          chaveEvento,
          pedidoVendaId: plano.pedidoVendaId,
          oportunidadeId: pedido?.oportunidadeId ?? null,
          statusAntigo: plano.statusAtual,
          statusNovo: plano.statusNovo,
          totalPedido: plano.totalPedido,
          totalFaturado: plano.totalFaturado,
          faturamentoIds: plano.faturamentoIds,
          origem: "BACKFILL",
        }
        await client.query(
          `insert into crm_timeline_eventos
             (lead_id, cliente_id, tipo, descricao, metadados, data_evento, created_at)
           select o.lead_id, o.cliente_id, 'PEDIDO_VENDA', $1, $2::jsonb, now(), now()
           from crm_oportunidades o
           where o.id = $3
             and (o.lead_id is not null or o.cliente_id is not null)
             and not exists (
               select 1
               from crm_timeline_eventos e
               where e.tipo = 'PEDIDO_VENDA'
                 and e.metadados->>'chaveEvento' = $4
             )`,
          [descricao, JSON.stringify(metadados), pedido?.oportunidadeId ?? null, chaveEvento]
        )
        corrigidos += 1
      }
      await client.query("COMMIT")
    } catch (erro) {
      await client.query("ROLLBACK")
      throw erro
    } finally {
      client.release()
    }

    console.log(`[${banco.nome}] ${corrigidos} pedido(s) corrigido(s)`)
    return corrigidos
  } finally {
    await pool.end()
  }
}

async function main() {
  const { aplicar, alvo } = lerArgs()
  const { planejarBackfillStatusPedidos: planejar } = carregarHelper()
  const bancos = []

  if (alvo !== "local") {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada")
    bancos.push({ nome: "neon", url: process.env.DATABASE_URL })
  }
  if (alvo !== "neon") {
    if (!process.env.DATABASE_URL_LOCAL) throw new Error("DATABASE_URL_LOCAL não configurada")
    bancos.push({ nome: "local", url: process.env.DATABASE_URL_LOCAL })
  }

  console.log(aplicar ? "Modo: aplicação" : "Modo: simulação (use --apply para gravar)")
  let total = 0
  for (const banco of bancos) {
    total += await processarBanco(banco, planejar, aplicar)
  }
  console.log(`\nTotal: ${total} pedido(s) ${aplicar ? "corrigidos" : "a corrigir"}`)
}

main().catch((erro) => {
  console.error("ERRO:", erro.message)
  process.exit(1)
})
