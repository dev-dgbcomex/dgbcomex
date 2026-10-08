import { describe, it, expect } from "vitest"
import { metadata } from "./layout"

describe("metadata da raiz", () => {
  it("usa DGBCOMEX como título da aba", () => {
    expect(metadata.title).toBe("DGBCOMEX")
    expect(metadata.title).not.toContain("PDM")
  })
})
