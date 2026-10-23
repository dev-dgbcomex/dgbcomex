import type { InfoContent } from "./types"

export const wmsContent: Record<string, InfoContent> = {
  "/wms": {
    title: "WMS — Gestão de Armazém",
    description:
      "Módulo de armazém que transforma pedidos liberados no ERP em ordens de separação. O comercial marca o pedido, o estoque seleciona as peças e o WMS reserva cada peça no PostgreSQL local (dgbcomex_warehouse), acessado pela api-microdata. O ERP é somente leitura: o WMS nunca grava nele.",
    rules: [
      "Pedido liberado = status 2 (aprovado), pedido e item abertos e saldo (qtde − romaneio − acerto) maior que zero.",
      "A marcação do comercial é por pedido inteiro; os itens servem para orientar a separação.",
      "Status da ordem: LIBERADO → EM_SEPARACAO → SEPARADO; CANCELADO encerra e libera as peças.",
      "Ao adicionar, a peça é reservada na hora e deixa de aparecer no estoque em aberto e para outras ordens.",
      "Concluir a ordem não libera as peças: elas seguem bloqueadas até a baixa no ERP.",
      "Se o ERP baixar uma peça durante a separação, a tela sinaliza a divergência e permite trocar/remover.",
      "O saldo separado tem tolerância para mais e para menos: é possível concluir parcialmente e deixar saldo.",
      "As gavetas são criadas no ERP e apenas visualizadas no WMS; a gaveta é o endereço da peça.",
      "As rotas /api/wms/* fazem proxy autenticado para a api-microdata, que acessa o banco local.",
    ],
    fields: [
      { name: "Pedido liberado", desc: "Pedido aprovado e aberto no ERP com saldo a separar" },
      { name: "Ordem de separação", desc: "Ordem local que reserva as peças de um pedido" },
      { name: "Peça reservada", desc: "Rolo/peça bloqueado por uma ordem ativa ou concluída" },
      { name: "Gaveta", desc: "Endereço físico da peça, criado e mantido no ERP" },
    ],
    examples: [
      {
        title: "Marcar um pedido",
        desc: "Em Pedidos, localize o pedido aprovado, clique em Marcar para separação e abra a ordem criada.",
      },
      {
        title: "Separar as peças",
        desc: "Na ordem, use Adicionar peças em cada item: a lista já mostra só peças em aberto compatíveis com a grade.",
      },
      {
        title: "Concluir",
        desc: "Com as peças reservadas, clique em Concluir. A baixa física acontece no ERP; até lá as peças continuam bloqueadas.",
      },
    ],
  },
  "/wms/pedidos": {
    title: "Pedidos para Separação",
    description:
      "Backlog dos pedidos aprovados e abertos no ERP (status 2) com saldo a separar. Mostra a situação da separação e permite marcar o pedido inteiro para o armazém.",
    rules: [
      "Só entram pedidos com status 2, status_ped aberto, itens abertos e saldo maior que zero.",
      "A situação pode ser SEM_SEPARACAO, LIBERADO, EM_SEPARACAO, SEPARADO ou CANCELADO.",
      "Pedido com ordem ativa (LIBERADO ou EM_SEPARACAO) não pode ser marcado de novo — a API responde 409.",
      "Marcar cria a ordem no banco local e leva para o detalhe da separação.",
      "O saldo em metros é a soma de qtde − qtde_romaneio − qtde_acerto dos itens abertos.",
    ],
    columns: [
      { name: "Pedido / Cliente", desc: "Identificação do pedido e razão social do cliente" },
      { name: "Data / Entrega", desc: "Datas do pedido e de entrega no ERP" },
      { name: "Itens", desc: "Quantidade de itens abertos com saldo" },
      { name: "Saldo (m)", desc: "Metros ainda a separar no pedido" },
      { name: "Separação", desc: "Situação da ordem de separação vinculada" },
    ],
    examples: [
      {
        title: "Pedido ainda sem ordem",
        desc: "Situação Sem separação: clique em Marcar. A ordem nasce LIBERADO e abre no detalhe.",
      },
      {
        title: "Pedido já em separação",
        desc: "Clique em Abrir ordem para retomar a seleção das peças.",
      },
    ],
  },
  "/wms/separacoes": {
    title: "Ordens de Separação",
    description:
      "Ordens criadas a partir dos pedidos liberados. O kanban mostra o fluxo por status e a lista detalha peças, metros e saldo de cada ordem.",
    rules: [
      "LIBERADO: pedido marcado, ainda sem peças (ou com peças de uma ordem recém-criada).",
      "EM_SEPARACAO: peças reservadas; novas peças podem ser adicionadas ou removidas.",
      "SEPARADO: conclusão registrada; as peças continuam bloqueadas até a baixa no ERP.",
      "CANCELADO: ordem encerrada; as peças reservadas voltam ao estoque em aberto.",
      "A API impede concluir sem peças e impede remover peças fora de EM_SEPARACAO.",
    ],
    columns: [
      { name: "Ordem / Pedido", desc: "Número local da ordem e pedido de origem" },
      { name: "Cliente", desc: "Cliente do pedido" },
      { name: "Status", desc: "LIBERADO, EM_SEPARACAO, SEPARADO ou CANCELADO" },
      { name: "Peças / Metros", desc: "Peças reservadas e total em metros" },
      { name: "Saldo (m)", desc: "Saldo restante do pedido no ERP" },
    ],
    examples: [
      {
        title: "Ordem em andamento",
        desc: "Abra a ordem, selecione peças compatibleis com cada item e clique em Concluir quando terminar.",
      },
    ],
  },
  "/wms/estoque": {
    title: "Estoque em Aberto (WMS)",
    description:
      "Peças sem baixa no ERP (raw.cte_peca menos raw.cte_baixa), excluindo as reservadas/separadas por ordens ativas. Serve de consulta e de base para a seleção de peças dentro da ordem de separação.",
    rules: [
      "Rolos de origem (nro_rolo_origem preenchido) ficam fora, como no estoque legado.",
      "Peças reservadas ou separadas por qualquer ordem ativa não aparecem aqui.",
      "A grade de seleção da ordem usa produto + situação + cor + desenho + variante + categoria; a largura não filtra porque o formato difere entre peça e item.",
      "Os filtros disponíveis são busca, gaveta, sub-lote, aviso, cor e produto.",
      "Gaveta e zona vêm do catálogo do ERP (cte_gaveta/cte_grupo_gaveta).",
    ],
    columns: [
      { name: "Rolo / Peça", desc: "Identificação da peça no ERP" },
      { name: "Produto / Cor / Situação", desc: "Atributos do tecido com descrições do ERP" },
      { name: "Largura", desc: "Largura como texto, do jeito que está no ERP" },
      { name: "Metros", desc: "Metragem da peça" },
      { name: "Sub-lote / Aviso", desc: "Rastreabilidade e marcações operacionais" },
      { name: "Gaveta / Zona", desc: "Endereço físico e zona do armazém" },
    ],
    examples: [
      {
        title: "Conferir antes de separar",
        desc: "Busque o rolo ou filtre a gaveta para conferir o que está disponível; a reserva em si é feita na ordem.",
      },
    ],
  },
  "/wms/gavetas": {
    title: "Gavetas do Armazém",
    description:
      "Catálogo de gavetas (endereços) criado no ERP, mostrado em kanban por zona ou em lista, com a ocupação de peças em aberto de cada gaveta.",
    rules: [
      "Somente leitura: o WMS não cria, edita, inativa nem transfere gavetas — isso é feito no ERP.",
      "O código pode ser posicional (AA.BB.CC.D) ou nomeado (PACKLIST, AVARIA 01, RACK 01 PQN, DEVOLUCOES, entre outros).",
      "A zona vem do grupo de gaveta do ERP (DEPÓSITO, PRODUÇÃO, TRANSPORTE, CANAL VERDE, CANAL VERMELHO, ETIQUETAGEM, INVENTARIO).",
      "Peças em gavetas consideram apenas o estoque em aberto.",
    ],
    columns: [
      { name: "Código / Descrição", desc: "Identificação da gaveta no ERP" },
      { name: "Zona / Setor", desc: "Grupo de gaveta e setor responsável" },
      { name: "Peças / Metros", desc: "Ocupação atual com peças em aberto" },
      { name: "Sugestão / Estoque plano", desc: "Configurações operacionais vindas do ERP" },
    ],
    examples: [
      {
        title: "Localizar uma gaveta",
        desc: "Use a busca por código ou descrição e alterne entre Kanban (por zona) e Lista para ver a ocupação.",
      },
    ],
  },
}
