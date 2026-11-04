// @vitest-environment jsdom
import { specRelatorioCrm } from "@/test/relatorio-page-spec"
import RelatorioPropostasPage from "./page"

const payload = {
  periodo: {
    de: "2026-10-28T00:00:00.000Z",
    ate: "2026-11-04T23:59:59.999Z",
    rotulo: "Últimos 7 dias",
  },
  cards: {
    total: 1,
    aceitas: 1,
    recusadas: 0,
    pendentes: 0,
    valorTotal: 15000,
    valorAceito: 15000,
    taxaAceitacao: 100,
  },
  linhas: [
    {
      id: 20,
      dataHora: "2026-11-02T15:00:00.000Z",
      titulo: "Proposta Uniformes 2026",
      pessoa: "TecMais Ltda",
      cliente: "TecMais",
      responsavel: "Tiago",
      status: "ACEITA",
      valor: 15000,
      dataResposta: "2026-11-03T10:00:00.000Z",
    },
  ],
  usuarios: [{ id: 1, nome: "Tiago" }],
}

specRelatorioCrm(
  {
    titulo: "Propostas",
    endpoint: "/api/crm/relatorios/propostas",
    payload,
    textos: [
      "Propostas no período",
      "Aceitas",
      "Recusadas",
      "Taxa de aceitação",
      "Proposta Uniformes 2026",
    ],
  },
  RelatorioPropostasPage
)
