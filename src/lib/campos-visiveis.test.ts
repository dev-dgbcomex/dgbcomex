// @vitest-environment node
import { describe, expect, it, vi } from "vitest"
import {
  CAMPO_PROPOSTA_VINCOLADA,
  CADASTRO_VISITA_DETALHE,
} from "./campos-visiveis/catalogo"

vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }))

const {
  campoEstaVisivel,
  camposVisiveisPara,
  normalizarRolesOcultos,
} = await import("./campos-visiveis")

describe("campos-visiveis", () => {
  it("normaliza papéis ocultos removendo inválidos, administrativos e duplicados", () => {
    expect(
      normalizarRolesOcultos([
        "COMERCIAL",
        "COMERCIAL",
        "ADMIN",
        "SUDO",
        "INVALIDO",
        42,
        null,
      ])
    ).toEqual(["COMERCIAL"])
  })

  it("mantém ADMIN e SUDO sempre visíveis", () => {
    expect(campoEstaVisivel("ADMIN", ["COMERCIAL", "ADMIN"])).toBe(true)
    expect(campoEstaVisivel("SUDO", ["COMERCIAL", "SUDO"])).toBe(true)
  })

  it("oculta o campo apenas para os papéis configurados", () => {
    expect(campoEstaVisivel("COMERCIAL", ["COMERCIAL"])).toBe(false)
    expect(campoEstaVisivel("CRM", ["COMERCIAL"])).toBe(true)
    expect(campoEstaVisivel("COMERCIAL", [])).toBe(true)
  })

  it("considera campo visível quando não há regra cadastrada", () => {
    expect(camposVisiveisPara(CADASTRO_VISITA_DETALHE, "COMERCIAL", {})).toEqual({
      [CAMPO_PROPOSTA_VINCOLADA]: true,
    })
  })

  it("aplica a regra do campo no retorno por cadastro", () => {
    expect(
      camposVisiveisPara(CADASTRO_VISITA_DETALHE, "COMERCIAL", {
        [`${CADASTRO_VISITA_DETALHE}:${CAMPO_PROPOSTA_VINCOLADA}`]: ["COMERCIAL"],
      })
    ).toEqual({ [CAMPO_PROPOSTA_VINCOLADA]: false })
  })
})
