import type { InfoContent } from "./types"

export const crmDashboardInfo = {
  pagina: {
    title: "Dashboard CRM — visão geral",
    description:
      "Painel inicial do CRM com cinco cards de resumo, três gráficos, Top Leads, Atividades Recentes e Ações Rápidas. Todos os números vêm de GET /api/crm/dashboard, que consulta as tabelas do CRM no banco principal.",
    rules: [
      "O resumo mostra apenas Leads (Negócios), Clientes, Oportunidades, Visitas e Tarefas Pendentes. Visitantes, Propostas, Campanhas e E-mails Enviados continuam no JSON da API, no funil e nos atalhos — só não ocupam mais um card.",
      "O funil usa contagens de visitantes, oportunidades, propostas e oportunidades convertidas; ele não mostra uma sequência fixa de etapas.",
      "O 'i' do título explica a tela como um todo; o 'i' de cada bloco explica a origem e o cálculo do número exibido naquele bloco.",
      "As Ações Rápidas são atalhos para cadastros e listagens; elas não alteram os números exibidos.",
    ],
    examples: [
      {
        title: "Leitura do painel",
        desc: "Com 185 leads, 12 clientes e 85 oportunidades, os três primeiros cards mostram 185, 12 e 85. O 'i' ao lado de 'CRM' abre esta visão geral; o 'i' de cada card abre o detalhe daquele número.",
      },
      {
        title: "Dados mantidos",
        desc: "Mesmo sem card de Campanhas, o atalho 'Nova Campanha' continua em Ações Rápidas e o campo 'campanhas' continua no JSON da API.",
      },
    ],
  } satisfies InfoContent,
  resumo: {
    title: "Cards de resumo — origem dos números",
    description:
      "Os cinco cards mostram contagens do banco principal calculadas em GET /api/crm/dashboard. Cada card é um link para a listagem do domínio; o botão 'i' abre esta explicação sem navegar.",
    rules: [
      "Leads (Negócios) = COUNT de crm_pessoas, ou seja, quantas pessoas/leads estão cadastradas.",
      "Clientes = COUNT da tabela clientes, independente de tarja de lead promovida.",
      "Oportunidades = COUNT de crm_oportunidades; o complemento 'este mês' conta só os registros com createdAt a partir do primeiro dia do mês corrente.",
      "Visitas = COUNT de crm_visitas; o complemento 'hoje' filtra dataVisita igual ao dia atual.",
      "Tarefas Pendentes = COUNT de crm_tarefas com status PENDENTE; o complemento 'vencidas' conta as pendentes com dataPrevista menor ou igual a hoje.",
      "Os números são recalculados a cada carregamento da API, sem filtro de período, usuário ou responsável.",
      "Clicar no card abre a listagem correspondente; clicar no 'i' abre apenas o modal.",
    ],
    fields: [
      { name: "Leads (Negócios)", desc: "Abre /comercial/crm/leads — contagem de crm_pessoas." },
      { name: "Clientes", desc: "Abre /comercial/crm/relatorios/clientes — contagem de clientes." },
      { name: "Oportunidades", desc: "Abre /comercial/crm/oportunidades — contagem de oportunidades." },
      { name: "Visitas", desc: "Abre /comercial/crm/visitas — contagem de visitas." },
      { name: "Tarefas Pendentes", desc: "Abre /comercial/crm/tarefas — contagem de tarefas PENDENTE." },
    ],
    examples: [
      {
        title: "Exemplo de leitura",
        desc: "185 leads, 12 clientes, 85 oportunidades (9 criadas este mês), 1 visita hoje e 8 tarefas pendentes (3 com prazo até hoje): os cards mostram 185, 12, 85, 1 e 8, com os complementos '9 este mês', '1 hoje' e '3 vencidas'.",
      },
    ],
  } satisfies InfoContent,
  graficos: {
    pipeline: {
      title: "Pipeline (Funil) — composição das barras",
      description:
        "Gráfico de barras horizontais com quatro contagens do mesmo JSON da API: visitantes, oportunidades, propostas e oportunidades fechadas como ganho.",
      rules: [
        "Visitantes = COUNT de crm_visitantes; Oportunidades = COUNT de crm_oportunidades; Propostas = COUNT de crm_propostas; Convertidas = COUNT de crm_oportunidades com status FECHADO_GANHO.",
        "São contagens absolutas do banco, sem filtro de mês e sem cálculo de passagem entre etapas: uma barra menor não representa percentual de perda.",
        "Os campos 'visitantes' e 'propostas' continuam no JSON e neste gráfico mesmo sem card próprio no resumo.",
      ],
      examples: [
        {
          title: "Exemplo das barras",
          desc: "240 visitantes, 85 oportunidades, 32 propostas e 18 convertidas: as barras mostram 240, 85, 32 e 18 registros, nessa ordem.",
        },
      ],
    } satisfies InfoContent,
    previsaoConversao: {
      title: "Previsão & Conversão — fórmulas",
      description:
        "Bloco com a previsão de receita do pipeline, a quantidade de oportunidades ganhas, a taxa de conversão e o histórico mensal salvo.",
      rules: [
        "Previsão de Receita = SOMA de valorEstimado das oportunidades cujo status não é FECHADO_GANHO nem FECHADO_PERDIDO.",
        "Convertidas = COUNT de crm_oportunidades com status FECHADO_GANHO.",
        "Taxa de Conversão = Convertidas ÷ total de oportunidades × 100, com uma casa decimal; sem oportunidades, mostra 0,0%.",
        "O histórico mensal lê até 12 registros de crm_previsaoVendas (valorPrevisto e valorReal), do mais recente para o mais antigo; a linha é invertida na exibição para ficar em ordem cronológica.",
      ],
      examples: [
        {
          title: "Exemplo da taxa",
          desc: "Com oportunidades abertas somando R$ 480.000 e 18 ganhas de um total de 85: a previsão mostra R$ 480.000, 'Convertidas' mostra 18 e a taxa mostra 21,2% (18 ÷ 85 × 100).",
        },
      ],
    } satisfies InfoContent,
    status: {
      title: "Oportunidades por Status — composição da rosca",
      description:
        "Gráfico de rosca com a distribuição das oportunidades agrupadas pelo status gravado no banco, sem filtro de período.",
      rules: [
        "Cada fatia vem de um GROUP BY status em crm_oportunidades; o número ao lado do rótulo é a contagem de oportunidades naquele status.",
        "Os rótulos são os status existentes no banco (NOVO, QUALIFICADO, PROPOSTA, NEGOCIAÇÃO, FECHADO_GANHO, FECHADO_PERDIDO etc.), não uma sequência fixa de etapas.",
        "Quando não há oportunidades, o bloco mostra 'Nenhuma oportunidade'.",
      ],
      examples: [
        {
          title: "Exemplo da legenda",
          desc: "Com 40 NOVO, 25 QUALIFICADO, 12 PROPOSTA, 6 NEGOCIACAO e 2 FECHADO_GANHO, a legenda mostra 'NOVO: 40', 'QUALIFICADO: 25', 'PROPOSTA: 12', 'NEGOCIACAO: 6' e 'FECHADO_GANHO: 2'.",
        },
      ],
    } satisfies InfoContent,
  },
  paineis: {
    topLeads: {
      title: "Top Leads (Negócios) — como a lista é montada",
      description: "Ranking das cinco pessoas/leads com maior soma de valor estimado em oportunidades ainda abertas.",
      rules: [
        "A API soma valorEstimado de crm_oportunidades com status diferente de FECHADO_GANHO e FECHADO_PERDIDO, agrupa por empresaId e ordena da maior soma para a menor, com limite de 5.",
        "O nome vem de crm_pessoas.razaoSocial; quando o vínculo não existe, aparece 'Sem nome'.",
        "O valor ao lado é a soma das oportunidades abertas daquela lead, não o faturamento e não o valor de propostas.",
      ],
      examples: [
        {
          title: "Exemplo do ranking",
          desc: "Tecelagem Y tem duas oportunidades abertas de R$ 80.000 e R$ 40.000: aparece no topo da lista com R$ 120.000.",
        },
      ],
    } satisfies InfoContent,
    recentes: {
      title: "Atividades Recentes — origem do feed",
      description:
        "Últimos eventos registrados na timeline do CRM, exibidos com ícone por tipo e data/hora em formato brasileiro.",
      rules: [
        "A API busca as 10 linhas mais recentes de crm_timeline_eventos ordenadas por dataEvento em ordem decrescente.",
        "Os tipos LEAD, OPORTUNIDADE, VISITA, TAREFA e PROPOSTA têm ícone e cor próprios; os demais usam o ícone de relógio.",
        "O texto é a descrição gravada no evento; a data/hora é convertida para pt-BR (dd/mm, hh:mm).",
      ],
      examples: [
        {
          title: "Exemplo do feed",
          desc: "Um evento LEAD com descrição 'Lead Tecelagem Y criada' e dataEvento em 20/11 às 14:30 aparece como '20/11, 14:30' com o ícone de lead.",
        },
      ],
    } satisfies InfoContent,
  },
  acoesRapidas: {
    title: "Ações Rápidas — atalhos do dashboard",
    description:
      "Nove atalhos para criar registros ou abrir listagens do CRM e da área de e-mail em massa, sem sair do dashboard.",
    rules: [
      "Os atalhos levam a: Novo Lead (visitante), Novo Lead (Negócio), Nova Oportunidade, Kanban, Nova Visita, Nova Proposta, Nova Campanha, Email Massa e Minhas Tarefas.",
      "'Nova Campanha' e 'Email Massa' permanecem aqui mesmo sem card de Campanhas ou E-mails Enviados no resumo.",
      "Os links apenas navegam: nenhum dado é criado ou alterado ao clicar em um atalho.",
    ],
    examples: [
      {
        title: "Exemplo de atalho",
        desc: "Clicar em 'Email Massa' abre /admin/email-massa e clicar em 'Nova Proposta' abre /comercial/crm/propostas/novo; nenhum dos dois modifica os números do dashboard.",
      },
    ],
  } satisfies InfoContent,
}
