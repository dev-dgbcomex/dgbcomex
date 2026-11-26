import type { InfoContent } from "./types"
import { crmDashboardInfo } from "./crm-dashboard"
import type { FaixaConversao } from "../crm/faixa-conversao"

export const semaforoConversaoInfo = {
  QUENTE: {
    title: "Quentes — negociação ou movimento do mês",
    description:
      "Leads e clientes com oportunidade em Negociação, oportunidade ganha atualizada no mês atual ou pedido emitido no mês atual.",
    rules: [
      "Clique no card para abrir a lista de registros da faixa; o 'i' explica a regra sem abrir a lista.",
      "No modal, o documento fica abaixo do nome e as colunas mostram Oportunidades, Pedidos, Visitas e Ações.",
      "Em Oportunidades, as quantidades aparecem separadas por Proposta e Negociação; sem oportunidades, a célula mostra '—'.",
      "Quentes tem prioridade sobre Mornos e Frios: Negociação, ganho no mês e pedido no mês entram aqui mesmo quando existe Proposta.",
      "O ganho usa a data da última atualização da oportunidade FECHADO_GANHO; o pedido usa a data de emissão, com fallback para a criação.",
      "O status cadastral da lead ou do cliente nunca classifica a faixa; a classificação usa o status das oportunidades e a data dos pedidos.",
      "Em clientes, entram também oportunidades e pedidos das pessoas promovidas e vinculadas ao cliente.",
      "A lista e as quantidades respeitam os filtros ativos da tela e os registros carregados.",
    ],
    examples: [
      {
        title: "Exemplo em leads",
        desc: "Lead com oportunidade em NEGOCIACAO, ou com pedido emitido neste mês, aparece em Quentes.",
      },
      {
        title: "Exemplo em clientes",
        desc: "Cliente com oportunidade FECHADO_GANHO atualizada neste mês, ou com pedido de lead promovida neste mês, aparece em Quentes.",
      },
    ],
  },
  MORNO: {
    title: "Mornos — proposta ou movimento do trimestre",
    description:
      "Leads e clientes sem QUENTE, mas com oportunidade em Proposta, oportunidade ganha atualizada no trimestre ou pedido emitido no trimestre.",
    rules: [
      "Clique no card para abrir a lista de registros da faixa; o 'i' explica a regra sem abrir a lista.",
      "No modal, o documento fica abaixo do nome e as colunas mostram Oportunidades, Pedidos, Visitas e Ações.",
      "Em Oportunidades, as quantidades aparecem separadas por Proposta e Negociação; sem oportunidades, a célula mostra '—'.",
      "Morno tem prioridade sobre Frio, mas perde para Quente quando há Negociação, ganho no mês ou pedido no mês.",
      "Ganho e pedido no trimestre, mas fora do mês, entram em Mornos; a data do ganho é a última atualização da oportunidade.",
      "O status cadastral da lead ou do cliente nunca classifica a faixa; a classificação usa o status das oportunidades e a data dos pedidos.",
      "Em clientes, entram também oportunidades e pedidos das pessoas promovidas e vinculadas ao cliente.",
      "A lista e as quantidades respeitam os filtros ativos da tela e os registros carregados.",
    ],
    examples: [
      {
        title: "Exemplo em leads",
        desc: "Lead com oportunidade em PROPOSTA, ou com pedido emitido neste trimestre mas no mês anterior, aparece em Mornos.",
      },
      {
        title: "Exemplo em clientes",
        desc: "Cliente com oportunidade de lead promovida em PROPOSTA, ou com ganho atualizado neste trimestre, aparece em Mornos.",
      },
    ],
  },
  FRIO: {
    title: "Frios — fora do trimestre",
    description:
      "Leads e clientes sem Negociação ou Proposta e sem ganho ou pedido no trimestre atual.",
    rules: [
      "Clique no card para abrir a lista de registros da faixa; o 'i' explica a regra sem abrir a lista.",
      "No modal, o documento fica abaixo do nome e as colunas mostram Oportunidades, Pedidos, Visitas e Ações.",
      "Em Oportunidades, as quantidades aparecem separadas por Proposta e Negociação; sem oportunidades, a célula mostra '—'.",
      "Também entram aqui oportunidades perdidas, sem movimento no trimestre e registros sem oportunidade ou pedido.",
      "A classificação usa o status das oportunidades e a data dos pedidos; o status cadastral (Novo, Qualificado, Ativo ou Inativo) não classifica a faixa.",
      "Em clientes, são consideradas as oportunidades e os pedidos diretos e os herdados das pessoas promovidas.",
      "A lista e as quantidades respeitam os filtros ativos da tela e os registros carregados.",
    ],
    examples: [
      {
        title: "Exemplo em leads",
        desc: "Lead com status cadastral QUALIFICADO e sem oportunidade ou pedido neste trimestre aparece em Frios.",
      },
      {
        title: "Exemplo em clientes",
        desc: "Cliente com oportunidade FECHADO_GANHO atualizada no trimestre anterior e nenhum pedido recente aparece em Frios.",
      },
    ],
  },
} satisfies Record<FaixaConversao, InfoContent>

export const crmContent: Record<string, InfoContent> = {
  // ==================== DISPONIBILIDADE ====================
  "/comercial/disponibilidade": {
    title: "Disponibilidade — dá para prometer?",
    description:
      "Por produto e cor: quanto tem em estoque, quanto está chegando e quanto já foi prometido em pedidos em aberto. A coluna 'Livre' é a resposta — o que sobra depois das promessas — e a 'Falta' é o que já foi prometido e o estoque não cobre.",
    rules: [
      "A unidade é metro nas três fontes. O estoque vem das peças em aberto (o mesmo dado do ERP); a carteira, do saldo dos pedidos em aberto (Qtde do pedido menos o que já foi romaneado); a compra em trânsito, dos pedidos de importação com data de entrega futura.",
      "Livre = estoque − prometido: negativo quando a carteira já pediu mais do que existe. Não é erro de cálculo, é a resposta — a empresa precisa saber que não pode prometer o que não tem.",
      "Depois da compra = estoque + o que está chegando − prometido. Se continua negativo, é porque não há compra em trânsito cobrindo o que falta; se ficar positivo, a cor fecha na data da chegada.",
      "A compra em trânsito vem do módulo de importação (pedido de compra com data de embarque e entrega). O aviso de recebimento do ERP não entra aqui: ele é o recebimento já efetivado, com data no passado.",
      "'A caminho' só conta o que ainda não foi recebido no destino. Uma entrega parcial aparece pela metade.",
      "O nome do produto e da cor vem do cadastro do ERP, então aparece mesmo quando a cor ainda não tem peça em estoque — nesse caso a coluna Estoque mostra zero.",
      "Clicar no número da coluna Pedidos abre os pedidos um a um: código do pedido, cliente, representante, data, saldo em metros e valor — com exportação em CSV e PDF. É a lista para cobrar antes de fazer nova promessa. Clicar na linha abre o mesmo resumo por representante.",
      "Os filtros de produto, cor e representante vão para a API ao clicar em Aplicar. A busca é instantânea e não vai ao ERP.",
      "Todas as colunas ordenam a tabela: o ▲/↕ no título mostra qual é a ordenação ativa. Nas colunas numéricas o número grande é o da coluna e a linha de baixo é o detalhe — data da chegada, valor em reais, peças e rolos.",
    ],
    columns: [
      {
        name: "Produto",
        desc: "Nome e código do produto (ex.: BELGA, 000014). Vem do cadastro do ERP, então aparece mesmo quando a cor não tem peça em estoque.",
      },
      {
        name: "Cor",
        desc: "Código e nome da cor (ex.: 56 - NATURAL). Estoque, carteira e compra em trânsito casam por produto + cor.",
      },
      {
        name: "Estoque",
        desc: "Peças em aberto no ERP convertidas em metro: 5.923 m de 93 peças · 93 rolos (cada rolo com 63,7 m). É o que existe no estoque agora, sem contar o que já foi reservado.",
      },
      {
        name: "A caminho",
        desc: "Soma das compras em trânsito com entrega futura: 30.207 m, com a data da primeira chegada (23/11/2026) logo abaixo. Entrega parcial aparece pela metade.",
      },
      {
        name: "Prometido",
        desc: "Saldo dos pedidos de venda em aberto (quantidade do pedido menos o já romaneado): 16.600 m, R$ 130.950,20. É o que a carteira comercial já consumiu.",
      },
      {
        name: "Pedidos",
        desc: "Quantos pedidos de venda em aberto sustentam esse prometido: 7. O número é clicável e abre a lista com código, cliente e representante; passar o mouse mostra o agregado por representante.",
      },
      {
        name: "Livre",
        desc: "Estoque − prometido: 5.923 − 16.600 = −10.677 m. Negativo em vermelho significa que já prometeram além do que existe — é a fila de conversa, não erro de cálculo.",
      },
      {
        name: "Depois da compra",
        desc: "Estoque + o que está chegando − prometido: 5.923 + 30.207 − 16.600 = 19.530 m. Positivo em verde significa que a cor fecha na data da chegada; negativo, que falta compra nova.",
      },
    ],
    fields: [
      {
        name: "Produto",
        desc: "Código (000014) ou parte da descrição. Aceita as duas coisas.",
      },
      {
        name: "Cor",
        desc: "Código da cor (00005). A carteira e o estoque casam nessa chave.",
      },
      {
        name: "Representante",
        desc: "Código do vendedor. Filtra só a carteira: mostra o que aquele representante prometeu e ainda não tem.",
      },
      {
        name: "Só o que falta",
        desc: "Esconde as cores que o estoque cobre. É a fila de quem precisa de conversa.",
      },
      {
        name: "Só o que está chegando",
        desc: "Só as cores com compra em trânsito, com a data da próxima chegada.",
      },
      {
        name: "Exportar CSV",
        desc: "Baixa o recorte atual em metros, com a falta e a data de chegada.",
      },
    ],
    examples: [
      {
        title: "O caso que mostra para que a tela existe",
        desc: "VELUDO CONFORT 11 BEIGE: 91 m em estoque contra 20.099 m prometidos em 10 pedidos de 3 representantes. Faltam 20.008 m e chegam 10.640 m em 09/11 — como a compra não cobre tudo, 'Depois da compra' continua em −9.368 m.",
      },
      {
        title: "Quando a compra resolve",
        desc: "BELGA 56 NATURAL: 5.923 m em estoque, 16.600 m prometidos e 30.207 m chegando em 23/11. O Livre é −10.677 m, mas depois da compra sobra 19.530 m: dá para prometer com a data da chegada no pé.",
      },
      {
        title: "Cor que não tem peça",
        desc: "VELUDO SILVER 37 GRANITO está com 828 m prometidos, zero em estoque e nada chegando: 'Depois da compra' continua negativo. É a fila do que precisa de compra nova.",
      },
    ],
  },
  // ==================== DASHBOARD ====================
  "/comercial/crm": crmDashboardInfo.pagina,

  // ==================== LEADS ====================
  "/comercial/crm/visitantes": {
    title: "Visitantes",
    description:
      "Lista de visitantes captados por diferentes origens: site, WhatsApp, indicação, prospecção ativa ou eventos. Aqui você gerencia o primeiro contato com potenciais clientes.",
    rules: [
      "Visitantes NOVOS devem ser contatados em até 24h para maior taxa de conversão.",
      "O score IA (0-100) é preenchido automaticamente pela inteligência artificial, indicando a probabilidade de conversão.",
      "Visitante QUALIFICADO pode ser convertido em Lead — isso cria um cadastro de lead no CRM.",
      "Visitante PERDIDO pode ser reativado automaticamente após 90 dias pela IA Comercial.",
      "A coluna Score IA mostra: verde (≥70), amarelo (40-69), vermelho (<40).",
    ],
    fields: [
      { name: "Nome", desc: "Nome completo do contato" },
      { name: "Contato", desc: "E-mail e telefone do visitante" },
      { name: "Empresa", desc: "Empresa onde o visitante trabalha (se informado)" },
      {
        name: "Score IA",
        desc: "Pontuação de 0-100 calculada pela IA Comercial — quanto maior, maior a chance de conversão",
      },
      {
        name: "Origem",
        desc: "Como o visitante foi captado: Site, WhatsApp, Indicação, Prospecção, Evento, Ligação, E-mail",
      },
      {
        name: "Status",
        desc: "Etapa atual: Novo → Contatado → Qualificado → Convertido → Perdido",
      },
    ],
  },
  "/comercial/crm/visitantes/novo": {
    title: "Novo Visitante",
    description:
      "Cadastre manualmente um visitante captado por qualquer canal. Quanto mais informações preencher, melhor a IA poderá classificar o visitante automaticamente.",
    rules: [
      "Apenas o nome é obrigatório — os demais campos podem ser preenchidos depois.",
      "Se o visitante já tiver um CNPJ, é melhor cadastrá-lo direto como Lead.",
      "Todo visitante inicia com status NOVO.",
      "O responsável padrão é o usuário logado, mas pode ser alterado.",
    ],
    fields: [
      { name: "Nome", desc: "Nome completo do contato (obrigatório)" },
      { name: "E-mail / Telefone", desc: "Canais de contato principais" },
      { name: "Origem", desc: "Selecione como o visitante foi captado" },
      { name: "Responsável", desc: "Quem vai fazer o primeiro contato" },
    ],
  },

  // ==================== PESSOAS ====================
  "/comercial/crm/leads": {
    title: "Leads",
    description:
      "Cadastro de leads no CRM. Cada lead pode ter múltiplos contatos, oportunidades, propostas, visitas e um histórico completo na timeline.",
    rules: [
      "O CNPJ é único — não é possível cadastrar duas leads com o mesmo CNPJ.",
      "Leads podem ser criadas manualmente ou convertidas de leads qualificados.",
      "Leads não podem ser excluídas: o cadastro é referenciado por contatos, oportunidades, propostas, visitas e timeline.",
      "Para qualificar uma lead, crie antes uma oportunidade vinculada. Criar a oportunidade em Novo, Perdido ou Inativo qualifica a lead automaticamente.",
      "Oportunidade em Proposta qualifica a lead para Qualificado (sem rebaixar se já estiver Possível Cliente). Oportunidade em Negociação ou Ganho leva a lead para Possível Cliente; Ganho exige um pedido vinculado do ERP.",
      "Requisitos por status da lead: Qualificado exige pelo menos uma oportunidade vinculada; Possível Cliente exige oportunidade em Negociação ou Ganho; conversão em cliente exige CNPJ cadastrado e confirmação da decisão 'Converter'.",
      "A conversão em cliente é manual: use 'Verificar faturados' e confirme a promoção quando houver nota de faturamento no ERP. O botão 'Tornar cliente' cria (ou reaproveita) o cliente pelo CNPJ e preserva todo o histórico.",
      "Perdido e Inativo recebem a tarja Arquivado. Voltar para Qualificado desarquiva a lead.",
      "Há três visualizações: Cards, Tabela e Kanban. A preferência fica salva neste navegador e os filtros valem para Cards e Tabela.",
      "Cards é a visualização padrão; Tabela e Kanban continuam disponíveis, e o Kanban organiza as leads por status.",
      "Os cards mostram as contagens de Oportunidades, Pedidos, Visitas e Ações no lugar do responsável do cadastro, que continua visível na Tabela e no detalhe da lead. Clique em qualquer contagem para abrir um modal com os registros vinculados a essa lead.",
      "A listagem esconde por padrão as leads convertidas em cliente. Use o filtro 'Sem conversão / Convertidos / Todos' para alternar a visibilidade.",
      "Leads convertidas continuam acessíveis pelo detalhe (link direto) e pelo relatório de Conversões.",
      "Os cards logo abaixo da busca formam o semáforo de conversão: Quentes (Negociação, ganho ou pedido no mês), Mornos (Proposta, ganho ou pedido no trimestre) e Frios (sem nenhum desses movimentos no trimestre).",
      "Clique em um card do semáforo para abrir a lista de leads daquela faixa; o 'i' no card explica a regra e mostra exemplos.",
      "No modal da faixa, o documento aparece abaixo do nome e as colunas trazem Oportunidades (com Proposta e Negociação), Pedidos, Visitas e Ações.",
      "A classificação usa o status das oportunidades e a data dos pedidos vinculados à lead, nunca o status cadastral da lead. Cada lead entra em uma única faixa, com prioridade de Quente sobre Morno e de Morno sobre Frio.",
      "As quantidades e a lista do modal respeitam a busca, os filtros de status/período e o filtro de conversão ativos na tela.",
      "Ao clicar no nome da lead, você abre o detalhe completo com timeline, WhatsApp e resumo IA.",
      "O botão 'Saúde da Prospecção' no cabeçalho abre o painel por cliente ou lead com as classificações AEC, BEC e Engajados.",
    ],
    fields: [
      { name: "Razão Social", desc: "Nome jurídico da lead (obrigatório)" },
      { name: "CNPJ", desc: "Formato XX.XXX.XXX/XXXX-XX — valida duplicidade" },
      { name: "Segmento", desc: "Ramo de atuação da lead" },
      { name: "Status", desc: "Novo, Qualificado, Possível Cliente, Convertido Cliente, Perdido, Inativo" },
      {
        name: "Conversão",
        desc: "Separa as leads ainda sem conversão das que já viraram cliente (Convertidos)",
      },
    ],
    columns: [
      { name: "Tipo", desc: "PF (pessoa física) ou PJ (pessoa jurídica)" },
      { name: "Nome", desc: "Razão social ou nome da pessoa física" },
      { name: "Documento", desc: "CNPJ ou CPF" },
      { name: "Segmento", desc: "Ramo de atuação" },
      { name: "Responsável", desc: "Quem cuida da conta" },
      { name: "Status", desc: "Etapa atual no funil" },
      { name: "Ações", desc: "Ver, editar, abrir no mapa, transformar em cliente e exportar" },
    ],
    examples: [
      {
        title: "Promoção",
        desc: "Clica em 'Tornar cliente', confirma o aviso e a lead passa a aparecer em Convertidos",
      },
      {
        title: "Promoção",
        desc: "Os botões PDF, CSV e MD exportam exatamente o que está filtrado na tela",
      },
    ],
  },
  "/comercial/crm/saude-prospeccao": {
    title: "Saúde da Prospecção",
    description:
      "Painel de saúde da prospecção por cliente ou lead. Reúne visitas reais e ações reais do ano corrente, classifica cada linha em AEC, BEC ou Engajados e permite pedir uma análise de IA usando exclusivamente as regras do sistema.",
    rules: [
      "O recorte padrão é o ano corrente; a listagem de leads continua em /comercial/crm/leads.",
      "Lead promovida a cliente é agrupada com o cliente. Quem não virou cliente aparece pelo nome da lead.",
      "Cada coluna mostra somente dados reais da sua origem: ações não são espelhadas como visitas e visitas não são espelhadas como ações.",
      "Visitas e ações entram juntas no esforço e no engajamento com os mesmos pesos; timeline e tarefas não entram na pontuação.",
      "Engajamento acima de 30% classifica como Engajados e prevalece sobre as demais regras.",
      "Com engajamento de até 30%, esforço acima de 45% classifica como AEC; 45% ou menos classifica como BEC.",
      "Temperatura usa as regras do sistema: QUENTE com negociação ou ganho/pedido no mês, MORNO com proposta ou ganho/pedido no trimestre e FRIO nos demais casos.",
      "Conversão = conversão comercial (pedidos de venda ÷ oportunidades, até 50%) + conversão financeira (faturamentos ÷ pedidos de venda, até 50%), arredondada e limitada a 100%.",
      "No badge de itens de engajamento, proposta e oportunidade valem 36% cada; ata/relato, check-in/check-out e contato dividem os 28% restantes (9,33% cada).",
      "Clique em Visitas R/A/C para listar as visitas e em Ações R/A/C para listar as ações; cada item da lista abre o cadastro correspondente.",
      "Clique no nome do cliente/lead para ver visitas, ações, contatos, propostas, oportunidades e valores do período.",
      "As tabelas exportam CSV, PDF e MD respeitando o recorte e os filtros atuais.",
      "O botão Todas/Minhas altera todo o dashboard e os dois conjuntos de dados.",
      "O botão 'Analisar com IA' usa somente as linhas filtradas na tela. A análise sugere ações para elevar engajamento ou reduzir esforço sempre dentro das regras acima.",
      "No modal da análise é possível fazer perguntas complementares, gerar Markdown, concluir e enviar o resultado por e-mail e consultar análises salvas depois.",
      "O chat da IA consulta apenas consultas curadas e somente leitura; não é permitido SQL livre.",
      "Análises salvas ficam visíveis para o autor e para usuários ADMIN, SUDO ou CRM.",
    ],
    columns: [
      { name: "Nome", desc: "Cliente ou lead do período, com documento e segmento logo abaixo. Clicável — abre o modal completo." },
      {
        name: "Visitas R/A/C",
        desc: "Visitas reais realizadas / agendadas / canceladas no ano corrente; fica zerada quando não há visitas.",
      },
      {
        name: "Ações R/A/C",
        desc: "Ações reais realizadas / agendadas / canceladas no ano corrente.",
      },
      {
        name: "Última visita / Próxima visita",
        desc: "Datas das visitas reais; mostra — quando não há visitas.",
      },
      {
        name: "Última ação / Próxima ação",
        desc: "Datas das ações reais; mostra — quando não há ações.",
      },
      {
        name: "Itens de engajamento",
        desc: "Quantidade de itens presentes e percentual ponderado.",
      },
      { name: "STATUS OPORT.", desc: "Status da oportunidade mais avançada." },
      { name: "VALOR OPORT.", desc: "Soma dos valores das oportunidades." },
      { name: "PROB. OPORT.", desc: "Média das probabilidades das oportunidades." },
      {
        name: "Conversão",
        desc: "Percentual de pedidos + faturamentos sobre o total de visitas reais + ações reais.",
      },
      { name: "Esforço / Engajamento", desc: "Scores de 0 a 100%; clique para ver os critérios." },
    ],
    fields: [
      { name: "Buscar", desc: "Nome do cliente/lead, documento ou responsável." },
      { name: "Segmento", desc: "Filtra pelo segmento do cliente/lead." },
      { name: "Porte", desc: "Filtra pelo porte cadastrado." },
      { name: "Responsável", desc: "Filtra pelo usuário responsável." },
      { name: "Status da visita", desc: "Agendada, realizada, cancelada ou em andamento." },
      { name: "Status da oportunidade", desc: "Filtra pelo status das oportunidades vinculadas." },
      { name: "Tipo de visita", desc: "Presencial, vídeo ou telefone." },
      { name: "Só alertas (AEC/Engajados)", desc: "Mostra apenas AEC e Engajados; esconde BEC." },
      { name: "Todas / Minhas", desc: "Alterna entre todos os responsáveis e o usuário logado." },
    ],
    examples: [
      {
        title: "Sem dados de visitas",
        desc: "Cliente com 0 visitas reais e 4 ações reais (3 realizadas e 1 agendada) aparece com 0/0/0 em Visitas R/A/C e 3/1/0 em Ações R/A/C; esforço e engajamento usam as ações.",
      },
      {
        title: "Engajados prevalece",
        desc: "Esforço 80% e engajamento 45%: mesmo com esforço alto, o registro entra em Engajados.",
      },
      {
        title: "BEC no limite",
        desc: "Esforço exatamente 45% com engajamento 20% entra em BEC; apenas acima de 45% vira AEC.",
      },
    ],
  },
  "/comercial/crm/leads/dashboard": {
    title: "Saúde da Prospecção (endereço antigo)",
    description: "Endereço antigo do painel; o conteúdo foi movido para /comercial/crm/saude-prospeccao.",
    rules: ["Esta URL redireciona para /comercial/crm/saude-prospeccao."],
  },
  "/comercial/crm/leads/novo": {
    title: "Novo Lead",
    description:
      "Cadastre uma nova lead no CRM. O cadastro pode ser feito manualmente ou através da conversão de um lead qualificado.",
    rules: [
      "A razão social é obrigatória; o CNPJ é recomendado para evitar duplicidade.",
      "O botão 'Consultar' ao lado do CNPJ busca os dados na Receita Federal e preenche razão social, nome fantasia, endereço e segmento.",
      "Leads sem CNPJ podem ser cadastradas, mas a validação de unicidade não será aplicada.",
      "Após criar, você pode adicionar contatos, oportunidades e visitas.",
    ],
    fields: [
      { name: "Razão Social", desc: "Nome jurídico da lead (obrigatório)" },
      { name: "CNPJ", desc: "Cadastro Nacional de Pessoa Jurídica" },
      { name: "Segmento", desc: "Ramo de atuação (ex: Confecção, Estamparia, Têxtil)" },
      { name: "Responsável", desc: "Representante comercial responsável pela conta" },
    ],
  },
  "/comercial/crm/leads/[id]": {
    title: "Detalhe da Lead",
    description:
      "Visão completa de uma lead no CRM: dados cadastrais, cards de contatos, representantes, oportunidades, ações de prospecção e visitas, timeline clicável, WhatsApp, histórico de Resumos IA e chat de análise.",
    rules: [
      "A Timeline mostra todo o histórico de interações e cada evento com cadastro próprio abre o registro de origem.",
      "O WhatsApp permite enviar e receber mensagens diretamente pelo sistema (integrado com Evolution API + n8n).",
      "O Resumo IA é gerado manualmente pelo botão 'Gerar resumo' e usa cadastro, oportunidades, pedidos, visitas, ações, propostas, tarefas, WhatsApp, timeline e os resumos anteriores da lead.",
      "A classificação QUENTE/MORNO/FRIO do Resumo IA é calculada pelo sistema com base em oportunidades e pedidos do mês/trimestre; o status cadastral, a recência de contato e a qualidade dos registros não definem a faixa.",
      "Cada resumo gerado vira um evento clicável na Timeline e abre o texto completo no card 'Resumo IA'.",
      "No card 'Resumo IA' é possível selecionar resumos e exportar em MD, PDF ou TXT, em arquivo único ou arquivos separados.",
      "Não há card de Propostas nesta tela; as propostas continuam disponíveis na listagem geral e nos relatórios.",
      "Para editar os dados, clique em Editar no topo da página.",
      "Não há exclusão de lead: o cadastro é referenciado por veículos, oportunidades, propostas e visitas. O botão 'Tornar cliente' faz a promoção (cria ou reaproveita o cliente pelo CNPJ) e preserva o histórico.",
      "Promovida, a lead recebe a tarja 'Cliente' no topo e some da listagem padrão — o histórico continua aqui e nos relatórios.",
      "O card 'Histórico de conversão em cliente' mostra quando a lead virou cliente, quem promoveu, o cliente vinculado e o total de oportunidades, ações e visitas acumulados.",
    ],
    fields: [
      {
        name: "Contatos",
        desc: "Contatos da lead com cargo, e-mail e telefone e link para o cadastro",
      },
      {
        name: "Representantes",
        desc: "Representantes vinculados com busca e link para o cadastro",
      },
      { name: "Oportunidades", desc: "Negócios em aberto da lead com link para cada oportunidade" },
      { name: "Ações de Prospecção", desc: "Ações agendadas e realizadas com link para o detalhe" },
      { name: "Visitas", desc: "Visitas agendadas e realizadas com link para o detalhe" },
      { name: "Timeline", desc: "Histórico completo de eventos da lead em ordem cronológica" },
      { name: "WhatsApp", desc: "Painel de conversas WhatsApp vinculadas à lead" },
      {
        name: "Resumo IA",
        desc: "Histórico de resumos, botão 'Gerar resumo', classificação QUENTE/MORNO/FRIO e exportação MD/PDF/TXT",
      },
      {
        name: "Análise de IA",
        desc: "Chat de perguntas sobre a lead com base na timeline",
      },
      {
        name: "Histórico de conversão",
        desc: "Data, responsável, cliente vinculado e indicadores do período",
      },
    ],
    examples: [
      {
        title: "Resumo QUENTE",
        desc: "Exemplo: lead com oportunidade em NEGOCIAÇÃO ou pedido de venda emitido neste mês (mesmo com status ABERTO) aparece como QUENTE. A classificação é do sistema, não da IA.",
      },
      {
        title: "Exportação do histórico",
        desc: "Com 3 resumos selecionados, 'Arquivo único' gera um MD com os 3; 'Arquivos separados' gera 3 arquivos nomeados pelo id de cada resumo.",
      },
    ],
  },

  // ==================== OPORTUNIDADES ====================
  "/comercial/crm/oportunidades": {
    title: "Oportunidades",
    description:
      "Lista de oportunidades comerciais em andamento. Cada oportunidade representa uma negociação em potencial com uma lead, com valor estimado e estágio no pipeline.",
    rules: [
      "O pipeline segue o fluxo: Novo → Qualificação → Proposta → Negociação → Fechado Ganho/Perdido.",
      "Somente NOVO e QUALIFICACAO podem ficar sem Valor Estimado e Probabilidade; Proposta, Negociação, Ganho e Perdido exigem ambos preenchidos e maiores que 1. O sistema solicita o preenchimento ao mover ou alterar o status para esses estágios.",
      "Os estágios e rótulos vêm do cadastro de Status (Admin → Configurações → Status, tipo Oportunidade): um novo status ativo já aparece aqui e vira coluna no Kanban.",
      "A visualização padrão é em Kanban, com as oportunidades agrupadas por status; Cards e Tabela continuam disponíveis e usam os mesmos filtros.",
      "Em Tabela, Cards e Kanban, cada oportunidade mostra se há pedido vinculado, o status do pedido (Aberto, Parcial, Faturado ou Cancelado) e o valor faturado; sem pedido, o card exibe 'Sem pedido vinculado'.",
      "O valor faturado soma os itens dos faturamentos ativos da oportunidade, exceto os cancelados, e é atualizado quando você usa 'Verificar faturados'.",
      "O filtro Todas/Minhas começa em Todas, mostrando as oportunidades de todos os responsáveis; Minhas continua disponível para restringir ao usuário logado.",
      "O botão 'Saúde da Prospecção' no cabeçalho abre o painel por cliente ou lead com as classificações AEC, BEC e Engajados.",
      "Use o Kanban para arrastar oportunidades entre estágios do pipeline.",
      "Ao marcar como FECHADO_GANHO, é obrigatório ter um pedido do ERP vinculado; a lead vai para Possível Cliente, sem virar cliente automaticamente.",
      "Ao perder a última oportunidade, o sistema pergunta: marcar a lead como Perdida ou criar uma nova oportunidade e manter a lead Qualificada. Se houver outras oportunidades, a lead fica como está e você é avisado.",
      "Use 'Verificar faturados' para sincronizar o valor do pedido do ERP na oportunidade, marcar a oportunidade como Fechado Ganho, gerar/vincular o faturamento da nota real e converter a lead em cliente. Tudo é confirmado antes de aplicar.",
      "Todas as mudanças de status passam pelo motor de automações: o sistema registra log/timeline, notifica a equipe e nunca altera a lead às escondidas.",
      "O lápis da linha abre a oportunidade já em modo de edição (o mesmo que o botão 'Editar' do detalhe).",
      'Oportunidade (crm_oportunidades): é a negociação em si, o "deal" no pipeline de vendas. Avança por etapas (Novo → Qualificação → Proposta → Negociação → Ganho/Perdido) e guarda valorEstimado, probabilidade, responsável, previsão de fechamento, motivo da perda. É usada na previsão de vendas.',
      "Proposta (crm_propostas): é o documento comercial formal enviado ao cliente (o orçamento/PDF). Vinculada a uma oportunidade (oportunidadeId), guarda valor, condições de pagamento, prazo de entrega, link do PDF e status (Enviada → Aceita/Recusada/Em revisão).",
      "Por que ambas têm valor? São números de naturezas diferentes: a oportunidade guarda o valor estimado do negócio (projeção/previsão), e a proposta guarda o valor efetivamente cotado/oferecido ao cliente. Os dois são legítimos e complementares para acompanhar o funil.",
    ],
    fields: [
      { name: "Título", desc: "Nome da oportunidade (ex: Venda de 500m de malha)" },
      { name: "Lead", desc: "Lead vinculada à oportunidade" },
      { name: "Valor Estimado", desc: "Valor potencial da negociação" },
      {
        name: "Pedido / Faturamento",
        desc: "Status do pedido de venda vinculado e total faturado em reais",
      },
      {
        name: "Status",
        desc: "Estágio no pipeline: Novo → Qualificação → Proposta → Negociação → Fechado",
      },
    ],
    examples: [
      {
        title: "Exemplo do dia a dia",
        desc: 'A Tecelagem Y pediu 10.000 kg de malha penteada. Você cadastra a Oportunidade "Fornecimento Malha Penteada - Tecelagem Y" com valorEstimado de R$ 120.000 (sua projeção). À medida que o cliente negocia, você avança o status: Novo → Qualificação → Proposta → Negociação. Se fechar, o valor estimado é que alimenta a previsão de vendas.',
      },
      {
        title: "Quando cada uma é usada",
        desc: "Use a Oportunidade para acompanhar o funil e a previsão de venda. A Proposta surge um passo depois, quando você formaliza o orçamento ao cliente com o valor efetivamente cotado, condições e prazo. A mesma negociação pode ter 1 oportunidade e várias propostas (ex: revisões).",
      },
    ],
  },
  "/comercial/crm/oportunidades/novo": {
    title: "Nova Oportunidade",
    description:
      "Registre uma nova oportunidade de negócio. Toda oportunidade deve estar vinculada a uma lead existente no CRM.",
    rules: [
      "A lead deve estar cadastrada no CRM antes de criar a oportunidade.",
      "O campo Lead tem caixa de busca com lupa: digite parte do nome para reduzir as opções; a seleção continua no seletor abaixo.",
      "O valor estimado e a probabilidade são obrigatórios apenas quando o status inicial for diferente de NOVO e QUALIFICACAO; nesses estágios ambos devem ser maiores que 1.",
      "A oportunidade inicia como NOVO e segue o pipeline até o fechamento.",
      "É possível vincular a oportunidade a um lead de origem.",
    ],
    fields: [
      { name: "Título", desc: "Descrição resumida da oportunidade (obrigatório)" },
      { name: "Lead", desc: "Lead vinculada, com busca por nome" },
      { name: "Valor Estimado", desc: "Valor potencial da negociação" },
      { name: "Probabilidade", desc: "Chance estimada de fechamento (0-100%)" },
    ],
  },
  "/comercial/crm/oportunidades/[id]": {
    title: "Detalhe da Oportunidade",
    description:
      "Acompanhe o andamento de uma oportunidade: dados da negociação, timeline, propostas vinculadas e ações disponíveis.",
    rules: [
      "A timeline da oportunidade mostra todas as interações relacionadas.",
      "Alterar o status registra automaticamente na timeline.",
      "Ao fechar como PERDIDO, informe o motivo para análise futura. Se for a última oportunidade da lead, escolha entre perder a lead ou criar uma nova oportunidade.",
      "O botão 'Verificar faturados' consulta os pedidos já vinculados no ERP, localiza as notas faturadas e, para cada nota, vincula todos os pedidos que ela fatura. Ele sincroniza o valor da oportunidade com a soma dos pedidos, registra o faturamento pelo valor da nota, marca a oportunidade como Fechado Ganho e converte a lead em cliente após confirmação. Sem pedido vinculado, avisa para vincular ou lançar o pedido com o mesmo número do ERP.",
      "O botão 'Editar' abre o formulário da oportunidade (título, descrição, valor estimado, probabilidade, previsão de fechamento e responsável); ao salvar, as alterações são gravadas na mesma oportunidade e ficam registradas na timeline.",
      "Ao alterar o status para Proposta, Negociação, Ganho ou Perdido, o sistema exige Valor Estimado e Probabilidade maiores que 1 e solicita o preenchimento antes de salvar.",
      "O lápis da lista abre a oportunidade já em modo de edição (é o mesmo formulário do botão 'Editar').",
      "Se a oportunidade estiver como FECHADO_PERDIDO, o formulário de edição também permite corrigir o motivo da perda.",
      "Os cards 'Faturamentos' e 'Pedidos de Venda' listam os documentos já vinculados à oportunidade; o botão 'Novo Faturamento'/'Novo Pedido' cria um documento manualmente no CRM.",
      "O botão 'Vincular do ERP' no card de Pedidos de Venda espelha um pedido de venda existente no ERP no CRM e atualiza o valor da oportunidade com a soma dos pedidos vinculados. Não grava nada no ERP.",
      "A ação final dos três botões ('Vincular do ERP', 'Vincular faturado' e 'Verificar faturados') recalcula o valor estimado com a soma de todos os pedidos vinculados à oportunidade — um pedido ou vários — e grava esse valor na oportunidade. O valor da nota fica registrado apenas no faturamento.",
      "O botão 'Vincular faturado' localiza notas faturadas pelo número original do pedido do ERP (nosso_pedido, ex. 00007046) e lê o pedido real diretamente do ERP, inclusive os faturados que não aparecem mais na listagem de pedidos. Quando uma nota fatura mais de um pedido, todos são espelhados no CRM e vinculados à oportunidade; o valor estimado é a soma dos pedidos e o faturamento registra o valor da nota.",
      "O faturamento não tem mais botão próprio de vínculo: o 'Verificar faturados' e o 'Vincular faturado' geram/vinculam o faturamento da nota real do ERP à oportunidade e aos pedidos de venda da nota. 'Novo Faturamento' continua criando um faturamento manual.",
      "Ao abrir o modal de vínculo de pedido, o sistema varre os pedidos do ERP, atualiza o warehouse e regrava os documentos já vinculados que mudaram, sem precisar de botão de recarga.",
      "A listagem de pedidos do ERP não exibe cancelados nem já faturados; use 'Vincular faturado' para localizar a nota e trazer o pedido faturado para o CRM.",
      "No modal do ERP a busca é filtrada pelo CNPJ da lead da oportunidade (desmarque 'Só desta lead' para ver todos os documentos).",
      "O mesmo documento do ERP não pode ser vinculado duas vezes: ao tentar, o sistema avisa que ele já está vinculado.",
    ],
    fields: [
      { name: "Valor Estimado", desc: "Valor potencial registrado para a oportunidade" },
      { name: "Status", desc: "Estágio atual no pipeline comercial" },
      {
        name: "Motivo da Perda",
        desc: "Preenchido quando a oportunidade é perdida — usado pela IA para análise",
      },
      {
        name: "Editar",
        desc: "Edita título, descrição, valor, probabilidade, previsão, responsável e motivo da perda",
      },
      {
        name: "Vincular do ERP",
        desc: "Espelha um pedido de venda existente no ERP na oportunidade (origem ERP) e atualiza o valor estimado.",
      },
      {
        name: "Vincular faturado",
        desc: "Busca notas faturadas pelo número original do pedido no ERP (nosso_pedido), lê os pedidos reais do ERP, vincula todos os pedidos da nota e processa o faturamento pelo valor da nota.",
      },
    ],
  },
  "/comercial/crm/oportunidades/kanban": {
    title: "Kanban de Oportunidades",
    description:
      "Quadro visual com drag-and-drop para gerenciar o pipeline comercial. Arraste oportunidades entre colunas para atualizar o status automaticamente.",
    rules: [
      "Arraste um card para outra coluna para mudar o estágio da oportunidade.",
      "Ao arrastar para Proposta, Negociação, Ganho ou Perdido, o sistema solicita Valor Estimado e Probabilidade maiores que 1 antes de mover o card.",
      "O sistema normaliza status gravados anteriormente (ex. 'Novo') para o código do cadastro ('NOVO'), evitando colunas duplicadas no Kanban.",
      "As colunas vêm do cadastro de Status (Admin → Configurações → Status, tipo Oportunidade): cada status ativo com 'Exibir no Kanban' marcado vira uma coluna, na ordem configurada.",
      "Ao arrastar para FECHADO_PERDIDO, um modal solicitará o motivo da perda.",
      "Apenas usuários com permissão podem mover cards entre estágios.",
      "Cada card mostra o título, lead, valor e probabilidade da oportunidade.",
      "Clique no card para ver detalhes completos.",
    ],
    fields: [
      {
        name: "Colunas",
        desc: "Estágios do pipeline definidos no cadastro de Status (Novo → Qualificação → Proposta → Negociação → Ganho/Perdido)",
      },
      { name: "Card", desc: "Cada card = uma oportunidade com valor e probabilidade" },
      {
        name: "Drag & Drop",
        desc: "Arraste para mover entre estágios — a timeline registra automaticamente",
      },
    ],
  },
  "/comercial/crm/temperatura/kanban": {
    title: "Kanban de Temperatura — leads e clientes",
    description:
      "Quadro com as colunas Quentes, Mornos e Frios. Reúne leads ativos não promovidos e clientes; mover um card entre colunas altera oportunidades conforme a regra de temperatura e sempre pede confirmação.",
    rules: [
      "Colunas: Quente = Negociação ou ganho/pedido no mês; Morno = Proposta ou ganho/pedido no trimestre; Frio = sem Negociação, Proposta ou ganho/pedido no trimestre.",
      "A tela usa toda a largura disponível: no desktop as três colunas ficam lado a lado, ocupando juntas a largura da área de conteúdo; em telas menores elas se empilham e cada uma ocupa a largura toda.",
      "Cada coluna usa a cor Dracula da faixa (Quentes verde, Mornos laranja, Frios lilás); os cards usam um tom mais intenso da mesma cor e o botão da faixa atual fica com contorno destacado.",
      "O 'i' no cabeçalho de cada coluna explica a regra específica daquela faixa; o 'i' ao lado do título explica o kanban inteiro.",
      "O botão Flutuar abre o kanban em janela separada; Recolocar na aplicação fecha a janela e mantém o quadro no lugar.",
      "Lead promovido a cliente aparece apenas como Cliente; a faixa do cliente já inclui as oportunidades das pessoas promovidas.",
      "A busca aceita nome, razão social, fantasia, CPF/CNPJ com ou sem pontuação, segmento, responsável, contato, e-mail, telefone e cidade; acentos são ignorados.",
      "Os filtros são combináveis: Tipo (Todos/Leads/Clientes), Segmento (opções encontradas nos leads e clientes), Com/Sem oportunidade, Com/Sem pedido, Com/Sem visitas e Com/Sem ações; Com e Sem do mesmo recurso são exclusivos.",
      "Ao subir para Morno, o sistema cria uma oportunidade em Proposta ou pergunta qual oportunidade existente deve ir para Proposta; ao subir para Quente, faz o mesmo com Negociação.",
      "Ao descer de Quente para Morno, todas as oportunidades em Negociação devem ser rebaixadas para Proposta. Se houver ganho ou pedido no mês, a descida é bloqueada.",
      "Ao descer para Frio, todas as oportunidades em Proposta/Negociação devem ir para FECHADO_PERDIDO com motivo. Se houver ganho ou pedido no trimestre, a descida é bloqueada.",
      "Se a última oportunidade de uma lead for perdida, o sistema pergunta se a lead deve ser marcada como Perdida ou mantida como Qualificada com uma nova oportunidade.",
      "Além do arraste, cada card oferece botões para mover entre faixas por teclado.",
      "Se um movimento fizer o card deixar de atender aos filtros ativos, ele desaparece da lista após a atualização e um aviso é exibido.",
      "O botão 'Saúde da Prospecção' no cabeçalho abre o painel por cliente ou lead com as classificações AEC, BEC e Engajados.",
    ],
    fields: [
      { name: "Buscar leads e clientes", desc: "Campo de busca com limpar busca" },
      {
        name: "Tipo",
        desc: "Segmentado Todos, Leads ou Clientes",
      },
      {
        name: "Segmento",
        desc: "Select com os segmentos distintos encontrados nos leads e clientes carregados",
      },
      {
        name: "Com/Sem oportunidade",
        desc: "Filtra por totalOportunidades maior que zero ou igual a zero",
      },
      { name: "Com/Sem pedido", desc: "Filtra por totalPedidos maior que zero ou igual a zero" },
      { name: "Com/Sem visitas", desc: "Filtra por totalVisitas maior que zero ou igual a zero" },
      { name: "Com/Sem ações", desc: "Filtra por totalAcoes maior que zero ou igual a zero" },
      { name: "Flutuar", desc: "Abre o kanban em janela separada e permite recolocá-lo" },
      { name: "Card", desc: "Lead ou cliente com métricas, links e ações de mover" },
    ],
    examples: [
      {
        title: "Frio para Morno sem oportunidade",
        desc: "Ao mover um lead frio para Morno, o sistema pergunta se deseja criar uma oportunidade em Proposta. Confirmando, a faixa recalculada passa a Morno.",
      },
    ],
  },

  // ==================== VISITAS ====================
  "/comercial/crm/visitas": {
    title: "Visitas",
    description:
      "Agenda de visitas comerciais. Registre e acompanhe visitas presenciais, videochamadas e contatos telefônicos com leads.",
    rules: [
      "Visitas podem ser presenciais, por vídeo ou telefone.",
      "Visitas FUTURAS aparecem destacadas — são compromissos agendados.",
      "O status da visita muda automaticamente com base na data.",
      "É possível registrar fotos da visita no detalhe.",
      "A listagem abre na visão Calendário; alterne para Tabela ou Kanban quando quiser.",
      "Na Tabela e no Calendário, clique nos botões superiores de status para filtrar; 'Todos' limpa o filtro.",
      "No Kanban não há filtro superior: as colunas continuam agrupando as visitas por status.",
      "No calendário, clique em um dia para ver as visitas daquele dia. Clique em uma visita para ir ao detalhe.",
      "No Kanban, arraste os cards entre colunas para alterar o status da visita.",
    ],
    fields: [
      { name: "Lead", desc: "Lead visitada" },
      { name: "Data", desc: "Data e horário da visita" },
      { name: "Tipo", desc: "Presencial, Vídeo ou Telefone" },
      { name: "Status", desc: "Agendada, Realizada, Cancelada" },
    ],
  },
  "/comercial/crm/visitas/dashboard": {
    title: "Dashboard de Visitas",
    description:
      "Painel de visitas comerciais do ano corrente com indicadores, gráficos de desempenho, viagens e últimas visitas com cliente/lead, documento e oportunidades. A saúde da prospecção por cliente ou lead fica em /comercial/crm/saude-prospeccao.",
    rules: [
      "O recorte padrão é o ano corrente; a listagem de visitas continua em /comercial/crm/visitas.",
      "Os cards de resumo cobrem total de visitas, realizadas, canceladas, agendadas, de hoje, do mês, com pesquisa respondida e por tipo/status.",
      "Cada card é clicável e abre a lista de visitas daquele recorte; cada visita da lista abre o cadastro da visita.",
      "Os gráficos mostram visitas por dia, tipo, gerente e distribuição de status.",
      "A seção Viagens cruza visitas, investimentos, retorno possível e retorno real por viagem; clique numa viagem para abrir o cronograma.",
      "A tabela Últimas visitas e as tabelas da seção Viagens exportam CSV, PDF e MD respeitando o recorte atual.",
      "O botão Todas/Minhas Visitas altera todo o dashboard.",
      "Para comparar visitas e ações lado a lado, com esforço, engajamento e conversão por cliente/lead, use /comercial/crm/saude-prospeccao.",
    ],
    columns: [
      {
        name: "Últimas visitas",
        desc: "Visitas mais recentes do recorte com nome e documento do cliente, lead ou atendimento avulso, tipo, data, hora, status, endereço e quantidade de oportunidades.",
      },
      {
        name: "Viagens",
        desc: "Viagem, total de visitas, realizadas, período, investimento e retorno.",
      },
    ],
    fields: [
      {
        name: "Todas / Minhas Visitas",
        desc: "Alterna o recorte de todos os responsáveis para somente as visitas do usuário logado.",
      },
    ],
    examples: [
      {
        title: "Card clicável",
        desc: "Clique em Visitas Realizadas para abrir a lista somente das visitas realizadas no ano corrente.",
      },
      {
        title: "Saúde da prospecção",
        desc: "O atalho Saúde da Prospecção leva a /comercial/crm/saude-prospeccao, onde visitas e ações aparecem juntas por cliente/pessoa.",
      },
    ],
  },
  "/comercial/crm/visitas/novo": {
    title: "Nova Visita",
    description:
      "Agende uma visita a uma lead, a um cliente ou a um avulso. Informe o tipo, data, contato e observações sobre o objetivo da visita.",
    rules: [
      "Escolha quem será visitado: Lead (Negócio), Cliente ou Visita Avulsa.",
      "Os seletores de Cliente, Lead, Oportunidade e Contato têm caixa de busca com lupa: digite para reduzir as opções; a escolha é feita no seletor abaixo.",
      "Escolha o tipo: Presencial (vai até o cliente), Vídeo (chamada online) ou Telefone.",
      "A data e horário definem quando a visita será realizada.",
      "O contato é opcional — você pode selecionar um contato já cadastrado da lead ou do cliente.",
      "O botão (+) ao lado de Contato cadastra um novo contato vinculado à lead ou ao cliente da visita, sem sair da tela.",
      "Ao salvar com recorrência, a agenda cria uma visita por período definido.",
    ],
    fields: [
      { name: "Lead / Cliente", desc: "Quem será visitado (obrigatório, exceto na visita avulsa), com busca por nome" },
      { name: "Contato", desc: "Contato da lead ou do cliente, com busca por nome — pode ser cadastrado na hora" },
      { name: "Tipo", desc: "Presencial, Vídeo ou Telefone" },
      { name: "Data/Hora", desc: "Quando a visita será realizada" },
      { name: "Observações", desc: "Objetivo e pauta da visita" },
    ],
  },
  "/comercial/crm/visitas/[id]": {
    title: "Detalhe da Visita",
    description:
      "Acompanhe os detalhes de uma visita: dados do encontro, fotos, relato do representante e próximo passo.",
    rules: [
      "Visitas realizadas podem ter fotos anexadas.",
      "O relato da visita ajuda a IA a gerar resumo da lead.",
      "É possível alterar o status da visita (Realizada, Cancelada).",
      "Alguns campos podem não aparecer conforme as regras de visibilidade definidas em Admin › Configurações.",
      "No modo de edição você pode trocar o contato da visita e cadastrar um novo contato (+) da lead ou do cliente vinculado.",
      "No modo de edição, os seletores de Oportunidade e Contato têm caixa de busca com lupa: digite para reduzir as opções antes de escolher.",
      "Ao vincular uma visita avulsa, o seletor de Cliente ou Lead também tem busca com lupa.",
    ],
    fields: [
      { name: "Contato", desc: "Contato da visita, com busca por nome — pode ser alterado ou cadastrado na edição" },
      { name: "Fotos", desc: "Imagens registradas durante a visita" },
      { name: "Relato", desc: "Descrição do que foi tratado na visita" },
      { name: "Próximo Passo", desc: "Ação de follow-up acordada com o cliente" },
    ],
  },
  "/comercial/crm/acoes-prospeccao": {
    title: "Ações de Prospecção",
    description:
      "Agenda de ações de prospecção comercial. Registre e acompanhe ações presenciais, videochamadas e contatos telefônicos com leads e clientes.",
    rules: [
      "Ações de prospecção podem ser presenciais, por vídeo ou telefone.",
      "Ações FUTURAS aparecem destacadas — são compromissos agendados.",
      "O status da ação muda automaticamente com base na data.",
      "É possível registrar fotos da ação no detalhe.",
      "A listagem abre na visão Calendário; alterne para Tabela ou Kanban quando quiser.",
      "Na Tabela e no Calendário, clique nos botões superiores de status para filtrar; 'Todos' limpa o filtro.",
      "No Kanban não há filtro superior: as colunas continuam agrupando as ações por status.",
      "No calendário, clique em um dia para ver as ações daquele dia. Clique em uma ação para ir ao detalhe.",
      "No Kanban, arraste os cards entre colunas para alterar o status da ação.",
      "O botão 'Saúde da Prospecção' no cabeçalho abre o painel por cliente ou lead com visitas e ações reais e as classificações AEC, BEC e Engajados.",
    ],
    fields: [
      { name: "Lead", desc: "Lead ou cliente prospectado" },
      { name: "Data", desc: "Data e horário da ação" },
      { name: "Tipo", desc: "Presencial, Vídeo ou Telefone" },
      { name: "Status", desc: "Agendada, Realizada, Cancelada" },
    ],
  },
  "/comercial/crm/acoes-prospeccao/dashboard": {
    title: "Dashboard de Ações de Prospecção",
    description:
      "Painel de ações de prospecção do ano corrente com indicadores, gráficos de desempenho, viagens e últimas ações com cliente/lead, documento e oportunidades. A saúde da prospecção por cliente ou lead fica em /comercial/crm/saude-prospeccao.",
    rules: [
      "O recorte padrão é o ano corrente; a listagem de ações continua em /comercial/crm/acoes-prospeccao.",
      "Os cards de resumo cobrem total de ações, realizadas, canceladas, agendadas, de hoje, do mês, com pesquisa respondida e por tipo/status.",
      "Cada card é clicável e abre a lista de ações daquele recorte; cada ação da lista abre o cadastro da ação.",
      "Os gráficos mostram ações por dia, tipo, gerente e distribuição de status.",
      "A seção Viagens cruza ações, investimentos, retorno possível e retorno real por viagem; clique numa viagem para abrir o cronograma.",
      "A tabela Últimas ações e as tabelas da seção Viagens exportam CSV, PDF e MD respeitando o recorte atual.",
      "O botão Todas/Minhas Ações altera todo o dashboard.",
      "Para comparar visitas e ações lado a lado, com esforço, engajamento e conversão por cliente/lead, use /comercial/crm/saude-prospeccao.",
    ],
    columns: [
      {
        name: "Últimas ações",
        desc: "Ações mais recentes do recorte com nome e documento do cliente, lead ou atendimento avulso, tipo, data, hora, status, endereço e quantidade de oportunidades.",
      },
      {
        name: "Viagens",
        desc: "Viagem, total de ações, realizadas, período, investimento e retorno.",
      },
    ],
    fields: [
      {
        name: "Todas / Minhas Ações",
        desc: "Alterna o recorte de todos os responsáveis para somente as ações do usuário logado.",
      },
    ],
    examples: [
      {
        title: "Card clicável",
        desc: "Clique em Ações Realizadas para abrir a lista somente das ações realizadas no ano corrente.",
      },
      {
        title: "Saúde da prospecção",
        desc: "O atalho Saúde da Prospecção leva a /comercial/crm/saude-prospeccao, onde visitas e ações aparecem juntas por cliente/pessoa.",
      },
    ],
  },
  "/comercial/crm/acoes-prospeccao/novo": {
    title: "Nova Ação de Prospecção",
    description:
      "Agende uma ação de prospecção com uma lead, um cliente ou um avulso. Informe o tipo, data, contato e observações sobre o objetivo da ação.",
    rules: [
      "Escolha quem será prospectado: Lead (Negócio), Cliente ou Ação Avulsa.",
      "Os seletores de Cliente, Lead, Oportunidade e Contato têm caixa de busca com lupa: digite para reduzir as opções; a escolha é feita no seletor abaixo.",
      "Escolha o tipo: Presencial (vai até o cliente), Vídeo (chamada online) ou Telefone.",
      "A data e horário definem quando a ação será realizada.",
      "O contato é opcional — você pode selecionar um contato já cadastrado da lead ou do cliente.",
      "O botão (+) ao lado de Contato cadastra um novo contato vinculado à lead ou ao cliente da ação, sem sair da tela.",
      "Ao salvar com recorrência, a agenda cria uma ação por período definido.",
    ],
    fields: [
      {
        name: "Lead / Cliente",
        desc: "Quem será prospectado (obrigatório, exceto na ação avulsa), com busca por nome",
      },
      { name: "Contato", desc: "Contato da lead ou do cliente, com busca por nome — pode ser cadastrado na hora" },
      { name: "Tipo", desc: "Presencial, Vídeo ou Telefone" },
      { name: "Data/Hora", desc: "Quando a ação será realizada" },
      { name: "Observações", desc: "Objetivo e pauta da ação" },
    ],
  },
  "/comercial/crm/acoes-prospeccao/[id]": {
    title: "Detalhe da Ação de Prospecção",
    description:
      "Acompanhe os detalhes de uma ação de prospecção: dados do encontro, fotos, relato do representante e próximo passo.",
    rules: [
      "Ações realizadas podem ter fotos anexadas.",
      "O relato da ação ajuda a IA a gerar resumo da lead.",
      "É possível alterar o status da ação (Realizada, Cancelada).",
      "Alguns campos podem não aparecer conforme as regras de visibilidade definidas em Admin › Configurações.",
      "No modo de edição você pode trocar o contato da ação e cadastrar um novo contato (+) da lead ou do cliente vinculado.",
      "No modo de edição, os seletores de Oportunidade e Contato têm caixa de busca com lupa: digite para reduzir as opções antes de escolher.",
      "Ao vincular uma ação avulsa, o seletor de Cliente ou Lead também tem busca com lupa.",
    ],
    fields: [
      { name: "Contato", desc: "Contato da ação, com busca por nome — pode ser alterado ou cadastrado na edição" },
      { name: "Fotos", desc: "Imagens registradas durante a ação" },
      { name: "Relato", desc: "Descrição do que foi tratado na ação" },
      { name: "Próximo Passo", desc: "Ação de follow-up acordada com o cliente" },
    ],
  },

  // ==================== TAREFAS ====================
  "/comercial/crm/tarefas": {
    title: "Tarefas",
    description:
      "Lista de tarefas comerciais: ligações, reuniões, propostas a enviar e follow-ups. Gerencie seu dia a dia comercial com prazos e prioridades.",
    rules: [
      "Tarefas podem ser dos tipos: Ligação, Reunião, Proposta ou Tarefa genérica.",
      "Tarefas PENDENTES com data vencida aparecem em vermelho no topo.",
      "A IA Comercial pode criar tarefas de reativação automaticamente.",
      "Marque como CONCLUÍDA quando finalizar — a timeline registra automaticamente.",
      "No diálogo de nova tarefa, o seletor de Empresa tem caixa de busca com lupa: digite para reduzir as opções.",
    ],
    fields: [
      { name: "Título", desc: "Descrição resumida da tarefa" },
      { name: "Tipo", desc: "Ligação, Reunião, Proposta ou Tarefa" },
      { name: "Prioridade", desc: "Baixa, Média ou Alta" },
      { name: "Data Prevista", desc: "Prazo para conclusão da tarefa" },
      { name: "Status", desc: "Pendente, Em Andamento ou Concluída" },
      { name: "Empresa", desc: "Lead opcional vinculada à tarefa, com busca por nome" },
    ],
  },

  // ==================== PROPOSTAS ====================
  "/comercial/crm/propostas": {
    title: "Propostas",
    description:
      "Lista de propostas comerciais enviadas. Acompanhe o status de cada proposta: enviada, aceita, recusada ou em revisão.",
    rules: [
      "Cada proposta está vinculada a uma lead e opcionalmente a uma oportunidade.",
      "Ao ACEITAR uma proposta, a oportunidade vinculada avança no pipeline.",
      "Propostas podem ser impressas em PDF diretamente do sistema.",
      "O lápis da linha abre a proposta já em modo de edição (o mesmo que o botão 'Editar' do detalhe).",
      "O valor total e as condições são registrados para controle histórico.",
      'Oportunidade (crm_oportunidades): é a negociação em si, o "deal" no pipeline de vendas. Avança por etapas (Novo → Qualificação → Proposta → Negociação → Ganho/Perdido) e guarda valorEstimado, probabilidade, responsável, previsão de fechamento, motivo da perda. É usada na previsão de vendas.',
      "Proposta (crm_propostas): é o documento comercial formal enviado ao cliente (o orçamento/PDF). Vinculada a uma oportunidade (oportunidadeId), guarda valor, condições de pagamento, prazo de entrega, link do PDF e status (Enviada → Aceita/Recusada/Em revisão).",
      "Por que ambas têm valor? São números de naturezas diferentes: a oportunidade guarda o valor estimado do negócio (projeção/previsão), e a proposta guarda o valor efetivamente cotado/oferecido ao cliente. Os dois são legítimos e complementares para acompanhar o funil.",
    ],
    fields: [
      { name: "Lead", desc: "Lead destinatária da proposta" },
      { name: "Valor Total", desc: "Valor total da proposta" },
      { name: "Status", desc: "Enviada, Aceita, Recusada ou Em Revisão" },
      { name: "Validade", desc: "Prazo de validade da proposta" },
    ],
    examples: [
      {
        title: "Exemplo de proposta concreta",
        desc: 'Depois da negociação, você cria a Proposta "Orçamento Malha Penteada - Tecelagem Y" para o cliente, com valor de R$ 118.500 (o preço final cotado), condicoesPagamento "30/60/90 dias" e prazoEntrega "45 dias". Você anexa o link do PDF e o status vai de Enviada → Aceita (ou Recusada/Em revisão).',
      },
      {
        title: "Proposta x Oportunidade no exemplo",
        desc: "Na mesma negociação, a Oportunidade tinha valorEstimado R$ 120.000 (projeção do funil), mas a Proposta enviada ficou em R$ 118.500 (valor efetivamente cotado). Por isso os dois números existem: um alimenta a previsão de vendas, o outro é o compromisso formal com o cliente. A diferença é normal.",
      },
    ],
  },
  "/comercial/crm/propostas/novo": {
    title: "Nova Proposta",
    description:
      "Crie uma proposta comercial para uma lead. Preencha os dados, valores, condições e itens da proposta.",
    rules: [
      "A lead é obrigatória — a oportunidade é opcional.",
      "Os campos Lead e Oportunidade têm caixa de busca com lupa: digite para reduzir as opções antes de selecionar.",
      "O prazo de validade define até quando a proposta pode ser aceita.",
      "Após criar, você pode imprimir em PDF.",
      "Propostas podem ser revisadas e reenviadas.",
    ],
    fields: [
      { name: "Lead", desc: "Lead destinatária (obrigatório), com busca por nome" },
      { name: "Oportunidade", desc: "Oportunidade vinculada (opcional), com busca por título" },
      { name: "Valor Total", desc: "Valor comercial da proposta" },
      { name: "Validade", desc: "Prazo para aceitação da proposta" },
    ],
  },
  "/comercial/crm/propostas/[id]": {
    title: "Detalhe da Proposta",
    description:
      "Visualize os detalhes de uma proposta: dados comerciais, condições, timeline e ações de PDF.",
    rules: [
      "Clique em Imprimir para gerar o PDF da proposta.",
      "Altere o status conforme o retorno do cliente.",
      "Propostas ACEITAS podem gerar automaticamente um pedido.",
      "O botão 'Editar' abre o formulário dos campos comerciais (título, valor, prazo de entrega, condições de pagamento, descrição e link do PDF); salvar grava na própria proposta.",
      "O lápis da lista abre a proposta já em modo de edição.",
    ],
    fields: [
      { name: "Status", desc: "Enviada, Aceita, Recusada ou Em Revisão" },
      { name: "Valor Total", desc: "Valor registrado na proposta" },
      { name: "Condições", desc: "Forma de pagamento e condições comerciais" },
      {
        name: "Editar",
        desc: "Edita título, valor, prazo de entrega, condições, descrição e link do PDF",
      },
    ],
  },

  // ==================== FATURAMENTOS ====================
  "/comercial/crm/faturamentos": {
    title: "Faturamentos",
    description:
      "Lista de faturamentos vinculados a oportunidades. Representam o retorno real da negociação: quem comprou e o valor efetivamente faturado.",
    rules: [
      "Cada faturamento está vinculado a uma oportunidade e possui seus próprios itens (produto, quantidade, unidade e valor).",
      "O total do faturamento é a soma automática dos valores dos itens.",
      "Status: Emitido → Parcial → Recebido (ou Cancelado).",
      "O Retorno Real (dashboard de visitas / detalhe da viagem) é a soma dos faturamentos das oportunidades vinculadas às visitas daquela viagem.",
      "Origem ERP indica registros importados de sistemas externos, identificados pela referência externa.",
    ],
    fields: [
      { name: "Número", desc: "Identificação do faturamento" },
      { name: "Oportunidade", desc: "Negociação do CRM à qual o faturamento pertence" },
      { name: "Total", desc: "Soma dos valores dos itens" },
      { name: "Status", desc: "Emitido, Parcial, Recebido ou Cancelado" },
    ],
  },
  "/comercial/crm/faturamentos/novo": {
    title: "Novo Faturamento",
    description:
      "Registre um faturamento para uma oportunidade, informando capa (número, data, status) e os itens vendidos.",
    rules: [
      "A oportunidade é obrigatória.",
      "O seletor de Oportunidade tem caixa de busca com lupa: digite o título para reduzir as opções.",
      "Adicione ao menos um item com produto preenchido.",
      "O valor total do item é calculado automaticamente pela quantidade × valor unitário, mas pode ser ajustado.",
      "Use 'OUTRA' na unidade quando a medida não estiver na lista.",
    ],
    fields: [
      { name: "Oportunidade", desc: "Oportunidade vinculada (obrigatório), com busca por título" },
      { name: "Data de Emissão", desc: "Data em que o faturamento foi emitido" },
      { name: "Itens", desc: "Produto, código, unidade, quantidade, valor unitário e valor total" },
    ],
  },
  "/comercial/crm/faturamentos/[id]": {
    title: "Detalhe do Faturamento",
    description: "Visualize e edite um faturamento: dados da capa e itens registrados.",
    rules: [
      "O valor total exibido é a soma dos itens.",
      "Ao editar, os itens são substituídos pelos salvos.",
      "A origem ERP exibe a referência externa do sistema de origem.",
      "No formulário de edição, o seletor de Oportunidade tem caixa de busca com lupa por título.",
      "O vínculo com pedidos aparece na timeline de cada pedido; clique no evento para abrir este faturamento.",
    ],
    fields: [
      { name: "Status", desc: "Emitido, Parcial, Recebido ou Cancelado" },
      { name: "Itens", desc: "Produto, unidade, quantidade e valor total" },
    ],
  },

  // ==================== PEDIDOS DE VENDA ====================
  "/comercial/crm/pedidos-venda": {
    title: "Pedidos de Venda",
    description:
      "Lista de pedidos de venda gerados a partir de oportunidades. Alimentam o KPI de Vendas.",
    rules: [
      "Cada pedido está vinculado a uma oportunidade e possui seus próprios itens.",
      "O total do pedido é a soma automática dos valores dos itens.",
      "Status: Aberto → Parcial → Faturado (ou Cancelado).",
      "O KPI Vendas (dashboard de visitas / detalhe da viagem) é a soma dos pedidos de venda das oportunidades vinculadas às visitas daquela viagem.",
      "Origem ERP indica pedidos importados de sistemas externos, identificados pela referência externa.",
      "O botão 'Verificar faturados' no topo consulta todos os pedidos vinculados a oportunidades; o ícone da linha consulta apenas aquele pedido. Para cada nota, o sistema lê direto do ERP todos os pedidos faturados por ela e os vincula à mesma oportunidade.",
      "Ao confirmar, o sistema atualiza o valor da oportunidade com a soma dos pedidos, marca Fechado Ganho, registra o faturamento pelo valor da nota e converte a lead em cliente. Um faturamento pode estar vinculado a vários pedidos. Pedidos já convertidos aparecem como 'Já convertida'.",
      "O status exibido é o do CRM; pedidos do ERP mostram também o status recebido do ERP e seu código em 'ERP: ...'.",
      "A sincronização nunca altera o status do CRM; ela apenas atualiza o status ERP, inclusive quando o ERP retorna cancelado.",
      "A timeline do pedido registra criação, faturamento, mudanças de status e sincronizações do ERP. Clique no evento para abrir o registro relacionado.",
    ],
    fields: [
      { name: "Número", desc: "Identificação do pedido" },
      { name: "Oportunidade", desc: "Negociação do CRM à qual o pedido pertence" },
      { name: "Total", desc: "Soma dos valores dos itens" },
      { name: "Status", desc: "Status do CRM: Aberto, Parcial, Faturado ou Cancelado" },
      { name: "ERP", desc: "Status informado pelo ERP e seu código, somente leitura" },
    ],
  },
  "/comercial/crm/pedidos-venda/novo": {
    title: "Novo Pedido de Venda",
    description:
      "Registre um pedido de venda para uma oportunidade, informando capa (número, data, status) e os itens vendidos.",
    rules: [
      "A oportunidade é obrigatória.",
      "O seletor de Oportunidade tem caixa de busca com lupa: digite o título para reduzir as opções.",
      "Adicione ao menos um item com produto preenchido.",
      "O valor total do item é calculado automaticamente pela quantidade × valor unitário, mas pode ser ajustado.",
      "Use 'OUTRA' na unidade quando a medida não estiver na lista.",
    ],
    fields: [
      { name: "Oportunidade", desc: "Oportunidade vinculada (obrigatório), com busca por título" },
      { name: "Data de Emissão", desc: "Data em que o pedido foi emitido" },
      { name: "Itens", desc: "Produto, código, unidade, quantidade, valor unitário e valor total" },
    ],
  },
  "/comercial/crm/pedidos-venda/[id]": {
    title: "Detalhe do Pedido de Venda",
    description: "Visualize e edite um pedido de venda: dados da capa e itens registrados.",
    rules: [
      "O valor total exibido é a soma dos itens.",
      "Ao editar, os itens são substituídos pelos salvos.",
      "A origem ERP exibe a referência externa do sistema de origem.",
      "No formulário de edição, o seletor de Oportunidade tem caixa de busca com lupa por título.",
      "Na verificação de faturados, o status é escolhido individualmente por pedido e permanece mesmo que o ERP continue informando outro status.",
      "O status ERP aparece ao lado do status do CRM e é somente leitura; a sincronização atualiza esse espelho sem sobrescrever o CRM.",
      "A timeline reúne eventos do pedido, da nota faturada, da oportunidade e das sincronizações. Clique no evento para abrir o registro relacionado.",
    ],
    fields: [
      { name: "Status", desc: "Status do CRM: Aberto, Parcial, Faturado ou Cancelado" },
      { name: "ERP", desc: "Status informado pelo ERP e seu código, somente leitura" },
      { name: "Itens", desc: "Produto, unidade, quantidade e valor total" },
      { name: "Timeline", desc: "Histórico clicável de criação, vínculos, status, faturamento e sincronizações" },
    ],
  },

  // ==================== REGIÕES ====================
  "/comercial/crm/regioes": {
    title: "Promoção",
    description:
      "Cadastro de regiões comerciais. Organize o território de vendas por regiões geográficas com gerentes responsáveis.",
    rules: [
      "Cada região pode ter um gerente responsável.",
      "Regiões são usadas para organizar equipes comerciais.",
      "Apenas ADMIN/SUDO podem excluir regiões.",
      "Regiões ativas aparecem nos filtros de relatórios.",
    ],
    fields: [
      { name: "Nome", desc: "Nome da região (ex: São Paulo, Nordeste)" },
      { name: "UF", desc: "Unidade Federativa (opcional)" },
      { name: "Gerente", desc: "Usuário responsável pela região" },
    ],
  },

  // ==================== EQUIPES ====================
  "/comercial/crm/equipes": {
    title: "Equipes",
    description:
      "Cadastro de equipes comerciais. Crie equipes com ou sem região definida e adicione representantes de qualquer estado/região.",
    rules: [
      "A região é opcional — a equipe pode ter representantes de qualquer localidade.",
      "Clique em uma equipe para gerenciar seus membros.",
      "Adicione representantes buscando por nome ou CNPJ.",
      "Apenas ADMIN/SUDO podem excluir equipes.",
      "Equipes ativas aparecem na distribuição de leads e relatórios.",
    ],
    fields: [
      { name: "Nome", desc: "Nome da equipe comercial" },
      { name: "Região", desc: "Região geográfica (opcional)" },
      { name: "Responsável", desc: "Líder/coordenador da equipe" },
      { name: "Membros", desc: "Representantes que compõem a equipe" },
    ],
  },

  // ==================== CAMPANHAS ====================
  "/comercial/crm/campanhas": {
    title: "Campanhas",
    description:
      "Lista de campanhas de marketing e comunicação. Gerencie campanhas de e-mail, WhatsApp, redes sociais e eventos.",
    rules: [
      "Tipos de campanha: E-mail, WhatsApp, Redes Sociais ou Evento.",
      "O status define se a campanha está ativa, pausada ou concluída.",
      "Leads gerados por campanhas são contabilizados automaticamente.",
      "O ROI pode ser calculado a partir do custo de aquisição vs leads gerados.",
    ],
    fields: [
      { name: "Nome", desc: "Identificação da campanha" },
      { name: "Tipo", desc: "E-mail, WhatsApp, Redes Sociais ou Evento" },
      { name: "Período", desc: "Data de início e fim da campanha" },
      { name: "Orçamento", desc: "Valor investido na campanha" },
      { name: "Leads Gerados", desc: "Quantidade de leads captados pela campanha" },
    ],
  },
  "/comercial/crm/campanhas/nova": {
    title: "Nova Campanha",
    description:
      "Crie uma nova campanha de marketing. Defina o tipo, período, orçamento e público-alvo.",
    rules: [
      "O nome é obrigatório; os demais campos são opcionais.",
      "Campanhas ativas aparecem no dashboard.",
      "O custo de aquisição é calculado automaticamente ao informar leads gerados.",
    ],
    fields: [
      { name: "Nome", desc: "Nome da campanha (obrigatório)" },
      { name: "Tipo", desc: "E-mail, WhatsApp, Redes Sociais ou Evento" },
      { name: "Orçamento", desc: "Valor investido" },
      { name: "Período", desc: "Data de início e fim" },
    ],
  },
  "/comercial/crm/campanhas/[id]": {
    title: "Detalhe da Campanha",
    description:
      "Acompanhe o desempenho de uma campanha: métricas, leads gerados, custo e resultados.",
    rules: [
      "Edite os campos diretamente para atualizar métricas.",
      "Leads gerados podem ser vinculados manualmente.",
      "O custo de aquisição (CAC) é calculado: orçamento ÷ leads gerados.",
    ],
    fields: [
      { name: "Status", desc: "Ativa, Pausada ou Concluída" },
      { name: "Leads Gerados", desc: "Total de leads captados" },
      { name: "Custo Aquisição", desc: "Custo médio por lead (CAC)" },
    ],
  },

  // ==================== REGIÕES ====================
  "/comercial/crm/relatorios": {
    title: "Relatórios CRM",
    description:
      "Análise consolidada dos dados do CRM com gráficos de leads por origem, pipeline, performance por representante, tarefas e taxa de conversão.",
    rules: [
      "Os cards de indicador e os cards de gráfico usam a cor do tema Dracula e um pequeno ícone, os dois derivados do título: o mesmo título mantém sempre a mesma cor e o mesmo ícone, mesmo que a ordem dos cards mude. A cor é só identificação visual — os números continuam sendo os do banco.",
      "Os dados são atualizados em tempo real com base no banco.",
      "Use os gráficos para identificar gargalos no pipeline.",
      "A taxa de conversão considera apenas oportunidades fechadas (ganhas vs perdidas).",
      "Os relatórios ajudam a IA Comercial a gerar previsões mais precisas.",
      "Na parte inferior estão os relatórios detalhados: Atividades, Leads, Oportunidades, Propostas, Visitas, Conversões e Clientes.",
      "Cada relatório detalhado tem filtros por período, cards de resumo, listagem completa e exportação em PDF, CSV e Markdown.",
    ],
    fields: [
      { name: "Leads por Origem", desc: "Distribuição dos leads pelo canal de captação" },
      { name: "Pipeline", desc: "Quantidade de oportunidades por estágio" },
      { name: "Representantes", desc: "Oportunidades abertas por vendedor" },
      {
        name: "Propostas por Status",
        desc: "Distribuição das propostas: enviadas, aceitas, recusadas",
      },
      { name: "Conversão", desc: "Taxa de conversão geral do funil comercial" },
    ],
  },

  "/comercial/crm/relatorios/atividades": {
    title: "Relatório de Atividades do CRM",
    description:
      "Mostra tudo que as contas comerciais fizeram no CRM: registros criados por lead, cliente, oportunidade, proposta, visita, tarefa, lead e contato, com data, hora e lead ou cliente envolvida.",
    rules: [
      "Os cards de resumo usam a cor do tema Dracula e um pequeno ícone, os dois derivados do rótulo do card: o mesmo rótulo mantém sempre a mesma cor e o mesmo ícone.",
      "A base do relatório é a tabela de logs: cada ação registrada no CRM aparece aqui.",
      "Os cards comparam o período escolhido com hoje, últimos 7 dias e mês atual.",
      "A tabela 'Produção por usuário' mostra quantos registros cada usuário criou em cada intervalo.",
      "O filtro de período vale para os cards, para a tabela e para as exportações.",
      "Use o filtro Usuário para medir a produção de uma conta específica.",
      "A categoria Clientes reúne as ações feitas no cadastro do cliente (criação, edição, exclusão, representantes e contatos vinculados).",
      "A exportação gera PDF, CSV e Markdown com os mesmos dados da tela.",
    ],
    fields: [
      { name: "Data e hora", desc: "Momento da atividade registrada" },
      { name: "Usuário", desc: "Conta comercial que realizou a ação" },
      { name: "Ação", desc: "O que foi feito (criar, mover, atualizar, excluir)" },
      { name: "Entidade", desc: "Registro do CRM afetado" },
      { name: "Lead", desc: "Lead ou empresa envolvida na atividade" },
      { name: "Cliente", desc: "Cliente vinculado, quando existir" },
    ],
  },

  "/comercial/crm/relatorios/leads": {
    title: "Relatório de Leads do CRM",
    description:
      "Relatório do cadastro de leads do CRM criado no período, com tipo de lead, documento, segmento, cidade, responsável, vínculo com cliente e a tarja de cliente (promoção).",
    rules: [
      "Os cards de resumo usam a cor do tema Dracula e um pequeno ícone, os dois derivados do rótulo do card: o mesmo rótulo mantém sempre a mesma cor e o mesmo ícone.",
      "O período padrão é os últimos 7 dias; troque para Hoje, Mês ou um período personalizado.",
      "PF e PJ são separados nos cards de resumo.",
      "Leads convertidas em cliente são as que já possuem vínculo na tabela de Clientes.",
      "A tarja de cliente marca quem foi promovido pelo botão 'Tornar cliente': o filtro 'Tarja de cliente' separa o que já virou cliente (Com tarja) do que ainda não virou (Sem tarja).",
      "Quem tem tarja também mostra a data da conversão e quem promoveu.",
      "A tabela rola na vertical e na horizontal, com o cabeçalho fixo durante a navegação.",
      "A exportação gera PDF, CSV e Markdown com os mesmos dados da tela.",
    ],
    fields: [
      { name: "Data e hora", desc: "Momento do cadastro da lead" },
      { name: "Nome", desc: "Nome da pessoa física ou razão social" },
      { name: "Tipo", desc: "PF (pessoa física) ou PJ (pessoa jurídica)" },
      { name: "Documento", desc: "CPF ou CNPJ" },
      { name: "Segmento", desc: "Segmento comercial da lead" },
      { name: "Responsável", desc: "Conta comercial responsável pelo cadastro" },
      { name: "Cliente", desc: "Sim quando a lead já está convertida em cliente" },
      { name: "Tarja", desc: "Sim quando a lead foi promovida a cliente" },
      { name: "Virou cliente em", desc: "Data e hora da promoção" },
      { name: "Promovido por", desc: "Quem realizou a promoção" },
    ],
  },

  "/comercial/crm/relatorios/conversoes": {
    title: "Relatório de Conversões do CRM",
    description:
      "Leads que viraram cliente (tarja de cliente) no período, com o cliente vinculado, quem promoveu e o negócio gerado por cada uma (oportunidades, propostas e visitas).",
    rules: [
      "Os cards de resumo usam a cor do tema Dracula e um pequeno ícone, os dois derivados do rótulo do card: o mesmo rótulo mantém sempre a mesma cor e o mesmo ícone.",
      "Só entram no relatório as leads promovidas a cliente com a ação 'Tornar cliente'.",
      "O período padrão é os últimos 7 dias; troque para Hoje, Mês ou um período personalizado.",
      "O filtro Usuário mostra quem fez cada promoção.",
      "Os cards mostram o total de conversões e o negócio gerado (oportunidades, propostas, visitas e valores).",
      "O ticket médio é o valor das propostas dividido pelo número de conversões do período.",
      "A tabela rola na vertical e na horizontal, com o cabeçalho fixo durante a navegação.",
      "A exportação gera PDF, CSV e Markdown com os mesmos dados da tela.",
    ],
    fields: [
      { name: "Data da conversão", desc: "Data e hora da promoção a cliente" },
      { name: "Lead", desc: "Lead que virou cliente" },
      { name: "Cliente", desc: "Cliente vinculado pela promoção" },
      { name: "Promovido por", desc: "Usuário que realizou a promoção" },
      { name: "Oportunidades", desc: "Quantidade de oportunidades da lead" },
      { name: "Propostas", desc: "Quantidade de propostas da lead" },
      { name: "Visitas", desc: "Quantidade de visitas da lead" },
      { name: "Valor das propostas", desc: "Soma do valor das propostas da lead" },
    ],
  },

  "/comercial/crm/relatorios/clientes": {
    title: "Relatório de Clientes do CRM",
    description:
      "Visão consolidada de cada cliente com o negócio do período: leads promovidas, oportunidades (em aberto e valor), propostas e visitas — incluindo o que foi feito nas leads do CRM que viraram o cliente.",
    rules: [
      "Os cards de resumo usam a cor do tema Dracula e um pequeno ícone, os dois derivados do rótulo do card: o mesmo rótulo mantém sempre a mesma cor e o mesmo ícone.",
      "O período padrão é os últimos 7 dias; troque para Hoje, Mês ou um período personalizado.",
      "O filtro Segmento separa os clientes por ramo de atividade.",
      "O card 'Clientes com negócio' mostra quem teve oportunidade, proposta ou visita no período.",
      "O negócio herdado das leads promovidas aparece junto do negócio lançado direto no cliente.",
      "O nome do cliente é um link para a tela do cliente, com todos os relacionamentos do CRM.",
      "A tabela rola na vertical e na horizontal, com o cabeçalho fixo durante a navegação.",
      "A exportação gera PDF, CSV e Markdown com os mesmos dados da tela.",
    ],
    fields: [
      { name: "Cliente", desc: "Nome do cliente (link para a tela do cliente)" },
      { name: "CNPJ", desc: "CNPJ do cliente" },
      { name: "Segmento", desc: "Segmento comercial do cliente" },
      { name: "Cidade/UF", desc: "Local do cliente" },
      { name: "Leads", desc: "Leads do CRM promovidas a este cliente" },
      { name: "Oportunidades", desc: "Oportunidades do cliente no período" },
      { name: "Em aberto", desc: "Oportunidades que ainda não foram fechadas" },
      { name: "Valor das oportunidades", desc: "Soma do valor estimado das oportunidades" },
      { name: "Propostas", desc: "Propostas do cliente no período" },
      { name: "Valor das propostas", desc: "Soma do valor das propostas" },
      { name: "Visitas", desc: "Visitas do cliente no período" },
    ],
  },

  "/comercial/crm/relatorios/oportunidades": {
    title: "Relatório de Oportunidades do CRM",
    description:
      "Oportunidades criadas no período com status, valor estimado, probabilidade, responsável e a lead ou cliente relacionada.",
    rules: [
      "Os cards de resumo usam a cor do tema Dracula e um pequeno ícone, os dois derivados do rótulo do card: o mesmo rótulo mantém sempre a mesma cor e o mesmo ícone.",
      "Os cards mostram o total, as em aberto, as ganhas, as perdidas e a taxa de conversão.",
      "A taxa de conversão considera apenas as oportunidades do período selecionado.",
      "O valor ponderado soma o valor estimado multiplicado pela probabilidade de cada oportunidade.",
      "A tabela rola na vertical e na horizontal, com o cabeçalho fixo durante a navegação.",
      "A exportação gera PDF, CSV e Markdown com os mesmos dados da tela.",
    ],
    fields: [
      { name: "Data e hora", desc: "Momento da criação da oportunidade" },
      { name: "Título", desc: "Nome da oportunidade" },
      { name: "Lead", desc: "Lead ou empresa da oportunidade" },
      { name: "Cliente", desc: "Cliente vinculado, quando existir" },
      { name: "Responsável", desc: "Conta comercial responsável" },
      { name: "Status", desc: "Estágio atual da oportunidade" },
      { name: "Valor", desc: "Valor estimado da oportunidade" },
      { name: "Probabilidade", desc: "Percentual de fechamento" },
    ],
  },

  "/comercial/crm/relatorios/propostas": {
    title: "Relatório de Propostas do CRM",
    description:
      "Propostas do CRM criadas no período, com valor, status (enviada, aceita, recusada ou em revisão), responsável e a lead ou cliente atendida.",
    rules: [
      "Os cards de resumo usam a cor do tema Dracula e um pequeno ícone, os dois derivados do rótulo do card: o mesmo rótulo mantém sempre a mesma cor e o mesmo ícone.",
      "A taxa de aceitação considera as propostas aceitas sobre o total do período.",
      "O valor aceito soma apenas as propostas com status ACEITA.",
      "O filtro Status permite separar enviadas, aceitas, recusadas e em revisão.",
      "A tabela rola na vertical e na horizontal, com o cabeçalho fixo durante a navegação.",
      "A exportação gera PDF, CSV e Markdown com os mesmos dados da tela.",
    ],
    fields: [
      { name: "Data e hora", desc: "Momento da criação da proposta" },
      { name: "Título", desc: "Título da proposta" },
      { name: "Lead", desc: "Lead ou empresa atendida" },
      { name: "Cliente", desc: "Cliente vinculado, quando existir" },
      { name: "Responsável", desc: "Usuário que criou a proposta" },
      { name: "Status", desc: "ENVIADA, ACEITA, RECUSADA ou REVISAO" },
      { name: "Valor", desc: "Valor da proposta" },
    ],
  },

  "/comercial/crm/relatorios/visitas": {
    title: "Relatório de Visitas do CRM",
    description:
      "Visitas do CRM realizadas ou agendadas no período, separando o tipo presencial, por vídeo e por telefone, com cidade, responsável e lead ou cliente atendido.",
    rules: [
      "Os cards de resumo usam a cor do tema Dracula e um pequeno ícone, os dois derivados do rótulo do card: o mesmo rótulo mantém sempre a mesma cor e o mesmo ícone.",
      "O relatório considera o registro da visita, não o relatório de campo preenchido depois.",
      "A taxa de comparecimento compara as visitas concluídas com o total do período.",
      "O filtro Tipo separa visitas presenciais, por vídeo e por telefone.",
      "A tabela rola na vertical e na horizontal, com o cabeçalho fixo durante a navegação.",
      "A exportação gera PDF, CSV e Markdown com os mesmos dados da tela.",
    ],
    fields: [
      { name: "Data e hora", desc: "Data e hora da visita" },
      { name: "Tipo", desc: "PRESENCIAL, VIDEO ou TELEFONE" },
      { name: "Lead", desc: "Lead, empresa ou visita avulsa" },
      { name: "Cliente", desc: "Cliente vinculado, quando existir" },
      { name: "Responsável", desc: "Usuário que agendou a visita" },
      { name: "Status", desc: "Situação da visita" },
      { name: "Local", desc: "Cidade e UF da visita" },
    ],
  },
  "/comercial/crm/relatorios/acoes-prospeccao": {
    title: "Relatório de Ações de Prospecção do CRM",
    description:
      "Ações de prospecção do CRM realizadas ou agendadas no período, separando o tipo presencial, por vídeo e por telefone, com cidade, responsável e lead ou cliente prospectado.",
    rules: [
      "Os cards de resumo usam a cor do tema Dracula e um pequeno ícone, os dois derivados do rótulo do card: o mesmo rótulo mantém sempre a mesma cor e o mesmo ícone.",
      "O relatório considera o registro da ação, não o relatório de campo preenchido depois.",
      "A taxa de comparecimento compara as ações concluídas com o total do período.",
      "O filtro Tipo separa ações presenciais, por vídeo e por telefone.",
      "A tabela rola na vertical e na horizontal, com o cabeçalho fixo durante a navegação.",
      "A exportação gera PDF, CSV e Markdown com os mesmos dados da tela.",
    ],
    fields: [
      { name: "Data e hora", desc: "Data e hora da ação" },
      { name: "Tipo", desc: "PRESENCIAL, VIDEO ou TELEFONE" },
      { name: "Lead", desc: "Lead, empresa ou ação avulsa" },
      { name: "Cliente", desc: "Cliente vinculado, quando existir" },
      { name: "Responsável", desc: "Usuário que agendou a ação" },
      { name: "Status", desc: "Situação da ação" },
      { name: "Local", desc: "Cidade e UF da ação" },
    ],
  },

  // ==================== TREINAMENTO ====================
  "/comercial/crm/treinamento": {
    title: "Treinamento CRM",
    description:
      "Central de documentação e treinamento do CRM. Aqui você encontra explicações detalhadas de cada tela, campo por campo, com pré-requisitos, links para POPs e vídeos tutoriais.",
    rules: [
      "Navegue pelos módulos e expanda para ver as lições disponíveis",
      "Cada lição documenta uma tela específica do CRM",
      "Use o botão Exportar PDF para gerar um documento com cabeçalho e rodapé",
      "Links de POPs e vídeos tutoriais abrem em nova aba",
    ],
    fields: [],
  },
  "/comercial/crm/treinamento/admin": {
    title: "Gerenciar Treinamento",
    description:
      "Gerencie os módulos e lições do treinamento. Crie, edite ou remova conteúdo de documentação do CRM.",
    rules: [
      "Módulos agrupam lições relacionadas",
      "Cada lição contém documentação em markdown",
      "É possível adicionar links de POPs e vídeos tutoriais em cada lição",
      "Marque como inativo para ocultar sem deletar",
    ],
    fields: [],
  },
  "/comercial/crm/treinamento/admin/novo": {
    title: "Nova Lição de Treinamento",
    description:
      "Crie uma nova lição de treinamento com conteúdo markdown, pré-requisitos e links multimídia.",
    rules: [
      "Selecione o módulo ao qual a lição pertence",
      "Preencha o conteúdo em markdown para formatação rica",
      "Adicione links de POPs (procedimentos) e vídeos tutoriais",
      "O pathname relacionado vincula a lição a uma tela específica do CRM",
    ],
    fields: [
      { name: "Módulo", desc: "Obrigatório. Módulo de treinamento ao qual esta lição pertence" },
      { name: "Título", desc: "Obrigatório. Nome da lição que aparecerá na lista" },
      { name: "Ordem", desc: "Posição da lição dentro do módulo" },
      {
        name: "Pathname relacionado",
        desc: "Caminho da tela CRM relacionada (ex: /comercial/crm/visitantes)",
      },
      {
        name: "Pré-requisitos",
        desc: "Lista de cadastros indispensáveis para usar a tela documentada",
      },
      {
        name: "Conversão",
        desc: "Documentação em markdown. Use ## para títulos, **negrito**, - listas",
      },
      { name: "Links POP", desc: "Links para Procedimentos Operacionais Padrão relacionados" },
      { name: "Links Vídeos", desc: "Links para vídeos tutoriais explicativos" },
    ],
  },
  "/comercial/crm/treinamento/": {
    title: "Detalhe da Lição",
    description:
      "Leia o conteúdo completo da lição de treinamento. Aqui você encontra a documentação detalhada da tela, pré-requisitos, links para POPs e vídeos tutoriais.",
    rules: [
      "Use Exportar PDF para gerar um documento com cabeçalho e rodapé",
      "Links de POPs e vídeos tutoriais abrem em nova aba",
      "Navegue entre lições usando os botões Anterior e Próxima",
      "O cabeçalho de impressão mostra o módulo e o título da lição",
    ],
    fields: [],
  },
  "/comercial/crm/treinamento/admin/": {
    title: "Editar Lição",
    description:
      "Edite os dados da lição de treinamento: módulo, título, conteúdo markdown, pré-requisitos e links multimídia.",
    rules: [
      "Altere o módulo para mover a lição entre módulos",
      "O conteúdo markdown é renderizado com formatação rica (títulos, listas, tabelas)",
      "Marque como inativo para ocultar a lição sem deletar",
      "Salve as alterações para que o conteúdo seja atualizado imediatamente",
    ],
    fields: [],
  },

  // ==================== ESTADOS (CONFIG) ====================
  "/comercial/crm/configuracoes/estados": {
    title: "Estados (UF)",
    description:
      "Consulta e edição dos estados cadastrados. A coluna Região define a região geográfica de cada estado para fins de organização comercial.",
    rules: [
      "Os estados são carregados automaticamente da base do IBGE.",
      "Você pode alterar a região de cada estado manualmente.",
      "As regiões disponíveis são: N (Norte), NE (Nordeste), CO (Centro-Oeste), SE (Sudeste), S (Sul).",
      "A região do estado influencia filtros e relatórios regionais.",
    ],
    fields: [
      { name: "UF", desc: "Sigla de 2 caracteres do estado" },
      { name: "Nome", desc: "Nome completo do estado" },
      { name: "Região", desc: "Região geográfica atribuída ao estado" },
      { name: "Gerente", desc: "Gerente comercial responsável pelo estado" },
    ],
  },

  // ==================== REPRESENTANTES ====================
  "/comercial/representantes": {
    title: "Representantes",
    description:
      "Cadastro de representantes comerciais. Cada representante possui endereço e está vinculado a uma região através do gerente responsável pelo seu estado.",
    rules: [
      "O CNPJ é único e obrigatório para cada representante.",
      "O gerente responsável é definido automaticamente com base no estado/região onde o representante atua.",
      "Representantes inativos não aparecem nos filtros de seleção do CRM.",
    ],
    fields: [
      { name: "Nome", desc: "Nome fantasia do representante" },
      { name: "CNPJ", desc: "CNPJ do representante (único)" },
      { name: "Razão Social", desc: "Razão social completa" },
      { name: "Email", desc: "Email de contato" },
      { name: "Telefone", desc: "Telefone de contato" },
      { name: "Contato", desc: "Nome da lead de contato" },
      { name: "Endereço", desc: "Endereço completo" },
      { name: "Cidade", desc: "Cidade onde está localizado" },
      { name: "UF", desc: "Estado onde está localizado" },
      { name: "Gerente", desc: "Gerente comercial responsável pelo representante" },
    ],
  },
  "/comercial/representantes/novo": {
    title: "Novo Representante",
    description: "Preencha os dados para cadastrar um novo representante comercial no sistema.",
    fields: [
      { name: "Nome", desc: "Nome fantasia do representante (obrigatório)" },
      { name: "CNPJ", desc: "CNPJ do representante (obrigatório, único)" },
      { name: "Razão Social", desc: "Razão social completa" },
      { name: "Contato", desc: "Nome da lead de contato" },
      { name: "Email", desc: "Email de contato" },
      { name: "Telefone", desc: "Telefone de contato" },
      { name: "Endereço", desc: "Endereço completo" },
      { name: "Cidade", desc: "Cidade onde está localizado" },
      { name: "UF", desc: "Estado onde está localizado" },
      { name: "Gerente", desc: "ID do usuário gerente responsável pelo representante" },
    ],
  },
  "/comercial/representantes/[id]": {
    title: "Editar Representante",
    description: "Edite os dados cadastrais do representante comercial.",
    fields: [
      { name: "Nome", desc: "Nome fantasia do representante" },
      { name: "CNPJ", desc: "CNPJ do representante" },
      { name: "Razão Social", desc: "Razão social completa" },
      { name: "Email", desc: "Email de contato" },
      { name: "Telefone", desc: "Telefone de contato" },
      { name: "Contato", desc: "Nome da lead de contato" },
      { name: "Endereço", desc: "Endereço completo" },
      { name: "Cidade", desc: "Cidade onde está localizado" },
      { name: "UF", desc: "Estado onde está localizado" },
      { name: "Gerente", desc: "ID do usuário gerente responsável" },
    ],
  },

  // ==================== CONVERSAS WHATSAPP ====================
  "/comercial/crm/conversas": {
    title: "Conversas WhatsApp",
    description:
      "Visualize todas as conversas do WhatsApp integradas ao CRM. As mensagens de leads que entram via WhatsApp são agrupadas por contato.",
    rules: [
      "Conversas são agrupadas automaticamente pelo número de telefone do contato.",
      "As mensagens são importadas automaticamente via n8n.",
      "Novos leads cadastrados via WhatsApp disparam uma notificação no sistema.",
    ],
    fields: [
      { name: "Painel lateral", desc: "Lista de conversas ativas, ordenadas pela mais recente" },
      { name: "Painel principal", desc: "Exibe o histórico de mensagens da conversa selecionada" },
      {
        name: "Link para lead",
        desc: "Clica no nome do contato para abrir a ficha do lead no CRM",
      },
    ],
  },

  // ==================== REGIÕES ====================
  "/comercial/crm/notificacoes": {
    title: "Promoção",
    description:
      "Central de notificações do CRM. Aqui você encontra alertas automáticos do sistema, como novos leads cadastrados via WhatsApp.",
    rules: [
      "Notificações são geradas automaticamente pelo sistema.",
      "Use o filtro 'Não lidas' para ver apenas as pendentes.",
      "Clique em 'Marcar como lida' para remover a notificação da lista de pendentes.",
      "Notificações com link podem ser clicadas para navegar diretamente para o registro relacionado.",
    ],
    fields: [
      { name: "Título", desc: "Título da notificação" },
      { name: "Mensagem", desc: "Descrição detalhada da notificação" },
      { name: "Tipo", desc: "Categoria da notificação (ex: lead_novo)" },
      { name: "Data", desc: "Data e hora em que a notificação foi gerada" },
      { name: "Status", desc: "Lida ou Não lida" },
    ],
  },

  // ==================== CIDADES (CONFIG) ====================
  "/comercial/crm/configuracoes/cidades": {
    title: "Cidades",
    description:
      "Consulta de todas as cidades cadastradas, carregadas automaticamente da base do IBGE. Utilize os filtros para localizar cidades por nome ou estado.",
    rules: [
      "As cidades são carregadas automaticamente da API do IBGE.",
      "São 5570 municípios brasileiros cadastrados.",
      "Utilize o campo de busca para filtrar por nome da cidade ou estado.",
      "Utilize o filtro de UF para exibir cidades de um estado específico.",
    ],
    fields: [
      { name: "Cidade", desc: "Nome do município" },
      { name: "Estado", desc: "Nome do estado ao qual pertence" },
      { name: "UF", desc: "Sigla do estado" },
    ],
  },

  // ==================== VIAGENS ====================
  "/comercial/crm/viagens": {
    title: "Viagens",
    description:
      "Gestão do cronograma da equipe comercial: planejamento de viagens, visitas a clientes por cidade, custos de deslocamento e acompanhamento no mapa.",
    rules: [
      "Viagem PLANEJADA pode ser editada ou excluída; EM_ANDAMENTO registra o início do roteiro.",
      "Cada viagem possui um cronograma de visitas; o mapa agrupa pontos coincidentes automaticamente.",
      "Use o filtro de status para ver Planejadas, Em andamento, Concluídas ou Canceladas.",
      "Clique em 'Nova viagem' para montar o roteiro com cidades, datas e custos estimados.",
    ],
    fields: [
      { name: "Destino", desc: "Cidade(s) e UF do roteiro" },
      { name: "Datas", desc: "Início e fim da viagem" },
      { name: "Status", desc: "Planejada → Em andamento → Concluída / Cancelada" },
      { name: "Custos", desc: "Estimativa de deslocamento e hospedagem" },
    ],
  },

  // ==================== CONTATOS ====================
  "/comercial/crm/contatos": {
    title: "Contatos",
    description:
      "Base de contatos do CRM (leads ligadas a clientes/empresas). Use para centralizar e-mails, telefones e o relacionamento comercial.",
    rules: [
      "Cada contato pode ser vinculado a uma Lead (Negócio), a um Cliente ou ficar avulso (sem vínculo).",
      "A ficha do contato (clique na linha da listagem) mostra os dados completos e permite trocar o vínculo entre lead, cliente ou avulso.",
      "O contato principal recebe destaque com estrela e pode ser marcado na edição.",
      "Salvar as alterações recarrega a ficha com o vínculo atual — o nome da lead ou do cliente aparece sempre atualizado.",
      "Nos formulários de contato, os seletores de Cliente e Lead (Negócio) têm caixa de busca com lupa: digite para reduzir as opções antes de escolher.",
      "Use a busca por nome, e-mail, cargo ou empresa para localizar rapidamente.",
      "Excluir um contato não remove o cliente/empresa vinculado.",
      "A exclusão de contato é exclusiva de ADMIN e SUDO.",
      "Se o contato não existir ou a carga falhar, a tela avisa o motivo e oferece o link 'Voltar' para a listagem.",
    ],
    fields: [
      { name: "Nome", desc: "Nome do contato (obrigatório)" },
      { name: "Cargo", desc: "Função do contato na empresa" },
      { name: "E-mail", desc: "E-mail principal de contato" },
      { name: "Telefone / Celular / WhatsApp", desc: "Canais de acesso do contato" },
      { name: "Principal", desc: "Contato principal do vínculo (estrela na listagem)" },
      { name: "Observações", desc: "Anotações livres sobre o contato" },
      { name: "Vínculo", desc: "Lead (Negócio), Cliente ou Sem vínculo (órfão); lead e cliente com busca por nome" },
      { name: "Empresa", desc: "Razão social ou nome fantasia da lead vinculada" },
    ],
  },

  // ==================== SEGMENTOS ====================
  "/comercial/crm/segmentos": {
    title: "Segmentos",
    description:
      "Cadastro de segmentos de mercado usados para classificar clientes (ex.: confecção, calçados, estofados). Ajuda a direcionar prospecção e ofertas.",
    rules: [
      "O segmento é um campo opcional no cadastro de clientes.",
      "Use nomes curtos e objetivos para facilitar filtros e relatórios.",
      "Crie, edite ou exclua segmentos diretamente na lista.",
    ],
    fields: [
      { name: "Nome", desc: "Nome do segmento de mercado" },
      { name: "Ativo", desc: "Indica se o segmento pode ser usado em novos cadastros" },
    ],
  },

  // ==================== PAÍSES (CONFIG) ====================
  "/comercial/crm/configuracoes/paises": {
    title: "Promoção",
    description:
      "Cadastro de países usados nas transações e requisições do módulo comercial (código + nome).",
    rules: [
      "O código é uma sigla curta (ex.: BR, PT, US) exibida em relatórios.",
      "Países são referenciados por vendas e requisições internacionais.",
      "Excluir um país em uso pode quebrar referências — prefira editar o nome.",
    ],
    fields: [
      { name: "Nome", desc: "Nome do país" },
      { name: "Código", desc: "Sigla usada como identificador (ex.: BR)" },
    ],
  },
}

export const saudeProspeccaoInfo = {
  tabela: {
    title: "Tabela — saúde da prospecção",
    description:
      "Cada linha é um cliente ou lead com visitas no ano corrente. A tabela cruza esforço comercial, engajamento e conversão, e respeita todos os filtros aplicados acima.",
    rules: [
      "Fórmula do esforço: visita realizada (+12,5) + relato/ata (+12,5) + check-in (+12,5) + contato (+12,5) + proposta (+25) + oportunidade (+25), limitado a 100%.",
      "Fórmula do engajamento: visita realizada (+20) + visita agendada (+10) + proposta negociada (+20) + oportunidade negociada (+20) + pedido de venda (+15) + faturamento (+15), limitado a 100%.",
      "Fórmula da conversão: (pedidos de venda + faturamentos) ÷ total de visitas da linha, arredondado e limitado a 100%.",
      "No badge de itens de engajamento, proposta e oportunidade valem 36% cada e os outros três itens dividem 28% (9,33% cada); a coluna mostra quantos itens estão presentes e o percentual ponderado.",
      "Visitas R/A/C abre a lista de visitas; cada visita da lista leva ao cadastro da visita.",
      "Clique no nome para ver todas as visitas, vínculos e valores do cliente/lead.",
    ],
    columns: [
      {
        name: "Visitas R/A/C",
        desc: "Realizadas / agendadas / canceladas. Clique para listar as visitas.",
      },
      {
        name: "Última / Próxima visita",
        desc: "Última visita já realizada e próxima visita agendada.",
      },
      {
        name: "Itens de engajamento",
        desc: "Ata, check-in/out, contato, proposta e oportunidade: quantidade, percentual e detalhe.",
      },
      {
        name: "Conversão",
        desc: "Percentual de pedidos + faturamentos sobre o total de visitas; clique para ver quantidades e valores.",
      },
      {
        name: "Esforço / Engajamento",
        desc: "Scores de 0 a 100% calculados pelas fórmulas acima.",
      },
    ],
    examples: [
      {
        title: "Conversão de 50%",
        desc: "Cliente com 4 visitas, 1 pedido de venda e 1 faturamento: (1 + 1) ÷ 4 = 50%. O badge fica verde e, ao clicar, mostra as quantidades e os valores.",
      },
      {
        title: "Itens de engajamento 3/5",
        desc: "Visita com relato, check-in e contato, mas sem proposta e sem oportunidade: 9,33% + 9,33% + 9,33% = 28% no badge.",
      },
    ],
  },
  itensEngajamento: {
    title: "Itens de engajamento — pesos e detalhes",
    description:
      "Composição ponderada do badge Itens de engajamento; ela é diferente do score de engajamento usado em AEC, Engajados e BEC.",
    rules: [
      "Proposta e oportunidade valem 36% cada.",
      "Ata/relato, check-in/check-out e contato dividem os 28% restantes: 9,33% cada.",
      "O badge mostra a quantidade de itens presentes e o percentual ponderado. Esses pesos não alteram o score nem a classificação.",
      "Clique em um registro vinculado para abrir a visita, a proposta ou a oportunidade.",
    ],
    columns: [
      { name: "Item", desc: "Ata/relato, check-in/check-out, contato, proposta ou oportunidade." },
      { name: "Peso", desc: "Percentual que o item presente soma ao badge." },
      { name: "Registros", desc: "Itens vinculados ao cliente/lead no ano corrente." },
    ],
    examples: [
      {
        title: "Só proposta",
        desc: "1 de 5 itens presente, mas o badge mostra 36% porque a proposta vale 36%.",
      },
      {
        title: "Ata, check-in e contato",
        desc: "3 de 5 itens presentes e 28% no badge: 9,33% + 9,33% + 9,33%.",
      },
    ],
  },
  esforco: {
    title: "Esforço comercial — composição do score",
    description:
      "O score de esforço mede o trabalho comercial feito com o cliente ou lead no período.",
    rules: [
      "Fórmula: visita realizada (+12,5) + relato/ata (+12,5) + check-in (+12,5) + contato (+12,5) + proposta (+25) + oportunidade (+25).",
      "Proposta e oportunidade valem 25 pontos cada; os outros quatro critérios dividem igualmente os 50 pontos restantes.",
      "O total é limitado a 100%.",
      "Clique na porcentagem na tabela para ver o detalhe de cada critério.",
    ],
    examples: [
      {
        title: "Exemplo",
        desc: "Visita realizada com relato e check-in, sem contato, proposta ou oportunidade: 12,5 + 12,5 + 12,5 = 37,5% de esforço.",
      },
    ],
  },
  engajamento: {
    title: "Engajamento — composição do score",
    description:
      "O score de engajamento mede o retorno do cliente: negociação, pedidos e faturamentos.",
    rules: [
      "Fórmula: visita realizada (+20) + visita agendada (+10) + proposta negociada (+20) + oportunidade negociada (+20) + pedido de venda (+15) + faturamento (+15).",
      "O total é limitado a 100%.",
      "Clique na porcentagem na tabela para ver o detalhe de cada critério.",
    ],
    examples: [
      {
        title: "Exemplo",
        desc: "Visita agendada, oportunidade negociada e 1 pedido de venda: 10 + 20 + 15 = 45% de engajamento.",
      },
    ],
  },
  registros: {
    title: "Registros — saúde da prospecção",
    description:
      "Quantidade de clientes e leads distintos que aparecem na saúde da prospecção depois dos filtros da tabela — não é a quantidade de visitas.",
    rules: [
      "Cada cliente ou lead com pelo menos uma visita no ano corrente conta como um registro, mesmo com várias visitas.",
      "Lead promovida a cliente é contada uma única vez, junto com o cliente.",
      "Visita avulsa aparece como lead.",
    ],
    examples: [
      {
        title: "Exemplo",
        desc: "58 visitas cadastradas podem virar 28 registros quando várias visitas são do mesmo cliente ou da mesma lead.",
      },
    ],
  },
  aec: {
    title: "AEC — Alto Esforço comercial",
    description: "Clientes e leads com esforço acima de 45% e engajamento de até 30%.",
    rules: [
      "Fórmula: AEC se Engajamento ≤ 30 e Esforço > 45.",
      "Se o engajamento passar de 30%, o registro vai para Engajados mesmo com esforço alto.",
      "Clique no card para abrir a lista de clientes e leads desse grupo.",
    ],
    examples: [
      {
        title: "Exemplo",
        desc: "Esforço 70% e engajamento 25%: entra em AEC (Alto Esforço comercial).",
      },
    ],
  },
  engajados: {
    title: "Engajados — clientes puxando o resultado",
    description: "Clientes e leads com engajamento acima de 30%, independente do esforço.",
    rules: [
      "Fórmula: Engajados se Engajamento > 30.",
      "Esta regra prevalece sobre AEC e BEC.",
      "Clique no card para abrir a lista de clientes e leads desse grupo.",
    ],
    examples: [
      {
        title: "Exemplo",
        desc: "Esforço 80% e engajamento 45%: entra em Engajados.",
      },
    ],
  },
  bec: {
    title: "BEC — Baixo Esforço comercial",
    description: "Clientes e leads com engajamento de até 30% e esforço de até 45%.",
    rules: [
      "Fórmula: BEC se Engajamento ≤ 30 e Esforço ≤ 45.",
      "Esforço exatamente 45% entra em BEC; apenas acima disso vira AEC.",
      "Clique no card para abrir a lista de clientes e leads desse grupo.",
    ],
    examples: [
      {
        title: "Exemplo",
        desc: "Esforço 45% e engajamento 20%: entra em BEC (Baixo Esforço comercial).",
      },
    ],
  },
  ultimasVisitas: {
    title: "Últimas visitas",
    description:
      "Visitas mais recentes do recorte, com nome e documento do cliente, lead ou atendimento avulso, data, hora, tipo, status, endereço e oportunidades.",
    rules: [
      "O nome e o documento vêm do cliente vinculado, do lead ou do atendimento avulso, nessa ordem.",
      "O selo Cliente, Lead ou Avulso identifica a origem do contato exibido.",
      "O selo mostra a quantidade de oportunidades do cliente/lead, incluindo a oportunidade vinculada à visita.",
      "Os botões CSV, PDF e MD exportam exatamente as linhas exibidas nesta seção.",
      "O arquivo respeita o filtro Todas/Minhas Visitas aplicado ao dashboard.",
      "Quando não há visitas no recorte, os botões de exportação ficam desabilitados.",
    ],
    columns: [
      { name: "ID da visita", desc: "Identificador único da visita." },
      {
        name: "Nome/Tipo de entidade",
        desc: "Nome do cliente, lead ou atendimento avulso, com selo da origem.",
      },
      { name: "Documento", desc: "CNPJ ou CPF formatado do cliente/lead; ausente no atendimento avulso." },
      { name: "Data/Hora", desc: "Data e horário da visita." },
      { name: "Tipo/Status", desc: "Presencial, vídeo ou telefone; e situação da visita." },
      { name: "Oportunidades", desc: "Sem oportunidade ou quantidade de oportunidades do cliente/lead." },
      { name: "Endereço", desc: "Logradouro, número, bairro, cidade e UF quando preenchidos." },
    ],
    examples: [
      {
        title: "Exemplo",
        desc: "Com o filtro Minhas Visitas ativo, o arquivo traz só as visitas do usuário logado.",
      },
    ],
  },
  conversao: {
    title: "Conversão — comercial + financeira",
    description:
      "Indicador que combina a transformação de oportunidades em pedidos com a transformação de pedidos em faturamentos.",
    rules: [
      "Conversão comercial: pedidos de venda ÷ oportunidades da linha, limitada a 50%.",
      "Conversão financeira: faturamentos ÷ pedidos de venda, limitada a 50%.",
      "Conversão real: comercial + financeira, arredondada e limitada a 100%.",
      "Sem oportunidades, a parte comercial é 0%; sem pedidos, a parte financeira é 0%.",
      "Clique no badge para ver oportunidades, pedidos, faturamentos e o cálculo completo.",
    ],
    examples: [
      {
        title: "Conversão de 75%",
        desc: "Cliente com 2 oportunidades, 1 pedido e 1 faturamento: comercial = 1 ÷ 2 × 50% = 25%; financeira = 1 ÷ 1 × 50% = 50%; conversão real = 75%.",
      },
    ],
  },
} satisfies Record<string, InfoContent>

export const saudeProspeccaoLeadsInfo = {
  ...saudeProspeccaoInfo,
  tabela: {
    title: "Tabela — saúde da prospecção por leads",
    description:
      "Cada linha é um cliente ou lead com visitas reais e ações reais de prospecção no ano corrente. As duas métricas aparecem lado a lado para comparar esforço comercial, engajamento e conversão.",
    rules: [
      "Cada coluna mostra somente dados reais da sua origem: ações não são espelhadas como visitas e visitas não são espelhadas como ações.",
      "Visitas e ações usam a mesma métrica: realizadas, agendadas e canceladas no ano corrente, e entram juntas nos scores com os mesmos pesos.",
      "Quando não há visitas reais, Visitas R/A/C fica 0/0/0 e Última/Próxima visita fica —; a saúde é calculada pelas ações reais.",
      "Visitas R/A/C abre a lista de visitas; Ações R/A/C abre a lista de ações; cada item da lista leva ao cadastro correspondente.",
      "Fórmula do esforço: visita/ação realizada (+12,5) + relato/ata (+12,5) + check-in (+12,5) + contato (+12,5) + proposta (+25) + oportunidade (+25), limitado a 100%.",
      "Fórmula do engajamento: visita/ação realizada (+20) + visita/ação agendada (+10) + proposta negociada (+20) + oportunidade negociada (+20) + pedido de venda (+15) + faturamento (+15), limitado a 100%.",
      "A conversão não usa visitas reais + ações reais como denominador: conversão comercial = pedidos de venda ÷ oportunidades da linha (até 50%) e conversão financeira = faturamentos ÷ pedidos de venda (até 50%).",
      "Conversão real = comercial + financeira, arredondada e limitada a 100%; sem oportunidades ou sem pedidos, a parte correspondente é 0%.",
      "No badge de itens de engajamento, proposta e oportunidade valem 36% cada e os outros três itens dividem 28% (9,33% cada); a coluna mostra quantos itens estão presentes e o percentual ponderado.",
      "Clique no nome para ver todas as visitas, ações, vínculos e valores do cliente/lead.",
      "Última ação e Próxima ação mostram as datas das ações reais de prospecção correspondentes.",
      "STATUS OPORT., VALOR OPORT. e PROB. OPORT. vêm das oportunidades vinculadas ao cliente/lead.",
      "Engajamento acima de 30% classifica como Engajados; com até 30%, esforço acima de 45% é AEC e 45% ou menos é BEC.",
      "A IA usa as linhas filtradas, as regras de temperatura do sistema e as fórmulas de esforço, engajamento e conversão; ela nunca inventa outra métrica.",
    ],
    columns: [
      {
        name: "Visitas R/A/C",
        desc: "Visitas reais realizadas / agendadas / canceladas; fica zerada quando não há visitas.",
      },
      {
        name: "Ações R/A/C",
        desc: "Ações reais realizadas / agendadas / canceladas. Clique para listar as ações.",
      },
      {
        name: "Última / Próxima visita",
        desc: "Datas das visitas reais; mostra — quando não há visitas cadastradas.",
      },
      {
        name: "Última / Próxima ação",
        desc: "Datas das ações reais de prospecção; mostra — quando não há ações cadastradas.",
      },
      {
        name: "Itens de engajamento",
        desc: "Ata, check-in/out, contato, proposta e oportunidade de visitas e ações: quantidade, percentual e detalhe.",
      },
      {
        name: "Conversão",
        desc: "Comercial (pedidos ÷ oportunidades, até 50%) + financeira (faturamentos ÷ pedidos, até 50%); clique para ver o cálculo.",
      },
      {
        name: "Esforço / Engajamento",
        desc: "Scores de 0 a 100% com visitas e ações na mesma ponderação; clique para ver os critérios.",
      },
    ],
    examples: [
      {
        title: "Sem dados de visitas",
        desc: "Cliente com 0 visitas reais e 4 ações reais (3 realizadas e 1 agendada) aparece com 0/0/0 em Visitas R/A/C e 3/1/0 em Ações R/A/C; esforço e engajamento usam as ações.",
      },
      {
        title: "Conversão de 75%",
        desc: "Cliente com 2 oportunidades vinculadas, 1 pedido de venda e 1 faturamento: comercial = 1 ÷ 2 × 50% = 25%; financeira = 1 ÷ 1 × 50% = 50%; conversão real = 75%. O badge fica verde e o modal mostra o cálculo.",
      },
    ],
  },
  itensEngajamento: {
    ...saudeProspeccaoInfo.itensEngajamento,
    rules: [
      "Proposta e oportunidade valem 36% cada.",
      "Ata/relato, check-in/check-out e contato dividem os 28% restantes: 9,33% cada.",
      "Itens de visitas e de ações de prospecção entram na mesma conta; registros repetidos são contados uma única vez.",
      "Clique em um registro vinculado para abrir a visita, a ação, a proposta ou a oportunidade.",
    ],
  },
  esforco: {
    ...saudeProspeccaoInfo.esforco,
    description:
      "O score de esforço mede o trabalho comercial feito com o cliente ou lead em visitas reais e ações de prospecção no período.",
    rules: [
      "Fórmula: visita/ação realizada (+12,5) + relato/ata (+12,5) + check-in (+12,5) + contato (+12,5) + proposta (+25) + oportunidade (+25).",
      "Visitas e ações usam os mesmos pesos e são somadas antes de aplicar a pontuação binária de cada critério.",
      "O total é limitado a 100%.",
      "Clique na porcentagem na tabela para ver o detalhe de cada critério.",
    ],
  },
  engajamento: {
    ...saudeProspeccaoInfo.engajamento,
    rules: [
      "Fórmula: visita/ação realizada (+20) + visita/ação agendada (+10) + proposta negociada (+20) + oportunidade negociada (+20) + pedido de venda (+15) + faturamento (+15).",
      "Visitas e ações usam os mesmos pesos e são somadas antes de aplicar a pontuação binária de cada critério.",
      "O total é limitado a 100%.",
      "Clique na porcentagem na tabela para ver o detalhe de cada critério.",
    ],
  },
  registros: {
    ...saudeProspeccaoInfo.registros,
    description:
      "Quantidade de clientes e leads distintos que aparecem na saúde da prospecção depois dos filtros da tabela — não é a quantidade de visitas.",
    rules: [
      "Cada cliente ou lead com pelo menos uma visita real ou ação real no ano corrente conta como um registro, mesmo com vários registros.",
      "Lead promovida a cliente é contada uma única vez, junto com o cliente.",
      "Registro avulso aparece como lead.",
    ],
  },
  ia: {
    title: "Análise de IA — saúde da prospecção",
    description:
      "Análise solicitada a partir das linhas filtradas na tela. A IA usa somente as regras cadastradas no sistema para explicar a saúde da prospecção e sugerir próximos passos.",
    rules: [
      "O botão 'Analisar com IA' envia apenas os registros visíveis depois dos filtros atuais e usa o mesmo provedor do resumo de IA do cliente.",
      "O botão 'Ver envio à IA' mostra o payload e as mensagens que serão enviados ao provedor, sem chamar a IA, e nunca exibe a chave secreta da API.",
      "A decisão sobre consultas extras usa uma chamada curta; a resposta final mantém 700 tokens, evitando o limite de tokens por minuto do Groq.",
      "A temperatura enviada à IA segue QUENTE, MORNO ou FRIO, conforme negociações, propostas, pedidos e faturamentos do sistema.",
      "A classificação enviada à IA segue Engajados, AEC ou BEC, com prevalência de Engajamento acima de 30%.",
      "As sugestões devem aumentar o engajamento ou reduzir o esforço sem inventar novas métricas.",
      "No chat é possível pedir detalhes; a IA pode consultar apenas consultas curadas e somente leitura, nunca SQL livre.",
      "O botão 'Concluir e enviar' envia a conversa por e-mail para o usuário logado.",
      "O botão Markdown gera o texto da análise para copiar ou salvar.",
      "Análises salvas podem ser consultadas depois pelo autor e por usuários ADMIN, SUDO ou CRM.",
      "O modal ocupa quase toda a tela no desktop; no mobile, empilha os componentes e mantém os botões acessíveis.",
    ],
    columns: [
      { name: "Análise", desc: "Texto em Markdown gerado pela IA." },
      { name: "Perguntas e respostas", desc: "Histórico do chat sobre a análise." },
      { name: "Salvas", desc: "Análises anteriores com data, título e autor." },
    ],
    examples: [
      {
        title: "AEC com baixo engajamento",
        desc: "A IA pode sugerir negociar proposta existente ou abrir oportunidade, porque esses itens aumentam o engajamento nas regras do sistema.",
      },
    ],
  },
} satisfies Record<string, InfoContent>

export const saudeProspeccaoAcoesInfo = {
  tabela: {
    title: "Tabela — saúde da prospecção",
    description:
      "Cada linha é um cliente ou lead com ações de prospecção no ano corrente. A tabela cruza esforço comercial, engajamento e conversão, e respeita todos os filtros aplicados acima.",
    rules: [
      "Fórmula do esforço: ação realizada (+12,5) + relato/ata (+12,5) + check-in (+12,5) + contato (+12,5) + proposta (+25) + oportunidade (+25), limitado a 100%.",
      "Fórmula do engajamento: ação realizada (+20) + ação agendada (+10) + proposta negociada (+20) + oportunidade negociada (+20) + pedido de venda (+15) + faturamento (+15), limitado a 100%.",
      "Fórmula da conversão: (pedidos de venda + faturamentos) ÷ total de ações da linha, arredondado e limitado a 100%.",
      "No badge de itens de engajamento, proposta e oportunidade valem 36% cada e os outros três itens dividem 28% (9,33% cada); a coluna mostra quantos itens estão presentes e o percentual ponderado.",
      "Ações R/A/C abre a lista de ações; cada ação da lista leva ao cadastro da ação.",
      "Clique no nome para ver todas as ações, vínculos e valores do cliente/lead.",
    ],
    columns: [
      {
        name: "Ações R/A/C",
        desc: "Realizadas / agendadas / canceladas. Clique para listar as ações.",
      },
      {
        name: "Última / Próxima ação",
        desc: "Última ação já realizada e próxima ação agendada.",
      },
      {
        name: "Itens de engajamento",
        desc: "Ata, check-in/out, contato, proposta e oportunidade: quantidade, percentual e detalhe.",
      },
      {
        name: "Conversão",
        desc: "Percentual de pedidos + faturamentos sobre o total de ações; clique para ver quantidades e valores.",
      },
      {
        name: "Esforço / Engajamento",
        desc: "Scores de 0 a 100% calculados pelas fórmulas acima.",
      },
    ],
    examples: [
      {
        title: "Conversão de 50%",
        desc: "Cliente com 4 ações, 1 pedido de venda e 1 faturamento: (1 + 1) ÷ 4 = 50%. O badge fica verde e, ao clicar, mostra as quantidades e os valores.",
      },
      {
        title: "Itens de engajamento 3/5",
        desc: "Ação com relato, check-in e contato, mas sem proposta e sem oportunidade: 9,33% + 9,33% + 9,33% = 28% no badge.",
      },
    ],
  },
  itensEngajamento: {
    title: "Itens de engajamento — pesos e detalhes",
    description:
      "Composição ponderada do badge Itens de engajamento; ela é diferente do score de engajamento usado em AEC, Engajados e BEC.",
    rules: [
      "Proposta e oportunidade valem 36% cada.",
      "Ata/relato, check-in/check-out e contato dividem os 28% restantes: 9,33% cada.",
      "O badge mostra a quantidade de itens presentes e o percentual ponderado. Esses pesos não alteram o score nem a classificação.",
      "Clique em um registro vinculado para abrir a ação, a proposta ou a oportunidade.",
    ],
    columns: [
      { name: "Item", desc: "Ata/relato, check-in/check-out, contato, proposta ou oportunidade." },
      { name: "Peso", desc: "Percentual que o item presente soma ao badge." },
      {
        name: "Registros",
        desc: "Itens vinculados ao cliente/lead no ano corrente.",
      },
    ],
    examples: [
      {
        title: "Só proposta",
        desc: "1 de 5 itens presente, mas o badge mostra 36% porque a proposta vale 36%.",
      },
      {
        title: "Ata, check-in e contato",
        desc: "3 de 5 itens presentes e 28% no badge: 9,33% + 9,33% + 9,33%.",
      },
    ],
  },
  esforco: {
    title: "Esforço comercial — composição do score",
    description:
      "O score de esforço mede o trabalho comercial feito com o cliente ou lead no período.",
    rules: [
      "Fórmula: ação realizada (+12,5) + relato/ata (+12,5) + check-in (+12,5) + contato (+12,5) + proposta (+25) + oportunidade (+25).",
      "Proposta e oportunidade valem 25 pontos cada; os outros quatro critérios dividem igualmente os 50 pontos restantes.",
      "O total é limitado a 100%.",
      "Clique na porcentagem na tabela para ver o detalhe de cada critério.",
    ],
    examples: [
      {
        title: "Exemplo",
        desc: "Ação realizada com relato e check-in, sem contato, proposta ou oportunidade: 12,5 + 12,5 + 12,5 = 37,5% de esforço.",
      },
    ],
  },
  engajamento: {
    title: "Engajamento — composição do score",
    description:
      "O score de engajamento mede o retorno do cliente: negociação, pedidos e faturamentos.",
    rules: [
      "Fórmula: ação realizada (+20) + ação agendada (+10) + proposta negociada (+20) + oportunidade negociada (+20) + pedido de venda (+15) + faturamento (+15).",
      "O total é limitado a 100%.",
      "Clique na porcentagem na tabela para ver o detalhe de cada critério.",
    ],
    examples: [
      {
        title: "Exemplo",
        desc: "Ação agendada, oportunidade negociada e 1 pedido de venda: 10 + 20 + 15 = 45% de engajamento.",
      },
    ],
  },
  registros: {
    title: "Registros — saúde da prospecção",
    description:
      "Quantidade de clientes e leads distintos que aparecem na saúde da prospecção depois dos filtros da tabela — não é a quantidade de ações.",
    rules: [
      "Cada cliente ou lead com pelo menos uma ação de prospecção no ano corrente conta como um registro, mesmo com várias ações.",
      "Lead promovida a cliente é contada uma única vez, junto com o cliente.",
      "Ação avulsa aparece como lead.",
    ],
    examples: [
      {
        title: "Exemplo",
        desc: "58 ações cadastradas podem virar 28 registros quando várias ações são do mesmo cliente ou da mesma lead.",
      },
    ],
  },
  aec: {
    title: "AEC — Alto Esforço comercial",
    description: "Clientes e leads com esforço acima de 45% e engajamento de até 30%.",
    rules: [
      "Fórmula: AEC se Engajamento ≤ 30 e Esforço > 45.",
      "Se o engajamento passar de 30%, o registro vai para Engajados mesmo com esforço alto.",
      "Clique no card para abrir a lista de clientes e leads desse grupo.",
    ],
    examples: [
      {
        title: "Exemplo",
        desc: "Esforço 70% e engajamento 25%: entra em AEC (Alto Esforço comercial).",
      },
    ],
  },
  engajados: {
    title: "Engajados — clientes puxando o resultado",
    description: "Clientes e leads com engajamento acima de 30%, independente do esforço.",
    rules: [
      "Fórmula: Engajados se Engajamento > 30.",
      "Esta regra prevalece sobre AEC e BEC.",
      "Clique no card para abrir a lista de clientes e leads desse grupo.",
    ],
    examples: [
      {
        title: "Exemplo",
        desc: "Esforço 80% e engajamento 45%: entra em Engajados.",
      },
    ],
  },
  bec: {
    title: "BEC — Baixo Esforço comercial",
    description: "Clientes e leads com engajamento de até 30% e esforço de até 45%.",
    rules: [
      "Fórmula: BEC se Engajamento ≤ 30 e Esforço ≤ 45.",
      "Esforço exatamente 45% entra em BEC; apenas acima disso vira AEC.",
      "Clique no card para abrir a lista de clientes e leads desse grupo.",
    ],
    examples: [
      {
        title: "Exemplo",
        desc: "Esforço 45% e engajamento 20%: entra em BEC (Baixo Esforço comercial).",
      },
    ],
  },
  ultimasVisitas: {
    title: "Últimas ações",
    description:
      "Ações de prospecção mais recentes do recorte, com nome e documento do cliente, lead ou atendimento avulso, data, hora, tipo, status, endereço e oportunidades.",
    rules: [
      "O nome e o documento vêm do cliente vinculado, do lead ou do atendimento avulso, nessa ordem.",
      "O selo Cliente, Lead ou Avulso identifica a origem do contato exibido.",
      "O selo mostra a quantidade de oportunidades do cliente/lead, incluindo a oportunidade vinculada à ação.",
      "Os botões CSV, PDF e MD exportam exatamente as linhas exibidas nesta seção.",
      "O arquivo respeita o filtro Todas/Minhas Ações aplicado ao dashboard.",
      "Quando não há ações no recorte, os botões de exportação ficam desabilitados.",
    ],
    columns: [
      { name: "ID da ação", desc: "Identificador único da ação." },
      {
        name: "Nome/Tipo de entidade",
        desc: "Nome do cliente, lead ou atendimento avulso, com selo da origem.",
      },
      { name: "Documento", desc: "CNPJ ou CPF formatado do cliente/lead; ausente no atendimento avulso." },
      { name: "Data/Hora", desc: "Data e horário da ação." },
      {
        name: "Tipo/Status",
        desc: "Presencial, vídeo ou telefone; e situação da ação.",
      },
      { name: "Oportunidades", desc: "Sem oportunidade ou quantidade de oportunidades do cliente/lead." },
      {
        name: "Endereço",
        desc: "Logradouro, número, bairro, cidade e UF quando preenchidos.",
      },
    ],
    examples: [
      {
        title: "Exemplo",
        desc: "Com o filtro Minhas Ações ativo, o arquivo traz só as ações do usuário logado.",
      },
    ],
  },
  conversao: {
    title: "Conversão — pedidos e faturamentos",
    description:
      "Indicador que reúne pedidos de venda e faturamentos em um único percentual sobre o total de ações do cliente/lead.",
    rules: [
      "Fórmula: (pedidos de venda + faturamentos) ÷ ações no ano corrente.",
      "O resultado é arredondado e limitado a 100%.",
      "Clique no badge para ver a quantidade e o valor de pedidos e faturamentos.",
    ],
    examples: [
      {
        title: "Sem ações",
        desc: "Se o registro não tem ações no período, a conversão mostra 0% e Sem ações.",
      },
    ],
  },
} satisfies Record<string, InfoContent>
