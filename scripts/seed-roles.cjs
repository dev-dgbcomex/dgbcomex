const fs = require("fs")
const path = require("path")
const postgres = require("postgres")

const env = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf-8")
const match = env.match(/DATABASE_URL="(.*)"/)
if (!match) { console.error("DATABASE_URL not found"); process.exit(1) }
const sql = postgres(match[1], { prepare: false })

const ROLES = [
  { name: "ADMIN", label: "Administrador", description: "Acesso total ao sistema" },
  { name: "BENEFICIAMENTO", label: "Beneficiamento", description: "Acesso ao módulo de beneficiamento" },
  { name: "COMERCIAL", label: "Comercial", description: "Acesso ao módulo comercial e solicitações" },
  { name: "DESENVOLVIMENTO", label: "Desenvolvimento", description: "Acesso ao módulo de solicitações, tecelagem e beneficiamento" },
  { name: "FINANCEIRO", label: "Financeiro", description: "Acesso ao módulo financeiro" },
  { name: "FISCAL", label: "Fiscal", description: "Acesso ao módulo fiscal" },
  { name: "CRM", label: "Gestão de Relacionamento com o Cliente", description: "Acesso ao módulo CRM" },
  { name: "DEFAULT", label: "Padrão", description: "Configuração padrão para novos usuários", paginaInicial: "/comercial/solicitacoes" },
  { name: "PCP", label: "PCP", description: "Planejamento e controle de produção" },
  { name: "QUALIDADE", label: "Qualidade", description: "Aprovação e controle de qualidade" },
  { name: "REVISAO", label: "Revisão", description: "Colaboradores do setor de revisão" },
  { name: "SUDO", label: "Super User", description: "Usuário root da aplicação" },
  { name: "TECELAGEM", label: "Tecelagem", description: "Acesso ao módulo de tecelagem" },
]

async function main() {
  console.log("Garantindo coluna roles.pagina_inicial...")
  await sql`ALTER TABLE roles ADD COLUMN IF NOT EXISTS pagina_inicial VARCHAR(255)`

  console.log(`Populando ${ROLES.length} perfis de acesso...`)
  for (const r of ROLES) {
    await sql`
      INSERT INTO roles (name, label, description, pagina_inicial, ativo, updated_at)
      VALUES (${r.name}, ${r.label}, ${r.description}, ${r.paginaInicial ?? null}, TRUE, NOW())
      ON CONFLICT (name) DO UPDATE
        SET label = EXCLUDED.label,
            description = EXCLUDED.description,
            ativo = TRUE,
            updated_at = NOW()
    `
  }

  const lista = await sql`SELECT id, name, label, ativo FROM roles ORDER BY label`
  console.table(lista)
  console.log("Seed de roles concluído!")

  const emUso = await sql`
    SELECT role, count(*) as usuarios FROM usuarios WHERE role IS NOT NULL GROUP BY role ORDER BY role
  `
  console.log("Roles em uso em usuarios:")
  console.table(emUso)

  await sql.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
