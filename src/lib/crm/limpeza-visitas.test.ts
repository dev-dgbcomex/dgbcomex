import { describe, expect, it } from "vitest"
import {
  COLUNAS_VISITAS,
  SQL_ACOES_VINCULADAS,
  SQL_CONTAGENS_LIMPEZA,
  SQL_EVENTOS_VISITA,
  SQL_TIMELINE_VISITA_BACKUP,
  formatarValorSql,
  sqlInserirRegistros,
  sqlLimparVisitas,
  sqlListaIds,
  sqlResetarSequencia,
  sqlRestaurarVinculosAcoes,
} from "./limpeza-visitas"

describe("limpeza de visitas", () => {
  it("inclui as colunas de lembrete que não estão no schema Drizzle", () => {
    expect(COLUNAS_VISITAS).toContain("lembrete_dia_anterior_enviado")
    expect(COLUNAS_VISITAS).toContain("lembrete_dia_visita_enviado")
    expect(COLUNAS_VISITAS).toContain("google_event_id")
  })

  it("gera INSERT idempotente com colunas explícitas", () => {
    const sql = sqlInserirRegistros("crm_visitas", ["id", "tipo"], [{ id: 7, tipo: "REMOTO" }])
    expect(sql).toContain("INSERT INTO crm_visitas (id, tipo) VALUES (7, E'REMOTO')")
    expect(sql).toContain("ON CONFLICT (id) DO NOTHING")
  })

  it("escapa textos, booleanos, nulos, datas e jsonb", () => {
    expect(formatarValorSql(null)).toBe("NULL")
    expect(formatarValorSql(true)).toBe("true")
    expect(formatarValorSql(12)).toBe("12")
    expect(formatarValorSql("O'Brien\\teste")).toBe("E'O''Brien\\\\teste'")
    expect(formatarValorSql(new Date("2026-01-02T03:04:05.000Z"))).toBe(
      "E'2026-01-02T03:04:05.000Z'"
    )
    expect(formatarValorSql({ visitaId: 3 })).toBe(`E'{"visitaId":3}'::jsonb`)
  })

  it("rejeita identificadores e ids inválidos", () => {
    expect(() => sqlInserirRegistros("crm_visitas; DROP", ["id"], [])).toThrow(/inválido/)
    expect(() => sqlListaIds([0])).toThrow(/ID inválido/)
  })

  it("limpa apenas dados de visita e vínculos das ações", () => {
    const comandos = sqlLimparVisitas([3, 8])
    expect(comandos.join("\n")).toContain(
      "UPDATE crm_acoes_prospeccao SET origem_visita_id = NULL, google_event_id = NULL"
    )
    expect(comandos.join("\n")).toContain("DELETE FROM crm_timeline_eventos WHERE tipo = 'VISITA'")
    expect(comandos.join("\n")).toContain("DELETE FROM crm_visitas WHERE id = ANY(ARRAY[3, 8])")
    expect(comandos.join("\n")).toContain("DELETE FROM crm_visitas_localizacoes")
    expect(comandos.join("\n")).toContain("DELETE FROM crm_pesquisas_satisfacao")
    expect(comandos.join("\n")).toContain("DELETE FROM crm_pesquisas_respostas")
    expect(comandos.join("\n")).not.toMatch(/DELETE FROM crm_acoes_prospeccao/)
    expect(comandos.join("\n")).not.toMatch(/DELETE FROM crm_viagens/)
  })

  it("ainda limpa vínculos quando não há visitas", () => {
    const comandos = sqlLimparVisitas([])
    expect(comandos).toHaveLength(2)
    expect(comandos.join("\n")).toContain("crm_acoes_prospeccao")
    expect(comandos.join("\n")).not.toContain("crm_visitas WHERE")
  })

  it("restaura vínculos, eventos e updated_at das ações", () => {
    const [sql] = sqlRestaurarVinculosAcoes([
      { id: 12, origemVisitaId: 34, googleEventId: "abc", updatedAt: "2026-01-02T03:04:05.000Z" },
    ])
    expect(sql).toContain("origem_visita_id = 34")
    expect(sql).toContain("google_event_id = E'abc'")
    expect(sql).toContain("updated_at = E'2026-01-02T03:04:05.000Z'")
    expect(sql).toContain("WHERE id = 12")
  })

  it("reseta sequências com o maior id presente", () => {
    expect(sqlResetarSequencia("crm_visitas", "id")).toContain(
      "setval(pg_get_serial_sequence('crm_visitas', 'id')"
    )
    expect(sqlResetarSequencia("crm_visitas", "id")).toContain(
      "GREATEST((SELECT COALESCE(MAX(id), 0)"
    )
  })

  it("expõe consultas de backup e contagens", () => {
    expect(SQL_TIMELINE_VISITA_BACKUP).toContain("tipo = 'VISITA'")
    expect(SQL_ACOES_VINCULADAS).toContain("origem_visita_id IS NOT NULL")
    expect(SQL_EVENTOS_VISITA).toContain("google_event_id IS NOT NULL")
    expect(SQL_CONTAGENS_LIMPEZA).toContain("AS timeline_visita")
    expect(SQL_CONTAGENS_LIMPEZA).toContain("AS acoes_com_origem")
  })
})
