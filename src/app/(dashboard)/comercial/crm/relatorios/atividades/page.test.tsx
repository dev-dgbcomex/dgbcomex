// @vitest-environment jsdom
import { specRelatorioCrm } from "@/test/relatorio-page-spec"
import RelatorioAtividadesPage from "./page"

const contagem = {
  pessoas: 1,
  oportunidades: 0,
  propostas: 0,
  visitas: 0,
  tarefas: 0,
  leads: 0,
  contatos: 0,
  total: 1,
}

const payload = {
  periodo: {
    de: "2026-10-28T00:00:00.000Z",
    ate: "2026-11-04T23:59:59.999Z",
    rotulo: "Últimos 7 dias",
  },
  resumo: {
    dia: contagem,
    semana: contagem,
    mes: contagem,
    periodo: contagem,
    totalAtividades: 1,
  },
  porUsuario: [
    {
      usuario: "Tiago",
      dia: contagem,
      semana: contagem,
      mes: contagem,
      periodo: contagem,
    },
  ],
  atividades: [
    {
      id: 50,
      dataHora: "2026-11-03T12:00:00.000Z",
      usuario: "Tiago",
      acao: "criar",
      entidade: "CrmPessoa",
      categoria: "pessoas",
      descricao: "Pessoa criada: Maria Souza",
      pessoa: "Maria Souza",
      cliente: null,
    },
  ],
  usuarios: [{ id: 1, nome: "Tiago" }],
}

specRelatorioCrm(
  {
    titulo: "Atividades do CRM",
    endpoint: "/api/crm/relatorios/atividades",
    payload,
    textos: [
      "Atividades no período",
      "Criados hoje",
      "Criados nos últimos 7 dias",
      "Criados no mês",
      "Produção por usuário",
      "Listagem de atividades",
      "Pessoa criada: Maria Souza",
    ],
  },
  RelatorioAtividadesPage
)
