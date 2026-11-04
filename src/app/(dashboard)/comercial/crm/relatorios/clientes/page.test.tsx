// @vitest-environment jsdom
import { specRelatorioCrm } from "@/test/relatorio-page-spec"
import RelatorioClientesPage from "./page"

const payload = {
  periodo: { de: "2026-11-01", ate: "2026-11-04", rotulo: "Últimos 7 dias" },
  cards: {
    total: 2,
    comNegocio: 1,
    semNegocio: 1,
    pessoas: 1,
    oportunidades: 2,
    valorOportunidades: 8000,
    propostas: 1,
    valorPropostas: 5000,
    visitas: 3,
  },
  linhas: [
    {
      id: 7,
      nome: "TecMais Ltda",
      cnpj: "12.345.678/0001-99",
      segmento: "Tecelagem",
      local: "Blumenau/SC",
      criadoEm: "2026-10-01T10:00:00Z",
      pessoas: 1,
      oportunidades: 2,
      oportunidadesEmAberto: 1,
      valorOportunidades: 8000,
      propostas: 1,
      propostasAceitas: 1,
      valorPropostas: 5000,
      visitas: 3,
      visitasConcluidas: 2,
    },
  ],
  usuarios: [{ id: 1, nome: "Tiago" }],
}

specRelatorioCrm(
  {
    titulo: "Clientes",
    endpoint: "/api/crm/relatorios/clientes",
    payload,
    textos: [
      "Clientes com negócio",
      "Oportunidades",
      "Propostas",
      "Visitas",
      "TecMais Ltda",
      "Valor das oportunidades",
    ],
  },
  RelatorioClientesPage
)
