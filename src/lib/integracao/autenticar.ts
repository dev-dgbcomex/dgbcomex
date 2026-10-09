import type { Integracao } from "@/lib/db/schema/integracoes"

export type ResultadoAutenticacao =
  | { ok: true; headers: Record<string, string> }
  | { ok: false; erro: string; status: number }

export const loginTokenCache = new Map<number, { token: string; expiresAt: number }>()

/**
 * Monta os headers HTTP de uma integração conforme `tipoAuth` e `authConfig`.
 *
 * Lógica extraída do route `/api/integracao/[id]/executar` para ser reutilizada pela
 * rota de proxy de detalhe do BI (mesmo login com cache por integração). Os tokens ficam
 * em memória (`loginTokenCache`) com expiração pela janela devolvida pelo login.
 */
export async function autenticarIntegracao(
  integracao: Integracao
): Promise<ResultadoAutenticacao> {
  const authConfig = (integracao.authConfig || {}) as Record<string, unknown>
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  }

  switch (integracao.tipoAuth) {
    case "login": {
      const loginUrl = authConfig.login_url as string
      const email = authConfig.email as string
      const senha = authConfig.senha as string
      const emailField = (authConfig.email_field as string) || "email"
      const senhaField = (authConfig.senha_field as string) || "senha"
      const tokenField = (authConfig.token_field as string) || "token"
      if (loginUrl && email && senha) {
        const cached = loginTokenCache.get(integracao.id)
        if (!cached || cached.expiresAt < Date.now()) {
          const loginRes = await fetch(loginUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [emailField]: email, [senhaField]: senha }),
            signal: AbortSignal.timeout(15000),
          })
          if (!loginRes.ok) {
            const errText = await loginRes.text().catch(() => "unknown")
            return {
              ok: false,
              erro: `Falha no login: ${loginRes.status} ${errText}`,
              status: loginRes.status,
            }
          }
          const loginData = await loginRes.json()
          const token = loginData?.[tokenField] as string | undefined
          if (!token) {
            return { ok: false, erro: "Login não retornou token", status: loginRes.status }
          }
          const expiraMin = Number(loginData?.expira_em_minutos || 25)
          loginTokenCache.set(integracao.id, {
            token,
            expiresAt: Date.now() + expiraMin * 60 * 1000,
          })
          headers["Authorization"] = `Bearer ${token}`
        } else {
          headers["Authorization"] = `Bearer ${cached.token}`
        }
      }
      break
    }
    case "bearer": {
      const token = authConfig.token as string
      if (token) headers["Authorization"] = `Bearer ${token}`
      break
    }
    case "basic": {
      const username = (authConfig.username as string) || ""
      const password = (authConfig.password as string) || ""
      const encoded = Buffer.from(`${username}:${password}`).toString("base64")
      headers["Authorization"] = `Basic ${encoded}`
      break
    }
    case "api_key": {
      const key = authConfig.key as string
      const keyName = (authConfig.key_name as string) || "x-api-key"
      const location = (authConfig.in as string) || "header"
      if (key && location === "header") {
        headers[keyName] = key
      }
      break
    }
    case "oauth2": {
      const tokenUrl = authConfig.token_url as string
      const clientId = authConfig.client_id as string
      const clientSecret = authConfig.client_secret as string
      const scope = authConfig.scope as string
      if (tokenUrl && clientId && clientSecret) {
        const bodyParams = new URLSearchParams()
        bodyParams.append("grant_type", (authConfig.grant_type as string) || "client_credentials")
        if (scope) bodyParams.append("scope", scope)
        const encodedCredentials = Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString("base64")
        const tokenRes = await fetch(tokenUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${encodedCredentials}`,
          },
          body: bodyParams.toString(),
        })
        if (!tokenRes.ok) {
          const errText = await tokenRes.text().catch(() => "unknown")
          return {
            ok: false,
            erro: `Falha ao obter token OAuth2: ${tokenRes.status} ${errText}`,
            status: tokenRes.status,
          }
        }
        const tokenData = await tokenRes.json()
        const accessToken = tokenData.access_token
        if (!accessToken) {
          return { ok: false, erro: "Token OAuth2 não retornou access_token", status: tokenRes.status }
        }
        headers["Authorization"] = `Bearer ${accessToken}`
      }
      break
    }
  }
  return { ok: true, headers }
}