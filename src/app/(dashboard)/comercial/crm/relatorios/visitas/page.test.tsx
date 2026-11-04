// @vitest-environment jsdom
import { specRelatorioCrm } from "@/test/relatorio-page-spec"
import RelatorioVisitasPage from "./page"

const payload = {
  periodo: {
    de: "2026-10-28T00:00:00.000Z",
    ate: "2026-11-04T23:59:59.999Z",
    rotulo: "Últimos 7 dias",
  },
  cards: {
    total: 1,
    presencial: 1,
    video: 0,
    telefone: 0,
    concluidas: 1,
    taxaComparecimento: 100,
  },
  linhas: [
    {
      id: 30,
      dataHora: "2026-11-04 09:00",
      dataHoraIso: "2026-11-01T12:00:00.000Z",
      tipo: "PRESENCIAL",
      status: "CONCLUIDA",
      pessoa: "TecMais Ltda",
      cliente: "TecMais",
      responsavel: "Tiago",
      local: "Campinas/SP",
    },
  ],
  usuarios: [{ id: 1, nome: "Tiago" }],
}

specRelatorioCrm(
  {
    titulo: "Visitas",
    endpoint: "/api/crm/relatorios/visitas",
    payload,
    textos: ["Visitas no período", "Presenciais", "Por vídeo", "Por telefone", "Concluídas"],
  },
  RelatorioVisitasPage
)
