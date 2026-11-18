// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { createQueryBuilder, resetDb } from "@/test/route-db-mock"
import { GET, PUT } from "./route"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
vi.mock("@/lib/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}))

const sessionAdmin = { user: { role: "ADMIN" } }
const sessionComercial = { user: { role: "COMERCIAL" } }

function put(body: unknown) {
  return PUT(
    new NextRequest("http://localhost/api/admin/campos-visiveis", {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })
  )
}

describe("/api/admin/campos-visiveis", () => {
  beforeEach(() => {
    resetDb(db)
    vi.mocked(getServerSession).mockReset()
    vi.mocked(getServerSession).mockResolvedValue(sessionAdmin as any)
    db.select = vi.fn(() => createQueryBuilder([]))
    db.insert = vi.fn(() => createQueryBuilder(undefined))
    db.update = vi.fn(() => createQueryBuilder(undefined))
  })

  it("nega acesso a perfil não administrativo", async () => {
    vi.mocked(getServerSession).mockResolvedValue(sessionComercial as any)

    const get = await GET()
    const putResponse = await put({
      cadastro: "CRM_VISITA_DETALHE",
      campo: "proposta_vinculada",
      rolesOcultos: ["COMERCIAL"],
    })

    expect(get.status).toBe(401)
    expect(putResponse.status).toBe(401)
  })

  it("retorna catálogo e regras com papéis administrativos removidos", async () => {
    db.select = vi.fn(() =>
      createQueryBuilder([
        {
          cadastro: "CRM_VISITA_DETALHE",
          campo: "proposta_vinculada",
          rolesOcultos: ["COMERCIAL", "ADMIN"],
        },
      ])
    )

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.catalogo).toHaveLength(1)
    expect(data.regras["CRM_VISITA_DETALHE:proposta_vinculada"]).toEqual(["COMERCIAL"])
  })

  it("rejeita cadastro ou campo fora do catálogo", async () => {
    const response = await put({
      cadastro: "CADASTRO_INVALIDO",
      campo: "proposta_vinculada",
      rolesOcultos: ["COMERCIAL"],
    })

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe("Cadastro ou campo inválido")
  })

  it("rejeita ADMIN e SUDO como perfis ocultos", async () => {
    const response = await put({
      cadastro: "CRM_VISITA_DETALHE",
      campo: "proposta_vinculada",
      rolesOcultos: ["COMERCIAL", "ADMIN"],
    })

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe("Perfil inválido para ocultação")
  })

  it("cria uma regra nova quando não existe registro", async () => {
    const response = await put({
      cadastro: "CRM_VISITA_DETALHE",
      campo: "proposta_vinculada",
      rolesOcultos: ["COMERCIAL"],
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      success: true,
      regra: {
        cadastro: "CRM_VISITA_DETALHE",
        campo: "proposta_vinculada",
        rolesOcultos: ["COMERCIAL"],
      },
    })
    expect(db.insert).toHaveBeenCalledTimes(1)
    expect(db.update).not.toHaveBeenCalled()
  })

  it("atualiza uma regra existente", async () => {
    db.select = vi.fn(() => createQueryBuilder([{ id: 7 }]))

    const response = await put({
      cadastro: "CRM_VISITA_DETALHE",
      campo: "proposta_vinculada",
      rolesOcultos: ["COMERCIAL", "CRM"],
    })

    expect(response.status).toBe(200)
    expect(db.update).toHaveBeenCalledTimes(1)
    expect(db.insert).not.toHaveBeenCalled()
  })
})
