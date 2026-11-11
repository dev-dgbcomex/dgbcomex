// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createQueryBuilder } from "@/test/route-db-mock"

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn(), insert: vi.fn() },
}))

vi.mock("@/lib/notificar", () => ({
  notificar: vi.fn(),
  notificarUsuario: vi.fn(),
}))

import { db } from "@/lib/db"
import { notificar } from "@/lib/notificar"
import { notificarEquipeChamado, rolesDaFila } from "./notificar"

function prepararSelects(resultados: unknown[]) {
  const fila = [...resultados]
  vi.mocked(db.select).mockImplementation(() => createQueryBuilder(fila.shift() ?? []))
}

describe("rolesDaFila", () => {
  beforeEach(() => {
    vi.mocked(db.select).mockReset()
  })

  it("liga a fila ao perfil de mesmo nome", async () => {
    prepararSelects([
      [{ nome: "COMERCIAL" }],
      [{ role: "COMERCIAL" }, { role: "ADMIN" }, { role: "TECELAGEM" }],
    ])

    expect(await rolesDaFila(1)).toEqual(["COMERCIAL"])
  })

  it("ignora acento e pontuação do nome da fila", async () => {
    prepararSelects([[{ nome: "T.I." }], [{ role: "TI" }, { role: "ADMIN" }]])

    expect(await rolesDaFila(2)).toEqual(["TI"])
  })

  it("devolve vazio quando a fila não existe", async () => {
    prepararSelects([[]])

    expect(await rolesDaFila(99)).toEqual([])
  })
})

describe("notificarEquipeChamado", () => {
  beforeEach(() => {
    vi.mocked(db.select).mockReset()
    vi.mocked(notificar).mockReset()
  })

  it("notifica a equipe da fila e os administradores (perfis globais)", async () => {
    prepararSelects([[{ nome: "COMERCIAL" }], [{ role: "COMERCIAL" }]])

    await notificarEquipeChamado({
      tipo: "CHAMADO",
      mensagem: "Chamado #1 cadastrado",
      link: "/chamados/1",
      areaId: 1,
      usuarioNome: "Tiago",
      excluirUsuarioIds: [10],
    })

    expect(notificar).toHaveBeenCalledWith(
      "CHAMADO",
      "Chamado #1 cadastrado",
      "/chamados/1",
      "Tiago",
      ["COMERCIAL"],
      { excluirUsuarioIds: [10] }
    )
  })

  it("quando a fila não tem perfil, avisa só os administradores", async () => {
    prepararSelects([[{ nome: "Manutenção" }], [{ role: "COMERCIAL" }]])

    await notificarEquipeChamado({
      tipo: "CHAMADO",
      mensagem: "Chamado #2 cadastrado",
      link: "/chamados/2",
      areaId: 3,
    })

    expect(notificar).toHaveBeenCalledWith(
      "CHAMADO",
      "Chamado #2 cadastrado",
      "/chamados/2",
      undefined,
      [],
      { excluirUsuarioIds: undefined }
    )
  })
})
