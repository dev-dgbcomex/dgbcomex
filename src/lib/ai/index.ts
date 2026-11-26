import { db } from "@/lib/db"
import { aiChaves, type AiChave } from "@/lib/db/schema/ai-chaves"
import { eq, and, lt, sql } from "drizzle-orm"

export type ProvedorIA =
  "groq" | "openai" | "anthropic" | "gemini" | "deepseek" | "openai_compatible" | "openrouter"

export interface MensagemIA {
  role: "system" | "user" | "assistant"
  content: string
}

export type CodigoErroIA = "PAYLOAD_TOO_LARGE"

export interface ResultadoIA {
  conteudo: string
  provedor: string
  modelo: string
  nomeChave: string
  tentativas: number
  erro?: string
  status?: number
  codigo?: CodigoErroIA
  finishReason?: string | null
  reasoningTokens?: number
}

export interface ChaveIA {
  id: number
  provedor: ProvedorIA
  nome: string
  chaveApi: string
  urlBase?: string | null
  modelo?: string | null
  ordem: number
  ativo: boolean
  failCount: number
  ultimaFalha?: Date | string | null
}

export interface OpcoesChamarIA {
  temperatura?: number
  maxTokens?: number
  aceitarRaciocinio?: boolean
  topP?: number
  reasoningEffort?: "none" | "low" | "medium" | "high"
  enableThinking?: boolean
  forceNonemptyContent?: boolean
  retryVazioComMaisTokens?: boolean
}

export const BASE_URLS: Record<ProvedorIA, string> = {
  groq: "https://api.groq.com/openai/v1",
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  deepseek: "https://api.deepseek.com/v1",
  openai_compatible: "",
  openrouter: "https://openrouter.ai/api/v1",
}

export const MODELOS_PADRAO: Record<ProvedorIA, string> = {
  groq: "qwen/qwen3.8-27b",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
  gemini: "gemini-3.6-flash",
  deepseek: "deepseek-chat",
  openai_compatible: "",
  openrouter: "openai/gpt-4o-mini",
}

export const PROVEDOR_LABELS: Record<ProvedorIA, string> = {
  groq: "Groq",
  openai: "OpenAI",
  anthropic: "Anthropic (Claude)",
  gemini: "Google Gemini",
  deepseek: "DeepSeek",
  openai_compatible: "OpenAI Compatível (URL custom)",
  openrouter: "OpenRouter",
}

export const OPENROUTER_SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://pdmtextil.com.br"
export const OPENROUTER_APP_NAME = "PDM Pro Têxtil"

export const TIMEOUT_IA_MS = 30_000

interface ChaveReserva {
  id: number
  prov: ProvedorIA
  nome: string
  chave: string
  url: string
  modelo: string
  ordem: number
}

const cooldownCache = new Map<number, number>()
const MSG_ERRO_TECNICO =
  "Desculpe, estou com dificuldades tecnicas no momento. Por favor, tente novamente em instantes."

interface RespostaProvedor {
  conteudo?: string
  finishReason?: string | null
  reasoningTokens?: number
}

function ehProvedorNvidia(chave: Pick<ChaveReserva, "prov" | "url" | "modelo">): boolean {
  return /integrate\.api\.nvidia\.com|nvidia|nemotron/i.test(`${chave.url} ${chave.modelo}`)
}

function statusDoErro(erro: unknown): number | undefined {
  if (!(erro instanceof Error)) return undefined
  const correspondencia = erro.message.match(/\bHTTP (\d{3})\b/)
  return correspondencia ? Number(correspondencia[1]) : undefined
}

function codigoDoErro(status: number | undefined): CodigoErroIA | undefined {
  return status === 413 ? "PAYLOAD_TOO_LARGE" : undefined
}

async function buscarChavesAtivas(): Promise<ChaveReserva[]> {
  const registros = await db
    .select()
    .from(aiChaves)
    .where(and(eq(aiChaves.ativo, true), lt(aiChaves.failCount, 5)))
    .orderBy(aiChaves.ordem)

  const agora = Date.now()
  return registros
    .filter((r: AiChave) => {
      const cooldown = cooldownCache.get(r.id)
      return !cooldown || cooldown < agora
    })
    .map((r: AiChave) => ({
      id: r.id,
      prov: (r.provedor || "groq") as ProvedorIA,
      nome: r.nome || r.provedor,
      chave: r.chaveApi,
      url: r.urlBase || BASE_URLS[r.provedor as ProvedorIA] || BASE_URLS.groq,
      modelo: r.modelo || MODELOS_PADRAO[r.provedor as ProvedorIA] || "",
      ordem: r.ordem,
    }))
}

async function marcarFalha(id: number) {
  try {
    await db
      .update(aiChaves)
      .set({
        failCount: sql`${aiChaves.failCount} + 1`,
        ultimaFalha: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aiChaves.id, id))
  } catch {}
  cooldownCache.set(id, Date.now() + 10 * 60 * 1000)
}

async function resetarFalha(id: number) {
  try {
    await db
      .update(aiChaves)
      .set({ failCount: 0, ultimaFalha: null, updatedAt: new Date() })
      .where(eq(aiChaves.id, id))
  } catch {}
  cooldownCache.delete(id)
}

function montarMensagens(messages: MensagemIA[]): MensagemIA[] {
  const ultimaMsg = messages[messages.length - 1]
  const historico = messages.slice(-16)
  if (ultimaMsg && historico[historico.length - 1] !== ultimaMsg) {
    return [...historico, ultimaMsg]
  }
  return historico
}

async function chamarProvedor(
  chave: ChaveReserva,
  messages: MensagemIA[],
  opcoes: OpcoesChamarIA
): Promise<RespostaProvedor> {
  const temperatura = opcoes.temperatura ?? 0.7
  const maxTokens = opcoes.maxTokens ?? 300
  const systemContent = messages.find((m) => m.role === "system")?.content || ""
  const historico = messages.filter((m) => m.role !== "system")

  if (chave.prov === "anthropic") {
    const res = await fetch(`${chave.url}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": chave.chave,
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(TIMEOUT_IA_MS),
      body: JSON.stringify({
        model: chave.modelo,
        max_tokens: maxTokens,
        temperature: temperatura,
        system: systemContent || undefined,
        messages: historico,
      }),
    })
    if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`)
    const data = await res.json()
    return {
      conteudo: typeof data.content?.[0]?.text === "string" ? data.content[0].text : undefined,
      finishReason: data.stop_reason ?? undefined,
    }
  }

  if (chave.prov === "gemini") {
    const contents = historico.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }))
    if (contents.length > 0 && contents[0].role !== "user") {
      contents.unshift({ role: "user", parts: [{ text: "Iniciar conversa" }] })
    }
    const res = await fetch(`${chave.url}/models/${chave.modelo}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": chave.chave,
      },
      signal: AbortSignal.timeout(TIMEOUT_IA_MS),
      body: JSON.stringify({
        contents,
        systemInstruction: systemContent ? { parts: [{ text: systemContent }] } : undefined,
        generationConfig: {
          temperature: temperatura,
          maxOutputTokens: Math.max(1024, maxTokens * 4),
        },
      }),
    })
    if (!res.ok) {
      const errBody = await res.text().catch(() => "")
      throw new Error(`Gemini HTTP ${res.status}${errBody ? `: ${errBody.slice(0, 300)}` : ""}`)
    }
    const data = await res.json()
    const parts: { text?: string }[] = data.candidates?.[0]?.content?.parts ?? []
    const texto = (parts.map((p) => p.text).filter(Boolean) as string[]).join(" ")
    return {
      conteudo: texto || undefined,
      finishReason: data.candidates?.[0]?.finishReason ?? undefined,
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${chave.chave}`,
  }
  if (chave.prov === "openrouter") {
    headers["HTTP-Referer"] = OPENROUTER_SITE_URL
    headers["X-Title"] = OPENROUTER_APP_NAME
  }

  const corpo: Record<string, unknown> = {
    model: chave.modelo,
    messages,
    temperature: temperatura,
    max_tokens: maxTokens,
  }

  if (ehProvedorNvidia(chave)) {
    if (opcoes.topP !== undefined) corpo.top_p = opcoes.topP
    if (opcoes.reasoningEffort !== undefined) corpo.reasoning_effort = opcoes.reasoningEffort

    const chatTemplateKwargs: Record<string, unknown> = {}
    if (opcoes.enableThinking !== undefined) chatTemplateKwargs.enable_thinking = opcoes.enableThinking
    if (opcoes.forceNonemptyContent !== undefined) {
      chatTemplateKwargs.force_nonempty_content = opcoes.forceNonemptyContent
    }
    if (Object.keys(chatTemplateKwargs).length > 0) corpo.chat_template_kwargs = chatTemplateKwargs
  }

  const res = await fetch(`${chave.url}/chat/completions`, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(TIMEOUT_IA_MS),
    body: JSON.stringify(corpo),
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => "")
    throw new Error(`HTTP ${res.status}${errBody ? `: ${errBody.slice(0, 300)}` : ""}`)
  }
  const data = await res.json()
  const escolha = data.choices?.[0]
  const mensagem = escolha?.message
  const conteudo = typeof mensagem?.content === "string" && mensagem.content.trim() ? mensagem.content : undefined
  const raciocinio = [mensagem?.reasoning_content, mensagem?.reasoning].find(
    (valor): valor is string => typeof valor === "string" && Boolean(valor.trim())
  )
  const tokensRaciocinio = data.usage?.completion_tokens_details?.reasoning_tokens

  return {
    conteudo: conteudo ?? (opcoes.aceitarRaciocinio ? raciocinio : undefined),
    finishReason: escolha?.finish_reason ?? null,
    reasoningTokens: typeof tokensRaciocinio === "number" ? tokensRaciocinio : undefined,
  }
}

function mapearChaveReserva(r: AiChave): ChaveReserva {
  return {
    id: r.id,
    prov: (r.provedor || "groq") as ProvedorIA,
    nome: r.nome || r.provedor,
    chave: r.chaveApi,
    url: r.urlBase || BASE_URLS[r.provedor as ProvedorIA] || BASE_URLS.groq,
    modelo: r.modelo || MODELOS_PADRAO[r.provedor as ProvedorIA] || "",
    ordem: r.ordem,
  }
}

async function carregarChavesEnvFallback(): Promise<ChaveReserva[]> {
  const envKey = process.env.GROQ_API_KEY
  if (envKey && envKey !== "cole-sua-chave-groq-aqui") {
    return [
      {
        id: -1,
        prov: "groq",
        nome: "Groq (env)",
        chave: envKey,
        url: BASE_URLS.groq,
        modelo: process.env.GROQ_MODEL || MODELOS_PADRAO.groq,
        ordem: 1,
      },
    ]
  }
  return []
}

async function carregarChavesPadrao(): Promise<ChaveReserva[]> {
  const chavesEnv = await carregarChavesEnvFallback()
  const chavesBanco = await buscarChavesAtivas().catch(() => [])
  return [...chavesBanco, ...chavesEnv]
}

type EstadoChamadaIA = {
  ultimoErro: unknown
  ultimoStatus?: number
  ultimoCodigo?: CodigoErroIA
  ultimoFinishReason?: string | null
  ultimoMotivoVazio?: boolean
  tentativas: number
}

async function tentarChaves(
  chaves: ChaveReserva[],
  mensagens: MensagemIA[],
  opcoes: OpcoesChamarIA,
  estado: EstadoChamadaIA
): Promise<ResultadoIA | null> {
  for (const chave of chaves) {
    estado.tentativas++
    try {
      const resposta = await chamarProvedor(chave, mensagens, opcoes)

      if (!resposta.conteudo?.trim()) {
        estado.ultimoErro = new Error(
          resposta.finishReason === "length"
            ? "Provedor retornou resposta vazia (finish_reason=length)"
            : "Provedor retornou resposta vazia"
        )
        estado.ultimoFinishReason = resposta.finishReason ?? undefined
        estado.ultimoMotivoVazio = true
        estado.ultimoStatus = undefined
        estado.ultimoCodigo = undefined
        await marcarFalha(chave.id)
        continue
      }

      estado.ultimoMotivoVazio = false
      if (chave.id > 0) await resetarFalha(chave.id)
      return {
        conteudo: resposta.conteudo,
        provedor: chave.prov,
        modelo: chave.modelo,
        nomeChave: chave.nome,
        tentativas: estado.tentativas,
        finishReason: resposta.finishReason,
        reasoningTokens: resposta.reasoningTokens,
      }
    } catch (err) {
      estado.ultimoErro = err
      estado.ultimoStatus = statusDoErro(err)
      estado.ultimoCodigo = codigoDoErro(estado.ultimoStatus)
      estado.ultimoFinishReason = undefined
      estado.ultimoMotivoVazio = false
      console.error(`[IA] Provedor ${chave.prov} (${chave.nome}) falhou:`, err)
      if (chave.id > 0 && !estado.ultimoCodigo) await marcarFalha(chave.id)
    }
  }
  return null
}

export async function chamarIA(
  messages: MensagemIA[],
  opcoes: OpcoesChamarIA = {},
  chaveId?: number
): Promise<ResultadoIA> {
  let chaves: ChaveReserva[] = []

  if (chaveId !== undefined) {
    const registros = await db.select().from(aiChaves).where(eq(aiChaves.id, chaveId))
    const r = registros[0]
    if (!r) {
      return {
        conteudo: MSG_ERRO_TECNICO,
        provedor: "nenhum",
        modelo: "",
        nomeChave: "",
        tentativas: 0,
        erro: "chave de IA nao encontrada",
      }
    }
    chaves = [mapearChaveReserva(r)]
  } else {
    chaves = await carregarChavesPadrao()
  }

  if (chaves.length === 0) {
    console.error("[IA] Nenhuma chave de IA configurada")
    return {
      conteudo: MSG_ERRO_TECNICO,
      provedor: "nenhum",
      modelo: "",
      nomeChave: "",
      tentativas: 0,
      erro: "nenhuma chave de IA configurada",
    }
  }

  const mensagens = montarMensagens(messages)
  const estado: EstadoChamadaIA = { ultimoErro: null, tentativas: 0 }
  let resultado = await tentarChaves(chaves, mensagens, opcoes, estado)

  if (
    !resultado &&
    opcoes.retryVazioComMaisTokens &&
    estado.ultimoMotivoVazio &&
    !estado.ultimoCodigo &&
    chaves.length > 0
  ) {
    const opcoesRetry: OpcoesChamarIA = {
      ...opcoes,
      maxTokens: Math.max((opcoes.maxTokens ?? 300) * 2, 8192),
      retryVazioComMaisTokens: false,
    }
    resultado = await tentarChaves(chaves, mensagens, opcoesRetry, estado)
  }

  if (!resultado && chaveId !== undefined && estado.ultimoCodigo !== "PAYLOAD_TOO_LARGE") {
    const jaTentadas = new Set(chaves.map((chave) => chave.id))
    const fallback = (await carregarChavesPadrao()).filter((chave) => !jaTentadas.has(chave.id))
    resultado = await tentarChaves(fallback, mensagens, opcoes, estado)
  }

  if (resultado) return resultado

  console.error("[IA] Todos os provedores falharam:", estado.ultimoErro)
  return {
    conteudo: MSG_ERRO_TECNICO,
    provedor: "nenhum",
    modelo: "",
    nomeChave: "",
    tentativas: estado.tentativas,
    erro: estado.ultimoErro ? String(estado.ultimoErro) : "todos os provedores falharam",
    status: estado.ultimoStatus,
    codigo: estado.ultimoCodigo,
    finishReason: estado.ultimoFinishReason,
  }
}

export async function testarChave(
  chave: ChaveIA
): Promise<{ ok: boolean; mensagem: string; detalhe?: string }> {
  const prov = (chave.provedor || "groq") as ProvedorIA
  const url = chave.urlBase || BASE_URLS[prov] || BASE_URLS.groq
  const modelo = chave.modelo || MODELOS_PADRAO[prov] || ""

  const opcoes: OpcoesChamarIA = { maxTokens: 512, aceitarRaciocinio: true }
  if (ehProvedorNvidia({ prov, url, modelo })) {
    opcoes.reasoningEffort = "none"
    opcoes.enableThinking = false
  }

  try {
    const resposta = await chamarProvedor(
      {
        id: chave.id,
        prov,
        nome: chave.nome,
        chave: chave.chaveApi,
        url,
        modelo,
        ordem: chave.ordem,
      },
      [
        { role: "system", content: "Voce e um assistente." },
        { role: "user", content: "Responda apenas: OK" },
      ],
      opcoes
    )
    if (!resposta.conteudo?.trim()) {
      return {
        ok: false,
        mensagem: "Provedor respondeu com erro tecnico",
        detalhe: resposta.finishReason ? `finish_reason=${resposta.finishReason}` : undefined,
      }
    }
    return { ok: true, mensagem: `Provedor respondeu: ${resposta.conteudo.substring(0, 200)}` }
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "erro desconhecido"
    return { ok: false, mensagem: `Falha: ${mensagem}` }
  }
}
