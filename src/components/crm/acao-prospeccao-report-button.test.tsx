// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { createFetchMock, renderPage, toastMock } from "@/test/harness"
import type { AcaoProspeccaoDetalhe } from "@/app/(dashboard)/comercial/crm/acoes-prospeccao/types"
import AcaoProspeccaoReportButton from "./acao-prospeccao-report-button"

const pdfMocks = vi.hoisted(() => ({
  save: vi.fn(),
  autoTable: Object.assign(vi.fn(), { previous: { finalY: 100 } }),
}))

vi.mock("jspdf", () => ({
  default: class {
    internal = {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    }

    setFillColor() {
      return this
    }
    setDrawColor() {
      return this
    }
    setTextColor() {
      return this
    }
    setFontSize() {
      return this
    }
    setFont() {
      return this
    }
    rect() {
      return this
    }
    roundedRect() {
      return this
    }
    text() {
      return this
    }
    splitTextToSize(texto: string) {
      return [texto]
    }
    getTextWidth() {
      return 20
    }
    link() {
      return this
    }
    addPage() {
      return this
    }
    getNumberOfPages() {
      return 1
    }
    setPage() {
      return this
    }
    save = pdfMocks.save
  },
}))

vi.mock("jspdf-autotable", () => ({ default: pdfMocks.autoTable }))

const acao: AcaoProspeccaoDetalhe = {
  id: 9,
  criadoPor: 1,
  criadoPorNome: "Maria",
  nomeAvulso: null,
  empresaId: 3,
  empresaNome: "Tecelagem Alfa",
  clienteId: null,
  clienteNome: null,
  oportunidadeId: null,
  oportunidadeTitulo: "Pedido 45",
  contatoId: null,
  contatoNome: "Carlos",
  contatoEmail: "carlos@example.com",
  viagemId: null,
  viagemTitulo: null,
  representanteId: null,
  representanteNome: null,
  propostaId: null,
  propostaTitulo: null,
  dataAcao: "2026-11-20",
  hora: "10:00",
  tipo: "PRESENCIAL",
  status: "REALIZADA",
  motivoCancelamento: null,
  duracaoEstimada: 60,
  endereco: "Rua A, 10",
  numero: "10",
  complemento: null,
  bairro: "Centro",
  cidade: "São Paulo",
  uf: "SP",
  cep: null,
  relato: "<p>Prospecção concluída</p>",
  fotos: ["https://example.com/foto.jpg"],
  googleEventId: null,
  checkInTime: null,
  checkOutTime: null,
  checkInLat: null,
  checkInLng: null,
  checkOutLat: null,
  checkOutLng: null,
}

describe("AcaoProspeccaoReportButton", () => {
  beforeEach(() => {
    pdfMocks.save.mockClear()
    pdfMocks.autoTable.mockClear()
    toastMock.success.mockClear()
    toastMock.error.mockClear()
  })

  it("gera o PDF da ação de prospecção", async () => {
    const fetchMock = createFetchMock(({ method, url }) => {
      if (method === "GET" && url === "/api/admin/config/empresa") {
        return { status: 200, json: [{ nome: "DGBCOMEX", isDefault: true }] }
      }
      if (method === "GET" && url === "/api/crm/acoes-prospeccao/9/localizacoes") {
        return { status: 200, json: [] }
      }
      return { status: 404, json: { error: `Rota não mockada: ${method} ${url}` } }
    })
    vi.stubGlobal("fetch", fetchMock.fn)

    renderPage(<AcaoProspeccaoReportButton acao={acao} />)
    fireEvent.click(screen.getByRole("button", { name: "Gerar Relatório" }))

    await waitFor(() => {
      expect(pdfMocks.save).toHaveBeenCalledWith("relatorio-acao-prospeccao-9.pdf")
      expect(toastMock.success).toHaveBeenCalledWith("Relatório gerado com sucesso")
    })
  })
})
