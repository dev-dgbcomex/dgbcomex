const fs = require("fs")
const path = require("path")
const postgres = require("postgres")

const env = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf-8")
const match = env.match(/DATABASE_URL="(.*)"/)
if (!match) { console.error("DATABASE_URL not found"); process.exit(1) }
const sql = postgres(match[1], { prepare: false })

const PAISES = [
  { nome: "Brasil", codigo: "BR" },
  { nome: "Argentina", codigo: "AR" },
  { nome: "Paraguai", codigo: "PY" },
  { nome: "Uruguai", codigo: "UY" },
  { nome: "Chile", codigo: "CL" },
  { nome: "Colômbia", codigo: "CO" },
  { nome: "Peru", codigo: "PE" },
  { nome: "Estados Unidos", codigo: "US" },
  { nome: "China", codigo: "CN" },
  { nome: "Alemanha", codigo: "DE" },
]

const ESTADOS = [
  { uf: "AC", nome: "Acre", regiao: "N" },
  { uf: "AL", nome: "Alagoas", regiao: "NE" },
  { uf: "AP", nome: "Amapá", regiao: "N" },
  { uf: "AM", nome: "Amazonas", regiao: "N" },
  { uf: "BA", nome: "Bahia", regiao: "NE" },
  { uf: "CE", nome: "Ceará", regiao: "NE" },
  { uf: "DF", nome: "Distrito Federal", regiao: "CO" },
  { uf: "ES", nome: "Espírito Santo", regiao: "SE" },
  { uf: "GO", nome: "Goiás", regiao: "CO" },
  { uf: "MA", nome: "Maranhão", regiao: "NE" },
  { uf: "MT", nome: "Mato Grosso", regiao: "CO" },
  { uf: "MS", nome: "Mato Grosso do Sul", regiao: "CO" },
  { uf: "MG", nome: "Minas Gerais", regiao: "SE" },
  { uf: "PA", nome: "Pará", regiao: "N" },
  { uf: "PB", nome: "Paraíba", regiao: "NE" },
  { uf: "PR", nome: "Paraná", regiao: "S" },
  { uf: "PE", nome: "Pernambuco", regiao: "NE" },
  { uf: "PI", nome: "Piauí", regiao: "NE" },
  { uf: "RJ", nome: "Rio de Janeiro", regiao: "SE" },
  { uf: "RN", nome: "Rio Grande do Norte", regiao: "NE" },
  { uf: "RS", nome: "Rio Grande do Sul", regiao: "S" },
  { uf: "RO", nome: "Rondônia", regiao: "N" },
  { uf: "RR", nome: "Roraima", regiao: "N" },
  { uf: "SC", nome: "Santa Catarina", regiao: "S" },
  { uf: "SP", nome: "São Paulo", regiao: "SE" },
  { uf: "SE", nome: "Sergipe", regiao: "NE" },
  { uf: "TO", nome: "Tocantins", regiao: "N" },
]

async function seedPaises() {
  console.log("Populando crm_paises...")
  for (const p of PAISES) {
    await sql`INSERT INTO crm_paises (nome, codigo) VALUES (${p.nome}, ${p.codigo}) ON CONFLICT DO NOTHING`
  }
  const r = await sql`SELECT count(*) as n FROM crm_paises`
  console.log(`  crm_paises: ${r[0].n} registros`)
}

async function seedEstados() {
  console.log("Populando crm_estados...")
  const pais = await sql`SELECT id FROM crm_paises WHERE codigo = 'BR' LIMIT 1`
  const paisId = pais.length > 0 ? pais[0].id : null
  for (const e of ESTADOS) {
    await sql`
      INSERT INTO crm_estados (nome, uf, regiao, pais_id)
      VALUES (${e.nome}, ${e.uf}, ${e.regiao}, ${paisId})
      ON CONFLICT (uf) DO NOTHING
    `
  }
  const r = await sql`SELECT count(*) as n FROM crm_estados`
  console.log(`  crm_estados: ${r[0].n} registros`)
}

async function seedCidades() {
  console.log("Buscando municípios do IBGE...")
  const res = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios")
  if (!res.ok) throw new Error("Falha IBGE: " + res.status)
  const municipios = await res.json()
  console.log(`  Recebidos ${municipios.length} municípios`)

  const estados = await sql`SELECT id, uf FROM crm_estados`
  const estadoMap = {}
  for (const e of estados) estadoMap[e.uf] = e.id

  const naoEncontrados = new Set()
  const cidades = municipios
    .map((m) => {
      const uf = m.microrregiao?.mesorregiao?.UF?.sigla
      const estadoId = estadoMap[uf]
      if (!uf || !estadoId) naoEncontrados.add(uf || "?")
      return { nome: m.nome, estadoId }
    })
    .filter((c) => c.estadoId)

  if (naoEncontrados.size > 0) console.warn("  UF não encontrados:", [...naoEncontrados].join(", "))

  console.log(`  Inserindo ${cidades.length} cidades...`)
  const BATCH = 500
  for (let i = 0; i < cidades.length; i += BATCH) {
    const batch = cidades.slice(i, i + BATCH)
    const placeholders = batch.map((_, j) => `($${j * 2 + 1}::varchar, $${j * 2 + 2}::integer)`).join(",")
    const values = batch.flatMap((c) => [c.nome, c.estadoId])
    await sql.unsafe(
      `INSERT INTO crm_cidades (nome, estado_id) VALUES ${placeholders} ON CONFLICT (nome, estado_id) DO NOTHING`,
      values
    )
    if ((i + BATCH) % 2000 === 0 || i + BATCH >= cidades.length) {
      console.log(`    ${Math.min(i + BATCH, cidades.length)}/${cidades.length}`)
    }
  }
  const r = await sql`SELECT count(*) as n FROM crm_cidades`
  console.log(`  crm_cidades: ${r[0].n} registros`)
}

async function main() {
  const skipCidades = process.argv.includes("--sem-cidades")
  await seedPaises()
  await seedEstados()
  if (!skipCidades) await seedCidades()
  console.log("Seed geográfico concluído!")
  await sql.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
