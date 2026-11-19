export function sqlVisitasPendentes(limite: number): string {
  const limiteSql = limite > 0 ? ` LIMIT ${Math.trunc(limite)}` : ""
  return `SELECT v.id, v.data_visita FROM crm_visitas v WHERE NOT EXISTS (SELECT 1 FROM crm_acoes_prospeccao a WHERE a.origem_visita_id = v.id) ORDER BY v.id${limiteSql}`
}

export function sqlInserirAcoes(limite: number): string {
  const limiteSql = limite > 0 ? ` LIMIT ${Math.trunc(limite)}` : ""
  return `
INSERT INTO crm_acoes_prospeccao (
  empresa_id, cliente_id, oportunidade_id, contato_id, viagem_id,
  representante_id, representante_nome, proposta_id,
  data_acao, hora, tipo, status,
  endereco, numero, complemento, bairro, cidade, uf, cep,
  endereco_lat, endereco_lng, motivo_cancelamento, nome_avulso, relato, fotos,
  check_in_time, check_out_time, check_in_lat, check_in_lng, check_out_lat, check_out_lng,
  criado_por, duracao_estimada, google_event_id,
  lembrete_dia_anterior_enviado, lembrete_dia_acao_enviado,
  created_at, updated_at, origem_visita_id
)
SELECT
  v.empresa_id, v.cliente_id, v.oportunidade_id, v.contato_id, v.viagem_id,
  v.representante_id, v.representante_nome, v.proposta_id,
  v.data_visita, v.hora, COALESCE(v.tipo, 'PRESENCIAL'), COALESCE(v.status, 'AGENDADA'),
  v.endereco, v.numero, v.complemento, v.bairro, v.cidade, v.uf, v.cep,
  v.endereco_lat, v.endereco_lng, v.motivo_cancelamento, v.nome_avulso, v.relato,
  COALESCE(v.fotos, '[]'::jsonb),
  v.check_in_time, v.check_out_time, v.check_in_lat, v.check_in_lng, v.check_out_lat, v.check_out_lng,
  v.criado_por, v.duracao_estimada, v.google_event_id,
  COALESCE(v.lembrete_dia_anterior_enviado, false),
  COALESCE(v.lembrete_dia_visita_enviado, false),
  v.created_at, v.updated_at, v.id
FROM crm_visitas v
WHERE NOT EXISTS (SELECT 1 FROM crm_acoes_prospeccao a WHERE a.origem_visita_id = v.id)${limiteSql}`
}

export const SQL_INSERIR_LOCALIZACOES = `
INSERT INTO crm_acoes_prospeccao_localizacoes (
  acao_id, latitude, longitude, endereco, observacao, foto_url, tipo, criado_por, created_at
)
SELECT a.id, l.latitude, l.longitude, l.endereco, l.observacao, l.foto_url, l.tipo, l.criado_por, l.created_at
FROM crm_visitas_localizacoes l
JOIN crm_acoes_prospeccao a ON a.origem_visita_id = l.visita_id
WHERE NOT EXISTS (
  SELECT 1 FROM crm_acoes_prospeccao_localizacoes al
  WHERE al.acao_id = a.id
    AND al.latitude = l.latitude
    AND al.longitude = l.longitude
    AND COALESCE(al.endereco, '') = COALESCE(l.endereco, '')
    AND COALESCE(al.foto_url, '') = COALESCE(l.foto_url, '')
    AND COALESCE(al.created_at::text, '') = COALESCE(l.created_at::text, '')
)
`

export const SQL_TOKENS_CONFLITANTES = `
SELECT p.token
FROM crm_pesquisas_satisfacao p
JOIN crm_acoes_prospeccao a ON a.origem_visita_id = p.visita_id
JOIN crm_acoes_prospeccao_pesquisas ap ON ap.token = p.token
WHERE ap.acao_id <> a.id
`

export const SQL_INSERIR_PESQUISAS = `
INSERT INTO crm_acoes_prospeccao_pesquisas (
  acao_id, email, nome, token, enviado_em, aberto_em, respondido_em, status, criado_por, created_at
)
SELECT a.id, p.email, p.nome, p.token, p.enviado_em, p.aberto_em, p.respondido_em, p.status, p.criado_por, p.created_at
FROM crm_pesquisas_satisfacao p
JOIN crm_acoes_prospeccao a ON a.origem_visita_id = p.visita_id
WHERE NOT EXISTS (
  SELECT 1 FROM crm_acoes_prospeccao_pesquisas ap WHERE ap.token = p.token
)
`

export const SQL_INSERIR_RESPOSTAS = `
INSERT INTO crm_acoes_prospeccao_pesquisas_respostas (pesquisa_id, pergunta, tipo, resposta, created_at)
SELECT ap.id, r.pergunta, r.tipo, r.resposta, r.created_at
FROM crm_pesquisas_respostas r
JOIN crm_pesquisas_satisfacao p ON p.id = r.pesquisa_id
JOIN crm_acoes_prospeccao a ON a.origem_visita_id = p.visita_id
JOIN crm_acoes_prospeccao_pesquisas ap ON ap.token = p.token
WHERE NOT EXISTS (
  SELECT 1 FROM crm_acoes_prospeccao_pesquisas_respostas ar
  WHERE ar.pesquisa_id = ap.id
    AND ar.pergunta = r.pergunta
    AND COALESCE(ar.resposta, '') = COALESCE(r.resposta, '')
    AND COALESCE(ar.created_at::text, '') = COALESCE(r.created_at::text, '')
)
`

export const SQL_INSERIR_TIMELINE = `
INSERT INTO crm_timeline_eventos (empresa_id, cliente_id, tipo, descricao, metadados, data_evento, created_at)
SELECT
  e.empresa_id,
  e.cliente_id,
  'ACAO_PROSPECCAO',
  e.descricao,
  (e.metadados - 'visitaId' - 'dataVisita')
    || jsonb_build_object('acaoProspeccaoId', a.id)
    || jsonb_build_object('dataAcao', e.metadados->'dataVisita'),
  e.data_evento,
  e.created_at
FROM crm_timeline_eventos e
JOIN crm_acoes_prospeccao a ON a.origem_visita_id::text = e.metadados->>'visitaId'
WHERE e.tipo = 'VISITA'
  AND e.metadados ? 'visitaId'
  AND NOT EXISTS (
    SELECT 1 FROM crm_timeline_eventos e2
    WHERE e2.tipo = 'ACAO_PROSPECCAO'
      AND e2.metadados->>'acaoProspeccaoId' = a.id::text
      AND e2.descricao = e.descricao
      AND COALESCE(e2.created_at::text, '') = COALESCE(e.created_at::text, '')
  )
`

export const SQL_CONTAGENS = `
SELECT
  (SELECT count(*) FROM crm_visitas) AS visitas,
  (SELECT count(*) FROM crm_acoes_prospeccao WHERE origem_visita_id IS NOT NULL) AS acoes,
  (SELECT count(*) FROM crm_visitas_localizacoes) AS localizacoes_visita,
  (SELECT count(*) FROM crm_acoes_prospeccao_localizacoes) AS localizacoes_acao,
  (SELECT count(*) FROM crm_pesquisas_satisfacao) AS pesquisas_visita,
  (SELECT count(*) FROM crm_acoes_prospeccao_pesquisas) AS pesquisas_acao,
  (SELECT count(*) FROM crm_pesquisas_respostas) AS respostas_visita,
  (SELECT count(*) FROM crm_acoes_prospeccao_pesquisas_respostas) AS respostas_acao,
  (SELECT count(*) FROM crm_timeline_eventos WHERE tipo = 'VISITA') AS timeline_visita,
  (SELECT count(*) FROM crm_timeline_eventos WHERE tipo = 'ACAO_PROSPECCAO') AS timeline_acao
`
