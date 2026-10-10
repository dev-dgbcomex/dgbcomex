import type { InfoContent } from "@/lib/info-content"

/**
 * Explicação da tabela "Produtos faturados" do detalhe do faturamento.
 * Falada no componente porque é uma seção da tela, não a tela inteira.
 */
export const infoTabelaProdutos: InfoContent = {
  title: "Tabela de produtos faturados",
  description:
    "Uma linha por produto, com os totais somados de todos os itens de nota do período filtrado. A tabela responde quanto cada produto rendeu, a que preço e em que volume.",
  rules: [
    "Os produtos vêm do catálogo do ERP: o código é o Cadastro_Produto e a descrição é o nome do tecido (VELUDO CONFORT, BELGA, ...). Produto fora do catálogo aparece só com o código.",
    "A unidade ao lado do código é a unidade comercial do produto (MT, KG, ...), também do ERP.",
    "A barra colorida é proporcional ao faturamento: o produto que mais rendeu ocupa 100% da largura.",
    "O faturamento usa a mesma fórmula do card de Faturamento — Σ (Vr_Total + Acres_Desc) — para o número da tabela bater com o do gráfico e com o do KPI.",
    "Os totais são do período que está filtrado no topo da tela, e não só da página de notas visível.",
    "Quando o produto não tem metragem registrada (venda por peso, por exemplo), o valor médio por metro aparece como — em vez de divisão por zero.",
  ],
  fields: [
    {
      name: "Produto",
      desc: "Código do produto no ERP (6 dígitos) com a descrição embaixo e a unidade comercial (MT, KG) ao lado.",
    },
    {
      name: "Itens",
      desc: "Quantas linhas de nota têm esse produto. Um item é uma linha da nota fiscal, não uma nota inteira.",
    },
    {
      name: "Metragem",
      desc: "Soma dos metros vendidos do produto no período. É a base do cálculo do valor médio por metro.",
    },
    {
      name: "Peso",
      desc: "Soma dos quilos vendidos do produto no período.",
    },
    {
      name: "Vlr. unitário médio",
      desc: "Média aritmética do valor unitário (Vr_Unitario) de todos os itens do produto: soma dos valores unitários dividida pela quantidade de itens. É o preço de venda que o ERP registrou em cada linha, já sem o acrescimo ou desconto do item.",
    },
    {
      name: "Vlr. médio (R$/m)",
      desc: "Quanto rendeu cada metro: faturamento total do produto dividido pela metragem total. Faturamento ÷ Metragem. Use para comparar produtos de preços diferentes pelo preço real por metro, já com acrescimos e descontos embutidos.",
    },
    {
      name: "Faturamento",
      desc: "Soma de (Vr_Total + Acres_Desc) de todos os itens do produto. É o valor que a empresa realmente faturou no período.",
    },
  ],
  examples: [
    {
      title: "Vlr. unitário médio × Vlr. médio por metro",
      desc: "Um produto com 2 itens a R$ 5,00 e R$ 7,00 tem unitário médio de R$ 6,00 (soma 12,00 ÷ 2 itens). Se esses 2 itens somaram 100 m e R$ 1.200 de faturamento, o valor médio por metro é R$ 12,00 (1.200 ÷ 100) — maior que o unitário porque o metro está no denominador e a venda não é exatamente pelo valor unitário.",
    },
    {
      title: "Por que os dois valores existem",
      desc: "O unitário médio mostra o preço de tabela que o ERP gravou. O valor por metro mostra o resultado real. Quando os dois divergem muito, é porque houve acrescimo, desconto ou venda fracionada no período.",
    },
    {
      title: "Produto sem metragem",
      desc: "Se o produto é vendido por peso ou por peça, a coluna Metragem fica zerada e o Vlr. médio (R$/m) mostra —. Nesse caso use a coluna Peso ou a unidade do produto para fazer a comparação.",
    },
  ],
}