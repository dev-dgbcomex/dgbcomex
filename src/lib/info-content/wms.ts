import type { InfoContent } from "./types"

export const wmsContent: Record<string, InfoContent> = {
  "/wms": {
    title: "WMS — Gestão de Armazém",
    description:
      "Módulo de armazém que transforma pedidos liberados no ERP em ordens de separação. O comercial libera o pedido no kanban, o estoque seleciona as peças e o WMS reserva cada peça no PostgreSQL local (dgbcomex_warehouse), acessado pela api-microdata. O ERP é somente leitura: o WMS nunca grava nele.",
    rules: [
      "Pedido liberado = status 2 (aprovado), pedido e item abertos e saldo (qtde − romaneio − acerto) maior que zero.",
      "A situação do pedido é local (não existe no ERP) e cada situação ativa vira uma coluna do kanban.",
      "A situação define a ação ao mover: criar/iniciar a ordem, concluir, cancelar ou apenas mover.",
      "O fluxo da ordem é LIBERADO → EM_SEPARACAO → SEPARADO; CANCELADO encerra a ordem e devolve as peças ao estoque em aberto.",
      "Ao adicionar, a peça é reservada na hora e deixa de aparecer no estoque em aberto e para outras ordens.",
      "Concluir a ordem não libera as peças: elas seguem bloqueadas até a baixa no ERP.",
      "Se o ERP baixar uma peça durante a separação, a tela sinaliza a divergência e permite trocar/remover.",
      "O saldo separado tem tolerância para mais e para menos: é possível concluir parcialmente e deixar saldo.",
      "As gavetas são criadas no ERP e apenas visualizadas no WMS; a gaveta é o endereço da peça.",
      "As rotas /api/wms/* fazem proxy autenticado para a api-microdata, que acessa o banco local.",
    ],
    fields: [
      { name: "Pedido liberado", desc: "Pedido aprovado e aberto no ERP com saldo a separar" },
      { name: "Situação do pedido", desc: "Coluna local do kanban com ação e perfis autorizados" },
      { name: "Ordem de separação", desc: "Ordem local que reserva as peças de um pedido" },
      { name: "Peça reservada", desc: "Rolo/peça bloqueado por uma ordem ativa ou concluída" },
      { name: "Gaveta", desc: "Endereço físico da peça, criado e mantido no ERP" },
    ],
    examples: [
      {
        title: "Liberar um pedido",
        desc: "Em Pedidos, arraste o cartão para a coluna Liberado ou use o seletor Mover para.",
      },
      {
        title: "Separar as peças",
        desc: "Arraste o pedido para Em separação para criar/iniciar a ordem e abra o link da ordem.",
      },
      {
        title: "Concluir",
        desc: "Com as peças reservadas, arraste para Separado. A baixa física acontece no ERP; até lá as peças continuam bloqueadas.",
      },
    ],
  },
  "/wms/pedidos": {
    title: "Pedidos para Separação",
    description:
      "Backlog dos pedidos aprovados e abertos no ERP (status 2) com saldo a separar, organizado em kanban. Cada coluna é uma situação do cadastro local e o movimento do cartão executa a ação configurada.",
    rules: [
      "Só entram pedidos com status 2, status_ped aberto, itens abertos e saldo maior que zero.",
      "As colunas vêm das situações ativas em Situações do Pedido; a ordem e a cor também são do cadastro.",
      "Arrastar para Liberado apenas registra a situação (não cria ordem); são permitidos COMERCIAL, ADMIN e SUDO.",
      "Arrastar para Em separação cria/inicia a ordem de separação; COMERCIAL, EXPEDICAO, ADMIN e SUDO podem mover.",
      "Separado conclui a ordem (exige peças) e Cancelado cancela e libera as peças.",
      "Cada coluna define os perfis autorizados; ADMIN e SUDO sempre podem mover.",
      "A tela abre no modo Kanban; use Lista para o seletor Mover para de cada pedido.",
      "A ordem vertical dos cartões é global por coluna (vale para todos os usuários) e é alterada arrastando o cartão para cima ou para baixo; COMERCIAL, EXPEDICAO, ADMIN e SUDO podem reordenar.",
      "A tarja lateral do cartão indica a prioridade pela posição: vermelha no topo (5%), amarela até a metade e verde no fim da coluna.",
      "Os artigos do pedido aparecem no cartão (vindos dos itens abertos no ERP).",
      "Ao mover um pedido com ordem ativa e peças reservadas, o sistema pede confirmação e cancela a ordem, liberando as peças para nova separação.",
      "O link Voltar para as separações aparece no topo e no rodapé da tela.",
      "O saldo em metros é a soma de qtde − qtde_romaneio − qtde_acerto dos itens abertos.",
    ],
    columns: [
      { name: "Pedido / Cliente", desc: "Identificação do pedido e razão social do cliente" },
      { name: "Data / Entrega", desc: "Datas do pedido e de entrega no ERP" },
      { name: "Itens", desc: "Quantidade de itens abertos com saldo" },
      { name: "Saldo (m)", desc: "Metros ainda a separar no pedido" },
      { name: "Situação", desc: "Coluna atual do kanban e ordem de separação vinculada" },
    ],
    examples: [
      {
        title: "Pedido sem separação",
        desc: "Arraste para Liberado ou Em separação. Em separação já cria a ordem; Liberado apenas marca o pedido.",
      },
      {
        title: "Pedido já em separação",
        desc: "Clique em Abrir ordem para retomar a seleção das peças.",
      },
      {
        title: "Usar o teclado",
        desc: "Foque o cartão e use o seletor Mover para como alternativa ao arrastar.",
      },
    ],
  },
  "/wms/situacoes": {
    title: "Situações do Pedido",
    description:
      "Cadastro local das colunas do kanban de Pedidos. Cada situação tem nome, cor, ordem, ação ao mover, perfis autorizados e indicador de ativa. A situação do pedido não existe no ERP.",
    rules: [
      "Cada situação ativa aparece como uma coluna no kanban de Pedidos, respeitando a ordem.",
      "A ação define o efeito ao mover o pedido: NENHUMA (somente mover), CRIAR_ORDEM, CONCLUIR_ORDEM ou CANCELAR_ORDEM.",
      "Os perfis autorizados controlam quem pode mover o pedido para a coluna; ADMIN e SUDO sempre podem.",
      "As situações do sistema (Sem separação, Liberado, Em separação, Separado, Cancelado) não podem ser excluídas.",
      "Uma situação em uso por algum pedido não pode ser excluída; desative-a para tirar do kanban.",
      "O perfil EXPEDICAO precisa existir no cadastro de perfis (tabela roles) para ser atribuído a usuários.",
      "Somente ADMIN e SUDO podem criar, editar ou excluir situações.",
    ],
    fields: [
      { name: "Nome", desc: "Título exibido na coluna do kanban" },
      { name: "Cor", desc: "Cor da borda, do ponto e do badge da coluna" },
      { name: "Ordem", desc: "Posição da coluna no kanban (menor aparece primeiro)" },
      { name: "Ação", desc: "O que acontece ao mover o pedido para a coluna" },
      { name: "Perfis", desc: "Perfis que podem mover o pedido para a coluna" },
      { name: "Ativa", desc: "Se desligada, a coluna não aparece no kanban" },
    ],
    examples: [
      {
        title: "Criar uma etapa intermediária",
        desc: "Cadastre Aguardando conferência com ação NENHUMA e perfil EXPEDICAO; ela vira uma coluna sem alterar a ordem.",
      },
      {
        title: "Desativar uma coluna",
        desc: "Edite a situação e desmarque Ativa. Pedidos que já estão nela continuam visíveis até serem movidos.",
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
      "A ordem vertical dos cartões é global por coluna (compartilhada entre usuários) e pode ser alterada arrastando para cima/baixo; COMERCIAL, EXPEDICAO, ADMIN e SUDO podem reordenar.",
      "A tarja lateral do cartão indica a prioridade pela posição: vermelha no topo (5%), amarela até a metade e verde no fim.",
      "O cartão mostra os artigos do pedido e o link para abrir a ordem.",
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
        desc: "Abra a ordem, selecione peças compatíveis com cada item e clique em Concluir quando terminar.",
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
      "A tela abre no modo Kanban agrupado por zona; a ordem dos cartões aqui é apenas de leitura (não há reordenação).",
      "O link Voltar para as separações aparece no topo e no rodapé da tela.",
      "A grade de seleção da ordem usa produto + situação + cor + desenho + variante + categoria; a largura não filtra porque o formato difere entre peça e item.",
      "Os filtros disponíveis são busca, gaveta, sub-lote, aviso, cor e produto.",
      "Na seleção de peças da ordem há abas para buscar por rolo/peça, lote (sub-lote), aviso ou gaveta.",
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
      "A tela abre no modo Kanban agrupado por zona; a ordem dos cartões não é editável.",
      "O link Voltar para as separações aparece no topo e no rodapé da tela.",
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
