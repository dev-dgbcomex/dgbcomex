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
    new NextRequest("http://localhost/api/integracao/ordem-graficos", {
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })
  )
}

describe("/api/integracao/ordem-graficos", () => {
  beforeEach(() => {
    resetDb(db)
    vi.mocked(requireAuth).mockReset()
  })

  describe("GET", () => {
    it("retorna 401 quando não autenticado", async () => {
      vi.mocked(requireAuth).mockResolvedValue(naoAutorizado as never)
      const res = await GET()
      expect(res.status).toBe(401)
    })

    it("retorna a ordem salva sanitizada (sem ids desconhecidos ou duplicados)", async () => {
      vi.mocked(requireAuth).mockResolvedValue(sessao as never)
      db.select = vi.fn(() =>
        createQueryBuilder([
          { biOrdemGraficos: ["produtos", "mes", "grafico-removido", "mes", 42, null] },
        ])
      )
      const res = await GET()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ids: ["produtos", "mes"] })
    })

    it("retorna lista vazia quando o usuário ainda não salvou ordem", async () => {
      vi.mocked(requireAuth).mockResolvedValue(sessao as never)
      db.select = vi.fn(() => createQueryBuilder([{ biOrdemGraficos: null }]))
      const res = await GET()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ids: [] })
    })
  })

  describe("PUT", () => {
    it("retorna 401 quando não autenticado", async () => {
      vi.mocked(requireAuth).mockResolvedValue(naoAutorizado as never)
      const res = await put({ ids: ["mes"] })
      expect(res.status).toBe(401)
    })

    it("retorna 400 quando a lista fica vazia depois de sanitizar", async () => {
      vi.mocked(requireAuth).mockResolvedValue(sessao as never)
      const res = await put({ ids: ["desconhecido", 7] })
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: "Lista de ids inválida" })
    })

    it("retorna 400 quando o corpo não é JSON válido", async () => {
      vi.mocked(requireAuth).mockResolvedValue(sessao as never)
      const res = await put("nao-e-json")
      expect(res.status).toBe(400)
    })

    it("salva a ordem no usuário autenticado", async () => {
      vi.mocked(requireAuth).mockResolvedValue(sessao as never)
      const upd = createQueryBuilder(undefined)
      db.update = vi.fn(() => upd)

      const res = await put({ ids: ["participacao", "mes", "participacao", "nao-existe"] })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ success: true, ids: ["participacao", "mes"] })

      expect(db.update).toHaveBeenCalledTimes(1)
      expect(upd.set).toHaveBeenCalledWith({ biOrdemGraficos: ["participacao", "mes"] })
      expect(upd.where).toHaveBeenCalled()
    })
  })
})