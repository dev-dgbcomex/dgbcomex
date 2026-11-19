// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { GET } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }))
vi.mock("@/lib/crm/geocode", () => ({ geocodificarCamposEndereco: vi.fn() }))

import { geocodificarCamposEndereco } from "@/lib/crm/geocode"

const sessionAdmin = { session: { user: { id: "1", role: "ADMIN", name: "Tiago" } }, userId: 1 }
const viagem = { id: 7, titulo: "Viagem Goiania - Ernandes", descricao: null, destinoCidade: "Goi�nia", destinoUf: "GO", dataInicio: "2026-08-10", dataFim: "2026-08-12", status: "REALIZADA" }

function acaoRow(id: number, extra: Record<string, unknown>) {
  return {
    id, empresaId: id, empresaNome: null, clienteId: null, clienteNome: "Cliente Teste", nomeAvulso: null,
    dataAcao: "2026-08-10", hora: "09:00", tipo: "PRESENCIAL", status: "REALIZADA",
    endereco: "Av. X", numero: "100", complemento: null, bairro: "Centro", cidade: "Goi�nia", uf: "GO", cep: null,
    enderecoLat: null, enderecoLng: null, clienteEndereco: null, clienteCidade: null, clienteUf: null,
    empresaEndereco: null, empresaNumero: null, empresaComplemento: null, empresaBairro: null, empresaCidade: null, empresaUf: null, empresaCep: null,
    checkInTime: new Date("2026-08-10T12:00:00Z"), checkOutTime: new Date("2026-08-10T13:00:00Z"),
    checkInLat: null, checkInLng: null, checkOutLat: null, checkOutLng: null, ...extra,
  }
}

describe("GET /api/crm/acoes-prospeccao/dashboard/viagem", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockReset()
    resetDb(db)
    vi.mocked(requireAuth).mockResolvedValue(sessionAdmin as any)
    vi.mocked(geocodificarCamposEndereco).mockReset()
    vi.mocked(geocodificarCamposEndereco).mockResolvedValue(null)
  })

  it("retorna 401 sem autentica��o", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      new NextResponse(JSON.stringify({ error: "N�o autorizado" }), { status: 401 }) as any
    )
    const res = await GET(new NextRequest("http://localhost/api/crm/acoes-prospeccao/dashboard/viagem?viagemId=7"))
    expect(res.status).toBe(401)
  })

  it("retorna 400 sem viagemId", async () => {
    const res = await GET(new NextRequest("http://localhost/api/crm/acoes-prospeccao/dashboard/viagem"))
    expect(res.status).toBe(400)
  })

  it("retorna 404 quando a viagem n�o existe", async () => {
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce(createQueryBuilder([]))
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce(createQueryBuilder([]))
    const res = await GET(new NextRequest("http://localhost/api/crm/acoes-prospeccao/dashboard/viagem?viagemId=99"))
    expect(res.status).toBe(404)
  })

  it("monta o cronograma com trajeto e kilometragem total", async () => {
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce(createQueryBuilder([viagem]))
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce(createQueryBuilder([
      acaoRow(11, { hora: "09:00", checkInLat: -23.55, checkInLng: -46.63, checkOutLat: -23.56, checkOutLng: -46.64 }),
      acaoRow(12, { hora: "11:00", checkInLat: -22.9, checkInLng: -43.17, checkOutLat: -22.91, checkOutLng: -43.18 }),
      acaoRow(13, { hora: "15:00", status: "CANCELADA" }),
    ]))
    const res = await GET(new NextRequest("http://localhost/api/crm/acoes-prospeccao/dashboard/viagem?viagemId=7"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.viagem.titulo).toBe("Viagem Goiania - Ernandes")
    expect(body.acoes).toHaveLength(3)
    expect(body.acoes[0]).toMatchObject({ id: 11, nome: "Cliente Teste", km: 0, dataAcao: "2026-08-10" })
    expect(body.acoes[1].km).toBeGreaterThan(340)
    expect(body.acoes[2]).toMatchObject({ id: 13, status: "CANCELADA", latitude: null, km: null })
    expect(body.resumo).toMatchObject({ total: 3, realizadas: 2, canceladas: 1, comLocalizacao: 2, kmSemLocalizacao: 1 })
  })
})
