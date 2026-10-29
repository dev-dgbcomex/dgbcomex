/**
 * Qual integração do BI atende cada tela.
 *
 * O painel (`/bi/integracoes`) monta um card por integração e o botão de detalhe
 * aponta para a tela correspondente. A tela de detalhe usa a MESMA integração do
 * card — por isso a busca é pelo nome exato, e não por "a primeira que parece":
 * um `find` por texto solto pegava "Faturamento Dia (diário)" na tela de
 * faturamento e "Custos Administrativos Anual" na de custos administrativos.
 */

export interface IntegracaoBiListagem {
  id: number
  nome: string
  baseUrl: string
}

/**
 * Cards que têm tela de detalhe. A chave é o `nome` da integração (como está no
 * banco), não o título do catálogo — assim o botão não depende do texto exibido.
 */
export const ROTA_DETALHE: Record<string, string> = {
  "Faturamento do Dia": "/bi/integracoes/faturamento",
  "Custos Administrativos Mensal": "/bi/integracoes/custos-administrativos",
  "Custos Administrativos Anual": "/bi/integracoes/custos-administrativos-anual",
  "Contas Pagas": "/bi/integracoes/contas-pagas",
}

/** Tela de detalhe → nome da integração que a atende (o inverso do ROTA_DETALHE). */
export const INTEGRACAO_DA_TELA: Record<string, string> = Object.fromEntries(
  Object.entries(ROTA_DETALHE).map(([nome, rota]) => [rota, nome])
)

/**
 * Procura a integração da tela: primeiro pelo nome exato, depois pela URL base
 * (para quem cadastrou o endpoint de detalhe em vez do card).
 *
 * Aceita a rota da tela (`/bi/integracoes/faturamento`) ou o nome da integração
 * (`Faturamento do Dia`) — a tela sabe a própria rota, o card sabe o nome.
 */
export function resolverIntegracaoBi<T extends IntegracaoBiListagem>(
  integracoes: T[] | undefined,
  telaOuNome: string,
  padraoBaseUrl?: RegExp
): T | undefined {
  if (!integracoes || integracoes.length === 0) return undefined
  const nome = INTEGRACAO_DA_TELA[telaOuNome] ?? telaOuNome
  const porNome = integracoes.find((i) => i.nome === nome)
  if (porNome) return porNome
  if (padraoBaseUrl) {
    const porUrl = integracoes.find((i) => padraoBaseUrl.test(i.baseUrl))
    if (porUrl) return porUrl
  }
  return undefined
}
