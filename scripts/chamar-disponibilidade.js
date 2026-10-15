// Chama a rota de disponibilidade na API local e imprime o resultado real.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") })

async function main() {
  const base = process.env.MICRODATA_API_URL
  const login = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.MICRODATA_SERVICE_EMAIL,
      senha: process.env.MICRODATA_SERVICE_SENHA,
    }),
  })
  const { token } = await login.json()
  const url = new URL(`${base}/estoque-disponibilidade`)
  // Argumentos no formato `chave=valor`: `node ... so_com_falta=true produto=000014`
  for (const argumento of process.argv.slice(2)) {
    const [chave, ...resto] = argumento.split("=")
    url.searchParams.set(chave, resto.join("="))
  }
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  console.log("status:", res.status)
  const corpo = await res.json()
  if (!res.ok) return console.log(corpo)
  console.log("resumo:", corpo.resumo)
  const mm = (v) => Math.round(v || 0).toLocaleString("pt-BR")
  console.log(
    "\nproduto".padEnd(20),
    "cor".padEnd(14),
    "estoque".padStart(10),
    "chegando".padStart(10),
    "prometido".padStart(10),
    "falta".padStart(10),
    "proxima"
  )
  for (const linha of corpo.linhas.slice(0, Number(process.env.LINHAS || 12))) {
    console.log(
      (linha.produto_desc || linha.produto).padEnd(20),
      (linha.cor_desc || linha.cor).padEnd(14),
      mm(linha.estoque_metros).padStart(10),
      mm(linha.caminho_metros).padStart(10),
      mm(linha.prometido_metros).padStart(10),
      mm(linha.falta_metros).padStart(10),
      linha.primeira_chegada ?? "-"
    )
  }
  const primeiro = corpo.linhas[0]
  if (primeiro) {
    console.log("\nquem prometeu (1a linha):")
    for (const r of primeiro.por_representante)
      console.log(`  ${r.vendedor} ${r.vendedor_nome}: ${r.pedidos} pedidos, ${mm(r.saldo)} m, R$ ${mm(r.valor)}`)
  }
}
main().catch((e) => {
  console.error("ERRO:", e.message)
  process.exit(1)
})
