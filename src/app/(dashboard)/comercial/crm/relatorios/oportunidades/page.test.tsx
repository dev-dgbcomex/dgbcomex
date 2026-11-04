// @vitest-environment jsdom
import { specRelatorioCrm } from "@/test/relatorio-page-spec"
import RelatorioOportunidadesPage from "./page"

const payload = {
  periodo: {
    de: "2026-10-28T00:00:00.000Z",
    ate: "2026-11-04T23:59:59.999Z",
    rotulo: "Últimos 7 dias",
  },
  cards: {
    total: 1,
    emAberto: 1,
    ganhas: 0,
    perdidas: 0,
    valorTotal: 15000,
    valorGanho: 0,
    taxaConversao: 0,
    mediaValor: 15000,
  },
  linhas: [
    {
      id: 10,
      dataHora: "2026-11-01T10:00:00.000Z",
      titulo: "Uniformes 2026",
      pessoa: "TecMais Ltda",
      cliente: "TecMais",
      responsavel: "Tiago",
      status: "Novo",
      valor: 15000,
      probabilidade: 40,
    },
  ],
  usuarios: [{ id: 1, nome: "Tiago" }],
}

specRelatorioCrm(
  {
    titulo: "Oportunidades",
    endpoint: "/api/crm/relatorios/oportunidades",
    payload,
    textos: ["Oportunidades no período", "Em aberto", "Ganhas", "Perdidas", "Uniformes 2026"],
  },
  RelatorioOportunidadesPage
)
