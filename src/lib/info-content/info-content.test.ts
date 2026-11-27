import { describe, it, expect } from "vitest"
import { getInfoContent } from "./index"
import {
  saudeProspeccaoAcoesInfo,
  saudeProspeccaoInfo,
  saudeProspeccaoLeadsInfo,
  semaforoConversaoInfo,
} from "./crm"
import { crmDashboardInfo } from "./crm-dashboard"

describe("getInfoContent", () => {
  it("returns exact match for known path", () => {
    const result = getInfoContent("/dashboard")
    expect(result).not.toBeNull()
    expect(result?.title).toContain("Dashboard")
  })

  it("normaliza ids numéricos para [id] nas rotas de detalhe", () => {
    const lead = getInfoContent("/comercial/crm/leads/191?edit=true".split("?")[0])
    const cliente = getInfoContent("/comercial/clientes/42")

    expect(lead?.title).toBe("Detalhe da Lead")
    expect(cliente?.title).toBe("Editar Cliente")
  })

  it("returns null for unknown path", () => {
    const result = getInfoContent("/nonexistent/path")
    expect(result).toBeNull()
  })

  it("returns best partial match for prefix", () => {
    const result = getInfoContent("/dashboard/amostra-comercial")
    expect(result).not.toBeNull()
    expect(result?.title).toContain("Amostras Comerciais")
  })

  it("matches cadastro paths", () => {
    const result = getInfoContent("/cadastros/clientes")
    expect(result).not.toBeNull()
  })

  it("matches admin paths", () => {
    const result = getInfoContent("/admin/usuarios")
    expect(result).not.toBeNull()
  })

  it("matches crm paths", () => {
    const result = getInfoContent("/comercial/crm")
    expect(result).not.toBeNull()
  })

  it("o dashboard do CRM descreve os blocos atuais sem afirmações obsoletas", () => {
    const conteudo = getInfoContent("/comercial/crm")
    const texto = [
      conteudo?.title ?? "",
      conteudo?.description ?? "",
      ...(conteudo?.rules ?? []),
      ...(conteudo?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ...(conteudo?.examples ?? []).map((e) => `${e.title}: ${e.desc}`),
    ].join("\n")

    expect(texto).toMatch(/seis cards/i)
    expect(texto).toMatch(/Ações de Prospecção/)
    expect(texto).toMatch(/oportunidades em aberto da previsão/)
    expect(texto).toMatch(/exportação/)
    expect(texto).toMatch(/Top Leads/)
    expect(texto).toMatch(/Top Clientes/)
    expect(texto).toMatch(/Ações Rápidas/)
    expect(texto).toMatch(/faixas compactas/i)
    expect(texto).toMatch(/topo e ao final/i)
    expect(texto).toMatch(/continuam no JSON da API/i)
    expect(texto).not.toMatch(/funil de 5 etapas|IA Comercial/i)
    expect(texto).not.toMatch(/Novo → Qualificação → Proposta → Negociação → Fechado/)
  })

  it("returns result with required fields", () => {
    const result = getInfoContent("/dashboard")
    expect(result).not.toBeNull()
    expect(result?.title).toBeDefined()
    expect(result?.description).toBeDefined()
  })

  it("o conteúdo de Contas Pagas reflete a dinâmica atual", () => {
    const result = getInfoContent("/bi/integracoes/contas-pagas")
    expect(result).not.toBeNull()

    const texto = [
      result?.description ?? "",
      ...(result?.rules ?? []),
      ...(result?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ...(result?.examples ?? []).map((e) => `${e.title}: ${e.desc}`),
    ].join("\n")

    // 5º card e as janelas fixas.
    expect(texto).toContain("Período selecionado")
    expect(texto).toMatch(/Mês atual/)
    // A tela nasce com um trimestre, não com o último mês com baixa.
    expect(texto).toMatch(/três meses atrás/)
    // O seletor 'Mês' e o 'Todos'.
    expect(texto).toContain("Todos os meses do período")
    // Todos os gráficos, inclusive o mês a mês, respeitam os filtros.
    expect(texto).toMatch(
      /mês a mês[\s\S]*respeitam os filtros|respeitam os filtros[\s\S]*mês a mês/
    )
    // O 'Limpar' volta ao período padrão, não fica no mês escolhido.
    expect(texto).toMatch(/Limpar: .*período padrão/)
    // O gráfico de barras em pé com a participação (%) do fornecedor no total.
    expect(texto).toMatch(/participação do fornecedor/i)
    expect(texto).toMatch(/barras em pé|barras EM PÉ/i)
    // Os dois gráficos sobre o faturamento e a fonte (vwFaturamento / data da nota).
    expect(texto).toMatch(/sobre o faturamento/i)
    expect(texto).toMatch(/vwFaturamento/)
    // O detalhe vermelho a partir de 65%.
    expect(texto).toMatch(/65%/)
    expect(texto).toMatch(/do faturamento/)
    // Não pode sobrar a descrição do recuo automático (aviso azul), que não existe mais.
    expect(texto).not.toMatch(/aviso azul|recua sozinha|último mês fechado/i)
  })

  it("o conteúdo do WMS reflete a ordenação vertical e as prioridades", () => {
    const pedidos = getInfoContent("/wms/pedidos")
    const separacoes = getInfoContent("/wms/separacoes")
    const estoque = getInfoContent("/wms/estoque")
    const gavetas = getInfoContent("/wms/gavetas")

    const texto = [pedidos, separacoes, estoque, gavetas]
      .flatMap((item) => [item?.description ?? "", ...(item?.rules ?? [])])
      .join("\n")

    expect(texto).toMatch(/ordem vertical dos cartões é global/i)
    expect(texto).toMatch(
      /arrastando o cartão para cima ou para baixo|arrastando para cima\/baixo/i
    )
    expect(texto).toMatch(/vermelha no topo \(5%\)/)
    expect(texto).toMatch(/COMERCIAL, EXPEDICAO, ADMIN e SUDO/)
    expect(texto).toMatch(/artigos do pedido/i)
    expect(texto).toMatch(/Voltar para as separações/)
    expect(texto).toMatch(/cancela a ordem, liberando as peças/i)
  })

  it("o painel do BI explica a cor Dracula e o ícone dos cards", () => {
    const conteudo = getInfoContent("/bi/integracoes")

    expect(conteudo).not.toBeNull()
    const texto = [
      conteudo?.description ?? "",
      ...(conteudo?.rules ?? []),
      ...(conteudo?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
    ].join("\n")

    expect(texto).toMatch(/Dracula/i)
    expect(texto).toMatch(/ícone/i)
    expect(texto).toMatch(/derivad[oa]s? do título/i)
  })

  it("as telas do BI e do WMS mostram a integração em uso e o Importar via API", () => {
    const telas = [
      "/bi/integracoes/faturamento",
      "/bi/integracoes/contas-pagas",
      "/bi/integracoes/custos-administrativos",
      "/bi/integracoes/custos-administrativos-anual",
      "/wms/pedidos",
    ]

    for (const caminho of telas) {
      const conteudo = getInfoContent(caminho)
      expect(conteudo).not.toBeNull()

      const texto = [
        conteudo?.description ?? "",
        ...(conteudo?.rules ?? []),
        ...(conteudo?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ].join("\n")

      // A integração em uso fica à vista e o botão traz as APIs da tela.
      expect(texto).toMatch(/Integração/)
      expect(texto).toMatch(/Importar via API/)
      expect(texto).toMatch(/já (selecionada|escolhida)/)
    }
  })

  it("o cadastro de status e o kanban de oportunidades explicam a configuração de colunas", () => {
    const cadastro = getInfoContent("/perfil/menus")
    const lista = getInfoContent("/comercial/crm/oportunidades")
    const kanban = getInfoContent("/comercial/crm/oportunidades/kanban")

    expect(cadastro).not.toBeNull()
    expect(lista).not.toBeNull()
    expect(kanban).not.toBeNull()

    const textoCadastro = [
      cadastro?.description ?? "",
      ...(cadastro?.rules ?? []),
      ...(cadastro?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
    ].join("\n")

    // A flag que decide se o status vira coluna do quadro.
    expect(textoCadastro).toContain("Exibir no Kanban")
    // A cor e a ordem definem a coluna.
    expect(textoCadastro).toMatch(/Cor/)
    expect(textoCadastro).toMatch(/Ordem/)
    // Os gatilhos disparados ao entrar no status.
    expect(textoCadastro).toMatch(/Gatilho/i)
    expect(textoCadastro).toMatch(/gatilho/i)
    expect(textoCadastro).toMatch(/Lead, Cliente/)
    expect(textoCadastro).toMatch(/Kanban de Leads/)

    const textoKanban = [lista, kanban]
      .flatMap((item) => [...(item?.rules ?? []), ...(item?.fields ?? []).map((f) => f.desc)])
      .join("\n")

    // As colunas vêm do cadastro de status.
    expect(textoKanban).toMatch(/cadastro de Status/i)
    expect(textoKanban).toMatch(/Exibir no Kanban/)
    expect(textoKanban).toMatch(/Cards/)
    expect(textoKanban).toMatch(/Tabela/)
    expect(textoKanban).toMatch(/Kanban/)
  })

  it("a selecao de tela do menu de navegacao explica a busca", () => {
    const cadastro = getInfoContent("/perfil/menus")

    expect(cadastro).not.toBeNull()

    const texto = [
      cadastro?.description ?? "",
      ...(cadastro?.rules ?? []),
      ...(cadastro?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
    ].join("\n")

    expect(texto).toMatch(/busca/i)
    expect(texto).toMatch(/Buscar tela/i)
    expect(texto).toMatch(/search-registry|registro de telas/i)
  })

  it("os chamados explicam quem recebe notificacao e e-mail", () => {
    const chamados = getInfoContent("/chamados")

    expect(chamados).not.toBeNull()

    const texto = [
      chamados?.description ?? "",
      ...(chamados?.rules ?? []),
      ...(chamados?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
    ].join("\n")

    expect(texto).toMatch(/notifica/i)
    expect(texto).toMatch(/e-mail/i)
    expect(texto).toMatch(/administradores/i)
    expect(texto).toMatch(/fila/i)
  })

  it("a tela antiga de status aponta para o novo cadastro", () => {
    const antigo = getInfoContent("/admin/configuracoes/status")

    expect(antigo).not.toBeNull()
    expect(antigo?.description).toMatch(/Menu de Navegação/)
    expect(antigo?.rules?.join(" ")).toMatch(/statusTipo/)
  })

  it("o detalhe da oportunidade explica o vínculo de documentos do ERP", () => {
    const detalhe = getInfoContent("/comercial/crm/oportunidades/[id]")

    expect(detalhe).not.toBeNull()

    const texto = [
      detalhe?.description ?? "",
      ...(detalhe?.rules ?? []),
      ...(detalhe?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
    ].join("\n")

    expect(texto).toMatch(/Vincular do ERP/)
    expect(texto).toMatch(/Vincular faturado/)
    expect(texto).toMatch(/ação final dos três botões/)
    expect(texto).toMatch(/soma de todos os pedidos vinculados/)
    expect(texto).toMatch(/nosso_pedido/)
    expect(texto).toMatch(/pedido real diretamente do ERP/)
    expect(texto).toMatch(/todos os pedidos da nota/)
    expect(texto).toMatch(/valor da nota/)
    expect(texto).toMatch(/pedido de venda|faturamento/)
    expect(texto).toMatch(/já está vinculado/)
    expect(texto).toMatch(/varre os pedidos/)
    expect(texto).toMatch(/cancelados/)
    expect(texto).toMatch(/não grava nada no ERP/i)
    expect(texto).toMatch(/Novo Faturamento/)
  })

  it("as telas de oportunidade e proposta explicam a edição dos campos", () => {
    const telas = [
      "/comercial/crm/oportunidades",
      "/comercial/crm/oportunidades/[id]",
      "/comercial/crm/propostas",
      "/comercial/crm/propostas/[id]",
    ]

    for (const caminho of telas) {
      const conteudo = getInfoContent(caminho)
      expect(conteudo).not.toBeNull()

      const texto = [
        conteudo?.description ?? "",
        ...(conteudo?.rules ?? []),
        ...(conteudo?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ].join("\n")

      expect(texto).toMatch(/Editar/)
      expect(texto).toMatch(/modo de edição|lápis/i)
    }
  })

  it("as telas de visita explicam o cadastro rápido de contato", () => {
    const telas = ["/comercial/crm/visitas/novo", "/comercial/crm/visitas/[id]"]

    for (const caminho of telas) {
      const conteudo = getInfoContent(caminho)
      expect(conteudo).not.toBeNull()

      const texto = [
        conteudo?.description ?? "",
        ...(conteudo?.rules ?? []),
        ...(conteudo?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ].join("\n")

      expect(texto).toMatch(/Contato/)
      expect(texto).toMatch(/\(\+\)/)
      expect(texto).toMatch(/pessoa|cliente/i)
    }
  })

  it("os formulários CRM explicam a busca com lupa nos seletores", () => {
    const telas = [
      "/comercial/crm/oportunidades/novo",
      "/comercial/crm/visitas/novo",
      "/comercial/crm/visitas/[id]",
      "/comercial/crm/acoes-prospeccao/novo",
      "/comercial/crm/acoes-prospeccao/[id]",
      "/comercial/crm/tarefas",
      "/comercial/crm/propostas/novo",
      "/comercial/crm/pedidos-venda/novo",
      "/comercial/crm/pedidos-venda/[id]",
      "/comercial/crm/faturamentos/novo",
      "/comercial/crm/faturamentos/[id]",
      "/comercial/crm/contatos",
    ]

    for (const caminho of telas) {
      const conteudo = getInfoContent(caminho)
      expect(conteudo).not.toBeNull()

      const texto = [
        conteudo?.description ?? "",
        ...(conteudo?.rules ?? []),
        ...(conteudo?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ].join("\n")

      expect(texto).toMatch(/busca com lupa/i)
    }
  })

  it("o detalhe da visita menciona regras de visibilidade de campos", () => {
    const conteudo = getInfoContent("/comercial/crm/visitas/[id]")
    expect(conteudo?.rules?.join(" ")).toMatch(/visibilidade/i)
  })

  it("a listagem de visitas explica a visão padrão Calendário", () => {
    const conteudo = getInfoContent("/comercial/crm/visitas")
    const texto = (conteudo?.rules ?? []).join("\n")

    expect(texto).toMatch(/abre na visão Calendário/i)
    expect(texto).toMatch(/Tabela ou Kanban/i)
    expect(texto).toMatch(/botões superiores de status/i)
    expect(texto).toMatch(/'Todos' limpa o filtro/i)
    expect(texto).toMatch(/Kanban não há filtro superior/i)
  })

  it("o dashboard de visitas mostra indicadores e aponta para o dashboard de leads", () => {
    const conteudo = getInfoContent("/comercial/crm/visitas/dashboard")
    expect(conteudo).not.toBeNull()
    expect(conteudo?.title).toMatch(/^Dashboard de Visitas$/i)

    const texto = [
      conteudo?.description ?? "",
      ...(conteudo?.rules ?? []),
      ...(conteudo?.columns ?? []).map((c) => `${c.name}: ${c.desc}`),
      ...(conteudo?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ...(conteudo?.examples ?? []).map((e) => `${e.title}: ${e.desc}`),
    ].join("\n")

    expect(texto).toMatch(/ano corrente/i)
    expect(texto).toMatch(/recorte padrão/i)
    expect(texto).toMatch(/cards de resumo/i)
    expect(texto).toMatch(/gráficos/i)
    expect(texto).toMatch(/Viagens/i)
    expect(texto).toMatch(/Últimas visitas/i)
    expect(texto).toMatch(/documento do cliente, lead ou atendimento avulso/i)
    expect(texto).toMatch(/quantidade de oportunidades/i)
    expect(texto).toMatch(/CSV, PDF e MD/i)
    expect(texto).toMatch(/Todas \/ Minhas Visitas/i)
    expect(texto).toMatch(/Saúde da Prospecção/i)
    expect(texto).not.toMatch(/Visitas R\/A\/C/i)
    expect(texto).not.toMatch(/\bAEC\b/i)
  })

  it("a listagem de ações de prospecção explica a visão padrão Calendário", () => {
    const conteudo = getInfoContent("/comercial/crm/acoes-prospeccao")
    const texto = (conteudo?.rules ?? []).join("\n")

    expect(conteudo?.title).toMatch(/Ações de Prospecção/)
    expect(texto).toMatch(/abre na visão Calendário/i)
    expect(texto).toMatch(/Tabela ou Kanban/i)
    expect(texto).toMatch(/botões superiores de status/i)
    expect(texto).toMatch(/'Todos' limpa o filtro/i)
    expect(texto).toMatch(/Kanban não há filtro superior/i)
  })

  it("o dashboard de ações mostra indicadores e aponta para o dashboard de leads", () => {
    const conteudo = getInfoContent("/comercial/crm/acoes-prospeccao/dashboard")
    expect(conteudo).not.toBeNull()
    expect(conteudo?.title).toMatch(/^Dashboard de Ações de Prospecção$/i)

    const texto = [
      conteudo?.description ?? "",
      ...(conteudo?.rules ?? []),
      ...(conteudo?.columns ?? []).map((c) => `${c.name}: ${c.desc}`),
      ...(conteudo?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ...(conteudo?.examples ?? []).map((e) => `${e.title}: ${e.desc}`),
    ].join("\n")

    expect(texto).toMatch(/ano corrente/i)
    expect(texto).toMatch(/recorte padrão/i)
    expect(texto).toMatch(/cards de resumo/i)
    expect(texto).toMatch(/gráficos/i)
    expect(texto).toMatch(/Viagens/i)
    expect(texto).toMatch(/Últimas ações/i)
    expect(texto).toMatch(/documento do cliente, lead ou atendimento avulso/i)
    expect(texto).toMatch(/quantidade de oportunidades/i)
    expect(texto).toMatch(/CSV, PDF e MD/i)
    expect(texto).toMatch(/Todas \/ Minhas Ações/i)
    expect(texto).toMatch(/Saúde da Prospecção/i)
    expect(texto).not.toMatch(/Ações R\/A\/C/i)
    expect(texto).not.toMatch(/\bAEC\b/i)
  })

  it("a saúde da prospecção explica visitas, ações, regras dos cards e IA", () => {
    const conteudo = getInfoContent("/comercial/crm/saude-prospeccao")
    expect(conteudo).not.toBeNull()
    expect(conteudo?.title).toMatch(/Saúde da Prospecção/i)

    const texto = [
      conteudo?.description ?? "",
      ...(conteudo?.rules ?? []),
      ...(conteudo?.columns ?? []).map((c) => `${c.name}: ${c.desc}`),
      ...(conteudo?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ...(conteudo?.examples ?? []).map((e) => `${e.title}: ${e.desc}`),
    ].join("\n")

    expect(texto).toMatch(/saúde da prospecção/i)
    expect(texto).toMatch(/ano corrente/i)
    expect(texto).toMatch(/Visitas R\/A\/C/i)
    expect(texto).toMatch(/Ações R\/A\/C/i)
    expect(texto).toMatch(/somente dados reais da sua origem/i)
    expect(texto).toMatch(/visitas reais/i)
    expect(texto).toMatch(/AEC/i)
    expect(texto).toMatch(/Engajados/i)
    expect(texto).toMatch(/BEC/i)
    expect(texto).toMatch(/30%/i)
    expect(texto).toMatch(/45%/i)
    expect(texto).not.toMatch(/\bEQL\b/i)
    expect(texto).toMatch(/STATUS OPORT\./i)
    expect(texto).toMatch(/VALOR OPORT\./i)
    expect(texto).toMatch(/PROB\. OPORT\./i)
    expect(texto).toMatch(/Última ação/i)
    expect(texto).toMatch(/Próxima ação/i)
    expect(texto).toMatch(/Analisar com IA/i)
    expect(texto).toMatch(/consultas curadas/i)
    expect(texto).toMatch(/NVIDIA Nemotron/i)
    expect(texto).toMatch(/100 mil caracteres/i)
    expect(texto).toMatch(/sem raciocínio/i)
    expect(texto).toMatch(/dobro de tokens/i)
    expect(texto).toMatch(/processa os dados em fatias sequenciais/i)
    expect(texto).toMatch(/sem reenviar os registros/i)
    expect(texto).toMatch(/contexto compactado/i)
    expect(texto).toMatch(/tabelas para comparações/i)
    expect(texto).toMatch(/checklist de ações/i)
    expect(texto).toMatch(/HTTP 413/i)
    expect(texto).toMatch(/Concluir e enviar/i)
    expect(texto).toMatch(/exportar a conversa inteira/i)
    expect(texto).toMatch(/em MD ou PDF/i)
    expect(texto).toMatch(/conversa inteira/i)
    expect(texto).toMatch(/cada resposta/i)
    expect(texto).toMatch(/normalizados antes da renderização/i)
    expect(texto).toMatch(/PDF mantém tabelas, checklist, cabeçalho e rodapé/i)
    expect(texto).toMatch(/Markdown/i)
    expect(texto).toMatch(/Conversão/i)
    expect(texto).toMatch(/conversão comercial/i)
    expect(texto).toMatch(/conversão financeira/i)
    expect(texto).toMatch(/ oportunidades/i)
    expect(texto).toMatch(/limitada a 100%/i)
    expect(texto).toMatch(/36%/i)
    expect(texto).toMatch(/9,33%/i)
    expect(texto).toMatch(/CSV, PDF e MD/i)
    expect(texto).toMatch(/Todas \/ Minhas/i)
  })

  it("o cadastro e o detalhe da ação de prospecção explicam tipo, recorrência e relato", () => {
    const novo = getInfoContent("/comercial/crm/acoes-prospeccao/novo")
    const detalhe = getInfoContent("/comercial/crm/acoes-prospeccao/[id]")

    expect(novo?.title).toMatch(/Nova Ação de Prospecção/)
    expect((novo?.rules ?? []).join("\n")).toMatch(/recorrência/i)
    expect(detalhe?.title).toMatch(/Detalhe da Ação de Prospecção/)
    expect((detalhe?.rules ?? []).join("\n")).toMatch(/relato da ação/i)
  })

  it("os relatórios do CRM explicam filtros, cards e exportações", () => {
    const telas = [
      "/comercial/crm/relatorios",
      "/comercial/crm/relatorios/atividades",
      "/comercial/crm/relatorios/leads",
      "/comercial/crm/relatorios/oportunidades",
      "/comercial/crm/relatorios/propostas",
      "/comercial/crm/relatorios/visitas",
      "/comercial/crm/relatorios/acoes-prospeccao",
      "/comercial/crm/relatorios/conversoes",
      "/comercial/crm/relatorios/clientes",
    ]

    for (const caminho of telas) {
      const conteudo = getInfoContent(caminho)
      expect(conteudo).not.toBeNull()

      const texto = [
        conteudo?.description ?? "",
        ...(conteudo?.rules ?? []),
        ...(conteudo?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ].join("\n")

      // Filtros por período, listagem e exportação.
      expect(texto).toMatch(/período/i)
      expect(texto).toMatch(/PDF/)
      expect(texto).toMatch(/CSV/)
      expect(texto).toMatch(/Markdown/)
    }
  })

  it("os relatórios de BI e do CRM explicam a cor Dracula e o ícone dos cards", () => {
    const telas = [
      "/bi/integracoes/faturamento",
      "/bi/integracoes/contas-pagas",
      "/bi/integracoes/custos-administrativos",
      "/bi/integracoes/custos-administrativos-anual",
      "/comercial/crm/relatorios",
      "/comercial/crm/relatorios/atividades",
      "/comercial/crm/relatorios/leads",
      "/comercial/crm/relatorios/oportunidades",
      "/comercial/crm/relatorios/propostas",
      "/comercial/crm/relatorios/visitas",
      "/comercial/crm/relatorios/acoes-prospeccao",
      "/comercial/crm/relatorios/conversoes",
      "/comercial/crm/relatorios/clientes",
    ]

    for (const caminho of telas) {
      const conteudo = getInfoContent(caminho)
      expect(conteudo).not.toBeNull()

      const texto = [
        conteudo?.description ?? "",
        ...(conteudo?.rules ?? []),
        ...(conteudo?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ].join("\n")

      expect(texto).toMatch(/Dracula/i)
      expect(texto).toMatch(/ícone/i)
      expect(texto).toMatch(/derivad[oa]s? do (título|rótulo)/i)
    }
  })

  it("as telas de relatório do CRM registram data/hora e lead ou cliente envolvida", () => {
    const atividades = getInfoContent("/comercial/crm/relatorios/atividades")
    const leads = getInfoContent("/comercial/crm/relatorios/leads")
    const conversoes = getInfoContent("/comercial/crm/relatorios/conversoes")

    const texto = [atividades, leads, conversoes]
      .flatMap((item) => [
        item?.description ?? "",
        ...(item?.rules ?? []),
        ...(item?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ])
      .join("\n")

    expect(texto).toMatch(/Data e hora/)
    expect(texto).toMatch(/Lead/)
    expect(texto).toMatch(/Cliente/)
  })

  it("a tela do cliente explica o histórico de conversão", () => {
    const cliente = getInfoContent("/comercial/clientes/[id]")

    expect(cliente).not.toBeNull()

    const texto = [
      cliente?.description ?? "",
      ...(cliente?.rules ?? []),
      ...(cliente?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
    ].join("\n")

    expect(texto).toMatch(/Histórico de conversão/)
    expect(texto).toMatch(/lead/i)
    expect(texto).toMatch(/oportunidades/i)
    expect(texto).toMatch(/ações/i)
  })

  it("a tela do cliente explica os relacionamentos do CRM", () => {
    const cliente = getInfoContent("/comercial/clientes/[id]")

    const texto = [
      cliente?.description ?? "",
      ...(cliente?.rules ?? []),
      ...(cliente?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
    ].join("\n")

    expect(texto).toMatch(/Relacionamentos do CRM/)
    expect(texto).toMatch(/Contatos/)
    expect(texto).toMatch(/Representantes/)
    expect(texto).toMatch(/Oportunidades/)
    expect(texto).toMatch(/Ações de Prospecção/)
    expect(texto).toMatch(/Visitas/)
    expect(texto).toMatch(/Timeline/)
    expect(texto).toMatch(/análise de IA/i)
    expect(texto).toMatch(/WhatsApp/)
    expect(texto).toMatch(/promovid/i)
    expect(texto).not.toMatch(/card de Propostas.*cliente/i)
  })

  it("o relatório de clientes explica o negócio herdado das leads promovidas", () => {
    const clientes = getInfoContent("/comercial/crm/relatorios/clientes")

    expect(clientes).not.toBeNull()

    const texto = [
      clientes?.description ?? "",
      ...(clientes?.rules ?? []),
      ...(clientes?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
    ].join("\n")

    expect(texto).toMatch(/promovid/i)
    expect(texto).toMatch(/oportunidades/i)
    expect(texto).toMatch(/propostas/i)
    expect(texto).toMatch(/visitas/i)
    expect(texto).toMatch(/Segmento/i)
  })

  it("os relatórios de leads e conversões explicam a tarja de cliente", () => {
    const leads = getInfoContent("/comercial/crm/relatorios/leads")
    const conversoes = getInfoContent("/comercial/crm/relatorios/conversoes")

    const texto = [leads, conversoes]
      .flatMap((item) => [
        item?.description ?? "",
        ...(item?.rules ?? []),
        ...(item?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ])
      .join("\n")

    expect(texto).toMatch(/[Tt]arja/)
    expect(texto).toMatch(/Tornar cliente|promoç|promovido/i)
    expect(texto).toMatch(/Promovido por|Virou cliente em/)
  })

  it("as telas de leads, oportunidades e pedidos explicam o ciclo de conversão", () => {
    const conteudos = [
      getInfoContent("/comercial/crm/leads"),
      getInfoContent("/comercial/crm/oportunidades"),
      getInfoContent("/comercial/crm/oportunidades/[id]"),
      getInfoContent("/comercial/crm/pedidos-venda"),
    ]
    const texto = conteudos
      .flatMap((item) => [
        item?.description ?? "",
        ...(item?.rules ?? []),
        ...(item?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ])
      .join("\n")

    expect(texto).toMatch(/Possível Cliente/)
    expect(texto).toMatch(/pedido do ERP vinculado/i)
    expect(texto).toMatch(/Verificar faturados/)
    expect(texto).toMatch(/arquivad/i)
    expect(texto).toMatch(/motor de automações/i)
    expect(texto).toMatch(/última oportunidade/i)
  })

  it("explica a preservação de status e a timeline clicável dos pedidos", () => {
    const conteudos = [
      getInfoContent("/comercial/crm/pedidos-venda"),
      getInfoContent("/comercial/crm/pedidos-venda/[id]"),
      getInfoContent("/comercial/crm/faturamentos/[id]"),
    ]
    const texto = conteudos
      .flatMap((item) => [
        item?.description ?? "",
        ...(item?.rules ?? []),
        ...(item?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ])
      .join("\n")

    expect(texto).toMatch(/nunca altera o status do CRM/i)
    expect(texto).toMatch(/status informado pelo ERP/i)
    expect(texto).toMatch(/status é escolhido individualmente por pedido/i)
    expect(texto).toMatch(/timeline/i)
    expect(texto).toMatch(/sincronizações/i)
    expect(texto).toMatch(/abrir o registro relacionado/i)
  })

  it("as telas de leads explicam a tarja de cliente e a promoção", () => {
    const listagem = getInfoContent("/comercial/crm/leads")
    const detalhe = getInfoContent("/comercial/crm/leads/[id]")

    for (const conteudo of [listagem, detalhe]) {
      expect(conteudo).not.toBeNull()
      const texto = [
        conteudo?.description ?? "",
        ...(conteudo?.rules ?? []),
        ...(conteudo?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
        ...(conteudo?.columns ?? []).map((c) => `${c.name}: ${c.desc}`),
      ].join("\n")

      expect(texto).toMatch(/Tornar cliente/)
      expect(texto).toMatch(/histórico/i)
      expect(texto).toMatch(/não podem ser excluídas|não há exclusão/i)
    }

    const listagemTexto = [
      listagem?.description ?? "",
      ...(listagem?.rules ?? []),
      ...(listagem?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
    ].join("\n")

    expect(listagemTexto).toMatch(/Cards/)
    expect(listagemTexto).toMatch(/Tabela/)
    expect(listagemTexto).toMatch(/Kanban/)
    expect(listagemTexto).toMatch(/Sem conversão/)
    expect(listagemTexto).toMatch(/Convertidos/)
    expect(listagemTexto).toMatch(/Quentes/)
    expect(listagemTexto).toMatch(/Mornos/)
    expect(listagemTexto).toMatch(/Frios/)
    expect(listagemTexto).toMatch(/data dos pedidos/i)
    expect(listagemTexto).not.toMatch(/Frios \(Novo, Qualificação/)

    const detalheTexto = [
      detalhe?.description ?? "",
      ...(detalhe?.rules ?? []),
      ...(detalhe?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
    ].join("\n")

    expect(detalheTexto).toMatch(/tarja/i)
    expect(detalheTexto).toMatch(/Contatos/)
    expect(detalheTexto).toMatch(/Representantes/)
    expect(detalheTexto).toMatch(/ações/i)
    expect(detalheTexto).toMatch(/Ações de Prospecção/)
    expect(detalheTexto).toMatch(/Visitas/)
    expect(detalheTexto).toMatch(/análise de IA/i)
  })

  it("as telas de lead e cliente explicam o histórico de Resumo IA", () => {
    const conteudos = [
      getInfoContent("/comercial/crm/leads/191"),
      getInfoContent("/comercial/clientes/42"),
    ]

    for (const conteudo of conteudos) {
      expect(conteudo).not.toBeNull()
      const texto = [
        conteudo?.description ?? "",
        ...(conteudo?.rules ?? []),
        ...(conteudo?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
        ...(conteudo?.examples ?? []).map((e) => `${e.title}: ${e.desc}`),
      ].join("\n")

      expect(texto).toMatch(/Resumo IA/i)
      expect(texto).toMatch(/Gerar resumo/i)
      expect(texto).toMatch(/QUENTE\/MORNO\/FRIO/)
      expect(texto).toMatch(/MD.*PDF.*TXT/i)
      expect(texto).toMatch(/arquivo único/i)
      expect(texto).toMatch(/arquivos separados/i)
      expect(texto).toMatch(/evento clicável/i)
    }
  })

  it("a tela de contatos explica vínculos, ficha e exclusão restrita", () => {
    const conteudo = getInfoContent("/comercial/crm/contatos")

    expect(conteudo).not.toBeNull()
    const texto = [
      conteudo?.description ?? "",
      ...(conteudo?.rules ?? []),
      ...(conteudo?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ...(conteudo?.columns ?? []).map((c) => `${c.name}: ${c.desc}`),
    ].join("\n")

    expect(texto).toMatch(/Lead \(Negócio\)/)
    expect(texto).toMatch(/Cliente/)
    expect(texto).toMatch(/avulso|órfão/i)
    expect(texto).toMatch(/ficha/i)
    expect(texto).toMatch(/ADMIN/)
    expect(texto).toMatch(/Voltar/)
  })

  it("a configuração de notificações explica a atividade comercial", () => {
    const conteudo = getInfoContent("/admin/notificacoes")

    expect(conteudo).not.toBeNull()
    const texto = [
      conteudo?.description ?? "",
      ...(conteudo?.rules ?? []),
      ...(conteudo?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
    ].join("\n")

    expect(texto).toMatch(/ATIVIDADE_COMERCIAL/)
    expect(texto).toMatch(/e-mail/i)
    expect(texto).toMatch(/não recebe a própria notificação/i)
  })

  it("a configuração de notificações explica os perfis que recebem tudo", () => {
    const conteudo = getInfoContent("/admin/notificacoes")

    expect(conteudo).not.toBeNull()
    const texto = [
      conteudo?.description ?? "",
      ...(conteudo?.rules ?? []),
      ...(conteudo?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
    ].join("\n")

    expect(texto).toMatch(/todas as notificações/i)
    expect(texto).toMatch(/ADMIN/)
    expect(texto).toMatch(/Enviar teste para os administradores/i)
  })

  it("a configuração de campos visíveis explica ocultação por perfil", () => {
    const conteudo = getInfoContent("/admin/configuracoes/campos-visiveis")

    expect(conteudo).not.toBeNull()
    const texto = [
      conteudo?.title ?? "",
      conteudo?.description ?? "",
      ...(conteudo?.rules ?? []),
      ...(conteudo?.columns ?? []).map((c) => `${c.name}: ${c.desc}`),
      ...(conteudo?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ...(conteudo?.examples ?? []).map((e) => `${e.title}: ${e.desc}`),
    ].join("\n")

    expect(texto).toMatch(/Campos Visíveis/i)
    expect(texto).toMatch(/Oculto/i)
    expect(texto).toMatch(/API/)
    expect(texto).toMatch(/ADMIN/)
    expect(texto).toMatch(/Proposta Vinculada/i)
  })
})

describe("saudeProspeccaoInfo", () => {
  it("explica cards, tabela e conversão com fórmulas e exemplos", () => {
    expect(saudeProspeccaoInfo.tabela.rules?.join(" ")).toMatch(
      /\(pedidos de venda \+ faturamentos\) ÷ total de visitas/i
    )
    expect(
      saudeProspeccaoInfo.tabela.examples
        ?.map((exemplo) => `${exemplo.title}: ${exemplo.desc}`)
        .join(" ")
    ).toMatch(/4 visitas, 1 pedido/i)
    expect(saudeProspeccaoInfo.aec.rules?.join(" ")).toMatch(/Esforço > 45/i)
    expect(saudeProspeccaoInfo.aec.rules?.join(" ")).toMatch(/Engajamento ≤ 30/i)
    expect(saudeProspeccaoInfo.engajados.rules?.join(" ")).toMatch(/Engajamento > 30/i)
    expect(saudeProspeccaoInfo.engajados.rules?.join(" ")).toMatch(/prevalece/i)
    expect(saudeProspeccaoInfo.bec.rules?.join(" ")).toMatch(/Esforço ≤ 45/i)
    expect(saudeProspeccaoInfo.bec.rules?.join(" ")).toMatch(/exatamente 45%/i)
    expect(saudeProspeccaoInfo.conversao.rules?.join(" ")).toMatch(/limitad[ao] a 100%/i)
    expect(saudeProspeccaoInfo.conversao.rules?.join(" ")).toMatch(/conversão comercial/i)
    expect(saudeProspeccaoInfo.conversao.rules?.join(" ")).toMatch(/conversão financeira/i)
    expect(saudeProspeccaoInfo.esforco.rules?.join(" ")).toMatch(/visita realizada \(\+12,5\)/i)
    expect(saudeProspeccaoInfo.esforco.rules?.join(" ")).toMatch(/proposta \(\+25\)/i)
    expect(saudeProspeccaoInfo.engajamento.rules?.join(" ")).toMatch(/proposta negociada \(\+20\)/i)
    expect(saudeProspeccaoInfo.itensEngajamento.rules?.join(" ")).toMatch(
      /Proposta e oportunidade valem 36% cada/i
    )
    expect(saudeProspeccaoInfo.itensEngajamento.rules?.join(" ")).toMatch(/9,33% cada/i)
    expect(saudeProspeccaoInfo.registros.description).toMatch(/não é a quantidade de visitas/i)
    expect(saudeProspeccaoInfo.registros.examples?.map((e) => e.desc).join(" ")).toMatch(
      /58 visitas cadastradas/i
    )
    expect(saudeProspeccaoInfo.registros.examples?.length).toBeGreaterThan(0)
    expect(saudeProspeccaoInfo.ultimasVisitas.rules?.join(" ")).toMatch(/CSV, PDF e MD/i)
    expect(saudeProspeccaoInfo.ultimasVisitas.rules?.join(" ")).toMatch(/selo Cliente, Lead ou Avulso/i)
    expect(saudeProspeccaoInfo.ultimasVisitas.rules?.join(" ")).toMatch(/quantidade de oportunidades/i)
    expect(saudeProspeccaoInfo.ultimasVisitas.columns?.map((c) => c.name).join(" ")).toMatch(
      /Nome\/Tipo de entidade/i
    )
    expect(saudeProspeccaoInfo.ultimasVisitas.columns?.map((c) => c.name).join(" ")).toMatch(
      /Documento/i
    )
    expect(saudeProspeccaoInfo.ultimasVisitas.columns?.map((c) => c.name).join(" ")).toMatch(
      /Oportunidades/i
    )
    expect(saudeProspeccaoInfo.ultimasVisitas.columns?.map((c) => c.name).join(" ")).toMatch(
      /Endereço/i
    )
    expect(saudeProspeccaoInfo.engajados.examples?.length).toBeGreaterThan(0)
  })
})

describe("semaforoConversaoInfo", () => {
  it("explica o clique, a prioridade e traz exemplos para cada faixa", () => {
    expect(Object.keys(semaforoConversaoInfo)).toEqual(["QUENTE", "MORNO", "FRIO"])

    for (const info of Object.values(semaforoConversaoInfo)) {
      const texto = [
        info.description,
        ...(info.rules ?? []),
        ...(info.examples ?? []).map((exemplo) => `${exemplo.title}: ${exemplo.desc}`),
      ].join("\n")

      expect(info.title).toMatch(/Quentes|Mornos|Frios/)
      expect(texto).toMatch(/Clique no card/i)
      expect(texto).toMatch(/status das oportunidades/i)
      expect(texto).toMatch(/Exemplo em (leads|clientes)/)
      expect(texto).toMatch(/documento fica abaixo do nome/i)
      expect(texto).toMatch(/Oportunidades, Pedidos, Visitas e Ações/)
      expect(texto).toMatch(/Proposta e Negociação/)
    }

    expect(semaforoConversaoInfo.QUENTE.rules?.join(" ")).toMatch(/prioridade/i)
    expect(semaforoConversaoInfo.MORNO.description).toMatch(/sem QUENTE/i)
    expect(semaforoConversaoInfo.FRIO.description).toMatch(/sem Negociação ou Proposta/i)
  })
})

describe("saudeProspeccaoLeadsInfo", () => {
  it("explica visitas e ações lado a lado na tabela de saúde", () => {
    expect(saudeProspeccaoLeadsInfo.tabela.rules?.join(" ")).toMatch(/mesma métrica/i)
    expect(saudeProspeccaoLeadsInfo.tabela.rules?.join(" ")).toMatch(
      /Ações R\/A\/C abre a lista de ações/i
    )
    expect(saudeProspeccaoLeadsInfo.tabela.columns?.map((coluna) => coluna.name).join(" ")).toMatch(
      /Visitas R\/A\/C.*Ações R\/A\/C/
    )
    expect(saudeProspeccaoLeadsInfo.tabela.rules?.join(" ")).toMatch(
      /não são espelhadas como visitas/i
    )
    expect(saudeProspeccaoLeadsInfo.tabela.rules?.join(" ")).toMatch(
      /visitas reais \+ ações reais/i
    )
    expect(saudeProspeccaoLeadsInfo.tabela.rules?.join(" ")).toMatch(
      /conversão comercial = pedidos de venda ÷ oportunidades/i
    )
    expect(saudeProspeccaoLeadsInfo.tabela.rules?.join(" ")).toMatch(
      /conversão financeira = faturamentos ÷ pedidos de venda/i
    )
    expect(saudeProspeccaoLeadsInfo.tabela.rules?.join(" ")).toMatch(/limitada a 100%/i)
    expect(
      saudeProspeccaoLeadsInfo.tabela.columns
        ?.map((coluna) => `${coluna.name}: ${coluna.desc}`)
        .join(" ")
    ).toMatch(/até 50%/i)
    expect(
      saudeProspeccaoLeadsInfo.tabela.examples?.map((exemplo) => exemplo.desc).join(" ")
    ).toMatch(/0\/0\/0 em Visitas R\/A\/C e 3\/1\/0 em Ações R\/A\/C/)
    expect(
      saudeProspeccaoLeadsInfo.tabela.examples?.map((exemplo) => exemplo.desc).join(" ")
    ).toMatch(/conversão real = 75%/i)
    expect(saudeProspeccaoLeadsInfo.aec.rules?.join(" ")).toMatch(/Esforço > 45/i)
    expect(saudeProspeccaoLeadsInfo.engajados.rules?.join(" ")).toMatch(/Engajamento > 30/i)
    expect(saudeProspeccaoLeadsInfo.ia.rules?.join(" ")).toMatch(/consultas curadas/i)
    expect(saudeProspeccaoLeadsInfo.ia.rules?.join(" ")).toMatch(/provedor configurado para análise/i)
    expect(saudeProspeccaoLeadsInfo.ia.rules?.join(" ")).toMatch(/Ver envio à IA/i)
    expect(saudeProspeccaoLeadsInfo.ia.rules?.join(" ")).toMatch(/sem chamar a IA/i)
    expect(saudeProspeccaoLeadsInfo.ia.rules?.join(" ")).toMatch(/chave secreta/i)
    expect(saudeProspeccaoLeadsInfo.ia.rules?.join(" ")).toMatch(/mensagens compactadas/i)
    expect(saudeProspeccaoLeadsInfo.ia.rules?.join(" ")).toMatch(/fatias sequenciais/i)
    expect(saudeProspeccaoLeadsInfo.ia.rules?.join(" ")).toMatch(/sem reenviar os registros/i)
    expect(saudeProspeccaoLeadsInfo.ia.rules?.join(" ")).toMatch(/contexto compactado/i)
    expect(saudeProspeccaoLeadsInfo.ia.rules?.join(" ")).toMatch(/tabelas para comparações/i)
    expect(saudeProspeccaoLeadsInfo.ia.rules?.join(" ")).toMatch(/checklist de ações/i)
    expect(saudeProspeccaoLeadsInfo.ia.rules?.join(" ")).toMatch(/chamada curta/i)
    expect(saudeProspeccaoLeadsInfo.ia.rules?.join(" ")).toMatch(/8192 tokens/i)
    expect(saudeProspeccaoLeadsInfo.ia.rules?.join(" ")).toMatch(/responder sem texto/i)
    expect(saudeProspeccaoLeadsInfo.ia.rules?.join(" ")).toMatch(/HTTP 413/i)
    expect(saudeProspeccaoLeadsInfo.ia.rules?.join(" ")).toMatch(/temperatura do modelo é 0/i)
    expect(
      saudeProspeccaoLeadsInfo.ia.examples?.map((exemplo) => exemplo.desc).join(" ")
    ).toMatch(/200 registros/i)
    expect(saudeProspeccaoLeadsInfo.ia.rules?.join(" ")).toMatch(/quase toda a tela/i)
    expect(saudeProspeccaoLeadsInfo.ia.rules?.join(" ")).toMatch(/Concluir e enviar/i)
    expect(saudeProspeccaoLeadsInfo.itensEngajamento.rules?.join(" ")).toMatch(/9,33% cada/i)
    expect(saudeProspeccaoLeadsInfo.itensEngajamento.rules?.join(" ")).toMatch(
      /Itens de visitas e de ações de prospecção/i
    )
    expect(saudeProspeccaoLeadsInfo.registros.description).toMatch(/não é a quantidade de visitas/i)
  })
})

describe("saudeProspeccaoAcoesInfo", () => {
  it("explica cards, tabela e conversão das ações com fórmulas e exemplos", () => {
    expect(saudeProspeccaoAcoesInfo.tabela.rules?.join(" ")).toMatch(
      /\(pedidos de venda \+ faturamentos\) ÷ total de ações/i
    )
    expect(
      saudeProspeccaoAcoesInfo.tabela.examples
        ?.map((exemplo) => `${exemplo.title}: ${exemplo.desc}`)
        .join(" ")
    ).toMatch(/4 ações, 1 pedido/i)
    expect(saudeProspeccaoAcoesInfo.aec.rules?.join(" ")).toMatch(/Esforço > 45/i)
    expect(saudeProspeccaoAcoesInfo.engajados.rules?.join(" ")).toMatch(/Engajamento > 30/i)
    expect(saudeProspeccaoAcoesInfo.bec.rules?.join(" ")).toMatch(/Esforço ≤ 45/i)
    expect(saudeProspeccaoAcoesInfo.conversao.rules?.join(" ")).toMatch(/limitado a 100%/i)
    expect(saudeProspeccaoAcoesInfo.esforco.rules?.join(" ")).toMatch(/ação realizada \(\+12,5\)/i)
    expect(saudeProspeccaoAcoesInfo.esforco.rules?.join(" ")).toMatch(/proposta \(\+25\)/i)
    expect(saudeProspeccaoAcoesInfo.engajamento.rules?.join(" ")).toMatch(/ação agendada \(\+10\)/i)
    expect(saudeProspeccaoAcoesInfo.itensEngajamento.rules?.join(" ")).toMatch(
      /Proposta e oportunidade valem 36% cada/i
    )
    expect(saudeProspeccaoAcoesInfo.itensEngajamento.rules?.join(" ")).toMatch(/9,33% cada/i)
    expect(saudeProspeccaoAcoesInfo.registros.description).toMatch(/não é a quantidade de ações/i)
    expect(saudeProspeccaoAcoesInfo.registros.examples?.map((e) => e.desc).join(" ")).toMatch(
      /58 ações cadastradas/i
    )
    expect(saudeProspeccaoAcoesInfo.registros.examples?.length).toBeGreaterThan(0)
    expect(saudeProspeccaoAcoesInfo.ultimasVisitas.rules?.join(" ")).toMatch(/CSV, PDF e MD/i)
    expect(saudeProspeccaoAcoesInfo.ultimasVisitas.rules?.join(" ")).toMatch(/selo Cliente, Lead ou Avulso/i)
    expect(saudeProspeccaoAcoesInfo.ultimasVisitas.rules?.join(" ")).toMatch(/quantidade de oportunidades/i)
    expect(saudeProspeccaoAcoesInfo.ultimasVisitas.columns?.map((c) => c.name).join(" ")).toMatch(
      /Nome\/Tipo de entidade/i
    )
    expect(saudeProspeccaoAcoesInfo.ultimasVisitas.columns?.map((c) => c.name).join(" ")).toMatch(
      /Documento/i
    )
    expect(saudeProspeccaoAcoesInfo.ultimasVisitas.columns?.map((c) => c.name).join(" ")).toMatch(
      /Oportunidades/i
    )
    expect(saudeProspeccaoAcoesInfo.ultimasVisitas.columns?.map((c) => c.name).join(" ")).toMatch(
      /ID da ação/i
    )
    expect(saudeProspeccaoAcoesInfo.engajados.examples?.length).toBeGreaterThan(0)
  })
})

describe("crmDashboardInfo", () => {
  const entradas = [
    ["pagina", crmDashboardInfo.pagina],
    ["resumo", crmDashboardInfo.resumo],
    ["graficos.pipeline", crmDashboardInfo.graficos.pipeline],
    ["graficos.previsaoConversao", crmDashboardInfo.graficos.previsaoConversao],
    ["graficos.status", crmDashboardInfo.graficos.status],
    ["paineis.topLeads", crmDashboardInfo.paineis.topLeads],
    ["paineis.topClientes", crmDashboardInfo.paineis.topClientes],
    ["paineis.recentes", crmDashboardInfo.paineis.recentes],
    ["temperatura", crmDashboardInfo.temperatura],
    ["acoesRapidas", crmDashboardInfo.acoesRapidas],
  ] as const

  it("todo bloco explica dados ou fórmula e traz pelo menos um exemplo concreto", () => {
    for (const [nome, entrada] of entradas) {
      expect(entrada.title, nome).toBeTruthy()
      expect(entrada.description.length, nome).toBeGreaterThan(20)
      expect(entrada.rules?.length, nome).toBeGreaterThan(0)
      expect(entrada.examples?.length, nome).toBeGreaterThan(0)
      expect(entrada.examples?.[0].desc.length, nome).toBeGreaterThan(20)
    }
  })

  it("o feed de recentes explica que o link usa o ID da entidade nos metadados", () => {
    const recentes = crmDashboardInfo.paineis.recentes
    const texto = [recentes.description, ...(recentes.rules ?? [])].join("\n")

    expect(texto).toMatch(/ID da entidade salvo nos metadados/i)
    expect(texto).toMatch(/<id da ação>, não o ID do evento/i)
  })

  it("o resumo explica a origem dos seis cards restantes", () => {
    const resumo = crmDashboardInfo.resumo
    const texto = [
      resumo.description,
      ...(resumo.rules ?? []),
      ...(resumo.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ...(resumo.examples ?? []).map((e) => `${e.title}: ${e.desc}`),
    ].join("\n")

    expect(texto).toMatch(/crm_leads/)
    expect(texto).toMatch(/tabela clientes/)
    expect(texto).toMatch(/crm_oportunidades/)
    expect(texto).toMatch(/dataVisita/)
    expect(texto).toMatch(/crm_acoes_prospeccao/)
    expect(texto).toMatch(/REALIZADA/)
    expect(texto).toMatch(/dataAcao/)
    expect(texto).toMatch(/dataPrevista/)
    expect(texto).toMatch(/185 leads/)
    expect(texto).toMatch(/modal de detalhes/)
    expect(texto).toMatch(/Ver todas/)
  })

  it("o painel Top Leads explica que clientes e leads promovidas ficam de fora", () => {
    const bloco = crmDashboardInfo.paineis.topLeads
    const texto = [
      bloco.title,
      bloco.description,
      ...(bloco.rules ?? []),
      ...(bloco.examples ?? []).map((e) => `${e.title}: ${e.desc}`),
    ].join("\n")

    expect(texto).toMatch(/ligadas a uma lead por empresaId/)
    expect(texto).toMatch(/clienteId preenchido/)
    expect(texto).toMatch(/promovidaCliente/)
    expect(texto).toMatch(/não aparecem neste painel/)
    expect(texto).toMatch(/cadastro da lead/)
  })

  it("o painel Top Clientes explica a promoção, a conversão e o exemplo", () => {
    const bloco = crmDashboardInfo.paineis.topClientes
    const texto = [
      bloco.title,
      bloco.description,
      ...(bloco.rules ?? []),
      ...(bloco.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ...(bloco.examples ?? []).map((e) => `${e.title}: ${e.desc}`),
    ].join("\n")

    expect(texto).toMatch(/crm_oportunidades/)
    expect(texto).toMatch(/COALESCE\(crm_oportunidades\.clienteId, crm_pessoas\.clienteId\)/)
    expect(texto).toMatch(/pessoa promovida/i)
    expect(texto).toMatch(/FECHADO_GANHO/)
    expect(texto).toMatch(/2 convertidas de 5/)
    expect(texto).toMatch(/valorAberto/)
  })

  it("os gráficos e painéis explicam contagens, somas e exemplos", () => {
    const textoBlocos = [
      ...Object.values(crmDashboardInfo.graficos),
      ...Object.values(crmDashboardInfo.paineis),
    ]
      .flatMap((bloco) => [
        bloco.description,
        ...(bloco.rules ?? []),
        ...(bloco.examples ?? []).map((e) => `${e.title}: ${e.desc}`),
      ])
      .join("\n")

    expect(textoBlocos).toMatch(/185 leads/)
    expect(textoBlocos).toMatch(/FECHADO_GANHO/)
    expect(textoBlocos).toMatch(/crm_previsaoVendas/)
    expect(textoBlocos).toMatch(/GROUP BY status/)
    expect(textoBlocos).toMatch(/limite de 5/)
    expect(textoBlocos).toMatch(/crm_timeline_eventos/)
    expect(textoBlocos).toMatch(/crm_visitas/)
    expect(textoBlocos).toMatch(/Ação de prospecção/)
    expect(textoBlocos).toMatch(/40 oportunidade\(s\) em aberto/)
    expect(textoBlocos).toMatch(/Total \(previsão \+ convertidas\)/)
    expect(textoBlocos).toMatch(/R\$ 1\.200\.000/)
    expect(textoBlocos).toMatch(/exportação em CSV, JSON e PDF/)
    expect(textoBlocos).toMatch(/nome do cliente/)
    expect(textoBlocos).toMatch(/R\$ 120\.000/)
    expect(textoBlocos).toMatch(/Top Clientes/)
    expect(textoBlocos).toMatch(/COALESCE/)
    expect(textoBlocos).toMatch(/promovida/i)
    expect(textoBlocos).toMatch(/convertidas de 5/)
    expect(textoBlocos).toMatch(/R\$ 150\.000/)

    const acoes = [
      crmDashboardInfo.acoesRapidas.description,
      ...(crmDashboardInfo.acoesRapidas.rules ?? []),
      ...(crmDashboardInfo.acoesRapidas.examples ?? []).map((e) => e.desc),
    ].join("\n")

    expect(acoes).toMatch(/seis atalhos/i)
    expect(acoes).toMatch(/faixas compactas/i)
    expect(acoes).toMatch(/topo e ao final/i)
    expect(acoes).toMatch(/Novo Lead \(Negócio\)/)
    expect(acoes).toMatch(/Nova Oportunidade/)
    expect(acoes).toMatch(/Nova Ação de Prospecção/)
    expect(acoes).toMatch(/Kanban/)
    expect(acoes).toMatch(/temperatura/i)
    expect(acoes).toMatch(/Nova Visita/)
    expect(acoes).toMatch(/Minhas Tarefas/)
    expect(acoes).not.toMatch(/Nova Proposta/)
    expect(acoes).not.toMatch(/Nova Campanha/)
    expect(acoes).not.toMatch(/Email Massa/)
  })

  it("a temperatura do dashboard e o kanban explicam dedupe, regras e busca", () => {
    const temperatura = [
      crmDashboardInfo.temperatura.description,
      ...(crmDashboardInfo.temperatura.rules ?? []),
      ...(crmDashboardInfo.temperatura.examples ?? []).map((e) => e.desc),
    ].join("\n")
    expect(temperatura).toMatch(/promovidos a cliente/i)
    expect(temperatura).toMatch(/cliente/)
    expect(temperatura).toMatch(/kanban/i)
    expect(temperatura).toMatch(/mês/i)
    expect(temperatura).toMatch(/trimestre/i)

    const kanban = getInfoContent("/comercial/crm/temperatura/kanban")
    expect(kanban).not.toBeNull()
    const textoKanban = [
      kanban?.description ?? "",
      ...(kanban?.rules ?? []),
      ...(kanban?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ...(kanban?.examples ?? []).map((e) => `${e.title}: ${e.desc}`),
    ].join("\n")
    expect(textoKanban).toMatch(/arraste/i)
    expect(textoKanban).toMatch(/largura disponível/i)
    expect(textoKanban).toMatch(/colunas/i)
    expect(textoKanban).toMatch(/Negociação/i)
    expect(textoKanban).toMatch(/Proposta/i)
    expect(textoKanban).toMatch(/FECHADO_PERDIDO com motivo/i)
    expect(textoKanban).toMatch(/CPF\/CNPJ/i)
    expect(textoKanban).toMatch(/Com\/Sem oportunidade/i)
    expect(textoKanban).toMatch(/Com\/Sem pedido/i)
    expect(textoKanban).toMatch(/apenas como Cliente/i)
    expect(textoKanban).toMatch(/cor Dracula/i)
    expect(textoKanban).toMatch(/contorno destacado/i)
    expect(textoKanban).toMatch(/i. no cabeçalho de cada coluna/i)
    expect(textoKanban).toMatch(/Flutuar/i)
    expect(textoKanban).toMatch(/Segmento/i)
    expect(textoKanban).toMatch(/Sem visitas/i)
    expect(textoKanban).toMatch(/Sem ações/i)
  })

  it("as listagens explicam o padrão em cards e as contagens exibidas", () => {
    const clientes = getInfoContent("/comercial/clientes")
    const leads = getInfoContent("/comercial/crm/leads")
    const oportunidades = getInfoContent("/comercial/crm/oportunidades")

    expect(clientes).not.toBeNull()
    expect(leads).not.toBeNull()
    expect(oportunidades).not.toBeNull()

    const textoClientes = [clientes?.description ?? "", ...(clientes?.rules ?? [])].join("\n")
    expect(textoClientes).toMatch(/visualização padrão é em cards/i)
    expect(textoClientes).toMatch(/Oportunidades, Pedidos, Visitas e Ações/)
    expect(textoClientes).toMatch(/Solicitações e Amostras/)
    expect(textoClientes).toMatch(/semáforo de conversão/i)
    expect(textoClientes).toMatch(/Quentes/)
    expect(textoClientes).toMatch(/Mornos/)
    expect(textoClientes).toMatch(/Frios/)
    expect(textoClientes).toMatch(/Clique em um card do semáforo/i)
    expect(textoClientes).toMatch(/no card explica a regra/i)
    expect(textoClientes).toMatch(/nunca o status cadastral/i)
    expect(textoClientes).toMatch(/rodapé do card, 'Ver'/i)
    expect(textoClientes).toMatch(/ganho ou pedido no mês/i)
    expect(textoClientes).toMatch(/ganho ou pedido no trimestre/i)

    const textoLeads = [leads?.description ?? "", ...(leads?.rules ?? [])].join("\n")
    expect(textoLeads).toMatch(/Cards é a visualização padrão/)
    expect(textoLeads).toMatch(/Oportunidades, Pedidos, Visitas e Ações/)
    expect(textoLeads).toMatch(/Clique em qualquer contagem para abrir um modal/)
    expect(textoLeads).toMatch(/semáforo de conversão/i)
    expect(textoLeads).toMatch(/Quentes/)
    expect(textoLeads).toMatch(/Mornos/)
    expect(textoLeads).toMatch(/Frios/)
    expect(textoLeads).toMatch(/Clique em um card do semáforo/i)
    expect(textoLeads).toMatch(/no card explica a regra/i)
    expect(textoLeads).toMatch(/nunca o status cadastral/i)
    expect(textoLeads).toMatch(/ganho ou pedido no mês/i)
    expect(textoLeads).toMatch(/ganho ou pedido no trimestre/i)
    expect(textoLeads).not.toMatch(/O Kanban é a visualização padrão/)

    const textoOportunidades = [
      oportunidades?.description ?? "",
      ...(oportunidades?.rules ?? []),
      ...(oportunidades?.fields ?? []).map((campo) => campo.name),
    ].join("\n")
    expect(textoOportunidades).toMatch(/visualização padrão é em Kanban/)
    expect(textoOportunidades).toMatch(/Pedido \/ Faturamento/)
    expect(textoOportunidades).toMatch(/Sem pedido vinculado/)
    expect(textoOportunidades).toMatch(/status do pedido/i)
    expect(textoOportunidades).toMatch(/exceto os cancelados/i)
  })

  it("as telas com atalho explicam o destino Saúde da Prospecção", () => {
    const rotas = [
      "/comercial/crm",
      "/comercial/crm/acoes-prospeccao",
      "/comercial/crm/leads",
      "/comercial/clientes",
      "/comercial/crm/oportunidades",
      "/comercial/crm/temperatura/kanban",
    ]

    for (const rota of rotas) {
      const conteudo = getInfoContent(rota)
      expect(conteudo, rota).not.toBeNull()
      expect((conteudo?.rules ?? []).join("\n"), rota).toMatch(/Saúde da Prospecção/i)
    }

    const oportunidades = getInfoContent("/comercial/crm/oportunidades")
    expect((oportunidades?.rules ?? []).join("\n")).toMatch(/começa em Todas/i)
  })
})
