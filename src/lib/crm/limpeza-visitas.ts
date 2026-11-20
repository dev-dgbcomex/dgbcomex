export const COLUNAS_VISITAS = [
  "id",
  "lead_id",
  "cliente_id",
  "oportunidade_id",
  "contato_id",
  "viagem_id",
  "representante_id",
  "representante_nome",
  "proposta_id",
  "data_visita",
  "hora",
  "tipo",
  "status",
  "endereco",
  "numero",
  "complemento",
  "bairro",
  "cidade",
  "uf",
  "cep",
  "endereco_lat",
  "endereco_lng",
  "motivo_cancelamento",
  "nome_avulso",
  "relato",
  "fotos",
  "check_in_time",
  "check_out_time",
  "check_in_lat",
  "check_in_lng",
  "check_out_lat",
  "check_out_lng",
  "criado_por",
  "duracao_estimada",
  "google_event_id",
  "lembrete_dia_anterior_enviado",
  "lembrete_dia_visita_enviado",
  "created_at",
  "updated_at",
]

export const COLUNAS_LOCALIZACOES_VISITA = [
  "id",
  "visita_id",
  "latitude",
  "longitude",
  "endereco",
  "observacao",
  "foto_url",
  "tipo",
  "criado_por",
  "created_at",
]

export const COLUNAS_PESQUISAS_VISITA = [
  "id",
  "visita_id",
  "email",
  "nome",
  "token",
  "enviado_em",
  "aberto_em",
  "respondido_em",
  "status",
  "criado_por",
  "created_at",
]

export const COLUNAS_RESPOSTAS_VISITA = [
  "id",
  "pesquisa_id",
  "pergunta",
  "tipo",
  "resposta",
  "created_at",
]

export const COLUNAS_TIMELINE_VISITA = [
  "id",
  "lead_id",
  "cliente_id",
  "tipo",
  "descricao",
  "metadados",
  "data_evento",
  "created_at",
]

export const SQL_VISITAS_BACKUP = `SELECT * FROM crm_visitas ORDER BY id`
export const SQL_LOCALIZACOES_VISITA_BACKUP = `SELECT * FROM crm_visitas_localizacoes ORDER BY id`
export const SQL_PESQUISAS_VISITA_BACKUP = `SELECT * FROM crm_pesquisas_satisfacao ORDER BY id`
export const SQL_RESPOSTAS_VISITA_BACKUP = `SELECT * FROM crm_pesquisas_respostas ORDER BY id`
export const SQL_TIMELINE_VISITA_BACKUP = `SELECT * FROM crm_timeline_eventos WHERE tipo = 'VISITA' ORDER BY id`

export const SQL_IDS_VISITAS = `SELECT id FROM crm_visitas ORDER BY id`

export const SQL_ACOES_VINCULADAS = `
SELECT id, origem_visita_id, google_event_id, updated_at
FROM crm_acoes_prospeccao
WHERE origem_visita_id IS NOT NULL
ORDER BY id
`

export const SQL_EVENTOS_VISITA = `
SELECT DISTINCT google_event_id
FROM crm_visitas
WHERE google_event_id IS NOT NULL
UNION
SELECT DISTINCT google_event_id
FROM crm_acoes_prospeccao
WHERE origem_visita_id IS NOT NULL AND google_event_id IS NOT NULL
ORDER BY 1
`

export const SQL_CONTAS_GOOGLE = `
SELECT a.id, a.user_id, u.email, u.name, a.refresh_token, a.access_token, a.expires_at
FROM accounts a
JOIN usuarios u ON u.id = a.user_id
WHERE a.provider = 'google'
ORDER BY a.id
`

export const SQL_CONTAGENS_LIMPEZA = `
SELECT
  (SELECT count(*) FROM crm_visitas) AS visitas,
  (SELECT count(*) FROM crm_visitas_localizacoes) AS localizacoes_visita,
  (SELECT count(*) FROM crm_pesquisas_satisfacao) AS pesquisas_visita,
  (SELECT count(*) FROM crm_pesquisas_respostas) AS respostas_visita,
  (SELECT count(*) FROM crm_timeline_eventos WHERE tipo = 'VISITA') AS timeline_visita,
  (SELECT count(*) FROM crm_acoes_prospeccao WHERE origem_visita_id IS NOT NULL) AS acoes_com_origem,
  (SELECT count(*) FROM crm_acoes_prospeccao WHERE origem_visita_id IS NOT NULL AND google_event_id IS NOT NULL) AS acoes_com_evento
`

function validarIdentificador(identificador: string): void {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identificador)) {
    throw new Error(`Identificador SQL inválido: ${identificador}`)
  }
}

function escaparTexto(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "''")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
}

export function formatarValorSql(valor: unknown): string {
  if (valor === null || valor === undefined) return "NULL"
  if (typeof valor === "boolean") return valor ? "true" : "false"
  if (typeof valor === "number") return Number.isFinite(valor) ? String(valor) : "NULL"
  if (valor instanceof Date) return `E'${escaparTexto(valor.toISOString())}'`
  if (typeof valor === "object") return `E'${escaparTexto(JSON.stringify(valor))}'::jsonb`
  return `E'${escaparTexto(String(valor))}'`
}

export function sqlInserirRegistros(
  tabela: string,
  colunas: string[],
  registros: Array<Record<string, unknown>>
): string {
  validarIdentificador(tabela)
  if (colunas.length === 0) throw new Error("Lista de colunas vazia")
  for (const coluna of colunas) validarIdentificador(coluna)
  if (registros.length === 0) return ""

  const linhas = registros.map((registro) => {
    const valores = colunas.map((coluna) => formatarValorSql(registro[coluna]))
    return `(${valores.join(", ")})`
  })

  return `INSERT INTO ${tabela} (${colunas.join(", ")}) VALUES ${linhas.join(",\n")} ON CONFLICT (id) DO NOTHING;`
}

export function sqlListaIds(ids: number[]): string {
  const normalizados = ids.map((id) => {
    const valor = Number(id)
    if (!Number.isInteger(valor) || valor <= 0) throw new Error(`ID inválido: ${id}`)
    return valor
  })
  return `ARRAY[${normalizados.join(", ")}]`
}

export function sqlLimparVisitas(ids: number[]): string[] {
  const comun = [
    `UPDATE crm_acoes_prospeccao SET origem_visita_id = NULL, google_event_id = NULL, updated_at = now() WHERE origem_visita_id IS NOT NULL`,
    `DELETE FROM crm_timeline_eventos WHERE tipo = 'VISITA'`,
  ]

  if (ids.length === 0) return comun

  const lista = sqlListaIds(ids)
  return [
    ...comun,
    `DELETE FROM crm_pesquisas_respostas WHERE pesquisa_id IN (SELECT id FROM crm_pesquisas_satisfacao WHERE visita_id = ANY(${lista}))`,
    `DELETE FROM crm_pesquisas_satisfacao WHERE visita_id = ANY(${lista})`,
    `DELETE FROM crm_visitas_localizacoes WHERE visita_id = ANY(${lista})`,
    `DELETE FROM crm_visitas WHERE id = ANY(${lista})`,
  ]
}

export interface VinculoAcaoBackup {
  id: number
  origemVisitaId: number
  googleEventId: string | null
  updatedAt: string | null
}

export function sqlRestaurarVinculosAcoes(vinculos: VinculoAcaoBackup[]): string[] {
  return vinculos.map((vinculo) => {
    const updatedAt = vinculo.updatedAt ? formatarValorSql(vinculo.updatedAt) : "now()"
    return `UPDATE crm_acoes_prospeccao SET origem_visita_id = ${Number(
      vinculo.origemVisitaId
    )}, google_event_id = ${formatarValorSql(
      vinculo.googleEventId
    )}, updated_at = ${updatedAt} WHERE id = ${Number(vinculo.id)}`
  })
}

export function sqlResetarSequencia(tabela: string, coluna: string): string {
  validarIdentificador(tabela)
  validarIdentificador(coluna)
  return `SELECT setval(pg_get_serial_sequence('${tabela}', '${coluna}'), GREATEST((SELECT COALESCE(MAX(${coluna}), 0) FROM ${tabela}), 1), (SELECT count(*) > 0 FROM ${tabela}));`
}
