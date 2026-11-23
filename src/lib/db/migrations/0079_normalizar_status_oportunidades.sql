WITH normalizados AS (
  SELECT id,
    CASE
      WHEN upper(status) = 'NOVO' THEN 'NOVO'
      WHEN upper(status) = 'QUALIFICACAO' THEN 'QUALIFICACAO'
      WHEN upper(status) = 'PROPOSTA' THEN 'PROPOSTA'
      WHEN upper(status) = 'NEGOCIACAO' THEN 'NEGOCIACAO'
      WHEN upper(status) = 'FECHADO_GANHO' THEN 'FECHADO_GANHO'
      WHEN upper(status) = 'FECHADO_PERDIDO' THEN 'FECHADO_PERDIDO'
      WHEN upper(status) = 'GANHO' THEN 'FECHADO_GANHO'
      ELSE status
    END AS status_normalizado
  FROM crm_oportunidades
  WHERE upper(status) IN (
    'NOVO','QUALIFICACAO','PROPOSTA','NEGOCIACAO','FECHADO_GANHO','FECHADO_PERDIDO','GANHO'
  )
)
UPDATE crm_oportunidades o
SET status = n.status_normalizado
FROM normalizados n
WHERE o.id = n.id
  AND o.status <> n.status_normalizado;
