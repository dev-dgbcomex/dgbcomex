// @vitest-environment jsdom
import { specRelatorioCrm } from "@/test/relatorio-page-spec"
import RelatorioConversoesPage from "./page"

const payload = {
  periodo: { de: "2026-11-01", ate: "2026-11-04", rotulo: "Últimos 7 dias" },
  cards: {
    total: 1,
    oportunidades: 2,
    propostas: 1,
    visitas: 3,
    valorPropostas: 5000,
    valorOportunidades: 8000,
    mediaValorPropostas: 5000,
  },
  linhas: [
    {
      id: 7,
      dataHora: "2026-11-02T10:00:00Z",
      pessoa: "TecMais Ltda",
      cliente: "TecMais Ltda",
      porUsuario: "Tiago",
      oportunidades: 2,
      propostas: 1,
      visitas: 3,
      valorPropostas: 5000,
      origem: "promocao",
    },
  ],
  usuarios: [{ id: 1, nome: "Tiago" }],
}

specRelatorioCrm(
  {
    titulo: "Conversões",
    endpoint: "/api/crm/relatorios/conversoes",
    payload,
    textos: [
      "Conversões no período",
      "Oportunidades",
      "Propostas",
      "Visitas",
      "TecMais Ltda",
      "Tiago",
    ],
  },
  RelatorioConversoesPage
)
