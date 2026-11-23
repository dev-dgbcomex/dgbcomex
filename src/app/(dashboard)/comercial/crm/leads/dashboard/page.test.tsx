// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }))

vi.mock("next/navigation", () => ({ redirect }))

import LeadsDashboardRedirect from "./page"

describe("LeadsDashboardRedirect", () => {
  it("redireciona para a nova rota de saúde da prospecção", () => {
    LeadsDashboardRedirect()
    expect(redirect).toHaveBeenCalledWith("/comercial/crm/saude-prospeccao")
  })
})
