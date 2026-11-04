import { describe, it, expect } from "vitest"
import { getInfoContent } from "./index"

describe("getInfoContent", () => {
  it("returns exact match for known path", () => {
    const result = getInfoContent("/dashboard")
    expect(result).not.toBeNull()
    expect(result?.title).toContain("Dashboard")
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

    const textoKanban = [lista, kanban]
      .flatMap((item) => [...(item?.rules ?? []), ...(item?.fields ?? []).map((f) => f.desc)])
      .join("\n")

    // As colunas vêm do cadastro de status.
    expect(textoKanban).toMatch(/cadastro de Status/i)
    expect(textoKanban).toMatch(/Exibir no Kanban/)
  })

  it("a tela antiga de status aponta para o novo cadastro", () => {
    const antigo = getInfoContent("/admin/configuracoes/status")

    expect(antigo).not.toBeNull()
    expect(antigo?.description).toMatch(/Menu de Navegação/)
    expect(antigo?.rules?.join(" ")).toMatch(/statusTipo/)
  })

  it("os relatórios do CRM explicam filtros, cards e exportações", () => {
    const telas = [
      "/comercial/crm/relatorios",
      "/comercial/crm/relatorios/atividades",
      "/comercial/crm/relatorios/pessoas",
      "/comercial/crm/relatorios/oportunidades",
      "/comercial/crm/relatorios/propostas",
      "/comercial/crm/relatorios/visitas",
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

  it("as telas de relatório do CRM registram data/hora e pessoa ou cliente envolvida", () => {
    const atividades = getInfoContent("/comercial/crm/relatorios/atividades")
    const pessoas = getInfoContent("/comercial/crm/relatorios/pessoas")

    const texto = [atividades, pessoas]
      .flatMap((item) => [
        item?.description ?? "",
        ...(item?.rules ?? []),
        ...(item?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
      ])
      .join("\n")

    expect(texto).toMatch(/Data e hora/)
    expect(texto).toMatch(/Pessoa/)
    expect(texto).toMatch(/Cliente/)
  })

  it("as telas de pessoas explicam a tarja de cliente e a promoção", () => {
    const listagem = getInfoContent("/comercial/crm/pessoas")
    const detalhe = getInfoContent("/comercial/crm/pessoas/[id]")

    for (const conteudo of [listagem, detalhe]) {
      expect(conteudo).not.toBeNull()
      const texto = [
        conteudo?.description ?? "",
        ...(conteudo?.rules ?? []),
        ...(conteudo?.fields ?? []).map((f) => `${f.name}: ${f.desc}`),
        ...(conteudo?.columns ?? []).map((c) => `${c.name}: ${c.desc}`),
      ].join("\n")

      expect(texto).toMatch(/Tornar cliente/)
      expect(texto).toMatch(/tarja/i)
      expect(texto).toMatch(/histórico/i)
      expect(texto).toMatch(/não podem ser excluídas|não há exclusão/i)
    }
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
})
