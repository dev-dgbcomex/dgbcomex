import type { InfoContent } from "./types"

export const comercialContent: Record<string, InfoContent> = {
  "/comercial/solicitacoes": {
    title: "Solicitações",
    description:
      "Lista de todas as solicitações comerciais registradas no sistema. Aqui você pode visualizar, filtrar e gerenciar cada solicitação.",
    rules: [
      "Solicitações passam por um fluxo de status: PENDENTE → EM_DESENVOLVIMENTO → APROVADO/REPROVADO → EM_PRODUÇÃO → CONCLUÍDO.",
      "Apenas usuários com perfil ADMIN ou SUDO podem excluir solicitações.",
      "Cada solicitação pertence a um cliente e pode ser do tipo Tecelagem ou Beneficiamento.",
      "Ao excluir uma solicitação, todos os anexos vinculados também são removidos.",
      "Mudanças de status são registradas no histórico da solicitação.",
    ],
    fields: [
      { name: "Cliente", desc: "Nome do cliente solicitante (autocomplete com dados cadastrados)" },
      {
        name: "Tipo",
        desc: "Tecelagem (desenvolvimento de tecido) ou Beneficiamento (processo químico)",
      },
      { name: "Status", desc: "Etapa atual no fluxo de desenvolvimento" },
      {
        name: "Briefing",
        desc: "Detalhamento técnico da solicitação com campos dinâmicos conforme o tipo",
      },
    ],
  },
  "/comercial/solicitacoes/nova": {
    title: "Nova Solicitação",
    description:
      "Formulário de criação de uma nova solicitação comercial. Preencha os dados do cliente, tipo, briefing técnico e prazos.",
    rules: [
      "Campos marcados com * são obrigatórios.",
      "O briefing é dividido em seções dinâmicas que mudam conforme o tipo de solicitação.",
      "Toda solicitação nova inicia com status PENDENTE.",
      "É possível anexar arquivos (PDF, DOCX, XLSX, JPG, PNG, MP4) até 10MB cada.",
      "Após criar, a solicitação pode ser editada até o início do desenvolvimento.",
    ],
  },
  "/comercial/clientes": {
    title: "Clientes",
    description:
      "Cadastro de clientes comerciais. Gerencie informações como nome, CNPJ, contatos e endereço.",
    rules: [
      "O CNPJ é validado para garantir unicidade no cadastro.",
      "O botão 'Buscar CNPJ' consulta a Receita Federal, mostra clientes já cadastrados com aquele documento e permite criar um novo cliente com os dados retornados.",
      "A visualização padrão é em cards; o botão 'Tabela' mantém a lista disponível com os mesmos filtros.",
      "Cada card mostra as contagens de Oportunidades, Pedidos, Visitas e Ações do cliente; Solicitações e Amostras continuam acessíveis na visualização em tabela.",
      "Clientes ativos podem ser vinculados a solicitações.",
      "A desativação de um cliente não remove solicitações existentes.",
    ],
    fields: [
      { name: "Nome", desc: "Nome fantasia ou razão social" },
      { name: "CNPJ", desc: "Cadastro Nacional de Pessoa Jurídica (formato XX.XXX.XXX/XXXX-XX)" },
      { name: "Contato", desc: "Nome e telefone do contato comercial" },
    ],
  },
  "/comercial/clientes/[id]": {
    title: "Editar Cliente",
    description:
      "Tela de cadastro do cliente: dados da empresa e, fora do formulário, cards de contatos, representantes, oportunidades, ações de prospecção, visitas, timeline, WhatsApp, histórico de Resumos IA e chat de análise.",
    rules: [
      "Campos marcados com * são obrigatórios: Nome / Fantasia e CNPJ.",
      "O botão Salvar grava as alterações via PUT e atualiza o cadastro do cliente.",
      "A exclusão é restrita a ADMIN e SUDO e remove também os vínculos de representantes e contatos.",
      "O card 'Histórico de conversão em cliente' mostra de qual pessoa do CRM o cliente veio, quando virou cliente, quem promoveu e o negócio acumulado (oportunidades, ações e visitas).",
      "Clientes cadastrados manualmente (sem origem no CRM) aparece no histórico com a mensagem de que não vieram de uma pessoa do CRM.",
      "Na seção 'Relacionamentos do CRM' o cliente tem os cards de Contatos, Representantes, Resumo IA, Oportunidades, Ações de Prospecção, Visitas, Timeline e WhatsApp.",
      "Não há card de Propostas nesta tela; as propostas continuam disponíveis na listagem geral e nos relatórios.",
      "Os cards do cliente somam o negócio lançado direto nele e o negócio herdado das leads do CRM que foram promovidas a este cliente.",
      "Nomes de contatos e representantes abrem o cadastro do respectivo registro; cada evento da timeline com detalhe abre o registro de origem.",
      "O botão '+' no card de Oportunidades cria o registro já vinculado ao cliente.",
      "O Resumo IA é gerado manualmente pelo botão 'Gerar resumo' e usa o histórico do cliente, das pessoas promovidas, dos negócios, visitas, ações, propostas, tarefas, WhatsApp e dos resumos anteriores.",
      "Cada resumo gerado vira um evento clicável na Timeline e abre o texto completo no card 'Resumo IA'.",
      "No card 'Resumo IA' é possível selecionar resumos e exportar em MD, PDF ou TXT, em arquivo único ou arquivos separados.",
      "O bloco de análise de IA responde perguntas sobre o histórico do cliente a partir da timeline.",
      "No WhatsApp do cliente vale a conversa dos contatos do cliente e das leads promovidas; o envio usa o contato principal com WhatsApp cadastrado.",
    ],
    fields: [
      { name: "Nome / Fantasia", desc: "Nome do cliente (obrigatório)" },
      { name: "CNPJ", desc: "Cadastro Nacional de Pessoa Jurídica (obrigatório)" },
      { name: "Segmento", desc: "Segmento comercial do cliente" },
      { name: "Representantes", desc: "Representantes comerciais vinculados ao cliente" },
      { name: "Contatos", desc: "Contatos vinculados ou sem vínculo no CRM" },
      {
        name: "Histórico de conversão",
        desc: "Lead de origem, data da conversão, quem promovou e números do funil",
      },
      {
        name: "Oportunidades / Ações / Visitas",
        desc: "Negócio e agenda do cliente, diretos ou herdados das leads promovidas",
      },
      { name: "Timeline", desc: "Histórico clicável do cliente e das leads promovidas" },
      {
        name: "Resumo IA",
        desc: "Histórico de resumos, botão 'Gerar resumo', classificação QUENTE/MORNO/FRIO e exportação MD/PDF/TXT",
      },
      { name: "Análise de IA", desc: "Chat de perguntas sobre o histórico do cliente" },
      { name: "WhatsApp", desc: "Conversa com os contatos do cliente e das leads promovidas" },
    ],
    examples: [
      {
        title: "Resumo MORNO",
        desc: "Ao gerar, a IA pode classificar o cliente como MORNO quando há proposta enviada-sem-resposta e o último contato foi há mais de 30 dias.",
      },
      {
        title: "Exportação do histórico",
        desc: "Com 2 resumos selecionados, 'Arquivos separados' gera 2 PDFs; 'Arquivo único' gera um PDF com os 2 resumos em sequência.",
      },
    ],
  },
  "/comercial/requisicoes-amostra-comercial": {
    title: "Requisições de Amostra Comercial",
    description:
      "Lista de requisições de amostra comercial. Gerencie solicitações de amostras para clientes, vinculadas a produtos cadastrados.",
    rules: [
      "Cada requisição deve estar vinculada a um produto existente.",
      "O título é obrigatório; os demais campos são opcionais.",
      "O status é gerenciado pelo fluxo configurado em AMOSTRA_COMERCIAL.",
      "Apenas perfis COMERCIAL, DESENVOLVIMENTO, PCP, ADMIN ou SUDO podem mover cards no kanban.",
      "Ao aprovar ou reprovar, um motivo deve ser informado.",
    ],
    fields: [
      { name: "Produto", desc: "Produto vinculado à requisição (autocomplete)" },
      { name: "Título", desc: "Identificação da requisição" },
      { name: "Status", desc: "Etapa atual no fluxo de amostra comercial" },
    ],
  },
  "/comercial/requisicoes-amostra-comercial/novo": {
    title: "Nova Requisição de Amostra Comercial",
    description: "Formulário de criação de uma nova requisição de amostra comercial.",
    rules: [
      "Selecione um produto existente.",
      "O título é obrigatório.",
      "O prazo desejado pode ser informado para controle de prioridade.",
      "Após criar, a requisição aparecerá na lista e kanban.",
    ],
  },
  "/comercial/requisicoes-amostra-comercial/kanban": {
    title: "Kanban — Amostras Comerciais",
    description: "Quadro kanban para gerenciar requisições de amostra comercial com drag-and-drop.",
    rules: [
      "Arraste os cards entre colunas para alterar o status.",
      "Status APROVADO/REPROVADO exigem motivo obrigatório.",
      "Apenas COMERCIAL, DESENVOLVIMENTO, PCP, ADMIN e SUDO podem arrastar cards.",
    ],
  },
  "/comercial/requisicoes-corte": {
    title: "Requisições de Corte",
    description:
      "Gerencie as requisições de corte de produtos. Uma requisição pode conter múltiplos itens (cortes) para diferentes produtos.",
    rules: [
      "Cada requisição pode ter vários itens de corte, cada um com seu próprio produto, ordem e quantidade.",
      "Status disponíveis: Solicitado → Processando → Atendido.",
      "Apenas o requisitante e usuários COMERCIAIS podem alterar o status.",
      "Para excluir, é necessário ser o requisitante ou ter permissão COMERCIAL.",
    ],
  },
  "/comercial/requisicoes-corte/por-romaneio": {
    title: "Requisição de Corte por Romaneio",
    description:
      "Crie requisições de corte a partir de romaneios de expedição. Selecione um romaneio, informe a metragem desejada para cada produto e crie a requisição automaticamente.",
    rules: [
      "Os romaneios são carregados da integração configurada para a tela com o nome desta página.",
      "Cada romaneio exibe os produtos disponíveis com suas respectivas metragens.",
      "Informe a metragem desejada para cada produto e clique em 'Criar Requisição de Corte'.",
      "A requisição será criada com status SOLICITADO e redirecionada automaticamente.",
      "Campos do romaneio são mapeados: produto → código do produto, ordem → pedido, cor → cor, narrativa → artigo.",
    ],
  },
}
