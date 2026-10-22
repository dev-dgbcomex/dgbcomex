import type { InfoContent } from "./types"

export const wmsContent: Record<string, InfoContent> = {
  "/wms": {
    title: "WMS — Gestão de Armazém",
    description:
      "Módulo de armazém que trabalha com o estoque em aberto vindo do ERP e com endereçamento próprio. Os dados do WMS ficam no PostgreSQL local (dgbcomex_warehouse); o ERP é somente leitura.",
    rules: [
      "O estoque em aberto é lido de raw.cte_peca descontando as baixas de raw.cte_baixa — nada é escrito no ERP.",
      "Endereços, peças alocadas e movimentos ficam apenas no banco local.",
      "Alocar uma peça exige um endereço de destino válido.",
      "Uma mesma peça (Nro. Rolo + Nro. Peça) não pode ser alocada duas vezes.",
      "Transferência muda o endereço da peça; saída remove a alocação — os dois geram movimento auditável.",
      "Qualquer usuário autenticado pode consultar; criar endereço e movimentar exige sessão ativa.",
    ],
    fields: [
      { name: "Endereço", desc: "Posição física do armazém com código único, tipo e capacidade" },
      { name: "Tipo", desc: "PULMAO, PICKING, EXPEDICAO ou AVARIA" },
      { name: "Peça em aberto", desc: "Rolo/peça que está no ERP sem baixa registrada" },
      { name: "Movimento", desc: "Entrada, transferência, saída ou ajuste com usuário e data" },
    ],
    examples: [
      {
        title: "Cadastrar uma posição",
        desc: "Em Endereços, informe um código único (ex.: A-01-01), o tipo PULMAO e a capacidade em metros.",
      },
      {
        title: "Alocar um rolo",
        desc: "Em Estoque em aberto, escolha um endereço de destino e confirme a entrada. A peça passa a constar como alocada.",
      },
      {
        title: "Transferir uma peça",
        desc: "Em Movimentos, selecione TRANSFERENCIA, a peça alocada e o novo endereço. O histórico guarda origem e destino.",
      },
    ],
  },
  "/wms/enderecos": {
    title: "Endereços do Armazém",
    description:
      "Cadastro das posições físicas do armazém. Cada endereço tem código único, tipo e capacidade opcional em metros.",
    rules: [
      "O código do endereço é único e obrigatório.",
      "Endereços inativos continuam no histórico, mas não devem receber novas alocações.",
      "Capacidade é informativa; o sistema não bloqueia a alocação ao ultrapassá-la.",
    ],
    columns: [
      { name: "Código", desc: "Identificador único da posição física" },
      { name: "Tipo", desc: "PULMAO, PICKING, EXPEDICAO ou AVARIA" },
      { name: "Zona / Rua / Prédio / Nível / Apto", desc: "Detalhamento opcional da localização" },
      { name: "Capacidade", desc: "Capacidade em metros (informativa)" },
      { name: "Ativo", desc: "Indica se o endereço pode receber alocações" },
    ],
    examples: [
      {
        title: "Endereço em picking",
        desc: "Código PIC-01-02, tipo PICKING, zona Picking, rua 01, nível 02.",
      },
    ],
  },
  "/wms/estoque": {
    title: "Estoque em Aberto (WMS)",
    description:
      "Peças que estão no ERP sem baixa. A tela mostra os dados do rolo e permite alocar a peça em um endereço do armazém.",
    rules: [
      "A lista vem de raw.cte_peca com antijoin em raw.cte_baixa e ignora rolos de origem (nro_rolo_origem).",
      "Peças já alocadas no WMS deixam de aparecer como disponíveis para nova alocação.",
      "A busca filtra por número de rolo, produto, cor ou lote interno.",
      "Alocar exige escolher um endereço de destino; a operação gera um movimento de ENTRADA.",
    ],
    columns: [
      { name: "Rolo / Peça", desc: "Identificação da peça no ERP" },
      { name: "Produto / Categoria", desc: "Classificação do item" },
      { name: "Cor / Desenho / Variante", desc: "Atributos têxteis" },
      { name: "Largura", desc: "Largura do tecido (texto, como no ERP)" },
      { name: "Metros / Peso", desc: "Quantidades da peça" },
      { name: "Lote interno / Data de entrada", desc: "Rastreabilidade" },
    ],
    examples: [
      {
        title: "Alocar um rolo",
        desc: "Busque pelo número do rolo, selecione o endereço de destino e clique em Alocar. A peça entra no WMS com movimento de ENTRADA.",
      },
    ],
  },
  "/wms/movimentos": {
    title: "Movimentos do Armazém",
    description:
      "Histórico auditável de entradas, transferências, saídas e ajustes de peças. Registra usuário, endereços de origem/destino, metros, peso e observação.",
    rules: [
      "Entrada cria a alocação da peça no endereço de destino.",
      "Transferência atualiza o endereço da peça e guarda origem e destino no movimento.",
      "Saída remove a alocação da peça do WMS e mantém o registro no histórico.",
      "Movimentos não podem ser editados ou excluídos — o histórico é imutável.",
    ],
    columns: [
      { name: "Tipo", desc: "ENTRADA, SAIDA, TRANSFERENCIA ou AJUSTE" },
      { name: "Peça", desc: "Peça alocada relacionada ao movimento" },
      { name: "Origem / Destino", desc: "Endereços envolvidos" },
      { name: "Usuário", desc: "Quem executou o movimento" },
      { name: "Metros / Peso", desc: "Quantidades movimentadas" },
      { name: "Data", desc: "Momento do registro" },
    ],
    examples: [
      {
        title: "Saída de peça",
        desc: "Selecione a peça alocada e o tipo SAIDA. A peça sai do WMS e o movimento fica registrado com o endereço de origem.",
      },
    ],
  },
}
