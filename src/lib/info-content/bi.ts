import type { InfoContent } from "./types"

export const biContent: Record<string, InfoContent> = {
  "/bi/integracoes/contas-pagas": {
    title: "Contas Pagas — as baixas que formam o valor",
    description:
      "Detalhe do card 'Contas Pagas': cada baixa de conta a pagar (documento, fornecedor, banco, empresa, departamento e valor), as quatro janelas fixas do card — mês atual, mês anterior, ano atual e ano anterior — mais o card 'Período selecionado', e os gráficos do recorte: mês a mês, fornecedor, participação do fornecedor (% do total), banco, empresa e departamento.",
    rules: [
      "O valor considera a DATA DA BAIXA, não a data de vencimento: uma conta vencida em abril e paga em maio entra em maio.",
      "O card soma a view vwContasPagas, que tem só duas colunas (Data_Baixa e valorPago) — por isso ele mostra apenas o total. A lista vem da tabela Pag_Baixas, que está por trás dessa view. As duas foram conferidas no ERP e batem com diferença R$ 0,00 em cada mês.",
      "A tela nasce com um trimestre: a Data inicial vem no 1º dia do mês três meses atrás e a Data final em hoje. Os quatro cards do topo (Mês atual, Mês anterior, Ano atual e Ano anterior) são fixos — medem sempre as janelas do mês corrente, como o card do BI. O quinto card, 'Período selecionado', acompanha as datas.",
      "O seletor 'Mês' fica fora dos filtros: ele não recorta o período, escolhe qual mês *dentro* dele olhar. 'Todos os meses do período' mostra o período inteiro das datas; escolher um mês faz a lista, os grupos e os gráficos de grupo seguirem aquele mês. O gráfico de pagamentos mês a mês é a exceção: ele mostra sempre a evolução do período inteiro, seja 'Todos' ou um mês escolhido.",
      "Os gráficos seguem o desenho do faturamento: área do valor mês a mês com a contagem de baixas em linha, barras deitadas nos grupos (fornecedor, banco, empresa) e pizza na participação por departamento. Há ainda um gráfico de barras EM PÉ com a participação do fornecedor: cada barra é o quanto o fornecedor representa do total pago no recorte, em %.",
      "Todos os gráficos — inclusive o 'mês a mês' — respeitam os filtros de fornecedor, banco, empresa e departamento: escolher um fornecedor mostra a evolução só daquele fornecedor, escolher um banco só os títulos daquele banco.",
      "Cada card pode ser arrastado ou movido pelas setas, e a ordem fica salva por usuário (ela segue a pessoa entre máquinas). É o mesmo mechanism do faturamento, em outro painel.",
      "O 'i' de cada card abre um modal com TODOS os dados daquele gráfico, sem o corte do top 8 — é por ele que se vê o grupo que ficou fora das barras e se confere linha a linha.",
      "A lista é um card por fornecedor, e o card abre as baixas dele — como a nota abre os itens no faturamento. O checkbox do canto seleciona o fornecedor para o PDF consolidado; o botão PDF do card gera só aquele.",
      "Os dropdowns de Fornecedor, Banco, Empresa e Departamento se alimentam das baixas já carregadas, não de outra consulta: só aparece o que existe naquele recorte. Dá para digitar (o autocompleta ignora acento e caixa) ou escolher na lista; as opções vêm do relatório inteiro, então combinar um fornecedor com o banco dele continua possível.",
      "O departamento e a despesa vêm do centro de custo (a mesma origem do detalhe de custos administrativos). Uma baixa sem classificação aparece como '—' no grupo.",
      "Quando a baixa foi rateada entre mais de uma linha de centro de custo, o card marca 'rateado'. O total do grupo continua sendo o valor pago da baixa, para bater com o card.",
      "Filtros de fornecedor, banco, empresa e departamento rodam na tela: são ~130 linhas, não vale ir ao ERP a cada tecla. Só as datas vão para a API, porque elas mudam o volume mesmo.",
      "O CSV respeita o filtro ativo, sai com BOM UTF-8 (sem ele o Excel abre em latin-1) e traz o valor como número, para somar direto.",
      "Uma baixa é uma parcela. Quando a mesma fatura tem várias parcelas pagas no mês, elas aparecem como linhas separadas dentro do card do fornecedor.",
    ],
    columns: [
      {
        name: "Baixa",
        desc: "A data em que o pagamento foi efetivado — a data que conta, não o vencimento.",
      },
      {
        name: "Documento",
        desc: "Documento, série e parcela do título: 000007424/U 01. É uma linha por parcela.",
      },
      {
        name: "Banco",
        desc: "Banco de saída do pagamento e, abaixo, o documento do débito (D000002234). Atenção: é o banco de onde saiu o dinheiro, não o banco do fornecedor.",
      },
      {
        name: "Departamento",
        desc: "Centro de custo da baixa. 'rateado no centro de custo' avisa que o valor foi dividido entre mais de um departamento.",
      },
      {
        name: "Valor",
        desc: "Valor pago. Os grupos somam exatamente estes valores, para o total da tela bater com o card de Contas Pagas.",
      },
    ],
    fields: [
      {
        name: "Data inicial / Data final",
        desc: "O período da consulta (data final inclusiva). Nascem com o 1º dia do mês três meses atrás e hoje; só entram na API ao clicar em Aplicar filtros.",
      },
      {
        name: "Mês",
        desc: "Escolhe um mês dentro do período ou 'Todos os meses do período'. Fica fora dos filtros porque não recorta o período — só decide o que a lista e os grupos mostram. Lista os meses entre a data inicial e a final.",
      },
      {
        name: "Fornecedor",
        desc: "Dropdown com os fornecedores do relatório. Aceita digitação, e o autocompleta ignora acento e caixa.",
      },
      {
        name: "Banco",
        desc: "Nome do banco ou o código (033, BLU...). Mesmo comportamento de digitação.",
      },
      {
        name: "Empresa",
        desc: "Código da empresa que pagou (13, 14...).",
      },
      {
        name: "Departamento",
        desc: "Centro de custo da baixa (TRANSPORTE, IMPORTACAO, ADM SBO...), com o código 1.1.x.x ao lado.",
      },
      {
        name: "Buscar nas baixas",
        desc: "Um 'talvez' em todos os campos — fornecedor, documento, banco, código do banco, documento do pagamento, departamento e despesa. É instantânea e não vai ao ERP.",
      },
      {
        name: "Aplicar filtros",
        desc: "Manda o recorte de datas para a API. Os outros campos só passam a valer depois do clique.",
      },
      {
        name: "Limpar",
        desc: "Volta ao período padrão (1º dia do mês três meses atrás até hoje), seleciona 'Todos os meses do período' e limpa filtros e busca.",
      },
      {
        name: "Exportar CSV",
        desc: "Baixa as baixas do recorte atual, com departamento, despesa e valor em número.",
      },
      {
        name: "Recarregar do ERP",
        desc: "Repete a consulta do mesmo recorte. Útil depois de fechar um pagamento.",
      },
    ],
    examples: [
      {
        title: "Por que o 'Mês atual' pode estar zerado",
        desc: "O card 'Mês atual' mede só o mês corrente, como o card do BI. Em outubro/2026, se nenhuma conta teve baixa com data dentro de outubro ainda, ele mostra R$ 0,00 — não é erro de carga. O 'Período selecionado' e a lista, porém, seguem o intervalo das datas; a tela abre com um trimestre (1º dia de três meses atrás até hoje).",
      },
      {
        title: "Conferindo um pagamento",
        desc: "Ao escolher setembro/2026 no seletor 'Mês', o topo mostra que as 118 baixas do mês saíram todas pelo BANCO SANTANDER, e o maior fornecedor do mês é ATUAL ASSESSORIA E DESPACHOS ADUANEIRO, com R$ 621.064,93 em 5 baixas.",
      },
      {
        title: "Baixa de folha com departamento",
        desc: "FOLHA DE PAGAMENTO 00002, documento 016092026, baixa de 16/09: R$ 2.740,01 classificados como despesa FIXOS e departamento ADM SBO (1.1.1.1). Abrindo o card do fornecedor FOLHA DE PAGAMENTO, a linha mostra o mesmo valor com o mesmo departamento — é a mesma classificação que a tela de custo administrativo mostra.",
      },
      {
        title: "Período selecionado x janelas fixas",
        desc: "Com data inicial 15/08 e data final 10/09, a faixa aparece na barra de filtros como '(recorte aplicado)' e a lista passa a ter só as baixas desse intervalo. O card 'Período selecionado' mostra o total e o nº de baixas exatamente desse intervalo, enquanto os quatro cards fixos (Mês atual, Mês anterior, Ano atual, Ano anterior) continuam sendo as janelas do mês corrente, que é o que o card do BI mede.",
      },
    ],
  },
  "/bi/integracoes/custos-administrativos-anual": {
    title: "Custo administrativo — 12 meses fechados",
    description:
      "Tela de detalhe do card 'Média – Custo administrativo 12 meses': mostra os 12 meses fechados mês a mês (custo, faturamento e a % entre os dois) e os lançamentos de contas pagas que formam o total, dos departamentos 1.1.1.1 e 1.1.1.2.",
    rules: [
      "A janela é sempre de 12 meses fechados: do dia 1º do mês 12 meses atrás até o último dia do mês anterior. O mês selecionado no filtro só ancora a janela — o mês corrente nunca entra, porque ainda não fechou.",
      "A tela lê direto da API do ERP a cada abertura, sem cache local.",
      "O total e a média batem exatamente com o card: R$ 9.906.460,70 e R$ 825.538,39 na consulta de outubro/2026.",
      "ATENÇÃO ao ler a média: um mês sozinho pode pesar quase 30% do total de 12 meses. Use a tabela 'Os 12 meses, do maior para o menor' antes de concluir que a despesa mensal sempre foi essa.",
      "Meses em vermelho no gráfico e na tabela passaram de 50% do faturamento do próprio mês — naquele mês a administração consumiu mais que metade do que a empresa vendeu.",
      "Clicar numa linha da tabela de meses filtra a lista de lançamentos e o CSV por aquele mês. O filtro 'Filtrar por mês' faz o mesmo.",
      "O CSV respeita o filtro de mês e a busca: ele baixa exatamente as linhas que estão na lista.",
    ],
    fields: [
      {
        name: "Mês de referência",
        desc: "Ancora a janela de 12 meses. Trocar o dia não muda nada; o que importa é o mês.",
      },
      {
        name: "Filtrar por mês",
        desc: "Mostra só os lançamentos de um mês. Equivale a clicar na linha do mês na tabela de meses.",
      },
      {
        name: "Buscar nos lançamentos",
        desc: "Filtra por fornecedor, documento, despesa, departamento ou referente. É instantâneo e não vai ao ERP.",
      },
      {
        name: "Aplicar",
        desc: "Busca os 12 meses no ERP. A busca livre e a limpeza não passam por aqui.",
      },
      {
        name: "Limpar",
        desc: "Volta para a referência atual e limpa a busca e o filtro de mês.",
      },
      {
        name: "Exportar CSV",
        desc: "Baixa os lançamentos do recorte atual, com o valor em número para somar direto no Excel.",
      },
      {
        name: "Recarregar do ERP",
        desc: "Repete a consulta sem trocar a referência. Útil depois de fechar contas pagas.",
      },
    ],
  },
  "/bi/integracoes/custos-administrativos": {
    title: "Custos Administrativos — Detalhe dos lançamentos",
    description:
      "Tela de detalhe do custo administrativo: mostra os lançamentos de contas pagas que formam o valor do card 'Custos Administrativos Mensal', do mês selecionado e do mês anterior, quebrados por departamento, tipo de despesa e fornecedor, com a lista linha a linha e exportação em CSV.",
    rules: [
      "A tela lê direto da API do ERP a cada abertura — não usa cache local. Por isso, o que aparece aqui é o que o ERP tem agora.",
      "O mês selecionado conta de 1º até o dia escolhido, igual ao card. No fim do mês, o card costuma vir zerado: ainda não houve baixa de contas pagas no mês.",
      "Só entram os departamentos administrativos 1.1.1.1 e 1.1.1.2 — os mesmos que o card consolida.",
      "A lista de lançamentos soma o valor absoluto das linhas, que é o que faz o total bater com o número do card. Entradas e saídas (estornos e rateios) aparecem sempre como custo positivo.",
      "As tabelas de departamento, despesa e fornecedor estão ordenadas do maior para o menor, e a % do total mostra a participação de cada um no mês.",
      "O mês anterior fica recolhido no fim da tela, com os mesmos agrupamentos e a lista completa, para você conferir a base da variação.",
    ],
    fields: [
      {
        name: "Mês de referência",
        desc: "Qualquer dia dentro do mês desejado. Só o mês interessa: a API monta a janela de 1º até o dia informado.",
      },
      {
        name: "Buscar nos lançamentos",
        desc: "Filtra a lista de lançamentos por fornecedor, documento, despesa, departamento ou referente. É instantâneo e não precisa de Aplicar.",
      },
      {
        name: "Aplicar",
        desc: "Busca os dados do mês escolhido no ERP. A busca livre e a limpeza não passam por aqui.",
      },
      {
        name: "Limpar",
        desc: "Volta para o mês atual e limpa a busca.",
      },
      {
        name: "Exportar CSV",
        desc: "Baixa os lançamentos do mês selecionado, um por linha, com o valor em número para somar direto no Excel.",
      },
      {
        name: "Recarregar do ERP",
        desc: "Repete a consulta sem trocar o mês. Útil depois de fechar contas pagas no ERP.",
      },
    ],
  },
  "/bi/integracoes/faturamento": {
    title: "Faturamento — Detalhe das notas",
    description:
      "Tela de detalhe do faturamento no nível do item de nota: mostra cada nota fiscal com seus itens (pedido, produto, romaneio, cliente, representante, metros, peso e valores) dos últimos 12 meses, com filtros, gráficos e geração de PDF e CSV.",
    rules: [
      "A tela lê de um cache local (IndexedDB) do seu próprio navegador. Por isso filtrar, agrupar e gerar PDF é instantâneo e não pesa no ERP.",
      "VOCÊ NÃO PRECISA CLICAR EM NADA PARA A TELA TER DADO. Ao abrir, ela pergunta ao Neon até quando a base vai e decide sozinha: baixa o espelho, busca só as notas novas, ou recarrega os 12 meses do ERP. O que ela decidiu fica escrito numa faixa azul no topo da tela.",
      "A base vem do ERP em dois tempos: uma carga de 12 meses (que espelha no Neon) e, depois, apenas as notas novas.",
      "Se a base do Neon estiver vazia, a tela carrega os 12 meses do ERP sozinha. Antes ela parava num aviso pedindo um clique, e os botões ficavam travados.",
      "Depois que o cache está populado, basta preencher os filtros e clicar em Aplicar filtros — e só.",
      "Usar base do Neon, Atualizar e Recarregar base (12 meses) são de manutenção de dados, não de consulta. No dia a dia, ninguno deles é necessário.",
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
        desc: "Popula o cache deste navegador com a base de 12 meses que já está no Neon, sem ler o ERP e sem reescrever o Neon. Use na primeira vez que você abre a tela, ou em um navegador novo. Se a base do Neon estiver vazia, a tela sobe para a carga do ERP sozinha — não fica esperando você clicar em nada.",
      },
      {
        name: "Atualizar",
        desc: "Busca somente as notas novas desde a última carga (lê o delta no ERP e faz merge no cache). Não substitui a base nem apaga o que já está lá. É o botão certo para pegar as notas do dia. Só fica disponível depois que o cache está populado.",
      },
      {
        name: "Recarregar base (12 meses)",
        desc: "Lê 12 meses do ERP e reescreve a base do Neon por completo. É a operação mais pesada, e a tela já a dispara sozinha quando a base está vazia ou parada há mais de 7 dias. O botão existe para quando você quer forçar agora.",
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
        desc: "Não precisa fazer nada. A tela pergunta ao Neon, e se a base estiver vazia ela lê os 12 meses do ERP sozinha e avisa que está carregando. Preencha o período, clique em Aplicar filtros e navegue pelas notas. Pronto — não precisa mais clicar em nada de dados.",
      },
      {
        title: "Do dia a dia",
        desc: "Abra a tela. Se houver notas novas no ERP, a faixa azul no topo diz que ela buscou o delta sozinha. Preencha o período e clique em Aplicar filtros. Nada mais.",
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