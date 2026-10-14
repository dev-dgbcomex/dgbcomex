/**
 * Regra que decide o que fazer com a base do detalhe do faturamento antes de a tela
 * mostrar qualquer número.
 *
 * Existem três bases diferentes no mesmo caminho e é fácil confundi-las:
 *
 * - o **ERP**, que é a verdade e só se lê;
 * - o **Neon** (`marts.faturamento_detalhe`), base compartilhada de 12 meses, com
 *   `carga` (reescreve) e `sync` (delta desde `ultima_data`);
 * - o **IndexedDB do navegador**, cópia local para a tela não bater no Neon a cada
 *   filtro.
 *
 * A tela pergunta só o *marcador* do Neon (`/faturamento-detalhe/estado`, leitura
 * barata) e decide daí:
 *
 * | Situação | Plano | Custo |
 * |---|---|---|
 * | Neon sem carga ou zerado | `carga` | lê 12 meses do ERP e reescreve o Neon |
 * | Neon parado há mais de `DIAS_PARA_RECONSTRUIR` | `carga` | idem: o delta não alcança o que mudou no meio da janela |
 * | Neon alguns dias atrás | `sync` | delta desde `ultima_data` |
 * | Neon em dia, navegador vazio ou atrasado | `usar-neon` | baixa o espelho; não toca no ERP |
 * | Neon em dia e navegador em dia | `pronto` | não pede nada |
 *
 * Sem o estado do Neon (API fora, 403, timeout) a decisão é conservadora: com base
 * local não se mexe em dado do ERP; sem base local tenta o espelho e, se ele vier
 * vazio, a tela escala para `carga` — foi o que travou a tela em produção, Parando
 * num aviso e deixando os botões sem utilidade.
 */

/** Acima disso o `sync` (que lê de `ultima_data` em diante) não cobre o meio da janela. */
export const DIAS_PARA_RECONSTRUIR = 7

export interface MarcadorBase {
  carga_completa: boolean
  contagem: number
  ultima_data: string | null
}

export type PlanoBase = "pronto" | "usar-neon" | "sync" | "carga"

export interface DecisaoBase {
  plano: PlanoBase
  /** Frase para o usuário: a tela executa o plano e mostra o motivo junto. */
  motivo: string
}

const paraDia = (iso: string) => Date.parse(`${iso}T00:00:00Z`)

/** Dias inteiros de `de` até `ate`; negativo quando `ate` é anterior. */
export function diasEntre(de: string, ate: string): number {
  return Math.round((paraDia(ate) - paraDia(de)) / 86_400_000)
}

export function decidirPlano({
  estadoNeon,
  cacheLocal,
  hoje,
  diasParaReconstruir = DIAS_PARA_RECONSTRUIR,
}: {
  /** `/faturamento-detalhe/estado`; `null` quando a API não respondeu. */
  estadoNeon: MarcadorBase | null
  /** Marcador guardado no IndexedDB deste navegador. */
  cacheLocal: MarcadorBase | null
  hoje?: string
  diasParaReconstruir?: number
}): DecisaoBase {
  const hojeIso = hoje ?? new Date().toISOString().slice(0, 10)
  const temBase = (m: MarcadorBase | null) => Boolean(m?.carga_completa) && (m?.contagem ?? 0) > 0
  const neonVazio = (neon: MarcadorBase | null) =>
    !neon || !neon.carga_completa || neon.contagem === 0 || !neon.ultima_data

  // 1. O navegador está sem base: pergunta primeiro ao espelho, que é mais barato
  //    que ler 12 meses do ERP. `estadoNeon === null` é "não sei", não "está vazio":
  //    nesse caso tenta o espelho e deixa a tela escalar para a carga se ele vier vazio.
  if (!temBase(cacheLocal)) {
    if (estadoNeon && neonVazio(estadoNeon)) {
      return {
        plano: "carga",
        motivo: "A base do Neon está vazia — carregando 12 meses do ERP. Pode levar alguns minutos.",
      }
    }
    return {
      plano: "usar-neon",
      motivo: estadoNeon
        ? `Baixando do Neon os ${estadoNeon.contagem.toLocaleString("pt-BR")} itens para este navegador.`
        : "Baixando a base do Neon para este navegador.",
    }
  }

  // 2. O navegador tem base. Sem resposta da API, fica como está: melhor uma tela
  //    um dia atrasada do que um sync disparado às cegas no ERP.
  if (!estadoNeon) {
    return {
      plano: "pronto",
      motivo: "A API não respondeu o estado da base; o cache local continua como está.",
    }
  }

  if (neonVazio(estadoNeon)) {
    return {
      plano: "carga",
      motivo: "A base do Neon não existe mais — recarregando 12 meses do ERP.",
    }
  }

  const atraso = diasEntre(estadoNeon.ultima_data!, hojeIso)
  if (atraso <= 0) {
    return {
      plano: "pronto",
      motivo: `A base está em dia, com notas até ${estadoNeon.ultima_data}. Nada a carregar.`,
    }
  }

  if (atraso >= diasParaReconstruir) {
    return {
      plano: "carga",
      motivo: `A base parou em ${estadoNeon.ultima_data} (${atraso} dias atrás): recarregando 12 meses do ERP.`,
    }
  }

  return {
    plano: "sync",
    motivo: `Faltam notas desde ${estadoNeon.ultima_data} (${atraso} ${atraso === 1 ? "dia" : "dias"}): buscando só o que é novo no ERP.`,
  }
}
