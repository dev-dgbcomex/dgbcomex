require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") })
const { Client } = require("pg")
const fs = require("fs")
const path = require("path")

const APPLY = process.argv.includes("--apply")
const DB_ARG = process.argv.find((arg) => arg.startsWith("--db="))?.split("=")[1] || "all"

const TARGETS = [
  { name: "neon", url: process.env.DATABASE_URL },
  { name: "warehouse_local", url: process.env.DATABASE_URL_LOCAL },
].filter((target) => DB_ARG === "all" || target.name === DB_ARG)

const CLIENTE_COPIAR = [
  ["razao_social", "razao_social"],
  ["email", "email"],
  ["email_nf", "email_nf"],
  ["telefone", "telefone"],
  ["celular", "celular"],
  ["contato", "contato"],
  ["segmento", "segmento"],
  ["endereco", "endereco"],
  ["cidade", "cidade"],
  ["uf", "uf"],
  ["id_integracao", "id_integracao"],
]

const LEAD_COPIAR = [
  ["razao_social", "razao_social"],
  ["nome_fantasia", "nome_fantasia"],
  ["email", "email"],
  ["email_nf", "email_nf"],
  ["telefone", "telefone"],
  ["celular", "celular"],
  ["segmento", "segmento"],
  ["porte", "porte"],
  ["site", "site"],
  ["endereco", "endereco"],
  ["numero", "numero"],
  ["complemento", "complemento"],
  ["bairro", "bairro"],
  ["cidade", "cidade"],
  ["uf", "uf"],
  ["cep", "cep"],
  ["observacoes", "observacoes"],
  ["cliente_id", "cliente_id"],
  ["responsavel_id", "responsavel_id"],
]

const REFS_CLIENTE = [
  ["crm_empresas", "cliente_id"],
  ["crm_leads", "cliente_id"],
  ["crm_contatos", "cliente_id"],
  ["crm_oportunidades", "cliente_id"],
  ["crm_propostas", "cliente_id"],
  ["crm_visitas", "cliente_id"],
  ["crm_timeline_eventos", "cliente_id"],
  ["crm_whatsapp_mensagens", "cliente_id"],
  ["crm_acoes_prospeccao", "cliente_id"],
  ["requisicoes_corte", "cliente_id"],
  ["requisicoes_corte_itens", "cliente_id"],
]

const REFS_LEAD = [
  ["crm_contatos", "lead_id"],
  ["crm_oportunidades", "lead_id"],
  ["crm_propostas", "lead_id"],
  ["crm_tarefas", "lead_id"],
  ["crm_timeline_eventos", "lead_id"],
  ["crm_visitas", "lead_id"],
  ["crm_whatsapp_mensagens", "lead_id"],
  ["crm_acoes_prospeccao", "lead_id"],
  ["crm_visitantes", "lead_id"],
  ["crm_visitantes", "lead_id_legado"],
  ["leads_representantes", "lead_id"],
]

function digitos(valor) {
  return String(valor ?? "").replace(/\D/g, "")
}

function formatar(valor, tipo) {
  const texto = String(valor ?? "").trim()
  if (!texto) return null
  const d = digitos(texto)
  const tipoDocumento = tipo || (d.length === 11 ? "CPF" : d.length === 14 ? "CNPJ" : null)
  if (tipoDocumento === "CPF" && d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  }
  if (tipoDocumento === "CNPJ" && d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
  }
  return texto
}

function pontuado(valor) {
  const texto = String(valor ?? "").trim()
  return Boolean(texto) && formatar(texto) === texto
}

function documentoLinha(linha) {
  return linha.tipo === "CNPJ" ? linha.cnpj : linha.cpf
}

function momento(linha) {
  const tempo = new Date(linha.created_at || 0).getTime()
  return Number.isFinite(tempo) ? tempo : 0
}

async function buscarPlanos(client, entidade) {
  const sql =
    entidade === "cliente"
      ? `SELECT id, nome, razao_social, cnpj, NULL::varchar AS cpf, 'CNPJ'::varchar AS tipo, created_at
         FROM clientes
         WHERE cnpj IS NOT NULL
         ORDER BY id`
      : `SELECT id, nome, razao_social, cpf, cnpj,
                CASE WHEN nullif(cnpj, '') IS NOT NULL THEN 'CNPJ' ELSE 'CPF' END::varchar AS tipo,
                created_at
         FROM crm_leads
         WHERE nullif(cnpj, '') IS NOT NULL OR nullif(cpf, '') IS NOT NULL
         ORDER BY id`

  const { rows } = await client.query(sql)
  const grupos = new Map()

  for (const linha of rows) {
    const d = digitos(documentoLinha(linha))
    if (![11, 14].includes(d.length)) continue
    if (!grupos.has(d)) grupos.set(d, [])
    grupos.get(d).push(linha)
  }

  return Array.from(grupos.entries())
    .map(([d, linhas]) => {
      const comPontuacao = linhas.filter((linha) => pontuado(documentoLinha(linha)))
      const candidatos = comPontuacao.length > 0 ? comPontuacao : linhas
      candidatos.sort((a, b) => momento(a) - momento(b) || a.id - b.id)
      const keeper = candidatos[0]
      const documentoCerto = formatar(documentoLinha(keeper), keeper.tipo)
      return {
        entidade,
        documento: documentoCerto,
        tipo: keeper.tipo,
        keeperId: keeper.id,
        keeperNome: keeper.nome || keeper.razao_social || `#${keeper.id}`,
        corrigirPontuacao: !pontuado(documentoLinha(keeper)),
        removerIds: linhas.filter((linha) => linha.id !== keeper.id).map((linha) => linha.id),
      }
    })
    .filter((plano) => plano.corrigirPontuacao || plano.removerIds.length > 0)
    .sort((a, b) => a.documento.localeCompare(b.documento))
}

async function colunaExiste(client, tabela, coluna) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tabela, coluna]
  )
  return rows.length > 0
}

async function backup(target, planos) {
  const client = new Client({ connectionString: target.url })
  await client.connect()
  try {
    const dir = path.join(__dirname, "..", "backups")
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, "-")
    const arquivo = path.join(dir, `normalizar-documentos-${target.name}-${stamp}.json`)

    const dados = { criadoEm: new Date().toISOString(), banco: target.name, planos, linhas: {} }
    const idsClientes = planos
      .filter((plano) => plano.entidade === "cliente")
      .flatMap((plano) => [plano.keeperId, ...plano.removerIds])
    const idsLeads = planos
      .filter((plano) => plano.entidade === "lead")
      .flatMap((plano) => [plano.keeperId, ...plano.removerIds])

    async function coletar(chave, tabela, coluna, ids) {
      if (ids.length === 0 || !(await colunaExiste(client, tabela, coluna))) return
      const { rows } = await client.query(
        `SELECT * FROM ${tabela} WHERE ${coluna} = ANY($1::int[]) ORDER BY ${coluna}, id`,
        [ids]
      )
      dados.linhas[`${chave}:${tabela}.${coluna}`] = rows
    }

    await coletar("cliente", "clientes", "id", idsClientes)
    await coletar("cliente", "clientes_representantes", "cliente_id", idsClientes)
    await coletar("lead", "crm_leads", "id", idsLeads)
    for (const [tabela, coluna] of REFS_CLIENTE) {
      await coletar("cliente", tabela, coluna, idsClientes)
    }
    for (const [tabela, coluna] of REFS_LEAD) {
      await coletar("lead", tabela, coluna, idsLeads)
    }

    fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2))
    return arquivo
  } finally {
    await client.end()
  }
}

function setsCopia(colunas, keeperAlias, duplicadoAlias) {
  return colunas
    .map(([coluna]) => `${coluna} = COALESCE(${keeperAlias}.${coluna}, ${duplicadoAlias}.${coluna})`)
    .join(", ")
}

async function mesclarCliente(client, plano, duplicadoId) {
  const copia = setsCopia(CLIENTE_COPIAR, "k", "d")
  await client.query(
    `UPDATE clientes k SET ${copia}, updated_at = now()
     FROM clientes d WHERE k.id = $1 AND d.id = $2`,
    [plano.keeperId, duplicadoId]
  )

  if (await colunaExiste(client, "clientes_representantes", "cliente_id")) {
    await client.query(
      `INSERT INTO clientes_representantes (cliente_id, representante_id)
       SELECT $1, representante_id FROM clientes_representantes WHERE cliente_id = $2
       ON CONFLICT DO NOTHING`,
      [plano.keeperId, duplicadoId]
    )
    await client.query(`DELETE FROM clientes_representantes WHERE cliente_id = $1`, [duplicadoId])
  }

  for (const [tabela, coluna] of REFS_CLIENTE) {
    if (!(await colunaExiste(client, tabela, coluna))) continue
    await client.query(`UPDATE ${tabela} SET ${coluna} = $1 WHERE ${coluna} = $2`, [
      plano.keeperId,
      duplicadoId,
    ])
  }

  await client.query(`DELETE FROM clientes WHERE id = $1`, [duplicadoId])
}

async function mesclarLead(client, plano, duplicadoId) {
  const copia = setsCopia(LEAD_COPIAR, "k", "d")
  await client.query(
    `UPDATE crm_leads k SET ${copia},
       promovida_cliente = k.promovida_cliente OR d.promovida_cliente,
       promovido_em = COALESCE(k.promovido_em, d.promovido_em),
       promovido_por = COALESCE(k.promovido_por, d.promovido_por),
       promovido_por_nome = COALESCE(k.promovido_por_nome, d.promovido_por_nome),
       status = CASE WHEN k.status = 'NOVO' THEN d.status ELSE k.status END,
       updated_at = now()
     FROM crm_leads d WHERE k.id = $1 AND d.id = $2`,
    [plano.keeperId, duplicadoId]
  )

  for (const [tabela, coluna] of REFS_LEAD) {
    if (!(await colunaExiste(client, tabela, coluna))) continue
    await client.query(`UPDATE ${tabela} SET ${coluna} = $1 WHERE ${coluna} = $2`, [
      plano.keeperId,
      duplicadoId,
    ])
  }

  await client.query(`DELETE FROM crm_leads WHERE id = $1`, [duplicadoId])
}

async function criarIndices(client) {
  await client.query(String.raw`
    CREATE UNIQUE INDEX IF NOT EXISTS clientes_cnpj_normalizado_unique
    ON clientes (regexp_replace(cnpj, '\D', '', 'g'))
  `)
  await client.query(String.raw`
    CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_cnpj_normalizado_unique
    ON crm_leads (regexp_replace(cnpj, '\D', '', 'g'))
    WHERE cnpj IS NOT NULL
  `)
  await client.query(String.raw`
    CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_cpf_normalizado_unique
    ON crm_leads (regexp_replace(cpf, '\D', '', 'g'))
    WHERE cpf IS NOT NULL
  `)
}

async function aplicar(target) {
  const client = new Client({ connectionString: target.url })
  await client.connect()
  try {
    await client.query("BEGIN")
    const planos = [...(await buscarPlanos(client, "cliente")), ...(await buscarPlanos(client, "lead"))]

    for (const plano of planos) {
      const tabela = plano.entidade === "cliente" ? "clientes" : "crm_leads"
      const coluna = plano.tipo === "CNPJ" ? "cnpj" : "cpf"
      if (plano.corrigirPontuacao) {
        await client.query(`UPDATE ${tabela} SET ${coluna} = $1, updated_at = now() WHERE id = $2`, [
          plano.documento,
          plano.keeperId,
        ])
      }
      for (const duplicadoId of plano.removerIds) {
        if (plano.entidade === "cliente") {
          await mesclarCliente(client, plano, duplicadoId)
        } else {
          await mesclarLead(client, plano, duplicadoId)
        }
      }
    }

    await criarIndices(client)
    await client.query("COMMIT")
    return planos.length
  } catch (erro) {
    await client.query("ROLLBACK")
    throw erro
  } finally {
    await client.end()
  }
}

async function main() {
  if (TARGETS.length === 0) {
    throw new Error("Use --db=all, --db=neon ou --db=warehouse_local")
  }

  for (const target of TARGETS) {
    const client = new Client({ connectionString: target.url })
    await client.connect()
    let planos
    try {
      planos = [
        ...(await buscarPlanos(client, "cliente")),
        ...(await buscarPlanos(client, "lead")),
      ]
    } finally {
      await client.end()
    }

    const duplicatas = planos.filter((plano) => plano.removerIds.length > 0)
    const semPontuacao = planos.filter((plano) => plano.corrigirPontuacao)
    console.log(`\n=== ${target.name} ===`)
    console.log(`Grupos com duplicata: ${duplicatas.length}`)
    console.log(`Documentos sem pontuação (mantidos): ${semPontuacao.length}`)

    for (const plano of planos) {
      const acoes = []
      if (plano.corrigirPontuacao) acoes.push(`pontuar #${plano.keeperId}`)
      if (plano.removerIds.length > 0) {
        acoes.push(`mesclar ${plano.removerIds.map((id) => `#${id}`).join(", ")} em #${plano.keeperId}`)
      }
      console.log(
        `  ${plano.entidade} ${plano.documento} ${plano.keeperNome}: ${acoes.join("; ")}`
      )
    }

    if (!APPLY) continue

    const arquivo = await backup(target, planos)
    console.log(`Backup: ${arquivo}`)
    const aplicados = await aplicar(target)
    console.log(`Aplicado: ${aplicados} documento(s) processado(s)`)
  }

  if (!APPLY) {
    console.log("\nDry-run: nenhuma alteração feita. Rode com --apply para executar.")
  }
}

main().catch((erro) => {
  console.error(erro)
  process.exitCode = 1
})
