import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { GET, PUT } from "./route"

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), execute: vi.fn() },
}))

const naoAutorizado = NextResponse.json({ error: "Não autorizado" }, { status: 401 })
const sessao = { session: { user: { id: "16", role: "CRM" } }, userId: 16 }

function put(body: unknown) {
  return PUT(
    new NextRequest("http://localhost/api/integracao/ordem", {
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })
  )
}

describe("/api/integracao/ordem", () => {
  beforeEach(() => {
    resetDb(db)
    vi.mocked(requireAuth).mockReset()
  })

  describe("GET", () => {
    it("retorna 401 quando não autenticado", async () => {
      vi.mocked(requireAuth).mockResolvedValue(naoAutorizado as any)
      const res = await GET()
      expect(res.status).toBe(401)
    })

    it("retorna a ordem salva sanitizada (sem duplicados, strings ou valores inválidos)", async () => {
      vi.mocked(requireAuth).mockResolvedValue(sessao as any)
      db.select = vi.fn(() =>
        createQueryBuilder([{ biOrdemCards: [3, 1, "2", 0, -5, 3, 1.5, 4] }])
      )
      const res = await GET()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ids: [3, 1, 4] })
    })

    it("retorna lista vazia quando o usuário ainda não salvou ordem", async () => {
      vi.mocked(requireAuth).mockResolvedValue(sessao as any)
      db.select = vi.fn(() => createQueryBuilder([{ biOrdemCards: null }]))
      const res = await GET()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ids: [] })
    })
  })

  describe("PUT", () => {
    it("retorna 401 quando não autenticado", async () => {
      vi.mocked(requireAuth).mockResolvedValue(naoAutorizado as any)
      const res = await put({ ids: [1] })
      expect(res.status).toBe(401)
    })

    it("retorna 400 quando a lista de ids é vazia", async () => {
      vi.mocked(requireAuth).mockResolvedValue(sessao as any)
      const res = await put({ ids: [] })
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: "Lista de ids inválida" })
    })

    it("retorna 400 quando o corpo não é JSON válido", async () => {
      vi.mocked(requireAuth).mockResolvedValue(sessao as any)
      const res = await put("nao-e-json")
      expect(res.status).toBe(400)
    })

    it("sanitiza e salva a ordem no usuário autenticado", async () => {
      vi.mocked(requireAuth).mockResolvedValue(sessao as any)
      const upd = createQueryBuilder(undefined)
      db.update = vi.fn(() => upd)

      const res = await put({ ids: [2, 2, 7, 0, "x", -3] })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ success: true, ids: [2, 7] })

      expect(db.update).toHaveBeenCalledTimes(1)
      expect(upd.set).toHaveBeenCalledWith({ biOrdemCards: [2, 7] })
      expect(upd.where).toHaveBeenCalled()
    })
  })
})
