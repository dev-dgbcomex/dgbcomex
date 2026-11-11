import type { InfoContent } from "./types"

export const outrosContent: Record<string, InfoContent> = {
  "/amostras": {
    title: "Amostras de Desenvolvimento",
    description:
      "Lista central de todas as amostras de desenvolvimento (tecido cru e acabamento) registradas no sistema.",
    rules: [
      "Amostras são vinculadas a um produto ou a um acabamento específico.",
      "Cada amostra passa por um fluxo de aprovação com status configuráveis.",
      "O histórico de status é registrado automaticamente para auditoria.",
      "Amostras aprovadas podem ser usadas como referência para produção.",
    ],
  },
  "/amostras/kanban": {
    title: "Kanban — Amostras de Desenvolvimento",
    description: "Kanban de amostras para visualizar e mover amostras entre colunas de status.",
    rules: [
      "Arraste os cards para mover amostras entre status.",
      "Cada coluna representa um status do fluxo de amostras.",
      "Apenas perfis autorizados podem mover amostras entre colunas.",
      "Amostras de tecido cru e acabamento aparecem juntas no kanban.",
    ],
  },
  "/perfil": {
    title: "Meu Perfil",
    description: "Visualização e edição dos seus dados de usuário, incluindo nome, email e senha.",
    rules: [
      "Você pode alterar seu nome, email e senha.",
      "O email deve ser único no sistema.",
      "A alteração de senha requer confirmação da senha atual.",
    ],
  },
  "/perfil/menus": {
    title: "Menu de Navegação",
    description:
      "Personalize os menus, a página inicial e o cadastro de Status (etiquetas, cores, colunas do Kanban e gatilhos) do sistema.",
    rules: [
      "Arraste os menus e os itens para reordenar a navegação; a ordem é salva ao soltar.",
      "A cópia de menus substitui a navegação atual pelos menus do usuário escolhido.",
      "A seleção de tela tem busca por nome: o sistema tem mais de 150 telas e o filtro encontra a desejada (ex: 'CRM — Relatórios').",
      "A lista de telas vem do cadastro de telas do sistema (src/lib/search-registry.ts): uma tela nova só aparece aqui depois de registrada nele.",
      "A página inicial também é escolhida pela mesma busca.",
      "A seção Status é o cadastro único de etiquetas usadas pelos módulos (Oportunidade, Proposta, Amostra, Produto Cru, Requisição de Corte e Solicitação de Desenvolvimento).",
      "Cada status pertence a um tipo (módulo) e define rótulo, cor, ordem e regras de exibição.",
      "O nome é o valor interno gravado nos registros (ex: QUALIFICACAO) e não pode se repetir dentro do mesmo tipo.",
      "O rótulo é o texto exibido nas telas; quando vazio, o próprio nome é usado.",
      "A cor (hex) pinta a coluna do Kanban e o badge do status na listagem.",
      "A ordem define a posição da coluna no Kanban (menor primeiro).",
      "Status inativos ficam ocultos: somem do Kanban e das listas de seleção.",
      "A flag 'Exibir no Kanban' (tipos Oportunidade e Proposta) permite cadastrar um status selecionável que não vira coluna do quadro.",
      "As colunas do Kanban de Oportunidades e Propostas saem deste cadastro: criar um status ativo aqui já cria a coluna correspondente.",
      "Gatilhos são ações disparadas automaticamente quando um registro entra no status (ex.: virar cliente, criar pedido de venda, notificar o responsável, registrar na timeline).",
      "Uma falha em um gatilho não impede a mudança de status nem interrompe os demais gatilhos.",
      "Apenas usuários ADMIN e SUDO podem criar, editar ou excluir status e gatilhos.",
    ],
    fields: [
      { name: "Buscar tela", desc: "Filtra a lista de telas pelo nome, URL ou módulo" },
      { name: "Página Inicial", desc: "Tela que abre ao clicar no logo ou na home" },
      { name: "Nome", desc: "Valor interno do status (ex: PENDENTE)" },
      { name: "Rótulo", desc: "Texto exibido nas telas (ex: Pendente)" },
      { name: "Tipo", desc: "Módulo que usa o status (ex: Oportunidade)" },
      { name: "Cor", desc: "Cor hexadecimal da coluna do Kanban e do badge" },
      { name: "Ordem", desc: "Posição da coluna no Kanban" },
      { name: "Ativo", desc: "Desmarcar oculta o status das listas e do Kanban" },
      {
        name: "Exibir no Kanban",
        desc: "Cria ou não a coluna no quadro de oportunidades e propostas",
      },
      { name: "Gatilhos", desc: "Ações automáticas executadas ao mover um registro para o status" },
    ],
  },
}
