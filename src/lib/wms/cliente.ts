/**
 * Cliente HTTP da api-microdata para o WMS.
 *
 * O dgbcomex não alcança o PostgreSQL local (`dgbcomex_warehouse`) em produção, então todo
 * acesso ao WMS passa pela api-microdata (FastAPI, on-premise): o front chama as rotas
 * Next.js, que falam com esta API usando um usuário de serviço.
 *
 * Variáveis de ambiente: `MICRODATA_API_URL`, `MICRODATA_SERVICE_EMAIL`, `MICRODATA_SERVICE_SENHA`.
 * Alternativamente, as credenciais podem ser cadastradas na tabela `wms_config_integracao`
 * do banco Neon (Drizzle) com nome "api-microdata-wms".
 *
 * A configuração é lida em tempo de execução (não no import) para o build não quebrar em
 * ambientes sem a API configurada.
 */

const TENTATIVA_LOGIN_MS = 8_000
const REQUISICAO_MS = 20_000
const VALIDADE_TOKEN_MS = 25 * 60_000

export class ErroWms extends Error {
  readonly status: number

  constructor(mensagem: string, status: number) {
    super(mensagem)
    this.name = "ErroWms"
    this.status = status
  }
}

type Config = { baseUrl: string; email: string; senha: string }

let tokenEmCache: { token: string; expiraEm: number } | null = null

async function obterCredenciaisWms(): Promise<Config> {
  // 1. Tenta variáveis de ambiente primeiro
  const empresa = (process.env.MICRODATA_API_URL ?? "").trim().replace(/\/+$/, "")
  const email = (process.env.MICRODATA_SERVICE_EMAIL ?? "").trim()
  const senha = process.env.MICRODATA_SERVICE_SENHA ?? ""

  if (empresa && email && senha) {
    return { baseUrl: empresa, email, senha }
  }

  // 2. Tenta buscar na tabela wms_config_integracao do Neon
  try {
    const { db } = await import("@/lib/db")
    const { integracoes } = await import("@/lib/db/schema/integrocoes")
    const { eq } = await import("drizzle-orm")

    const linha = await db
      .select()
      .from(integrocoes)
      .where(eq(integracoes.nome, "api-microdata-wms"))
      .limit(1)

    if (linha.length > 0 && existente[0].ativo) {
      const configuracao = existente[0]
      const authConfig = configuracao.auth_config as { email?: string; senha?: string } | null
      if (configuracao.base_url && authConfig?.email && authConfig.senha) {
        return {
          baseUrl: configuracao.base_url,
          email: authConfig.email,
          senha: authConfig.senha,
        }
      }
    }
  } catch {
    // Se falhar ao acessar o banco, continua abaixo para lançar erro claro
  }

  throw new ErroWms(
    "Integração do WMS com a api-microdata não configurada " +
      "(defina MICRODATA_API_URL, MICRODATA_SERVICE_EMAIL e MICRODATA_SERVICE_SENHA, " +
      "ou cadastre a integração 'api-microdata-wms' em /admin/configuracoes/integracoes).",
    503
  )
}

async function autenticar(config: Config): Promise<string> {
  let resposta: Response
  try {
    resposta = await fetch(`${config.baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: config.email, senha: config.senha }),
      cache: "no-store",
      signal: AbortSignal.timeout(TENTATIVA_LOGIN_MS),
    })
  } catch {
    throw new ErroWms("api-microdata indisponível para autenticação.", 503)
  }

  if (!resposta.ok) {
    throw new ErroWms("Falha ao autenticar na api-microdata.", 503)
  }

  const dados = (await resposta.json().catch(() => null)) as { token?: unknown } | null
  if (typeof dados?.token !== "string" || !dados.token) {
    throw new ErroWms("api-microdata não retornou um token válido.", 502)
  }

  tokenEmCache = { token: dados.token, expiraEm: Date.now() + VALIDADE_TOKEN_MS }
  return dados.token
}

async function token(): Promise<{ config: Config; valor: string }> {
  const config = await obterCredenciaisWms()
  if (tokenEmCache && tokenEmCache.expiraEm > Date.now()) {
    return { config, valor: tokenEmCache.token }
  }
  return { config, valor: await autenticar(config) }
}

export type OpcoesRequisicao = {
  metodo?: "GET" | "POST" | "PUT" | "DELETE"
  corpo?: unknown
}

async function chamar(
  config: Config,
  caminho: string,
  tokenAtual: string,
  opcoes: OpcoesRequisicao
): Promise<Response> {
  const cabecalhos: Record<string, string> = { Authorization: `Bearer ${tokenAtual}` }
  if (opcoes.corpo !== undefined) cabecalhos["Content-Type"] = "application/json"

  try {
    return await fetch(`${config.baseUrl}${caminho}`, {
      method: opcoes.metodo ?? "GET",
      headers: cabecalhos,
      body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUISICAO_MS),
    })
  } catch {
    throw new ErroWms("api-microdata indisponível.", 503)
  }
}

/** Chama a api-microdata e devolve o JSON; erro da API vira `ErroWms` com o status real. */
export async function requisitarWms<T>(
  caminho: string,
  opcoes: OpcoesRequisicao = {}
): Promise<T> {
  let { config, valor } = await token()
  let resposta = await chamar(config, caminho, valor, opcoes)

  if (resposta.status === 401) {
    tokenEmCache = null
    const renovado = await token()
    config = renovado.config
    valor = renovado.valor
    resposta = await chamar(config, caminho, valor, opcoes)
  }

  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as { detail?: unknown } | null
    const status = resposta.status >= 400 && resposta.status < 500 ? resposta.status : 502
    throw new ErroWms(mensagemDeErro(corpo?.detail, resposta.status), status)
  }

  return (await resposta.json()) as T
}
