import { describe, expect, it } from "vitest"
import {
  SQL_CONTAGENS,
  SQL_INSERIR_LOCALIZACOES,
  SQL_INSERIR_PESQUISAS,
  SQL_INSERIR_RESPOSTAS,
  SQL_INSERIR_TIMELINE,
  SQL_TOKENS_CONFLITANTES,
  sqlInserirAcoes,
  sqlVisitasPendentes,
} from "./backfill-visitas-acoes"

const SQL_INSERIR_ACOES = sqlInserirAcoes(0)

describe("backfill visitas para ações de prospecção", () => {
  it("mapeia data_visita para data_acao e os dois lembretes", () => {
    expect(SQL_INSERIR_ACOES).toContain("v.data_visita")
    expect(SQL_INSERIR_ACOES).toContain("data_acao, hora, tipo, status")
    expect(SQL_INSERIR_ACOES).toContain("COALESCE(v.lembrete_dia_anterior_enviado, false)")
    expect(SQL_INSERIR_ACOES).toContain("COALESCE(v.lembrete_dia_visita_enviado, false)")
    expect(SQL_INSERIR_ACOES).toContain("COALESCE(v.tipo, 'PRESENCIAL')")
    expect(SQL_INSERIR_ACOES).toContain("COALESCE(v.status, 'AGENDADA')")
    expect(SQL_INSERIR_ACOES).toContain("lembrete_dia_acao_enviado")
  })

  it("copia todos os vínculos com pessoa, cliente, contato e demais entidades", () => {
    for (const coluna of [
      "empresa_id",
      "cliente_id",
      "oportunidade_id",
      "contato_id",
      "viagem_id",
      "representante_id",
      "proposta_id",
      "criado_por",
    ]) {
      expect(SQL_INSERIR_ACOES).toContain(`v.${coluna}`)
    }
  })

  it("preserva fotos, coordenadas, check-in/out, google event e auditoria", () => {
    expect(SQL_INSERIR_ACOES).toContain("COALESCE(v.fotos, '[]'::jsonb)")
    expect(SQL_INSERIR_ACOES).toContain("v.endereco_lat")
    expect(SQL_INSERIR_ACOES).toContain("v.check_in_time")
    expect(SQL_INSERIR_ACOES).toContain("v.check_out_lng")
    expect(SQL_INSERIR_ACOES).toContain("v.google_event_id")
    expect(SQL_INSERIR_ACOES).toContain("v.created_at")
    expect(SQL_INSERIR_ACOES).toContain("v.updated_at")
  })

  it("rastreia a origem e é idempotente", () => {
    expect(SQL_INSERIR_ACOES).toContain("origem_visita_id")
    expect(SQL_INSERIR_ACOES).toContain("a.origem_visita_id = v.id")
    expect(sqlVisitasPendentes(0)).not.toContain("LIMIT")
    expect(sqlVisitasPendentes(25)).toContain("LIMIT 25")
    expect(SQL_INSERIR_ACOES).not.toContain("LIMIT")
    expect(sqlInserirAcoes(25)).toContain("LIMIT 25")
  })

  it("não altera nem apaga registros de visita", () => {
    const todas = [
      SQL_INSERIR_ACOES,
      SQL_INSERIR_LOCALIZACOES,
      SQL_INSERIR_PESQUISAS,
      SQL_INSERIR_RESPOSTAS,
      SQL_INSERIR_TIMELINE,
    ].join("\n")
    expect(todas).not.toMatch(/\bDELETE\b/i)
    expect(todas).not.toMatch(/\bUPDATE\b/i)
  })

  it("copia localizações com o novo acao_id", () => {
    expect(SQL_INSERIR_LOCALIZACOES).toContain(
      "JOIN crm_acoes_prospeccao a ON a.origem_visita_id = l.visita_id"
    )
    expect(SQL_INSERIR_LOCALIZACOES).toContain("a.id, l.latitude, l.longitude")
  })

  it("copia pesquisas mantendo o token e detecta colisões", () => {
    expect(SQL_INSERIR_PESQUISAS).toContain("p.token")
    expect(SQL_TOKENS_CONFLITANTES).toContain("ap.token = p.token")
    expect(SQL_TOKENS_CONFLITANTES).toContain("ap.acao_id <> a.id")
  })

  it("copia respostas pelo token da pesquisa", () => {
    expect(SQL_INSERIR_RESPOSTAS).toContain("ap.token = p.token")
    expect(SQL_INSERIR_RESPOSTAS).toContain("r.pergunta, r.tipo, r.resposta")
  })

  it("converte eventos de timeline VISITA para ACAO_PROSPECCAO", () => {
    expect(SQL_INSERIR_TIMELINE).toContain("e.tipo = 'VISITA'")
    expect(SQL_INSERIR_TIMELINE).toContain("'ACAO_PROSPECCAO'")
    expect(SQL_INSERIR_TIMELINE).toContain("'acaoProspeccaoId', a.id")
    expect(SQL_INSERIR_TIMELINE).toContain("e.metadados - 'visitaId'")
    expect(SQL_INSERIR_TIMELINE).toContain("'dataAcao', e.metadados->'dataVisita'")
  })

  it("expõe contagens para conferência nos dois bancos", () => {
    for (const chave of [
      "visitas",
      "acoes",
      "localizacoes_visita",
      "localizacoes_acao",
      "pesquisas_visita",
      "pesquisas_acao",
      "respostas_visita",
      "respostas_acao",
      "timeline_visita",
      "timeline_acao",
    ]) {
      expect(SQL_CONTAGENS).toContain(`AS ${chave}`)
    }
  })
})
