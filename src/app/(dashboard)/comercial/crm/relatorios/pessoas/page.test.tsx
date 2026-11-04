// @vitest-environment jsdom
import { specRelatorioCrm } from "@/test/relatorio-page-spec"
import RelatorioPessoasPage from "./page"

const payload = {
  periodo: {
    de: "2026-10-28T00:00:00.000Z",
    ate: "2026-11-04T23:59:59.999Z",
    rotulo: "Últimos 7 dias",
  },
  cards: {
    total: 2,
    pessoasFisicas: 1,
    pessoasJuridicas: 1,
    convertidasEmCliente: 1,
    comSegmento: 1,
  },
  linhas: [
    {
      id: 1,
      dataHora: "2026-11-02T13:30:00.000Z",
      nome: "Maria Souza",
      tipoPessoa: "PF",
      documento: "12345678901",
      segmento: "Têxtil",
      cidade: "São Paulo/SP",
      status: "ATIVO",
      responsavel: "Tiago",
      clienteVinculado: true,
    },
    {
      id: 2,
      dataHora: "2026-11-03T09:00:00.000Z",
      nome: "TecMais Ltda",
      tipoPessoa: "PJ",
      documento: "11222333000181",
      segmento: "Confecção",
      cidade: "Campinas/SP",
      status: "ATIVO",
      responsavel: "Ana",
      clienteVinculado: false,
    },
  ],
  usuarios: [{ id: 1, nome: "Tiago" }],
}

specRelatorioCrm(
  {
    titulo: "Pessoas",
    endpoint: "/api/crm/relatorios/pessoas",
    payload,
    textos: [
      "Pessoas no período",
      "Pessoas físicas",
      "Pessoas jurídicas",
      "Convertidas em cliente",
      "Maria Souza",
      "TecMais Ltda",
    ],
  },
  RelatorioPessoasPage
)
