import type { InfoContent } from "./types"

export const biContent: Record<string, InfoContent> = {
  "/bi/integracoes/faturamento": {
    title: "Faturamento — Detalhe das notas",
    description:
      "Tela de detalhe do faturamento no nível do item de nota: mostra cada nota fiscal com seus itens (pedido, produto, romaneio, cliente, representante, metros, peso e valores) dos últimos 12 meses, com filtros, gráficos e geração de PDF e CSV.",
    rules: [
      "A tela lê de um cache local (IndexedDB) do seu próprio navegador. Por isso filtrar, agrupar e gerar PDF é instantâneo e não pesa no ERP.",
      "A base vem do ERP em dois tempos: uma carga inicial de 12 meses (que espelha no Neon) e, depois, apenas as notas novas.",
      "VOCÊ NÃO PRECISA CLICAR NOS BOTÕES DE DADOS PARA FILTRAR. Depois que o cache está populado, basta preencher os filtros e clicar em Aplicar filtros — e só.",
      "Usar base do Neon, Atualizar e Carregar base (1ª vez) são de manutenção de dados, não de consulta. No dia a dia, ninguno deles é necessário.",
      "Os filtros (período, representante, cliente, produto e nº da nota) só têm efeito depois de clicar em Aplicar filtros. A busca livre acima da lista filtra na hora, sem clicar em nada.",
      "Exportar CSV baixa exatamente os itens do filtro aplicado, incluindo todos os produtos e notas do período — não só a página visível.",
      "A base é compartilhada: o Neon tem uma cópia única. Outro usuário que já rodou a carga inicial basta usar a base existente.",
    ],
    fields: [
      {
        name: "Aplicar filtros",
        desc: "Aplica período, representante, cliente, produto e nº da nota. Roda a consulta no cache local, sem ir ao ERP. Só precisa clicar quando mudar algum desses campos.",
      },
      {
        name: "Limpar",
        desc: "Volta os filtros para o padrão (últimos 12 meses) e limpa a seleção de notas e a busca.",
      },
      {
        name: "Busca livre",
        desc: "Filtra as notas já carregadas na tela por nota, cliente, produto, representante ou romaneio. É instantâneo e não precisa de Aplicar filtros.",
      },
      {
        name: "Usar base do Neon",
        desc: "Popula o cache deste navegador com a base de 12 meses que já está no Neon, sem ler o ERP e sem reescrever o Neon. Use na primeira vez que você abre a tela, ou em um navegador novo. Se a base do Neon estiver vazia, avisa e pede a carga inicial.",
      },
      {
        name: "Atualizar",
        desc: "Busca somente as notas novas desde a última carga (lê o delta no ERP e faz merge no cache). Não substitui a base nem apaga o que já está lá. É o botão certo para pegar as notas do dia. Só fica disponível depois que o cache está populado.",
      },
      {
        name: "Carregar base (1ª vez)",
        desc: "Lê 12 meses do ERP e reescreve a base do Neon por completo. É a operação mais pesada e raramente precisa: só na primeira vez da instalação, ou quando a janela de 12 meses mudou. Se você só quer consultar, prefira Usar base do Neon.",
      },
      {
        name: "Exportar CSV",
        desc: "Baixa os itens do filtro em CSV, separados por ponto e vírgula, com todos os campos (data, nota, empresa, pedido, produto, romaneio, representante, metros e valores).",
      },
      {
        name: "Selecionar / PDF",
        desc: "Marque notas pelos checkbox e gere um PDF único. Use Selecionar todas do período para levar o período inteiro em um documento, ou Inverter para pegar as que você não quer.",
      },
      {
        name: "Carregar mais notas",
        desc: "A lista mostra um bloco de notas por vez para a tela não travar. Clique para carregar mais; os KPIs e os gráficos já cobrem o período inteiro, não só o que está visível.",
      },
    ],
    examples: [
      {
        title: "1ª vez que você abre a tela",
        desc: "1) Clique em Usar base do Neon (se alguém já tiver feito a carga inicial, ele funciona). Se disser que a base está vazia, clique em Carregar base (1ª vez). 2) Preencha o período e clique em Aplicar filtros. 3) Navegue pelas notas. Pronto — não precisa mais clicar em nada de dados.",
      },
      {
        title: "Do dia a dia",
        desc: "Abra a tela, ajuste período/cliente/produto, clique em Aplicar filtros e navegue. Se quiser as notas de hoje, clique em Atualizar uma vez. Nada mais.",
      },
      {
        title: "Mudou a janela de 12 meses",
        desc: "Se a base foi carregada com outra janela, a tela avisa que o cache foi populado com datas diferentes. Aí use Usar base do Neon para repopular, sem precisar da carga completa.",
      },
      {
        title: "Os gráficos",
        desc: "Faturamento e metragem por mês (evolução ao longo do período); por cliente e por produto (os 8 maiores, em barras e linha de metros); e Participação por representante (fatia de cada vendedor). Os cartões podem ser arrastados pela alça ou movidos pelas setas — a ordem fica salva na sua conta.",
      },
      {
        title: "Gerar o PDF de várias notas",
        desc: "Marque as notas (ou use Selecionar todas do período), escolha Retrato ou Paisagem e clique em PDF único. Uma nota por página, com cabeçalho, itens, totais e numeração. A tabela de produtos abaixo dos gráficos explica os cálculos de cada coluna.",
      },
    ],
  },
}