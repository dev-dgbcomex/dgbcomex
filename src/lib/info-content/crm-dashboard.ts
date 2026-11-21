import type { InfoContent } from "./types"

export const crmDashboardInfo = {
  pagina: {
    title: "Dashboard CRM — visão geral",
    description:
      "Painel inicial do CRM com faixas compactas de Ações Rápidas no topo e ao final, seis cards de resumo, três gráficos, Top Leads, Top Clientes e Atividades Recentes. Cards, gráficos e painéis abrem um modal com a lista de registros; cada registro abre o cadastro correspondente.",
    rules: [
      "O resumo mostra Leads (Negócios), Clientes, Oportunidades, Visitas, Ações de Prospecção e Tarefas Pendentes. Visitantes, Propostas, Campanhas e E-mails Enviados continuam no JSON da API e nos atalhos.",
      "Clicar em 'Previsão de Receita (Pipeline)' abre o modal com as oportunidades em aberto da previsão, com total e botão de exportação; 'Convertidas' abre as oportunidades FECHADO_GANHO com o mesmo total e exportação.",
      "O funil mostra três contagens: Leads (crm_leads), Oportunidades e Oportunidades Convertidas; Propostas foi removido do gráfico.",
      "A linha dos painéis mostra Top Leads, Top Clientes e Atividades Recentes; o Top Leads considera só oportunidades de leads não promovidas, e o Top Clientes considera oportunidades abertas e fechadas de clientes e de pessoas promovidas.",
      "Clicar em um card, em 'Ver todas', em uma barra do funil ou em um status abre GET /api/crm/dashboard/detalhes com o bloco correspondente.",
      "O 'i' do título explica a tela como um todo; o 'i' de cada bloco explica a origem e o cálculo do número exibido naquele bloco.",
      "As Ações Rápidas ficam em faixas compactas acima dos cards e ao final da página, são atalhos para cadastros e listagens e não alteram os números exibidos; a repetição no final permite acessar os atalhos sem voltar ao topo, inclusive por teclado.",
    ],
    examples: [
      {
        title: "Leitura do painel",
        desc: "Com 185 leads, 12 clientes, 85 oportunidades e 30 ações realizadas, os cards mostram 185, 12, 85 e 30. Clicar no card de Oportunidades abre a lista de oportunidades; o 'i' abre apenas a explicação.",
      },
      {
        title: "Detalhe do gráfico",
        desc: "Clicar na barra 'Convertidas' abre o modal com as oportunidades FECHADO_GANHO; cada linha abre a oportunidade e o rodapé 'Ver todas' abre a listagem filtrada.",
      },
    ],
  } satisfies InfoContent,
  resumo: {
    title: "Cards de resumo — origem dos números",
    description:
      "Os seis cards mostram contagens do banco principal calculadas em GET /api/crm/dashboard. Cada card abre um modal com os registros do domínio; o botão 'i' abre esta explicação sem abrir o modal.",
    rules: [
      "Leads (Negócios) = COUNT de crm_pessoas, ou seja, quantas pessoas/leads estão cadastradas.",
      "Clientes = COUNT da tabela clientes, independente de tarja de lead promovida.",
      "Oportunidades = COUNT de crm_oportunidades; o complemento 'este mês' conta só os registros com createdAt a partir do primeiro dia do mês corrente.",
      "Visitas = COUNT de crm_visitas; o complemento 'hoje' filtra dataVisita igual ao dia atual.",
      "Ações de Prospecção = COUNT de crm_acoes_prospeccao com status REALIZADA; os complementos 'hoje' e 'no mês' filtram dataAcao igual ao dia atual e a partir do primeiro dia do mês, sempre mantendo status REALIZADA.",
      "Tarefas Pendentes = COUNT de crm_tarefas com status PENDENTE; o complemento 'vencidas' conta as pendentes com dataPrevista menor ou igual a hoje.",
      "Os números são recalculados a cada carregamento da API, sem filtro de período, usuário ou responsável.",
      "Clicar no card abre o modal de detalhes; cada linha do modal abre o cadastro e o rodapé 'Ver todas' abre a listagem do domínio.",
      "Clicar no 'i' abre apenas esta explicação e não abre o modal de detalhes.",
    ],
    fields: [
      { name: "Leads (Negócios)", desc: "Abre o modal de leads — contagem de crm_leads." },
      { name: "Clientes", desc: "Abre o modal de clientes — contagem de clientes." },
      {
        name: "Oportunidades",
        desc: "Abre o modal de oportunidades — contagem de crm_oportunidades.",
      },
      { name: "Visitas", desc: "Abre o modal de visitas — contagem de crm_visitas." },
      {
        name: "Ações de Prospecção",
        desc: "Abre o modal de ações realizadas — contagem de crm_acoes_prospeccao com status REALIZADA.",
      },
      {
        name: "Tarefas Pendentes",
        desc: "Abre o modal de tarefas — contagem de tarefas PENDENTE.",
      },
    ],
    examples: [
      {
        title: "Exemplo de leitura",
        desc: "185 leads, 12 clientes, 85 oportunidades (9 criadas este mês), 1 visita hoje, 30 ações realizadas (4 hoje e 22 no mês) e 8 tarefas pendentes (3 com prazo até hoje): os cards mostram 185, 12, 85, 1, 30 e 8, com os complementos '9 este mês', '1 hoje', '4 hoje · 22 no mês' e '3 vencidas'.",
      },
    ],
  } satisfies InfoContent,
  graficos: {
    pipeline: {
      title: "Pipeline (Funil) — composição das barras",
      description:
        "Gráfico de barras horizontais com três contagens do mesmo JSON da API: leads, oportunidades e oportunidades fechadas como ganho.",
      rules: [
        "Leads = COUNT de crm_leads; Oportunidades = COUNT de crm_oportunidades; Convertidas = COUNT de crm_oportunidades com status FECHADO_GANHO.",
        "Propostas não aparece mais no funil, mas continua no JSON da API e no atalho 'Nova Proposta'.",
        "São contagens absolutas do banco, sem filtro de mês e sem cálculo de passagem entre etapas: uma barra menor não representa percentual de perda.",
        "Clicar em uma barra ou em 'Ver todas' abre o modal com os registros daquele bloco; cada linha abre o cadastro do registro.",
      ],
      examples: [
        {
          title: "Exemplo das barras",
          desc: "185 leads, 85 oportunidades e 18 convertidas: as barras mostram 185, 85 e 18 registros, nessa ordem. Clicar em 'Convertidas' abre as 18 oportunidades FECHADO_GANHO.",
        },
      ],
    } satisfies InfoContent,
    previsaoConversao: {
      title: "Previsão & Conversão — fórmulas",
      description:
        "Bloco com quantidade e valor da previsão de receita do pipeline, quantidade e valor das oportunidades ganhas, total somando as duas partes, taxa de conversão e histórico mensal salvo.",
      rules: [
        "Previsão de Receita = SOMA de valorEstimado e COUNT das oportunidades cujo status não é FECHADO_GANHO nem FECHADO_PERDIDO.",
        "Convertidas = COUNT e SOMA de valorEstimado de crm_oportunidades com status FECHADO_GANHO.",
        "Total (previsão + convertidas) = quantidade de oportunidades abertas mais convertidas e valor da previsão mais valor das convertidas.",
        "Taxa de Conversão = Convertidas ÷ total de oportunidades × 100, com uma casa decimal; sem oportunidades, mostra 0,0%.",
        "O histórico mensal lê até 12 registros de crm_previsaoVendas (valorPrevisto e valorReal), do mais recente para o mais antigo; a linha é invertida na exibição para ficar em ordem cronológica.",
        "Clicar em 'Previsão de Receita (Pipeline)' ou em 'Ver todas' abre o modal com as oportunidades em aberto da previsão; clicar em 'Convertidas' abre as oportunidades FECHADO_GANHO.",
        "Ambos os modais mostram a quantidade e o valor total de todas as oportunidades do filtro, independente do limite de linhas exibidas, e oferecem exportação em CSV, JSON e PDF.",
      ],
      examples: [
        {
          title: "Exemplo da taxa",
          desc: "Com 40 oportunidades abertas somando R$ 480.000 e 18 ganhas somando R$ 720.000 de um total de 85: a previsão mostra '40 oportunidade(s) em aberto' e R$ 480.000, 'Convertidas' mostra 18 e R$ 720.000, o total mostra 58 oportunidade(s) e R$ 1.200.000, e a taxa mostra 21,2% (18 ÷ 85 × 100).",
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
        "Clicar em uma fatia da legenda abre o modal filtrado por aquele status; 'Ver todas' abre todas as oportunidades.",
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
      description:
        "Ranking das cinco leads com maior soma de valor estimado em oportunidades ainda abertas.",
      rules: [
        "A API soma valorEstimado de crm_oportunidades com status diferente de FECHADO_GANHO e FECHADO_PERDIDO, considera só oportunidades ligadas a uma lead por empresaId e ordena da maior soma para a menor, com limite de 5.",
        "Oportunidades com clienteId preenchido na oportunidade ou na lead, bem como leads com promovidaCliente ativo, ficam de fora do Top Leads e entram no Top Clientes.",
        "O nome vem de crm_leads (nome fantasia, razão social ou nome); oportunidades ligadas a clientes não aparecem neste painel.",
        "Clicar em uma linha abre o cadastro da lead; 'Ver todas' abre o modal com o mesmo ranking.",
        "O valor ao lado é a soma das oportunidades abertas daquela lead, não o faturamento e não o valor de propostas.",
      ],
      examples: [
        {
          title: "Exemplo do ranking",
          desc: "Tecelagem Y tem duas oportunidades abertas de R$ 80.000 e R$ 40.000: aparece no topo da lista com R$ 120.000.",
        },
        {
          title: "Exemplo de separação",
          desc: "Uma oportunidade ligada ao cliente Conforto Prime não aparece no Top Leads; ela entra no Top Clientes quando o cliente vem da oportunidade ou de uma lead promovida.",
        },
      ],
    } satisfies InfoContent,
    topClientes: {
      title: "Top Clientes — oportunidades e conversão por cliente",
      description:
        "Ranking do painel Top Clientes com os cinco clientes de maior soma de valor estimado em oportunidades, incluindo as oportunidades de pessoas promovidas a cliente.",
      rules: [
        "A origem é crm_oportunidades: a API soma valorEstimado de todas as oportunidades do cliente, abertas e fechadas, e ordena da maior soma para a menor com limite de 5.",
        "O cliente de cada oportunidade vem de COALESCE(crm_oportunidades.clienteId, crm_pessoas.clienteId): quando a oportunidade está ligada a uma pessoa promovida, ela entra para o cliente dessa pessoa.",
        "O nome do cliente exibido vem da tabela clientes; oportunidades sem cliente resolvido não entram no ranking.",
        "O texto 'X convertidas de Y' usa o total de oportunidades do cliente (Y) e a quantidade com status FECHADO_GANHO (X).",
        "O valor ao lado do nome é a soma de todas as oportunidades do cliente; o campo valorAberto separa apenas as que não estão FECHADO_GANHO nem FECHADO_PERDIDO.",
        "Clicar em uma linha abre /comercial/clientes/[id]; 'Ver todas' abre o modal com o mesmo ranking e o link final abre a listagem de clientes.",
      ],
      fields: [
        {
          name: "Linha do cliente",
          desc: "Nome do cliente, soma das oportunidades e texto de conversão; abre o cadastro do cliente.",
        },
        { name: "Ver todas", desc: "Abre o modal de detalhes com o bloco top-clientes." },
      ],
      examples: [
        {
          title: "Exemplo do ranking",
          desc: "Conforto Prime tem cinco oportunidades: duas FECHADO_GANHO de R$ 50.000 e R$ 30.000 e três abertas de R$ 40.000, R$ 20.000 e R$ 10.000. Aparece com R$ 150.000 e '2 convertidas de 5'.",
        },
        {
          title: "Exemplo de pessoa promovida",
          desc: "Uma oportunidade de R$ 25.000 ligada à pessoa promovida Tecelagem Y, com clienteId preenchido nela, entra na soma do cliente da pessoa por COALESCE.",
        },
      ],
    } satisfies InfoContent,
    recentes: {
      title: "Atividades Recentes — origem do feed",
      description:
        "Feed com os eventos mais recentes da timeline do CRM e as visitas cadastradas, exibidos com ícone por tipo e data/hora em formato brasileiro.",
      rules: [
        "A API junta crm_timeline_eventos e crm_visitas, ordena por data em ordem decrescente e limita o resultado a 10 itens.",
        "Ações de prospecção aparecem com o texto 'Ação de prospecção ...' e abrem a ação; visitas aparecem com data, status e abrem a visita.",
        "O link de cada item usa o ID da entidade salvo nos metadados do evento de timeline: a ação abre /comercial/crm/acoes-prospeccao/<id da ação>, não o ID do evento.",
        "Os tipos LEAD, OPORTUNIDADE, VISITA, TAREFA, PROPOSTA e ACAO_PROSPECCAO têm ícone e cor próprios; os demais usam o ícone de relógio.",
        "Clicar em uma linha abre o cadastro do evento; 'Ver todas' abre o modal com a lista completa.",
      ],
      examples: [
        {
          title: "Exemplo do feed",
          desc: "Uma ação de prospecção em 20/11 às 14:30 e uma visita em 20/11 às 16:00 aparecem nessa ordem decrescente, cada uma com seu ícone e link.",
        },
      ],
    } satisfies InfoContent,
  },
  acoesRapidas: {
    title: "Ações Rápidas — atalhos do dashboard",
    description:
      "Seis atalhos em faixas compactas no topo e ao final do dashboard para criar registros ou abrir listagens do CRM.",
    rules: [
      "Os atalhos disponíveis são: Novo Lead (Negócio), Nova Oportunidade, Nova Ação de Prospecção, Kanban, Nova Visita e Minhas Tarefas.",
      "As faixas ficam acima dos cards de resumo e ao final da página, com os mesmos seis atalhos, para facilitar o acesso por teclado sem voltar ao topo.",
      "Os links apenas navegam: nenhum dado é criado ou alterado ao clicar em um atalho.",
    ],
    examples: [
      {
        title: "Exemplo de atalho",
        desc: "Clicar em 'Nova Ação de Prospecção' abre /comercial/crm/acoes-prospeccao/novo e clicar em 'Minhas Tarefas' abre /comercial/crm/tarefas, sem modificar os números do dashboard.",
      },
    ],
  } satisfies InfoContent,
}
